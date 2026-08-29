import test from 'node:test';
import assert from 'node:assert/strict';
import { batchDefaults, parseBatchConfig } from '../../scripts/agent-bridge/core.mjs';
import { runBoundedBatch } from '../../scripts/agent-bridge/batch.mjs';

const config = (overrides = {}) => ({ ...batchDefaults, dryRun: false, autoMerge: true, ...overrides });
const audit = (runId, overrides = {}) => ({ runId, outcome: 'complete', merge: { merged: true }, cleanup: { cleanup: 'complete' }, ...overrides });
function fake({ tasks = [], health = [], auditFailure = false, releaseFailure = false } = {}) {
  const calls = []; let index = 0; let healthIndex = 0;
  const adapter = {
    listReadyIssues: async () => index < tasks.length ? [{ number: tasks[index].issue, title: `Task ${tasks[index].issue}`, createdAt: `2026-01-0${index + 1}T00:00:00Z`, labels: [{ name: 'agent:ready' }] }] : [],
    healthCheck: async () => { calls.push('health'); return health[healthIndex++] || { pass: true, mainSha: 'main-sha' }; },
    acquireLock: async () => { calls.push('lock'); return async () => { calls.push('release'); if (releaseFailure) throw new Error('release failed'); }; },
    readRunAudit: async (_, id) => tasks.find((task) => task.runId === id)?.audit,
    writeBatchAudit: async () => { calls.push('audit'); if (auditFailure) throw new Error('ghp_secret'); },
  };
  const runSingle = async () => { const task = tasks[index++]; calls.push(`run:${task.issue}`); return task.result; };
  return { adapter, runSingle, calls };
}

test('two successful tasks are strictly sequential and end at the limit', async () => {
  const tasks = [1, 2].map((issue) => ({ issue, runId: `run-${issue}`, result: { runId: `run-${issue}`, issue, pullRequest: issue + 100, outcome: 'complete', elapsedMs: issue }, audit: audit(`run-${issue}`) }));
  const f = fake({ tasks }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: 'batch', runSingle: f.runSingle });
  assert.equal(result.outcome, 'completed_task_limit'); assert.equal(result.completedTaskCount, 2); assert.deepEqual(f.calls.filter((call) => call.startsWith('run:')), ['run:1', 'run:2']); assert.deepEqual(result.taskRuns.map((entry) => entry.prNumber), [101, 102]); assert.equal(f.calls.at(-1), 'audit');
});
test('no work and time limit complete without a task mutation', async () => {
  const noWork = fake(); const noWorkResult = await runBoundedBatch({ adapter: noWork.adapter, root: '.', config: config(), batchId: 'none', runSingle: noWork.runSingle }); assert.equal(noWorkResult.outcome, 'completed_no_work'); assert.equal(noWork.calls.includes('lock'), true); assert.equal(noWork.calls.some((call) => call.startsWith('run:')), false);
  const one = fake({ tasks: [{ issue: 1, runId: 'run-1', result: { runId: 'run-1', issue: 1, outcome: 'complete' }, audit: audit('run-1') }] }); let tick = 0; const timed = await runBoundedBatch({ adapter: one.adapter, root: '.', config: config({ maxMinutes: 1 }), batchId: 'time', now: () => tick++ ? 60_000 : 0, runSingle: one.runSingle }); assert.equal(timed.outcome, 'completed_time_limit'); assert.equal(one.calls.some((call) => call.startsWith('run:')), false);
});
test('blocked, failed, and incomplete cleanup stop before the next task', async () => {
  for (const [outcome, taskAudit, expected] of [['blocked', audit('one'), 'stopped_task_blocked'], ['complete', audit('one', { cleanup: { cleanup: 'blocked' } }), 'stopped_cleanup_incomplete'], ['handoff', audit('one'), 'stopped_task_failed']]) {
    const f = fake({ tasks: [{ issue: 1, runId: 'one', result: { runId: 'one', issue: 1, outcome }, audit: taskAudit }, { issue: 2, runId: 'two', result: { runId: 'two', issue: 2, outcome: 'complete' }, audit: audit('two') }] }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: outcome, runSingle: f.runSingle }); assert.equal(result.outcome, expected); assert.deepEqual(f.calls.filter((call) => call.startsWith('run:')), ['run:1']);
  }
});
test('health failures after a task stop before the next task and sanitize output', async () => {
  const f = fake({ tasks: [{ issue: 1, runId: 'one', result: { runId: 'one', issue: 1, outcome: 'complete' }, audit: audit('one') }, { issue: 2, runId: 'two', result: { runId: 'two', issue: 2, outcome: 'complete' }, audit: audit('two') }], health: [{ pass: true, mainSha: 'a' }, { pass: true, mainSha: 'a' }, { pass: false, reason: 'ghp_secret C:\\private\\path' }] }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: 'health', runSingle: f.runSingle }); assert.equal(result.outcome, 'stopped_health_check'); assert.match(result.sanitizedError, /\[redacted\].*\[private-path\]/); assert.deepEqual(f.calls.filter((call) => call.startsWith('run:')), ['run:1']);
});
test('dirty, unsynchronized, unexpected-worktree, and active-process health gates never start a task', async () => {
  for (const reason of ['main dirty', 'main unsynchronized', 'unexpected worktree', 'active bridge process']) { const f = fake({ tasks: [{ issue: 1, runId: 'one', result: { runId: 'one', issue: 1, outcome: 'complete' }, audit: audit('one') }], health: [{ pass: false, reason }] }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: reason, runSingle: f.runSingle }); assert.equal(result.outcome, 'stopped_health_check'); assert.equal(f.calls.some((call) => call.startsWith('run:')), false); }
});
test('dry run plans eligibility without lock, task, audit, or mutation', async () => { const f = fake({ tasks: [{ issue: 1, runId: 'one', result: {}, audit: {} }] }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config({ dryRun: true }), batchId: 'dry', runSingle: f.runSingle }); assert.equal(result.outcome, 'dry_run_complete'); assert.equal(result.plan[0].issueNumber, 1); assert.equal(f.calls.includes('lock'), false); assert.equal(f.calls.includes('audit'), false); assert.equal(f.calls.some((call) => call.startsWith('run:')), false); });
test('invalid bounds and concurrency reject before mutation, while audit failure stops before another task', async () => {
  const f = fake(); await assert.rejects(runBoundedBatch({ adapter: f.adapter, root: '.', config: config({ maxTasks: 6 }), batchId: 'bad', runSingle: f.runSingle })); assert.deepEqual(f.calls, []); assert.throws(() => parseBatchConfig([], { BRIDGE_BATCH_MAX_TASKS: '0' })); assert.throws(() => parseBatchConfig([], { BRIDGE_BATCH_MAX_MINUTES: '181' })); assert.throws(() => parseBatchConfig([], { BRIDGE_CONCURRENCY: '2' }));
  const failedAudit = fake({ tasks: [{ issue: 1, runId: 'one', result: { runId: 'one', issue: 1, outcome: 'complete' }, audit: audit('one') }, { issue: 2, runId: 'two', result: { runId: 'two', issue: 2, outcome: 'complete' }, audit: audit('two') }], auditFailure: true }); const result = await runBoundedBatch({ adapter: failedAudit.adapter, root: '.', config: config(), batchId: 'audit', runSingle: failedAudit.runSingle }); assert.equal(result.outcome, 'stopped_health_check'); assert.deepEqual(failedAudit.calls.filter((call) => call.startsWith('run:')), ['run:1']);
});
test('batch lock is released after failure and release failure does not hide task failure', async () => { const f = fake({ tasks: [{ issue: 1, runId: 'one', result: { runId: 'one', issue: 1, outcome: 'blocked' }, audit: audit('one') }], releaseFailure: true }); const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: 'release', runSingle: f.runSingle }); assert.equal(result.outcome, 'stopped_task_blocked'); assert.ok(f.calls.includes('release')); });
test('a stale batch lock stops before task execution', async () => { const f = fake(); f.adapter.acquireLock = async () => { throw new Error('stale lock'); }; const result = await runBoundedBatch({ adapter: f.adapter, root: '.', config: config(), batchId: 'lock', runSingle: f.runSingle }); assert.equal(result.outcome, 'stopped_health_check'); assert.equal(result.stopPhase, 'acquire-batch-lock'); assert.equal(f.calls.some((call) => call.startsWith('run:')), false); });
