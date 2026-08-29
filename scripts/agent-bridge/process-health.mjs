const integer = (value) => Number.isSafeInteger(value) && value > 0;

export function normalizeProcessSnapshot(value) {
  const entries = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : null;
  if (!entries) throw new Error('process snapshot must be an array');
  return entries.map((entry) => {
    const pid = entry?.pid ?? entry?.ProcessId; const ppid = entry?.ppid ?? entry?.ParentProcessId; const name = entry?.name ?? entry?.Name; const command = entry?.command ?? entry?.CommandLine; const startTime = entry?.startTime ?? entry?.CreationDate;
    if (!entry || !integer(Number(pid)) || (ppid !== undefined && ppid !== null && !integer(Number(ppid))) || typeof name !== 'string' || typeof command !== 'string') throw new Error('malformed process snapshot');
    return { pid: Number(pid), ppid: ppid == null ? null : Number(ppid), name, command, startTime: startTime == null ? null : String(startTime) };
  });
}

const sameIdentity = (process, record) => Number(record?.pid) === process.pid && (record?.startTime == null || record.startTime === process.startTime);
const commandShape = (command) => String(command || '').toLowerCase().replace(/\s+/g, ' ').trim();
const isWatcher = (command) => /(?:^|\s)(?:bridge:watch|cli\.mjs\s+watch)(?:\s|$)/i.test(command);
const isBridgeCommand = (command) => /(?:^|\s)(?:bridge:(?:once|watch|batch)|cli\.mjs\s+(?:once|watch|batch))(?:\s|$)/i.test(command);

export function classifyBridgeProcesses(snapshot, context = {}) {
  const processes = normalizeProcessSnapshot(snapshot);
  const current = context.currentProcess || { pid: context.currentPid };
  const launchers = Array.isArray(context.launchers) ? context.launchers : [];
  const tracked = Array.isArray(context.trackedChildren) ? context.trackedChildren : [];
  const ancestorPids = new Set(); let ancestor = processes.find((entry) => entry.pid === Number(current.pid))?.ppid;
  while (ancestor) { ancestorPids.add(ancestor); ancestor = processes.find((entry) => entry.pid === ancestor)?.ppid; }
  const classified = processes.map((process) => {
    if (Number(current.pid) === process.pid) return { ...process, category: current.startTime != null && process.startTime !== current.startTime ? 'stale_pid_record' : 'current_batch', relation: 'current-run' };
    const launcher = launchers.find((record) => sameIdentity(process, record)) || (ancestorPids.has(process.pid) && /^(?:npm|npm\.cmd|node|powershell|cmd)(?:\.exe|\.cmd)?$/i.test(process.name) && /(?:^|\s)bridge:batch(?:\s|$)|cli\.mjs\s+batch/i.test(process.command) ? process : null);
    if (launcher) return { ...process, category: 'verified_launcher', relation: `parent-of-${current.pid}` };
    const child = tracked.find((record) => Number(record.pid) === process.pid);
    if (child) return { ...process, category: sameIdentity(process, child) && (!child.commandIdentity || commandShape(process.command).includes(commandShape(child.commandIdentity))) ? 'tracked_task_child' : 'stale_pid_record', relation: 'tracked-record' };
    if (isWatcher(process.command)) return { ...process, category: 'bridge_watch', relation: 'untracked' };
    if (isBridgeCommand(process.command)) return { ...process, category: 'ambiguous_bridge_process', relation: 'untracked' };
    return { ...process, category: 'unrelated_process', relation: 'untracked' };
  });
  const blocking = classified.filter((entry) => ['tracked_task_child', 'bridge_watch', 'ambiguous_bridge_process'].includes(entry.category));
  return { pass: blocking.length === 0, processes: classified.map(({ pid, ppid, name, startTime, category, relation }) => ({ pid, ppid, name, startTime, category, relation })), blocking: blocking.map(({ pid, ppid, category, relation }) => ({ pid, ppid, category, relation })) };
}

export function sanitizedProcessHealth(result) {
  return { pass: Boolean(result?.pass), blocking: result?.blocking || [], processes: result?.processes || [] };
}
