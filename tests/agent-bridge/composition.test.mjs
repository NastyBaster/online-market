import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBridgeComposition, readOnlyIdentityProof } from '../../scripts/agent-bridge/composition.mjs';

const windowsIdentity = JSON.stringify([{ ProcessId: 42, Name: 'node.exe', CreationDate: '20260829120000.000000+000' }]);

test('production composition wires one runner into owner lease and exact identity proof', async () => {
  const calls = [];
  const composition = createBridgeComposition({ platform: 'win32', commandRunner: async (executable, args) => { calls.push({ executable, args }); return { exitCode: 0, stdout: windowsIdentity, stderr: '' }; } });
  const proof = await readOnlyIdentityProof(composition, { pid: 42 });
  assert.deepEqual(proof, { status: 'pass', platform: 'win32', stable: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].executable, 'powershell.exe');
  assert.match(calls[0].args.at(-1), /ProcessId = 42/);
  const root = await mkdtemp(path.join(os.tmpdir(), 'bridge-composition-'));
  try {
    const owner = await composition.acquireLock(root, { mode: 'once', runId: 'proof', ownerPid: 42 });
    assert.equal((await composition.processIdentity(42)).identity.startIdentity, '20260829120000.000000+000');
    await owner.release();
  } finally { await rm(root, { recursive: true, force: true }); }
  assert.ok(calls.length >= 3);
});

test('composition fails before lifecycle when runner is missing or platform is unsupported', () => {
  assert.throws(() => createBridgeComposition({ platform: 'win32' }), /command runner is required at composition time/);
  assert.throws(() => createBridgeComposition({ platform: 'darwin', commandRunner: async () => ({}) }), /platform is unsupported/);
});

test('composition import has no command side effects', async () => {
  assert.equal(typeof createBridgeComposition, 'function');
});

test('once, batch and watch lease modes use the composed identity provider', async () => {
  const composition = createBridgeComposition({ platform: 'win32', commandRunner: async () => ({ exitCode: 0, stdout: windowsIdentity, stderr: '' }) });
  const root = await mkdtemp(path.join(os.tmpdir(), 'bridge-composition-modes-'));
  try {
    for (const mode of ['once', 'batch', 'watch']) {
      const owner = await composition.acquireLock(root, { mode, runId: mode, ownerPid: 42 });
      assert.equal(owner.ownerPlatform, 'win32');
      await owner.release();
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
