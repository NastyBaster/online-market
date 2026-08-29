import { eligible, runId, runOnce, sanitize, selectOldestEligible } from './core.mjs';

const successfulCleanup = (run, audit) => run?.outcome === 'complete' && audit?.outcome === 'complete' && audit?.cleanup?.cleanup === 'complete';
const terminalOutcome = (run, audit) => {
  if (run?.outcome === 'blocked') return 'stopped_task_blocked';
  if (run?.outcome === 'blocked_cleanup' || audit?.cleanup?.cleanup !== 'complete') return 'stopped_cleanup_incomplete';
  return 'stopped_task_failed';
};

export async function runBoundedBatch({ adapter, root, config, batchId = `batch-${runId()}`, now = () => Date.now(), runSingle = runOnce, progress = () => {} }) {
  if (!config || config.concurrency !== 1 || !Number.isSafeInteger(config.maxTasks) || config.maxTasks < 1 || config.maxTasks > 5 || !Number.isSafeInteger(config.maxMinutes) || config.maxMinutes < 1 || config.maxMinutes > 180) throw new Error('invalid bounded batch configuration');
  const started = now();
  const summary = { schemaVersion: 1, batchId, startedAt: new Date().toISOString(), completedAt: null, requestedMaxTasks: config.maxTasks, effectiveMaxTasks: config.maxTasks, maxMinutes: config.maxMinutes, dryRun: Boolean(config.dryRun), autoMerge: Boolean(config.autoMerge), concurrency: 1, ownerMode: 'batch', ownershipAcquired: false, leaseReleased: false, childSpawned: false, outcome: 'running', completedTaskCount: 0, attemptedTaskCount: 0, taskRuns: [], stopPhase: null, sanitizedError: null, finalHealth: null, mainBefore: null, mainAfter: null };
  const emit = (phase, data = {}) => progress({ batchId, phase, ...data });
  const persist = async () => adapter.writeBatchAudit?.(root, batchId, summary);
  let release; let primaryError = null;
  const releaseOwner = async () => {
    if (!release) return;
    await (typeof release === 'function' ? release() : release.release());
    summary.leaseReleased = true;
  };
  const health = async (phase) => { const result = await adapter.healthCheck(root, { batchId, phase, owner: typeof release === 'function' ? null : release, dryRun: Boolean(config.dryRun) }); summary.finalHealth = result; if (!result?.pass) { summary.outcome = 'stopped_health_check'; summary.stopPhase = phase; summary.sanitizedError = sanitize(result?.reason || 'batch health check failed'); return false; } if (!summary.mainBefore) summary.mainBefore = result.mainSha || null; summary.mainAfter = result.mainSha || summary.mainAfter; return true; };
  try {
    release = await adapter.acquireLock(root, { mode: 'batch', runId: batchId, dryRun: Boolean(config.dryRun) }); summary.ownershipAcquired = true; emit('batch-lock-acquired', { dryRun: Boolean(config.dryRun) });
    if (!await health('pre-batch-health')) return summary;
    if (config.dryRun) {
      const candidate = await selectOldestEligible(adapter);
      summary.plan = candidate ? [{ issueNumber: candidate.number, title: sanitize(candidate.title || '').slice(0, 160) }] : [];
      summary.candidateCount = summary.plan.length;
      summary.outcome = 'dry_run_complete';
      return summary;
    }
    while (true) {
      if (summary.attemptedTaskCount >= config.maxTasks) { summary.outcome = 'completed_task_limit'; break; }
      if (now() - started >= config.maxMinutes * 60_000) { summary.outcome = 'completed_time_limit'; break; }
      if (!await health(summary.attemptedTaskCount ? 'between-task-health' : 'pre-task-health')) break;
      const candidate = await selectOldestEligible(adapter);
      if (!candidate) { summary.outcome = 'completed_no_work'; break; }
      emit('start-task', { issue: candidate.number, sequence: summary.attemptedTaskCount + 1 });
      const owner = typeof release === 'function' ? null : release;
      const taskRunId = `${batchId}-task-${summary.attemptedTaskCount + 1}`;
      const task = await runSingle({ adapter, root, id: taskRunId, config: { ...config, dryRun: false }, lockHeld: true, ownership: owner, delegated: owner ? { ownershipToken: owner.ownershipToken, parentMode: 'batch', childRunId: taskRunId, batchId, sequence: summary.attemptedTaskCount + 1 } : null, progress: (event) => emit('task-progress', event) });
      summary.attemptedTaskCount += 1;
      const audit = await adapter.readRunAudit(root, task.runId);
      const entry = { sequence: summary.attemptedTaskCount, runId: task.runId, issueNumber: task.issue ?? candidate.number, prNumber: task.pullRequest ?? null, taskOutcome: task.outcome, merged: Boolean(audit?.merge?.merged), cleanup: audit?.cleanup?.cleanup || null, elapsedMs: task.elapsedMs ?? null };
      summary.taskRuns.push(entry);
      if (!successfulCleanup(task, audit)) { summary.outcome = terminalOutcome(task, audit); summary.stopPhase = 'verify-task-terminal'; break; }
      summary.completedTaskCount += 1;
      try { await persist(); } catch (error) { summary.outcome = 'stopped_health_check'; summary.stopPhase = 'write-batch-audit'; summary.sanitizedError = sanitize(error?.message || error); break; }
    }
  } catch (error) { primaryError = error; summary.outcome = !release && summary.attemptedTaskCount === 0 ? 'stopped_health_check' : config.dryRun ? 'stopped_health_check' : 'stopped_task_failed'; summary.stopPhase = summary.stopPhase || (!release ? 'acquire-batch-lock' : config.dryRun ? 'dry-run-inspection' : 'batch-execution'); summary.sanitizedError = sanitize(error?.message || error); }
  finally { if (release) { try { await releaseOwner(); } catch (error) { const secondary = { phase: 'release-batch-lock', category: sanitize(error?.message || error).slice(0, 160) }; summary.secondaryCleanupErrors = [...(summary.secondaryCleanupErrors || []), secondary]; if (!primaryError && ['running', 'dry_run_complete', 'completed_task_limit', 'completed_time_limit', 'completed_no_work'].includes(summary.outcome)) { summary.outcome = 'lock_release_failed'; summary.stopPhase = 'release-batch-lock'; summary.sanitizedError = secondary.category; } } } }
  summary.completedAt = new Date().toISOString();
  if (!config.dryRun) {
    try { await persist(); } catch (error) { const secondary = { phase: 'write-final-batch-audit', category: sanitize(error?.message || error).slice(0, 160) }; summary.secondaryCleanupErrors = [...(summary.secondaryCleanupErrors || []), secondary]; if (!primaryError) { summary.outcome = 'stopped_health_check'; summary.stopPhase = 'write-final-batch-audit'; summary.sanitizedError = secondary.category; } }
  }
  return summary;
}

export { successfulCleanup };
