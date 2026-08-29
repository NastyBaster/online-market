import { spawn } from 'node:child_process';
import { createBridgeComposition, readOnlyIdentityProof } from './composition.mjs';

const run = (executable, args, { cwd = process.cwd() } = {}) => new Promise((resolve, reject) => {
  const child = spawn(executable, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (exitCode) => resolve({ exitCode, stdout, stderr: stderr.replaceAll(/token|authorization/gi, '[redacted]') }));
});

const composition = createBridgeComposition({ commandRunner: run });
const proof = await readOnlyIdentityProof(composition);
console.log(JSON.stringify({ command: 'identity-proof', ...proof }));
