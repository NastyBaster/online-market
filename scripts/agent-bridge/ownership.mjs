import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

export const OWNER_SCHEMA_VERSION = 1;
export const CHILD_SCHEMA_VERSION = 1;
export const DEFAULT_LEASE_MS = 120_000;
export const DEFAULT_HEARTBEAT_MS = 30_000;
const modes = new Set(['once', 'batch', 'watch']);

const runtimeDir = (root) => path.join(root, '.agent-bridge');
const ownerPath = (root) => path.join(runtimeDir(root), 'execution-owner.json');
const childDir = (root) => path.join(runtimeDir(root), 'children');
const capabilityFingerprint = (token) => createHash('sha256').update(token).digest('hex').slice(0, 16);
const iso = (value) => new Date(value).toISOString();
const validIso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateOwner(record, repositoryIdentity) {
  if (!record || record.schemaVersion !== OWNER_SCHEMA_VERSION || record.repositoryIdentity !== repositoryIdentity || !modes.has(record.mode)) throw new Error('malformed or mismatched execution owner');
  if (typeof record.ownershipToken !== 'string' || record.ownershipToken.length < 32) throw new Error('malformed execution owner capability');
  if (!Number.isSafeInteger(record.ownerPid) || record.ownerPid < 1 || typeof record.ownerStartIdentity !== 'string' || !record.ownerStartIdentity) throw new Error('malformed execution owner process identity');
  if (typeof record.runId !== 'string' || !record.runId || !validIso(record.createdAt) || !validIso(record.heartbeatAt) || !validIso(record.leaseExpiresAt)) throw new Error('malformed execution owner lease');
  if (record.childRegistryVersion !== CHILD_SCHEMA_VERSION) throw new Error('unsupported child registry version');
  return record;
}

export function validateChild(record, repositoryIdentity) {
  if (!record || record.schemaVersion !== CHILD_SCHEMA_VERSION || record.repositoryIdentity !== repositoryIdentity) throw new Error('malformed child registry entry');
  if (typeof record.ownerTokenFingerprint !== 'string' || !record.ownerTokenFingerprint || typeof record.runId !== 'string' || !record.runId || typeof record.batchId !== 'string' || !record.batchId) throw new Error('malformed child registry entry');
  if (!Number.isSafeInteger(record.childPid) || record.childPid < 1 || typeof record.childStartIdentity !== 'string' || !record.childStartIdentity) throw new Error('malformed child process identity');
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 1 || !validIso(record.spawnedAt) || !['running', 'exited', 'stale'].includes(record.state)) throw new Error('malformed child registry state');
  return record;
}

export function repositoryIdentity(root) { return path.resolve(root).replaceAll('\\', '/').toLowerCase(); }
export function redactOwner(record) { const { ownershipToken: _, ...safe } = record; return { ...safe, ownerTokenFingerprint: capabilityFingerprint(record.ownershipToken) }; }

async function atomicWrite(target, value, fs = { mkdir, open, rename, rm }) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
  const handle = await fs.open(temporary, 'wx');
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8'); await handle.sync(); await handle.close(); await fs.rename(temporary, target); } catch (error) { await handle.close().catch(() => {}); await fs.rm(temporary, { force: true }).catch(() => {}); throw error; }
}

export async function readOwner(root, fs = { readFile }) { const record = JSON.parse(await fs.readFile(ownerPath(root), 'utf8')); return validateOwner(record, repositoryIdentity(root)); }

export async function classifyLease(record, { now = Date.now, inspect = async () => ({ exists: false, identityMatch: false }) } = {}) {
  const leaseExpired = Date.parse(record.leaseExpiresAt) + 5_000 < now();
  const process = await inspect(record.ownerPid, record.ownerStartIdentity);
  if (!leaseExpired && process.exists && process.identityMatch !== false) return 'live_current_lease';
  if (leaseExpired && process.exists && process.identityMatch !== false) return 'expired_live_owner';
  if (process.exists && process.identityMatch === false) return 'pid_reuse_stale_candidate';
  return leaseExpired ? 'stale_candidate' : 'owner_process_unverified';
}

export async function acquireOwnership(root, { mode, runId, now = () => Date.now(), ownerPid = process.pid, ownerStartIdentity = `process-${process.pid}`, leaseMs = DEFAULT_LEASE_MS, tokenGenerator = () => randomBytes(32).toString('hex'), fs = { mkdir, open, readFile, rename, rm }, processInspector = async () => ({ exists: false }) } = {}) {
  if (!modes.has(mode)) throw new Error('invalid execution owner mode');
  const identity = repositoryIdentity(root); const target = ownerPath(root); await fs.mkdir(runtimeDir(root), { recursive: true });
  const createdAt = new Date(now()).toISOString(); const token = tokenGenerator();
  const record = { schemaVersion: OWNER_SCHEMA_VERSION, repositoryIdentity: identity, ownershipToken: token, mode, ownerPid, ownerStartIdentity, runId: runId || `run-${now()}`, createdAt, heartbeatAt: createdAt, leaseExpiresAt: new Date(now() + leaseMs).toISOString(), commandCategory: `bridge_${mode}`, childRegistryVersion: CHILD_SCHEMA_VERSION };
  let handle;
  try { handle = await fs.open(target, 'wx'); await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, 'utf8'); await handle.sync(); await handle.close(); } catch (error) { await handle?.close().catch(() => {}); if (error?.code === 'EEXIST') { let existing; try { existing = await readOwner(root, fs); } catch { throw new Error('execution owner state is malformed; manual recovery required'); } const identityResult = await processInspector(existing.ownerPid, existing.ownerStartIdentity); if (identityResult?.exists && identityResult.identityMatch !== false) throw new Error(`Agent Bridge ${existing.mode} owner is live`); throw new Error('execution owner exists and requires controlled stale recovery'); } throw error; }
  const confirmed = await readOwner(root, fs); if (confirmed.ownershipToken !== token) throw new Error('execution ownership confirmation failed');
  let released = false;
  const assertToken = async () => { const current = await readOwner(root, fs); if (current.ownershipToken !== token) throw new Error('execution ownership token mismatch'); return current; };
  const heartbeat = async (time = now()) => { const current = await assertToken(); const at = new Date(time).toISOString(); await atomicWrite(target, { ...current, heartbeatAt: at, leaseExpiresAt: new Date(time + leaseMs).toISOString() }, fs); };
  const release = async () => { if (released) return; const current = await assertToken(); if (current.ownershipToken !== token) throw new Error('execution ownership token mismatch'); await fs.rm(target, { force: false }); released = true; };
  return { ...redactOwner(record), ownershipToken: token, heartbeat, release, ownerPath: target };
}

export async function registerChild(root, owner, { batchId, runId, sequence, issueNumber, childPid, childStartIdentity, now = () => Date.now(), fs = { mkdir, open, rename, rm } } = {}) {
  if (!owner?.ownershipToken) throw new Error('owner capability required for child registration');
  const current = await readOwner(root); if (current.ownershipToken !== owner.ownershipToken) throw new Error('execution ownership token mismatch');
  const record = { schemaVersion: CHILD_SCHEMA_VERSION, repositoryIdentity: repositoryIdentity(root), ownerTokenFingerprint: capabilityFingerprint(owner.ownershipToken), batchId, runId, sequence, issueNumber: Number.isSafeInteger(issueNumber) ? issueNumber : null, childPid, childStartIdentity, spawnedAt: new Date(now()).toISOString(), lastSeenAt: new Date(now()).toISOString(), state: 'running' };
  validateChild(record, repositoryIdentity(root)); const target = path.join(childDir(root), `${runId}.json`); await atomicWrite(target, record, fs);
  return { ...record, path: target };
}

export async function updateChild(root, owner, runId, patch, fs = { readFile, mkdir, open, rename, rm }) { const target = path.join(childDir(root), `${runId}.json`); const record = validateChild(JSON.parse(await fs.readFile(target, 'utf8')), repositoryIdentity(root)); if (record.ownerTokenFingerprint !== capabilityFingerprint(owner?.ownershipToken || '')) throw new Error('execution ownership token mismatch'); const updated = { ...record, ...patch }; validateChild(updated, repositoryIdentity(root)); await atomicWrite(target, updated, fs); return updated; }
export async function listChildren(root, fs = { readFile }) { let entries; try { entries = await (await import('node:fs/promises')).readdir(childDir(root)); } catch (error) { if (error?.code === 'ENOENT') return []; throw error; } return Promise.all(entries.filter((entry) => entry.endsWith('.json')).map(async (entry) => validateChild(JSON.parse(await fs.readFile(path.join(childDir(root), entry), 'utf8')), repositoryIdentity(root)))); }
export { capabilityFingerprint, ownerPath, childDir };
