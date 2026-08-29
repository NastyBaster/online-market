const integer = (value) => Number.isSafeInteger(value) && value > 0;
const executableName = (value) => String(value || '').replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() || '';
const normalizedPath = (value) => String(value || '').replaceAll('\\', '/').replace(/^['"]|['"]$/g, '').toLowerCase();
const nodeExecutables = new Set(['node', 'node.exe']);
const npmExecutables = new Set(['npm', 'npm.cmd', 'npm.exe']);
const shellExecutables = new Set(['cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe']);

export function parseWindowsCommandLine(value) {
  if (typeof value !== 'string') return { args: [], malformed: true };
  const args = []; let arg = ''; let quoted = false; let wasQuoted = false; let slashCount = 0;
  const push = () => { if (arg.length || wasQuoted) args.push(arg); arg = ''; wasQuoted = false; };
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '\\') { slashCount += 1; continue; }
    if (character === '"') {
      arg += '\\'.repeat(Math.floor(slashCount / 2));
      if (slashCount % 2) arg += '"'; else { quoted = !quoted; wasQuoted = true; }
      slashCount = 0; continue;
    }
    if (slashCount) { arg += '\\'.repeat(slashCount); slashCount = 0; }
    if (!quoted && /\s/.test(character)) { push(); continue; }
    arg += character;
  }
  if (slashCount) arg += '\\'.repeat(slashCount);
  if (quoted) return { args, malformed: true };
  push(); return { args, malformed: false };
}

export function normalizeProcessSnapshot(value, { platform = process.platform } = {}) {
  const entries = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : null;
  if (!entries) throw new Error('process snapshot must be an array');
  return entries.map((entry) => {
    const pid = entry?.pid ?? entry?.ProcessId; const ppid = entry?.ppid ?? entry?.ParentProcessId;
    const name = entry?.name ?? entry?.Name; const command = entry?.command ?? entry?.CommandLine;
    const startTime = entry?.startTime ?? entry?.CreationDate;
    if (!entry || !integer(Number(pid)) || (ppid !== undefined && ppid !== null && !integer(Number(ppid))) || typeof name !== 'string' || typeof command !== 'string') throw new Error('malformed process snapshot');
    const parsed = parseWindowsCommandLine(command);
    return { pid: Number(pid), ppid: ppid == null ? null : Number(ppid), name, command, startTime: startTime == null ? null : String(startTime), executable: executableName(name), parsedArgs: parsed.args, parseMalformed: parsed.malformed, platform };
  });
}

const sameIdentity = (process, record) => Number(record?.pid) === process.pid && (record?.startTime == null || record.startTime === process.startTime);
const exactCliPath = (value) => { const path = normalizedPath(value); return path === 'scripts/agent-bridge/cli.mjs' || path.endsWith('/scripts/agent-bridge/cli.mjs'); };
const npmCliPath = (value) => /(?:^|\/)node_modules\/npm\/bin\/npm-cli\.js$/.test(normalizedPath(value));
const nodeArgs = (process) => {
  const args = [...process.parsedArgs];
  if (args.length && nodeExecutables.has(executableName(args[0]))) args.shift();
  const valueOptions = new Set(['-r', '--require', '--loader', '--import', '--eval', '-e', '--inspect', '--inspect-brk', '--title']);
  while (args.length && args[0].startsWith('-')) { const option = args.shift(); if (valueOptions.has(option) && args.length) args.shift(); }
  return args;
};
const npmArgs = (process) => { const args = [...process.parsedArgs]; if (args.length && npmExecutables.has(executableName(args[0]))) args.shift(); return args; };
const npmWatch = (args) => args.length >= 2 && args[0].toLowerCase() === 'run' && args[1] === 'bridge:watch';
const npmBridge = (args) => args.length >= 2 && args[0].toLowerCase() === 'run' && ['bridge:batch', 'bridge:once', 'bridge:watch'].includes(args[1]);
const nodeCommand = (process) => {
  if (!nodeExecutables.has(process.executable) || process.parseMalformed) return { kind: null };
  const args = nodeArgs(process); const script = args[0];
  if (exactCliPath(script)) {
    const command = args[1];
    if (command === 'watch' && args.length >= 2) return { kind: 'watch' };
    if (['batch', 'once', 'doctor'].includes(command)) return { kind: 'bridge' };
    return { kind: 'bridge-like' };
  }
  if (script && npmCliPath(script) && npmWatch(args.slice(1))) return { kind: 'watch' };
  return { kind: null };
};
const shellPayload = (process) => {
  let args = [...process.parsedArgs]; if (args.length && shellExecutables.has(executableName(args[0]))) args.shift();
  const commandIndex = args.findIndex((arg) => ['/c', '-c', '-command'].includes(String(arg).toLowerCase()));
  if (commandIndex < 0) return null;
  const payload = args.slice(commandIndex + 1); if (!payload.length) return null;
  const nested = payload.length === 1 ? parseWindowsCommandLine(payload[0]) : { args: payload, malformed: false };
  return nested.malformed ? null : nested.args;
};
const commandIdentity = (process) => {
  if (process.parseMalformed) return { kind: 'ambiguous' };
  if (npmExecutables.has(process.executable)) { const args = npmArgs(process); if (npmWatch(args)) return { kind: 'watch' }; if (npmBridge(args)) return { kind: 'bridge' }; }
  const node = nodeCommand(process); if (node.kind) return node;
  if (shellExecutables.has(process.executable)) {
    const payload = shellPayload(process); if (!payload) return process.parsedArgs.some((arg) => ['/c', '-c', '-command'].includes(String(arg).toLowerCase())) ? { kind: 'ambiguous' } : { kind: null };
    const npmPayload = npmExecutables.has(executableName(payload[0])) ? payload.slice(1) : payload;
    if (npmWatch(npmPayload)) return { kind: 'watch' }; if (npmBridge(npmPayload)) return { kind: 'bridge' };
    if (payload.some((arg) => arg.toLowerCase().includes('bridge:'))) return { kind: 'ambiguous' };
  }
  return { kind: null };
};
export function classifyBridgeCommand(processRecord) { return commandIdentity({ ...processRecord, executable: processRecord.executable || executableName(processRecord.name), parsedArgs: processRecord.parsedArgs || parseWindowsCommandLine(processRecord.command).args, parseMalformed: processRecord.parseMalformed ?? parseWindowsCommandLine(processRecord.command).malformed }); }

const blockingCategories = new Set(['tracked_task_child', 'bridge_watch', 'ambiguous_bridge_process']);
const safeRecord = ({ pid, ppid, category, relation, identityMatch, reason }) => ({ pid, parentPid: ppid, category, relation, identityMatch, reason });

export function classifyBridgeProcesses(snapshot, context = {}) {
  const processes = normalizeProcessSnapshot(snapshot, context); const current = context.currentProcess || { pid: context.currentPid };
  const launchers = Array.isArray(context.launchers) ? context.launchers : []; const tracked = Array.isArray(context.trackedChildren) ? context.trackedChildren : [];
  const watcherRecords = Array.isArray(context.watcherRecords) ? context.watcherRecords : [];
  const ancestorPids = new Set(); let ancestor = processes.find((entry) => entry.pid === Number(current.pid))?.ppid;
  while (ancestor) { ancestorPids.add(ancestor); ancestor = processes.find((entry) => entry.pid === ancestor)?.ppid; }
  const classified = processes.map((process) => {
    const identityMatch = current.startTime != null && process.pid === Number(current.pid) ? process.startTime === current.startTime : null;
    if (process.pid === Number(current.pid)) return safeRecord({ ...process, category: identityMatch === false ? 'stale_pid_record' : 'current_batch', relation: 'current-run', identityMatch, reason: identityMatch === false ? 'current PID identity mismatch' : 'current batch process' });
    const launcher = launchers.find((record) => sameIdentity(process, record)) || (ancestorPids.has(process.pid) && ['npm', 'npm.cmd', 'node', 'node.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe', 'cmd', 'cmd.exe'].includes(process.executable) && commandIdentity(process).kind === 'bridge' ? process : null);
    if (launcher) return safeRecord({ ...process, category: 'verified_launcher', relation: `parent-of-${current.pid}`, identityMatch: true, reason: 'verified current batch launcher' });
    const trackedChild = tracked.find((record) => Number(record.pid) === process.pid);
    if (trackedChild) {
      const matches = sameIdentity(process, trackedChild) && (!trackedChild.commandIdentity || process.command.includes(trackedChild.commandIdentity));
      return safeRecord({ ...process, category: matches ? 'tracked_task_child' : 'stale_pid_record', relation: 'tracked-record', identityMatch: sameIdentity(process, trackedChild), reason: matches ? 'tracked task child detected' : 'tracked PID identity mismatch' });
    }
    const watcherRecord = watcherRecords.find((record) => Number(record.pid) === process.pid);
    if (watcherRecord) { const matches = sameIdentity(process, watcherRecord); return safeRecord({ ...process, category: matches ? 'bridge_watch' : 'stale_pid_record', relation: 'watcher-record', identityMatch: matches, reason: matches ? 'exact Bridge watch entrypoint detected' : 'watcher PID identity mismatch' }); }
    const identity = commandIdentity(process);
    if (identity.kind === 'watch') return safeRecord({ ...process, category: 'bridge_watch', relation: 'untracked', identityMatch: null, reason: 'exact Bridge watch entrypoint detected' });
    if (identity.kind === 'bridge' || identity.kind === 'bridge-like' || identity.kind === 'ambiguous') return safeRecord({ ...process, category: 'ambiguous_bridge_process', relation: 'untracked', identityMatch: null, reason: 'Bridge-like process identity could not be verified' });
    return safeRecord({ ...process, category: 'unrelated_process', relation: 'untracked', identityMatch: null, reason: 'unrelated process' });
  });
  const blocking = classified.filter((entry) => blockingCategories.has(entry.category));
  return { pass: blocking.length === 0, processes: classified, blocking };
}

export function sanitizedProcessHealth(result) { return { pass: Boolean(result?.pass), blocking: Array.isArray(result?.blocking) ? result.blocking : [], processes: Array.isArray(result?.processes) ? result.processes : [] }; }
