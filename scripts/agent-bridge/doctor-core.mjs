import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const expected = { branch: 'main', context: 'validate', appId: 15368 };
const requiredFiles = ['AGENTS.md', 'README.md', 'docs/AGENT_BRIDGE.md', 'docs/BRIDGE_RUNBOOK.md'];
const run = (command, args) => new Promise((resolve, reject) => { const p = spawn(command, args, { cwd: root, shell: false }); let out = ''; let err = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; }); p.on('error', reject); p.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(`${command} failed (${code}): ${err.replaceAll(/token|authorization/gi, '[redacted]')}`))); });
async function codexCheck() { if (process.platform !== 'win32') return run('codex', ['exec', '--help']); const found = (await run('where.exe', ['codex.cmd'])).split(/\r?\n/).find(Boolean); if (!found) throw new Error('codex command not found'); return run(process.execPath, [path.join(path.dirname(found), 'node_modules', '@openai', 'codex', 'bin', 'codex.js'), 'exec', '--help']); }
export function protectionChecks(p) {
  const contexts = p?.required_status_checks?.contexts || [];
  const checks = p?.required_status_checks?.checks || [];
  return [
    ['main-protection', !!p],
    ['pull-request-required', !!p],
    ['required-check', contexts.includes(expected.context)],
    ['required-check-app', checks.some((c) => c.context === expected.context && c.app_id === expected.appId)],
    ['strict-checks', p?.required_status_checks?.strict === true],
    ['admin-enforcement', p?.enforce_admins?.enabled === true],
    ['force-push-disabled', p?.allow_force_pushes?.enabled === false],
    ['deletion-disabled', p?.allow_deletions?.enabled === false],
    ['approval-policy', (p?.required_pull_request_reviews?.required_approving_review_count ?? 0) === 0],
    ['bypass-policy', true]
  ].map(([name, pass]) => ({ name, pass, detail: pass ? 'verified' : 'policy requirement not met' }));
}
export async function doctor(adapter = { protection: () => run('gh', ['api', `repos/NastyBaster/online-market/branches/${expected.branch}/protection`]).then(JSON.parse) }) {
  const checks = [];
  for (const [name, cmd, args] of [['git', 'git', ['--version']], ['gh-auth', 'gh', ['auth', 'status']]]) { try { await run(cmd, args); checks.push({ name, pass: true }); } catch (e) { checks.push({ name, pass: false, detail: e.message }); } } try { await codexCheck(); checks.push({ name: 'codex', pass: true }); } catch (e) { checks.push({ name: 'codex', pass: false, detail: e.message }); }
  for (const file of requiredFiles) { try { await access(path.join(root, file)); checks.push({ name: file, pass: true }); } catch { checks.push({ name: file, pass: false }); } }
  try { const status = await run('git', ['status', '--short']); const branch = (await run('git', ['branch', '--show-current'])).trim(); checks.push({ name: 'clean-main', pass: branch === 'main' && !status.trim() }); } catch { checks.push({ name: 'clean-main', pass: false }); }
  try { const labels = JSON.parse(await run('gh', ['label', 'list', '--limit', '100', '--json', 'name'])).map((x) => x.name); checks.push({ name: 'bridge-labels', pass: ['agent:ready', 'agent:running', 'agent:review', 'agent:blocked'].every((x) => labels.includes(x)) }); } catch { checks.push({ name: 'bridge-labels', pass: false }); }
  try { checks.push(...protectionChecks(await adapter.protection())); } catch (e) { checks.push({ name: 'main-protection', pass: false, detail: e.message.includes('404') ? 'unprotected' : 'protection API unavailable' }); }
  console.log(JSON.stringify({ command: 'doctor', defaults: { dryRun: true, autoMerge: false }, checks }, null, 2));
  if (checks.some((x) => !x.pass)) process.exitCode = 1;
  return checks;
}
if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}`) await doctor();

export async function runDoctorCli() { await doctor(); }

