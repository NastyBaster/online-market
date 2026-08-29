import { readFile, readlink } from 'node:fs/promises';

const positivePid = (pid) => Number.isSafeInteger(pid) && pid > 0;
const identityError = (category, detail) => Object.assign(new Error(category), { category, detail });

export function normalizeStartIdentity(value, platform) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') throw identityError('process_identity_malformed');
  const normalized = String(value).trim();
  if (platform === 'win32') {
    if (!/^\d{14}(?:\.\d+)?[+-]\d{3,4}$/.test(normalized) && !/^\d{14}(?:\.\d+)?$/.test(normalized) && !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(normalized)) throw identityError('process_identity_malformed');
  } else if (!/^\d+$/.test(normalized)) throw identityError('process_identity_malformed');
  return platform === 'win32' && /^\d{4}-/.test(normalized) ? new Date(normalized.replace(' ', 'T') + (normalized.endsWith('Z') ? '' : 'Z')).toISOString() : normalized;
}

export function parseWindowsProcessIdentity(raw, pid) {
  let value;
  try { value = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^\uFEFF/, '')) : raw; } catch { throw identityError('process_identity_malformed'); }
  const rows = Array.isArray(value) ? value : value == null ? [] : [value];
  if (!rows.length) return { status: 'absent' };
  if (rows.length !== 1 || !rows[0] || Number(rows[0].ProcessId ?? rows[0].pid) !== pid) throw identityError('process_identity_malformed');
  const row = rows[0];
  const startIdentity = normalizeStartIdentity(row.CreationDate ?? row.startIdentity ?? row.startTime, 'win32');
  return { status: 'present', identity: { pid, platform: 'win32', startIdentity, executableIdentity: String(row.Name ?? row.ExecutablePath ?? '').trim().toLowerCase() || null } };
}

async function windowsIdentity(pid, { run, executable = 'powershell.exe', cwd } = {}) {
  if (typeof run !== 'function') throw new TypeError('process identity runner is required');
  const args = ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; $p = Get-CimInstance -ClassName Win32_Process -Filter 'ProcessId = ${pid}' -Property ProcessId,Name,ExecutablePath,CreationDate; if ($null -eq $p) { '[]' } else { $row = [pscustomobject]@{ ProcessId = $p.ProcessId; Name = $p.Name; ExecutablePath = $p.ExecutablePath; CreationDate = $p.CreationDate.ToUniversalTime().ToString('o', [Globalization.CultureInfo]::InvariantCulture) }; ConvertTo-Json -InputObject @($row) -Compress }`];
  let result;
  try { result = await run(executable, args, { cwd }); } catch { throw identityError('process_identity_inspection_failed'); }
  if (Number(result?.exitCode) !== 0 || String(result?.stderr ?? '').trim()) throw identityError('process_identity_inspection_failed');
  return parseWindowsProcessIdentity(result?.stdout ?? '', pid);
}

async function linuxIdentity(pid, { read = readFile, link = readlink } = {}) {
  let stat;
  try { stat = await read(`/proc/${pid}/stat`, 'utf8'); } catch (error) { if (error?.code === 'ENOENT') return { status: 'absent' }; throw identityError('process_identity_inspection_failed'); }
  const close = stat.lastIndexOf(')');
  const fields = close >= 0 ? stat.slice(close + 2).trim().split(/\s+/) : [];
  if (close < 0 || fields.length < 20) throw identityError('process_identity_malformed');
  const startIdentity = normalizeStartIdentity(fields[19], 'linux');
  let executableIdentity = null;
  try { executableIdentity = (await link(`/proc/${pid}/exe`)).replaceAll('\\', '/').split('/').at(-1) || null; } catch (error) { if (error?.code !== 'ENOENT') throw identityError('process_identity_inspection_failed'); }
  return { status: 'present', identity: { pid, platform: 'linux', startIdentity, executableIdentity } };
}

export async function getProcessIdentity(pid, dependencies = {}) {
  if (!positivePid(pid)) throw identityError('process_identity_invalid_pid');
  const platform = dependencies.platform || process.platform;
  const result = platform === 'win32' ? await windowsIdentity(pid, dependencies) : platform === 'linux' ? await linuxIdentity(pid, dependencies) : (() => { throw identityError('process_identity_unsupported_platform'); })();
  if (result.status === 'present') result.identity.observedAt = new Date(dependencies.now ? dependencies.now() : Date.now()).toISOString();
  return result;
}

export { identityError };
