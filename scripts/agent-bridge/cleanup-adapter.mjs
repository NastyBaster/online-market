import { validTaskBranch } from './cleanup.mjs';

const safeError = (message) => new Error(String(message).replace(/(?:gh[pousr]_|github_pat_)[A-Za-z0-9_-]+/gi, '[redacted]'));

function validPrNumber(value) { return Number.isSafeInteger(value) && value > 0; }

async function command(commandRunner, executable, args, options) {
  const result = await commandRunner(executable, args, options);
  if (!result || result.exitCode !== 0) throw safeError(`${executable} command failed`);
  return String(result.stdout ?? '');
}

function parseWorktreePorcelain(output) {
  if (!output || !output.endsWith('\n')) throw safeError('malformed git worktree porcelain output');
  const records = output.split('\n\n').filter(Boolean);
  if (!records.length) throw safeError('malformed git worktree porcelain output');
  return records.map((record) => {
    const lines = record.split('\n');
    if (!lines[0].startsWith('worktree ') || lines.length < 2 || !lines[1].startsWith('HEAD ')) throw safeError('malformed git worktree porcelain record');
    const parsed = { branch: null };
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (parsed.worktree) throw safeError('malformed git worktree porcelain record');
        parsed.worktree = line.slice('worktree '.length);
      } else if (line.startsWith('HEAD ')) {
        if (parsed.head) throw safeError('malformed git worktree porcelain record');
        parsed.head = line.slice('HEAD '.length);
      } else if (line.startsWith('branch ')) {
        if (parsed.branch !== null) throw safeError('malformed git worktree porcelain record');
        parsed.branch = line.slice('branch '.length);
      } else if (line === 'detached' || line === 'bare' || line === 'locked' || line.startsWith('locked ') || line === 'prunable' || line.startsWith('prunable ')) {
        // Known porcelain metadata does not affect branch attachment.
      } else throw safeError('malformed git worktree porcelain record');
    }
    if (!parsed.worktree || !parsed.head) throw safeError('malformed git worktree porcelain record');
    return parsed;
  });
}

function parseRemoteRef(output, exactRef) {
  if (output === '') return false;
  const lines = output.split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw safeError('malformed remote ref probe output');
  const match = lines[0].match(/^([0-9a-f]{40,64})\t(refs\/heads\/[^\s]+)$/i);
  if (!match || match[2] !== exactRef) throw safeError('unexpected remote ref probe output');
  return true;
}

export function createCleanupOperations({ commandRunner, repository, expectedBranch, worktreePath, prNumber, defaultBase = 'main' }) {
  if (typeof commandRunner !== 'function') throw new TypeError('commandRunner is required');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new TypeError('repository must be an owner/name value');
  if (!validTaskBranch(expectedBranch, Number(expectedBranch?.match(/^agent\/(\d+)-/)?.[1]))) throw new TypeError('unsafe task branch');
  if (!validPrNumber(prNumber)) throw new TypeError('prNumber must be a positive integer');
  const exactRef = `refs/heads/${expectedBranch}`;
  const root = { cwd: undefined };
  return {
    verifyMergedPullRequest: async () => {
      const output = await command(commandRunner, 'gh', ['pr', 'view', String(prNumber), '--repo', repository, '--json', 'number,state,headRefName,baseRefName,mergeCommit,mergedAt,url'], root);
      let pr;
      try { pr = JSON.parse(output); } catch { throw safeError('malformed pull request JSON'); }
      const mergeCommit = typeof pr?.mergeCommit?.oid === 'string' ? pr.mergeCommit.oid : null;
      if (pr?.number !== prNumber || pr?.state !== 'MERGED' || pr?.headRefName !== expectedBranch || pr?.baseRefName !== defaultBase || (!mergeCommit && !pr?.mergedAt)) throw safeError('pull request merge verification failed');
      return { merged: true, prNumber, headBranch: pr.headRefName, baseBranch: pr.baseRefName, mergeCommit, mergedAt: pr.mergedAt || null, url: typeof pr.url === 'string' ? pr.url : null };
    },
    isWorktreeClean: async () => !(await command(commandRunner, 'git', ['status', '--short', '--untracked-files=all'], { cwd: worktreePath })).trim(),
    syncMain: async () => command(commandRunner, 'git', ['pull', '--ff-only', 'origin', defaultBase], root),
    removeWorktree: async () => command(commandRunner, 'git', ['worktree', 'remove', worktreePath], root),
    pruneWorktrees: async () => command(commandRunner, 'git', ['worktree', 'prune'], root),
    isLocalBranchAttached: async () => parseWorktreePorcelain(await command(commandRunner, 'git', ['worktree', 'list', '--porcelain'], root)).some((record) => record.branch === exactRef),
    deleteLocalBranch: async () => command(commandRunner, 'git', ['branch', '-d', expectedBranch], root),
    remoteBranchExists: async () => parseRemoteRef(await command(commandRunner, 'git', ['ls-remote', '--heads', 'origin', exactRef], root), exactRef),
    deleteRemoteBranch: async () => command(commandRunner, 'git', ['push', 'origin', '--delete', expectedBranch], root),
    verifyRemoteBranchAbsent: async () => {
      if (await parseRemoteRef(await command(commandRunner, 'git', ['ls-remote', '--heads', 'origin', exactRef], root), exactRef)) throw safeError('remote branch still exists after deletion');
      return true;
    },
  };
}

export { parseRemoteRef, parseWorktreePorcelain, validPrNumber };
