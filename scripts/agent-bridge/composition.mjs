import { acquireLock } from './core.mjs';
import { registerChild, updateChild, archiveAndRemoveChild } from './ownership.mjs';
import { getProcessIdentity } from './process-identity.mjs';

export function createBridgeComposition({ commandRunner, platform = process.platform, now = () => Date.now() } = {}) {
  if (typeof commandRunner !== 'function') throw new TypeError('bridge command runner is required at composition time');
  if (platform !== 'win32' && platform !== 'linux') throw new Error('process identity platform is unsupported');
  const processIdentity = (pid, options = {}) => getProcessIdentity(pid, { ...options, platform, run: commandRunner, now });
  return {
    commandRunner,
    platform,
    processIdentity,
    acquireLock: (root, options = {}) => acquireLock(root, { ...options, now, processIdentity }),
    registerChild,
    updateChild,
    archiveAndRemoveChild
  };
}

export async function readOnlyIdentityProof(composition, { pid = process.pid } = {}) {
  if (!composition?.processIdentity) throw new TypeError('bridge process identity provider is required');
  const first = await composition.processIdentity(pid);
  const second = await composition.processIdentity(pid);
  if (first.status !== 'present' || second.status !== 'present' || first.identity.startIdentity !== second.identity.startIdentity) throw new Error('process identity is not stable');
  return { status: 'pass', platform: composition.platform, stable: true };
}
