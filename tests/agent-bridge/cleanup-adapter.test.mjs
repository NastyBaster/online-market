import test from 'node:test';
import assert from 'node:assert/strict';
import { createCleanupOperations } from '../../scripts/agent-bridge/cleanup-adapter.mjs';
import { cleanupMergedTask } from '../../scripts/agent-bridge/cleanup.mjs';

const branch = 'agent/36-parent-owned-cleanup';
const ref = `refs/heads/${branch}`;
const merged = JSON.stringify({ number: 37, state: 'MERGED', headRefName: branch, baseRefName: 'main', mergeCommit: { oid: 'a'.repeat(40) }, mergedAt: '2026-08-29T00:00:00Z', url: 'https://example.test/pr/37' });
const worktrees = `worktree C:/repo\nHEAD ${'b'.repeat(40)}\nbranch refs/heads/main\n\n`;

function runner(responses = []) {
  const calls = [];
  return {
    calls,
    run: async (executable, args, options = {}) => {
      calls.push({ executable, args, cwd: options.cwd });
      const response = responses.shift();
      if (!response) throw new Error('unexpected command');
      if (response.throw) throw response.throw;
      return { exitCode: response.exitCode ?? 0, stdout: response.stdout ?? '', stderr: response.stderr ?? '' };
    },
  };
}
function operations(responses) { const fake = runner(responses); return { fake, ops: createCleanupOperations({ commandRunner: fake.run, repository: 'owner/repo', expectedBranch: branch, worktreePath: 'C:/worktree', prNumber: 37 }) }; }

test('production adapter verifies only the exact merged pull request', async () => {
  const good = operations([{ stdout: merged }]);
  assert.equal((await good.ops.verifyMergedPullRequest()).mergeCommit, 'a'.repeat(40));
  assert.deepEqual(good.fake.calls[0], { executable: 'gh', args: ['pr', 'view', '37', '--repo', 'owner/repo', '--json', 'number,state,headRefName,baseRefName,mergeCommit,mergedAt,url'], cwd: undefined });
  for (const payload of [JSON.stringify({ ...JSON.parse(merged), state: 'OPEN' }), JSON.stringify({ ...JSON.parse(merged), state: 'CLOSED', mergedAt: null, mergeCommit: null }), JSON.stringify({ ...JSON.parse(merged), number: 38 }), JSON.stringify({ ...JSON.parse(merged), headRefName: 'agent/36-other' }), JSON.stringify({ ...JSON.parse(merged), baseRefName: 'develop' }), JSON.stringify({ ...JSON.parse(merged), mergeCommit: null, mergedAt: null }), '{bad']) {
    const current = operations([{ stdout: payload }]); await assert.rejects(current.ops.verifyMergedPullRequest());
  }
  const failed = operations([{ exitCode: 1, stderr: 'failure' }]); await assert.rejects(failed.ops.verifyMergedPullRequest());
  assert.throws(() => createCleanupOperations({ commandRunner: async () => ({}), repository: 'owner/repo', expectedBranch: branch, worktreePath: 'wt', prNumber: 0 }));
  assert.throws(() => createCleanupOperations({ commandRunner: async () => ({}), repository: 'owner/repo', expectedBranch: 'main', worktreePath: 'wt', prNumber: 37 }));
});

test('worktree porcelain probe exactly detects attachment and fails closed', async () => {
  const attached = `worktree C:/repo\nHEAD ${'a'.repeat(40)}\nbranch ${ref}\n\n`;
  for (const [stdout, expected] of [[attached, true], [`worktree C:/repo\nHEAD ${'a'.repeat(40)}\nbranch refs/heads/${branch}-similar\n\n`, false], [worktrees, false], [`worktree C:/repo\nHEAD ${'a'.repeat(40)}\ndetached\n\nworktree C:/other\nHEAD ${'b'.repeat(40)}\nbranch ${ref}\n\n`, true]]) {
    const current = operations([{ stdout }]); assert.equal(await current.ops.isLocalBranchAttached(), expected);
  }
  for (const response of [{ stdout: 'worktree C:/repo\nbranch ' + ref + '\n\n' }, { exitCode: 1 }]) { const current = operations([response]); await assert.rejects(current.ops.isLocalBranchAttached()); }
});

test('remote ref probe uses an exact ref and rejects ambiguous output', async () => {
  const exists = operations([{ stdout: `${'c'.repeat(40)}\t${ref}\n` }]); assert.equal(await exists.ops.remoteBranchExists(), true);
  assert.deepEqual(exists.fake.calls[0].args, ['ls-remote', '--heads', 'origin', ref]);
  const absent = operations([{ stdout: '' }]); assert.equal(await absent.ops.remoteBranchExists(), false);
  for (const response of [{ stdout: `${'c'.repeat(40)}\trefs/heads/${branch}-other\n` }, { stdout: 'nonsense\n' }, { exitCode: 1 }]) { const current = operations([response]); await assert.rejects(current.ops.remoteBranchExists()); }
});

test('production adapter cleanup performs verified read-back in order without real commands', async () => {
  const current = operations([{ stdout: merged }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: worktrees }, { stdout: '' }, { stdout: `${'d'.repeat(40)}\t${ref}\n` }, { stdout: '' }, { stdout: '' }]);
  const result = await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, current.ops);
  assert.equal(result.cleanup, 'complete'); assert.equal(result.merged, true); assert.equal(result.terminal, 'merged');
  assert.equal(current.fake.calls.flatMap((entry) => entry.args).some((argument) => ['--force', '--admin', '--bypass'].includes(argument)), false);
  assert.deepEqual(current.fake.calls.map((entry) => entry.args), [
    ['pr', 'view', '37', '--repo', 'owner/repo', '--json', 'number,state,headRefName,baseRefName,mergeCommit,mergedAt,url'], ['status', '--short', '--untracked-files=all'], ['pull', '--ff-only', 'origin', 'main'], ['worktree', 'remove', 'C:/worktree'], ['worktree', 'prune'], ['worktree', 'list', '--porcelain'], ['branch', '-d', branch], ['ls-remote', '--heads', 'origin', ref], ['push', 'origin', '--delete', branch], ['ls-remote', '--heads', 'origin', ref],
  ]);
});

test('cleanup blocks mutations before verification and when branch remains attached', async () => {
  const badPr = operations([{ stdout: JSON.stringify({ ...JSON.parse(merged), state: 'OPEN' }) }]);
  const failed = await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, badPr.ops);
  assert.equal(failed.merged, false); assert.equal(failed.phase, 'verify-merge'); assert.equal(badPr.fake.calls.length, 1);
  const attached = `worktree C:/repo\nHEAD ${'a'.repeat(40)}\nbranch ${ref}\n\n`;
  const current = operations([{ stdout: merged }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: attached }]);
  const blocked = await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, current.ops);
  assert.equal(blocked.merged, true); assert.equal(blocked.phase, 'attached-branch'); assert.equal(current.fake.calls.some((entry) => entry.args.includes('--delete')), false);
});

test('remote delete is idempotent only after verified merge and read-back absence', async () => {
  const absent = operations([{ stdout: merged }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: worktrees }, { stdout: '' }, { stdout: '' }, { stdout: '' }]);
  const absentResult = await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, absent.ops);
  assert.equal(absentResult.remoteBranchAlreadyAbsent, true); assert.equal(absent.fake.calls.some((entry) => entry.args.includes('--delete')), false);
  const stillThere = operations([{ stdout: merged }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: worktrees }, { stdout: '' }, { stdout: `${'e'.repeat(40)}\t${ref}\n` }, { stdout: '' }, { stdout: `${'e'.repeat(40)}\t${ref}\n` }]);
  const blocked = await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, stillThere.ops);
  assert.equal(blocked.merged, true); assert.equal(blocked.phase, 'verify-remote-absent');
  const deleteError = operations([{ stdout: merged }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: '' }, { stdout: worktrees }, { stdout: '' }, { stdout: `${'e'.repeat(40)}\t${ref}\n` }, { exitCode: 1 }]);
  assert.equal((await cleanupMergedTask({ issueNumber: 36, prNumber: 37, expectedBranch: branch, worktreePath: 'C:/worktree' }, deleteError.ops)).phase, 'delete-remote-branch');
});
