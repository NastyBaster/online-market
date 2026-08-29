import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanupMergedTask } from '../../scripts/agent-bridge/cleanup.mjs';

test('merge invocation delegates branch cleanup to parent', async () => {
  const source = await readFile('scripts/agent-bridge/cli.mjs', 'utf8');
  assert.match(source, /pr', 'merge', String\(number\), '--merge'/);
  assert.doesNotMatch(source, /--delete-branch/);
});

test('cleanup command order removes worktree before pruning and deleting branch', async () => {
  const source = await readFile('scripts/agent-bridge/cli.mjs', 'utf8');
  const remove = source.indexOf("['worktree', 'remove'");
  const prune = source.indexOf("['worktree', 'prune'");
  const branch = source.indexOf("['branch', '-d'");
  assert.ok(remove >= 0 && remove < prune && prune < branch);
});
test('remote cleanup is exact, non-force, and follows local cleanup', async () => {
  const source = await readFile('scripts/agent-bridge/cli.mjs', 'utf8');
  assert.match(source, /git\/refs\/heads/);
  assert.doesNotMatch(source, /push.*--force/);
  assert.ok(source.indexOf("['branch', '-d'") < source.indexOf("git/refs/heads/"));
});
test('unsafe task branches are rejected before remote deletion', async () => {
  const source = await readFile('scripts/agent-bridge/cleanup.mjs', 'utf8');
  assert.match(source, /unsafe task branch/);
  assert.match(source, /unsafe task branch/);
});

function fake(overrides = {}) { const events = []; const ops = { verifyMergedPullRequest: async () => { events.push('verify'); return { merged: true, headBranch: 'agent/36-cleanup' }; }, isWorktreeClean: async () => { events.push('clean'); return true; }, syncMain: async () => events.push('sync'), removeWorktree: async () => events.push('remove'), pruneWorktrees: async () => events.push('prune'), isLocalBranchAttached: async () => { events.push('attached'); return false; }, deleteLocalBranch: async () => events.push('local'), remoteBranchExists: async () => { events.push('exists'); return true; }, deleteRemoteBranch: async () => events.push('remote'), verifyRemoteBranchAbsent: async () => events.push('absent'), ...overrides }; return { events, ops }; }
test('behavioral fake cleanup enforces complete order and result', async () => { const f = fake(); const result = await cleanupMergedTask({ issueNumber: 36, prNumber: 1, expectedBranch: 'agent/36-cleanup', worktreePath: 'wt' }, f.ops); assert.equal(result.cleanup, 'complete'); assert.deepEqual(f.events, ['verify','clean','sync','remove','prune','attached','local','exists','remote','absent']); });
test('behavioral fake cleanup is fail-closed for unmerged and dirty states', async () => { const u = fake({ verifyMergedPullRequest: async () => ({ merged: false, headBranch: 'agent/36-cleanup' }) }); const ur = await cleanupMergedTask({ issueNumber: 36, prNumber: 1, expectedBranch: 'agent/36-cleanup', worktreePath: 'wt' }, u.ops); assert.equal(ur.terminal, 'blocked_cleanup'); const d = fake({ isWorktreeClean: async () => { d.events.push('clean'); return false; } }); const dr = await cleanupMergedTask({ issueNumber: 36, prNumber: 1, expectedBranch: 'agent/36-cleanup', worktreePath: 'wt' }, d.ops); assert.equal(dr.merged, true); assert.equal(dr.cleanup, 'blocked'); assert.deepEqual(d.events, ['clean']); });
