export function validTaskBranch(branch, issueNumber) { return typeof branch === 'string' && new RegExp(`^agent/${issueNumber}-[a-z0-9-]+$`).test(branch); }
export async function cleanupMergedTask(context, ops) {
  const fail = (phase, error, merged = false) => ({ merged, cleanup: 'blocked', phase, error: String(error?.message || error).replaceAll(/token|authorization/gi, '[redacted]'), terminal: 'blocked_cleanup' });
  if (!validTaskBranch(context.expectedBranch, context.issueNumber) || !Number.isSafeInteger(context.prNumber) || context.prNumber < 1) return fail('validate-context', new Error('unsafe task branch or pull request number'));
  let verified;
  let phase = 'verify-merge';
  try {
    verified = await ops.verifyMergedPullRequest(context.prNumber, context.expectedBranch);
    if (!verified?.merged || verified.prNumber !== context.prNumber || verified.headBranch !== context.expectedBranch) return fail(phase, new Error('PR not merged or head mismatch'));
    phase = 'clean-worktree'; if (!(await ops.isWorktreeClean(context.worktreePath))) return fail(phase, new Error('dirty worktree'), true);
    phase = 'sync-main'; await ops.syncMain(); phase = 'remove-worktree'; await ops.removeWorktree(context.worktreePath); phase = 'prune-worktrees'; await ops.pruneWorktrees();
    phase = 'attached-branch'; if (await ops.isLocalBranchAttached(context.expectedBranch)) return fail(phase, new Error('branch still attached'), true);
    phase = 'delete-local-branch'; await ops.deleteLocalBranch(context.expectedBranch); phase = 'remote-exists'; const exists = await ops.remoteBranchExists(context.expectedBranch);
    if (exists) { phase = 'delete-remote-branch'; await ops.deleteRemoteBranch(context.expectedBranch); }
    phase = 'verify-remote-absent'; await ops.verifyRemoteBranchAbsent(context.expectedBranch);
    return { merged: true, verifiedPullRequest: verified, cleanup: 'complete', localBranchRemoved: true, remoteBranchRemoved: !!exists, remoteBranchAlreadyAbsent: !exists, terminal: 'merged' };
  } catch (error) { return fail(phase, error, Boolean(verified?.merged)); }
}
