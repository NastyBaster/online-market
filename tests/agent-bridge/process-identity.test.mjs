import test from 'node:test';
import assert from 'node:assert/strict';
import { getProcessIdentity, parseWindowsProcessIdentity } from '../../scripts/agent-bridge/process-identity.mjs';

const win = (creation = '20260829120000.000000+000') => JSON.stringify([{ ProcessId: 42, Name: 'node.exe', CreationDate: creation }]);

test('Windows identity queries one exact PID and is stable', async () => {
  const calls = []; const run = async (exe, args) => { calls.push({ exe, args }); return { exitCode: 0, stdout: win() }; };
  const first = await getProcessIdentity(42, { platform: 'win32', run, now: () => 1_700_000_000_000 }); const second = await getProcessIdentity(42, { platform: 'win32', run, now: () => 1_700_000_000_001 });
  assert.equal(first.identity.startIdentity, second.identity.startIdentity); assert.equal(calls.length, 2); assert.match(calls[0].args.at(-1), /ProcessId = 42/); assert.doesNotMatch(calls[0].args.at(-1), /Get-CimInstance(?!.*-Filter)/);
});

test('Windows absent, reused PID, malformed and inspection failure are distinct', async () => {
  assert.deepEqual(parseWindowsProcessIdentity('[]', 42), { status: 'absent' }); assert.notEqual(parseWindowsProcessIdentity(win('20260829120000.000000+000'), 42).identity.startIdentity, parseWindowsProcessIdentity(win('20260829130000.000000+000'), 42).identity.startIdentity);
  assert.throws(() => parseWindowsProcessIdentity(win('not-an-identity'), 42), /process_identity_malformed/);
  await assert.rejects(getProcessIdentity(42, { platform: 'win32', run: async () => { throw new Error('denied'); } }), /process_identity_inspection_failed/);
});

test('Linux identity parses exact proc stat and distinguishes absence', async () => {
  const read = async (file) => file.endsWith('/stat') ? '42 (node worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 12345 21' : '';
  const link = async () => '/usr/bin/node'; const observed = await getProcessIdentity(42, { platform: 'linux', read, link, now: () => 1_700_000_000_000 }); assert.equal(observed.identity.startIdentity, '12345'); assert.equal(observed.identity.executableIdentity, 'node');
  await assert.rejects(getProcessIdentity(42, { platform: 'linux', read: async () => { const error = new Error(); error.code = 'EACCES'; throw error; } }), /process_identity_inspection_failed/);
  const absent = await getProcessIdentity(42, { platform: 'linux', read: async () => { const error = new Error(); error.code = 'ENOENT'; throw error; } }); assert.deepEqual(absent, { status: 'absent' });
});

test('unsupported platform and PID zero fail closed', async () => {
  await assert.rejects(getProcessIdentity(0, { platform: 'win32', run: async () => ({}) }), /process_identity_invalid_pid/); await assert.rejects(getProcessIdentity(42, { platform: 'darwin' }), /process_identity_unsupported_platform/);
});
