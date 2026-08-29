# Agent Bridge Runbook

Short definitions for the lifecycle terms in this document are in the [Agent Bridge glossary](BRIDGE_GLOSSARY.md).

## 1. Одноразове налаштування власником

1. Створіть labels із `.github/labels.yml` у GitHub repository settings або через `gh`.
2. Увімкніть Issues та Actions.
3. Захистіть `main`: pull request required, один approval, required conversation resolution і required status checks.
4. Не дозволяйте force-push і deletion `main`.
5. Створіть GitHub Project зі статусами Draft, Ready, Running, Review, Blocked, Done.
6. Не додавайте production secrets, поки bridge перевіряється документаційними задачами.

Workflow навмисно не змінює repository settings: це чутливе рішення власника.

## 2. Architect: створення задачі

1. Власник і браузерний Codex узгоджують рішення.
2. Architect відкриває **Agent task** через issue form.
3. Acceptance criteria повинні бути перевірними, а allowed paths — мінімальними.
4. Якщо рішення глобальне, спочатку створюється ADR у `docs/adr/`.
5. Власник додає `agent:validate`. Workflow перевіряє контракт і лише після успіху додає `agent:ready`.

Якщо `agent:ready` не з'явився або автоматично знятий після редагування, прочитайте bot comment, доповніть issue і повторно додайте `agent:validate`. Пряме ручне додавання `agent:ready` workflow відхиляє.

## 3. Implementer: ручний claim у B0.1

CLI або власник виконує:

```bash
gh issue view <number> --json number,title,body,labels,assignees
gh issue edit <number> --remove-label agent:ready --add-label agent:running --add-assignee @me
gh issue comment <number> --body "Claimed by Codex CLI. Run: local-<timestamp>. Branch: agent/<number>-<slug>."
git fetch origin main
git switch -c agent/<number>-<slug> origin/main
```

Перед редагуванням CLI повторно читає issue, `AGENTS.md` і дозволені документи. Якщо потрібен secret, глобальне рішення або вихід за allowed paths, він не імпровізує, а ставить `agent:blocked` із конкретним питанням.

## 4. Handoff у review

Після checks:

```bash
git push -u origin agent/<number>-<slug>
gh pr create --draft --title "..." --body-file <prepared-pr-body>
gh issue edit <number> --remove-label agent:running --add-label agent:review
gh issue comment <number> --body "Implementation is ready in PR #<pr>. Checks and risks are in the PR body."
```

PR має містити `Closes #<number>`. Якщо issue залишається відкритою після merge через налаштування репозиторію, власник закриває її вручну.

## 5. Review і repair

1. CI перевіряє контракт незалежно від звіту CLI.
2. GitHub Codex може виконати додатковий review, якщо він доступний та явно запущений.
3. Браузерний Architect звіряє diff з acceptance criteria.
4. Власник приймає глобальні та high-risk рішення.
5. Для змін поверніть issue у `agent:validate` із консолідованим списком. Workflow поверне `agent:ready` лише після успішної перевірки. Дозволено один автоматизований repair cycle.
6. Merge виконує власник, крім bounded low-risk task за [ADR 0001](adr/0001-bounded-autonomous-agent-bridge.md): у нього мають бути всі required checks успішні, жодного pending/failed check, один активний PR і записаний audit trail.

## 6. Blocked і аварійна зупинка

Implementer ставить `agent:blocked` і залишає один коментар із: blocking condition, already tried, потрібне рішення та безпечний default. Він не публікує secret і не продовжує небезпечну дію.

Для зупинки: зніміть `agent:ready`/`agent:running`, скасуйте workflow, відкличте тимчасовий token, закрийте draft PR і збережіть audit trail. Не видаляйте історію інциденту. Нічний run зупиняється повністю після другого repair cycle, втрати GitHub/auth, неочікуваного оновлення `main` або не чистого worktree.

## 7. Пілот

Перші 10 задач повинні змінювати лише документацію або GitHub metadata. Вимірюйте час власника, кількість уточнень, contract failures, repair cycles і помилкові зміни. Self-hosted автоматизація дозволяється лише після окремого рішення власника за результатами пілоту. Bounded night run має concurrency 1, максимум 3 задачі, 90 хвилин на задачу й максимум 2 repair cycles; усі comments містять run ID.

Записуйте кожен run у [журналі пілота Agent Bridge](BRIDGE_PILOT_LOG.md). До B0.2 переходять лише після виконання його вимірюваних exit criteria та окремого рішення власника.

## 8. Local orchestrator MVP

Use Node.js without external runtime dependencies: `npm run bridge:doctor`, `npm run bridge:once -- --dry-run`, and `npm run bridge:watch`. Defaults are safe: dry-run is on, auto-merge is off, concurrency is 1, task limit is 3, repair limit is 2, task budget is 90 minutes, and watch polling is at least 30 seconds.

`npm run bridge:batch -- --dry-run` is the read-only planning command for the bounded sequential executor. Its real mode is intentionally not authorized by this runbook alone: it processes at most `BRIDGE_BATCH_MAX_TASKS` tasks (default 2, hard cap 5) within `BRIDGE_BATCH_MAX_MINUTES` (default/hard cap 180), always at concurrency 1. It reuses `bridge:once` lifecycle internals, performs a clean/synchronized-main health gate before each task, and stops permanently at the first blocked task, cleanup inconsistency, health problem, or audit-write failure. Do not create arbitrary issues to fill a batch; only independently validated `agent:ready` issues are candidates.

On Windows, process health uses an identity-scoped snapshot and a small argv parser. The PowerShell adapter runs with `-NoProfile` and `-NonInteractive`, selects only `ProcessId`, `ParentProcessId`, `Name`, `ExecutablePath`, `CommandLine`, and `CreationDate`, materializes the result before `ConvertTo-Json -InputObject`, and reserves stdout for one compressed JSON array. The parser strips a UTF-8 BOM and surrounding whitespace, accepts CRLF, validates PID/parent PID and duplicate PIDs, and reports sanitized categories such as `windows_snapshot_empty`, `windows_snapshot_invalid_json`, `windows_snapshot_wrong_root_shape`, `windows_snapshot_invalid_pid`, and `process_inspection_command_failed`. `CommandLine`, `ExecutablePath`, and `CreationDate` may legally be null; missing command identity is conservative and may produce `ambiguous_bridge_process`, never an implicitly trusted process. Watcher detection uses the executable identity plus exact positional Node/npm/shell arguments (including the repository `cli.mjs watch` path); it never searches a raw command line or Codex prompt. The current batch PID and only verified npm/Node/shell launcher ancestors are categorized as `current_batch` or `verified_launcher`; unrelated Node, npm, and Codex processes are not implicitly safe or unsafe. `bridge_watch`, `tracked_task_child`, and `ambiguous_bridge_process` remain blocking. A stale tracked PID is reported separately and never trusted solely by numeric PID. If inspection is malformed, noisy, failed, or unavailable, the gate fails closed. The sanitized audit records category, PID and parent relationship only. Troubleshoot by checking those categories; do not kill a process without verifying identity. A safe resume requires new owner authorization and is never an automatic retry.

Each batch creates a sanitized summary in `.agent-bridge/batches/` with task run IDs, issue/PR numbers, outcomes, cleanup facts, and terminal reason. For an emergency stop, interrupt the active command once, preserve the task worktree and both audit files, and do not start another batch until an owner has reviewed the failure. Resume needs new explicit authorization after confirming clean synchronized `main`, no lock/process, and no unresolved running issue; it never permits `bridge:watch`, bypass, or a parallel run.

The Windows System Idle Process is the sole permitted PID 0 sentinel. It must have PID and parent PID 0, the factual CIM name `System Idle Process` or `Idle`, null/empty command and executable fields, and no duplicate PID. Its creation date may be null and it is normalized as `system_idle`; it is visible in sanitized counts but is never an executable, launcher, tracked child, watcher, current batch, or ancestry node. Any other PID 0 shape fails closed as `windows_snapshot_invalid_system_idle` without recording raw process fields.

A null `CommandLine` on an ordinary record is counted as missing identity evidence and does not, by itself, create a blocking Bridge classification. Malformed non-null command data and Bridge-looking identities remain fail-closed.

For Windows overnight use, first check out a clean `main`, run `npm run bridge:doctor`, then confirm the local values in `.env.example` are appropriate for the bounded pilot. Keep the terminal session available. Do not start `bridge:watch` until the owner has reviewed its configuration. `bridge:once` processes no more than one ready issue; `bridge:watch` stops after the configured task limit or a blocked task and never nests a second watch loop.

Emergency stop (kill switch): press `Ctrl+C`, inspect the issue label and the local `.agent-bridge/runs/` audit report, and keep any worktree that has uncommitted changes for recovery. Never delete such a worktree. The `.agent-bridge/` directory is local and gitignored. Auto-merge remains off unless `BRIDGE_AUTO_MERGE=true`; even then it needs one non-draft, clean PR, a permitted diff, and non-empty successful GitHub checks.

## 10. Verified handoff

The local orchestrator reports `handoff` only after it finds exactly one open pull request for the run branch. It records that PR number in the audit report and handoff comment, then moves the issue from `agent:running` to `agent:review`. If either prerequisite fails, it blocks the issue with a sanitized reason and writes the failure audit record; it must not report a successful handoff.

After an eligible auto-merge, cleanup re-reads that exact PR number and requires `MERGED`, the expected head branch, the trusted `main` base, and merge evidence. It then checks `git worktree list --porcelain`, probes the exact `refs/heads/<task-branch>` remote ref, and probes it again after a non-force delete. Any malformed or failed probe blocks cleanup and preserves the verified merge fact plus the failed phase in the sanitized audit report.

The parent owns the lifecycle after child exit: inspect the supplied worktree, validate changed paths and checks, create the commit, push, create the complete PR, poll checks, merge only under policy, verify closure, and clean only a verified-clean worktree. The child only edits allowed paths and returns a structured completion summary. A matching claim context permits the child to continue an already claimed `agent:running` issue; it does not authorize any unrelated issue.

Low-risk documentation auto-merge uses two independent allowlists. Repository policy permits only normalized `README.md` and Markdown files under `docs/` (excluding `docs/adr/`); the issue contract must also permit every actual changed path. Empty, absolute, traversal, deleted, renamed, binary, symlink, submodule, or mode-only changes and `risk:high` labels remain ineligible. Either layer can veto the merge.

## 9. Local troubleshooting checklist

Use this checklist only for the local pilot. Do not paste tokens, secrets, or private paths into issue comments, PRs, or audit notes. Start every recovery by stopping the active local command with `Ctrl+C`, recording the run ID and observed error, and preserving the worktree and `.agent-bridge/runs/` audit report.

### `gh auth` fails

Run `gh auth status` and verify that the intended GitHub account and repository access are available. Re-authenticate through the GitHub CLI's normal interactive flow only after the owner confirms the account to use. Do not put a token in a command, environment file, issue, or log. When authentication is restored, run `npm run bridge:doctor`; resume only if its GitHub checks pass.

### `main` is dirty

Do not start or resume a run from a dirty `main`. Inspect the changes with `git status --short` and `git diff`, then either finish them in their own branch/PR or ask their owner to resolve them. Do not use reset, checkout, clean, or any command that discards changes as routine recovery. After `main` is clean and current, run `npm run bridge:doctor` again.

### Stale local lock

If the bridge reports that another run owns the repository, first confirm that no `bridge:once`, `bridge:watch`, or Codex process is still active and inspect `.agent-bridge/runs/` for the most recent audit report. A lock is normally released when the process exits. If the process is confirmed stopped and the lock is still present, an operator may remove only the exact local `.agent-bridge/lock` directory, then rerun `npm run bridge:doctor`.

> **Warning:** removing the lock while a run is active can allow two runs to claim work concurrently. Never remove it until the active process has been stopped and verified absent.

### Orphaned worktree

List worktrees with `git worktree list` and inspect the candidate worktree with `git -C <worktree-path> status --short`. Preserve any worktree with changes and associate it with its issue, branch, and run ID. If it is clean, first decide whether its branch or PR is still needed; leave it in place until that decision is recorded.

> **Warning:** removing a worktree or deleting its branch is destructive when it contains uncommitted work or is still needed for review. Do not perform cleanup automatically; use Git's documented worktree removal only after the owner confirms the exact clean target.

### Issue stuck in `agent:running`

Check the issue assignee, run comment, branch, draft PR, and matching local audit report. If the implementer is still running, do not take over the issue. If the run has stopped, preserve its worktree and add one factual comment describing the blocking condition, what was checked, and the safe next step. The owner or authorized operator should then move the issue to `agent:blocked` for a decision, or to `agent:review` only when a valid PR and required checks exist. Never add `agent:ready` directly to bypass the contract workflow.

### GitHub checks fail

Open the failed check and identify whether it is a contract, documentation, or environment failure. Keep the PR and its failing logs as the audit trail; do not merge, force-push, or disable required checks. For an in-scope fix, use the single permitted repair cycle; otherwise mark the issue blocked with the failure summary and required owner decision. Resume review only after all required checks are successful and no required check is pending.

### Emergency stop and safe resume

For an emergency stop, press `Ctrl+C`, stop any active bridge command, and do not start another run. Preserve the worktree, audit report, issue state, PR, and failed checks. Remove `agent:ready` or `agent:running` only through the authorized GitHub issue transition, cancel a GitHub workflow only when it is the affected run, and leave the incident history intact.

Before resuming, confirm that authentication works, `main` is clean, no active run owns the lock, the intended issue state is accurate, and `npm run bridge:doctor` passes. Start with the default dry run (`npm run bridge:once -- --dry-run`) and have the owner review the result before any bounded non-dry-run execution. A resume never authorizes production operations, secrets, direct pushes to `main`, or automatic cleanup.
