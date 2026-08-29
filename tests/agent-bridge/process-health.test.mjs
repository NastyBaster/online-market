import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBridgeProcesses, normalizeProcessSnapshot } from '../../scripts/agent-bridge/process-health.mjs';

const p = (pid, command, extras = {}) => ({ pid, ppid: extras.ppid ?? 1, name: extras.name ?? 'node.exe', command, startTime: extras.startTime ?? `s-${pid}` });
const context = { currentProcess: { pid: 10, startTime: 's-10' }, launchers: [{ pid: 9, startTime: 's-9' }] };

test('current batch and verified npm/shell launcher chain pass', () => {
  const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(9, 'powershell npm run bridge:batch', { name: 'powershell.exe' })], context);
  assert.equal(result.pass, true); assert.deepEqual(result.processes.map((x) => x.category), ['current_batch', 'verified_launcher']);
});
test('npm.cmd ancestor is verified only when it is in the current batch chain', () => { const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch', { ppid: 9 }), p(9, 'npm.cmd run bridge:batch', { name: 'npm.cmd', ppid: 1 })], { currentProcess: { pid: 10, startTime: 's-10' } }); assert.equal(result.pass, true); assert.equal(result.processes[1].category, 'verified_launcher'); });
test('codex parent and unrelated node are not task children by ancestry or path', () => {
  const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(8, 'codex exec --ephemeral repository prompt', { name: 'codex.exe', ppid: 10 }), p(7, 'node worker.js', { ppid: 10 })], context);
  assert.equal(result.pass, true); assert.equal(result.processes[1].category, 'unrelated_process'); assert.equal(result.processes[2].category, 'unrelated_process');
});
test('real watcher and ambiguous bridge command block', () => {
  const watcher = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(20, 'node cli.mjs watch')], context); assert.equal(watcher.pass, false); assert.equal(watcher.blocking[0].category, 'bridge_watch');
  const ambiguous = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(21, 'node cli.mjs once')], context); assert.equal(ambiguous.pass, false); assert.equal(ambiguous.blocking[0].category, 'ambiguous_bridge_process');
});
test('tracked live child blocks and stale or reused PID is not trusted', () => {
  const live = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(30, 'codex exec task')], { ...context, trackedChildren: [{ pid: 30, startTime: 's-30', commandIdentity: 'codex exec' }] }); assert.equal(live.pass, false); assert.equal(live.blocking[0].category, 'tracked_task_child');
  const reused = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(30, 'node unrelated')], { ...context, trackedChildren: [{ pid: 30, startTime: 'old-start', commandIdentity: 'codex exec' }] }); assert.equal(reused.pass, true); assert.equal(reused.processes[1].category, 'stale_pid_record');
});
test('current PID start mismatch is stale and cannot authorize a reused process', () => { const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch', { startTime: 'new-start' })], context); assert.equal(result.pass, true); assert.equal(result.processes[0].category, 'stale_pid_record'); });
test('stale nonexistent records are not synthesized as live children', () => { const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch')], { ...context, trackedChildren: [{ pid: 99, startTime: 'missing' }] }); assert.equal(result.pass, true); assert.deepEqual(result.blocking, []); });
test('multiple processes block when one watcher exists', () => { const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(7, 'node worker'), p(8, 'bridge:watch')], context); assert.equal(result.pass, false); assert.equal(result.blocking[0].category, 'bridge_watch'); });
test('malformed snapshots fail closed at normalization boundary', () => { assert.throws(() => normalizeProcessSnapshot(null)); assert.throws(() => normalizeProcessSnapshot([{ pid: 1, name: 'node.exe' }])); });
test('Windows CIM field names and a single-process JSON object normalize safely', () => { const result = normalizeProcessSnapshot({ ProcessId: 10, ParentProcessId: 1, Name: 'node.exe', CommandLine: 'node cli.mjs batch', CreationDate: 'start' }); assert.deepEqual(result[0], { pid: 10, ppid: 1, name: 'node.exe', command: 'node cli.mjs batch', startTime: 'start' }); });
test('original false-positive command shape is unrelated when not the current process', () => { const result = classifyBridgeProcesses([p(10, 'node cli.mjs batch'), p(40, 'codex.exe exec --ephemeral C:\\Projects\\online-market')], context); assert.equal(result.pass, true); assert.equal(result.processes[1].category, 'unrelated_process'); });
test('import has no process side effects', async () => { const result = classifyBridgeProcesses([], context); assert.equal(result.pass, true); });
