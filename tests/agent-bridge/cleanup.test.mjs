import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
