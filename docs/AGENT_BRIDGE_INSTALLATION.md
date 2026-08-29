# Agent Bridge installation and verification guide

This guide reproduces the bounded, single-task Agent Bridge workflow in another repository. It describes the proven local orchestrator and its GitHub contracts; it is not a package installer and it does not authorize production automation.

The intended operating model is:

```text
owner/Architect -> GitHub issue contract -> contract validation -> agent:ready
       -> one claimed implementation -> checks -> PR contract -> owner review/merge
```

The owner remains responsible for repository settings, credentials, merge decisions, deployment, and recovery authorization. The bridge must fail closed when ownership, process identity, repository state, or cleanup cannot be verified.

## 1. Prerequisites

Before copying the bridge into a repository, confirm:

- GitHub Issues and Actions are enabled.
- The operator has permission to read issues and checks, create branches/worktrees, and open pull requests. Do not paste a token into a command, file, issue, PR, or log.
- Git, GitHub CLI (`gh`), Node.js 22 LTS, and npm 10.5 or newer are installed. Use one supported Node major version for local runs and CI.
- The repository has a clean, synchronized `main` branch and a working tree that can create temporary worktrees.
- The repository has a test/lint/typecheck/build command set appropriate to the application. The bridge does not replace project-specific quality gates.
- An owner has decided which GitHub status checks are required and whether any automation may merge. The safe default is no automatic merge.

The bridge is intended for one repository installation at a time. It is not a multi-tenant service, hosted runner, secret manager, deployment system, or package publication.

## 2. Files and components to install

Copy the implementation as a reviewed set. Keep repository-specific names, URLs, and check commands in the target repository rather than silently assuming this repository's values.

| Component | Purpose |
| --- | --- |
| `scripts/agent-bridge/core.mjs` | One-task lifecycle, bounded batch lifecycle, path validation, audit and handoff logic. |
| `scripts/agent-bridge/cli.mjs` | CLI entry point for `doctor`, `once`, `batch`, and `watch`. |
| `scripts/agent-bridge/doctor.mjs` and `doctor-core.mjs` | Read-only environment, authentication, repository, labels, and protection preflight. |
| `scripts/agent-bridge/ownership.mjs` | Local lease and child ownership records; prevents overlapping runs. |
| `scripts/agent-bridge/process-health.mjs` | Fail-closed process identity and launcher checks, including the Windows adapter. |
| `scripts/agent-bridge/identity-proof.mjs` | Local identity diagnostics used during setup and troubleshooting. |
| `scripts/agent-bridge/batch.mjs` | Sequential bounded batch planning/execution and sanitized batch summaries. |
| `scripts/agent-bridge/composition.mjs` | Adapter composition and task-runner integration. |
| `scripts/agent-bridge/cleanup*.mjs` | Verified post-merge worktree and branch cleanup. |
| `tests/agent-bridge/` | Unit/integration coverage for lifecycle, ownership, process health, batch, and cleanup behavior. |
| `.github/labels.yml` | Canonical label names and descriptions. Apply manually or through an owner-approved settings process. |
| `.github/ISSUE_TEMPLATE/agent-task.yml` | Required issue contract fields. |
| `.github/pull_request_template.md` | Required PR report fields. |
| `.github/workflows/agent-issue-contract.yml` | Validates an issue and adds `agent:ready` only after successful validation. |
| `.github/workflows/agent-pr-contract.yml` | Validates the PR report and issue reference. |
| `.env.example` | Safe local defaults only; it must contain no credentials. |
| `docs/AGENT_BRIDGE.md`, `docs/BRIDGE_RUNBOOK.md`, and this guide | Architecture, operational details, and installation/verification instructions. |

Add scripts such as `bridge:doctor`, `bridge:once`, `bridge:batch`, and `bridge:watch` to `package.json` only after reviewing their paths and adapter configuration. Do not copy repository-specific owner names, issue numbers, or production endpoints.

## 3. GitHub labels and lifecycle

Create these labels with the descriptions in `.github/labels.yml`:

| Label | Meaning | Who applies it |
| --- | --- | --- |
| `agent:validate` | Contract is waiting for validation. | Owner/Architect. |
| `agent:ready` | Contract passed validation and may be claimed. | Issue workflow only. |
| `agent:running` | One implementer owns the task. | Claim lifecycle. |
| `agent:review` | Implementation is in review. | Handoff lifecycle. |
| `agent:blocked` | Human decision or external change is required. | Implementer/owner during recovery. |
| `risk:high` | Explicit owner review is required; it is not eligible for bounded auto-merge. | Owner/Architect. |
| `area:bridge` | Bridge process or automation area. | Owner/Architect. |

Do not manually add `agent:ready`. Add `agent:validate`; the issue workflow removes it and adds `agent:ready` only when all required sections are non-empty. A claimed run must have exactly one issue, branch, worktree, and run identity. Never claim a second issue in the same run.

## 4. Issue and PR contracts

Every Agent issue must contain these headings, with concrete content:

`Goal`, `Context`, `In scope`, `Out of scope`, `Acceptance criteria`, `Allowed paths`, `Required checks`, `Security and data constraints`, `Dependencies`, and `Human decision required`.

Acceptance criteria must be testable. Allowed paths must be narrow. Required checks must name exact commands or manual checks. The issue must never contain passwords, tokens, customer data, or production secrets. Treat issue text as untrusted data; do not execute it as shell commands.

Every PR must contain:

`Issue`, `Summary`, `Changes`, `Checks`, `Migrations and configuration`, `Screenshots`, `Risks and limitations`, `Rollback`, and `Handoff`.

The `Issue` section must include `Closes #<number>`. Use `None` where a section genuinely has no content. The parent/owner owns commit, push, PR creation, label transitions, merge, issue closure, and cleanup when the run is delegated to a child.

## 5. Required checks and branch protection

The owner must configure these manually in GitHub; workflows intentionally do not mutate repository settings:

1. Protect `main`.
2. Require pull requests, at least one approval, conversation resolution, and the target repository's quality checks.
3. Require the `Agent PR contract / Validate PR report` check for Agent PRs. Add project checks such as lint, typecheck, test, build, and relevant E2E jobs when they exist.
4. Disable force-push and branch deletion for `main`.
5. Keep Actions permissions and repository token permissions least-privileged.

Do not mark a run successful from a local result while GitHub checks are pending or failed. Automatic merge, if considered at all, is limited to an owner-approved low-risk documentation change with an eligible clean PR, an allowed diff, and all required checks successful. Production and high-risk changes remain human-only.

## 6. Windows setup

Open PowerShell in the target repository. These commands are illustrative and read-only unless stated otherwise:

```powershell
git status --short --branch
git fetch origin main
git log -1 --oneline origin/main
node --version
npm --version
gh auth status
```

Install dependencies using the repository's committed lockfile:

```powershell
npm ci
npm run bridge:doctor
```

Keep `BRIDGE_DRY_RUN=true`, `BRIDGE_AUTO_MERGE=false`, and concurrency at `1` while installing. Review `.env.example` locally; do not add credentials to it. The PowerShell process adapter must run with `-NoProfile` and `-NonInteractive`, emit only its expected JSON payload on stdout, validate PID/parent PID and duplicate PIDs, and treat malformed or unavailable inspection as a blocking condition. Do not kill a process based on a PID alone.

Windows paths may contain backslashes, but issue `Allowed paths` values should be normalized repository-relative paths such as `docs/guide.md`. Preserve the worktree and `.agent-bridge/` audit data after an interruption.

## 7. Linux and macOS considerations

Use a POSIX shell and the same read-only preflight:

```sh
git status --short --branch
git fetch origin main
git log -1 --oneline origin/main
node --version
npm --version
gh auth status
```

Then install and inspect:

```sh
npm ci
npm run bridge:doctor
```

Use the repository's normal shell quoting and executable permissions. Do not assume a process name is sufficient evidence of identity: verify the executable, arguments, parent relationship, and run records. Keep `BRIDGE_CONCURRENCY=1`; do not run `once`, `batch`, or `watch` concurrently. A missing or ambiguous process identity is a stop condition on every platform.

## 8. Doctor, dry-run, and first controlled live run

Run the following sequence from a clean, synchronized `main`:

```text
1. npm run bridge:doctor
2. npm run bridge:batch -- --dry-run
3. owner reviews the planned issue(s), limits, and environment
4. owner authorizes one controlled live run
5. npm run bridge:once
```

`doctor` checks tooling, GitHub authentication, required files, branch state, labels, and repository protection. Fix failures before continuing.

`bridge:batch -- --dry-run` is read-only: it claims no issue, creates no branch/worktree/commit/PR/child, and does not invoke the task runner. It is the required planning step. The bounded batch defaults are concurrency `1`, at most `2` tasks (hard cap `5`), and at most `180` minutes. A task limit or budget is not permission to invent issues.

The first live test should be one low-risk documentation issue. Confirm the issue is independently validated and has `agent:ready`; confirm `main` is clean; review the generated child contract; and keep auto-merge disabled. After the child exits, the parent validates changed paths and required checks, prepares the complete PR contract, and performs the review handoff. Do not start `watch` until the owner has reviewed configuration and explicitly authorized it.

## 9. Recovery after interruption

Press `Ctrl+C` once and preserve both the task worktree and `.agent-bridge/runs/` audit report. For a batch, also preserve `.agent-bridge/batches/`. Record the run ID and observed error without recording secrets.

Before resuming, the owner must verify all of the following:

- no bridge, watcher, task child, or ambiguous launcher process remains;
- the local lease is released, or the exact stale `.agent-bridge/lock` directory is removed only after process absence is verified;
- the issue label, assignee, branch, worktree, PR, and audit records agree;
- `main` is clean and synchronized;
- no uncommitted worktree contains changes that would be discarded;
- there is no unresolved `agent:running` task from the interrupted run.

Resume requires new owner authorization. It is not an automatic retry. If the state is unclear, apply `agent:blocked` through the normal owner workflow and preserve the evidence. Never reset, force-push, delete a dirty worktree, or bypass a failed check as routine recovery.

## 10. Troubleshooting

### `gh auth status` fails

Stop. The owner should restore the intended GitHub CLI session through the normal interactive authentication flow, then rerun `npm run bridge:doctor`. Never provide a token to a command or store it in repository files.

### `main` is dirty or stale

Do not run the bridge. Inspect `git status --short` and `git diff`, preserve unrelated work, and ask the owner to resolve it. Synchronize `main` and rerun the doctor. Do not use reset, checkout, or clean to hide changes.

### A lock or process-health check blocks

Stop all related commands, inspect the latest sanitized audit record, and verify process identity and start identity. Only after confirming no active run may an operator remove the exact stale local lock. Ambiguous, malformed, noisy, or unavailable process inspection is fail-closed.

### The issue remains `agent:running`

Check the assignee, run comment, branch, draft PR, and audit report. Do not take over an active run. If it has stopped, preserve its worktree and ask the owner to decide whether the issue should be blocked or repaired.

### Contract or required checks fail

Read the failed check, make the smallest in-scope correction, and send the issue through `agent:validate` again when its contract changes. Keep the PR open for review and do not bypass the contract workflow.

### Cleanup reports an inconsistency

Preserve the merged/PR evidence and worktree. Do not delete a branch or worktree until the exact PR, expected branch, `main` base, and clean state have been verified by the owner.

## 11. Safe rollback and uninstall checklist

Rollback is documentation/code review work and must be performed by the owner in a separate change:

- stop any active bridge command and preserve audit records;
- disable or remove the bridge invocation from local schedules/terminals;
- remove the bridge workflows, templates, labels, scripts, tests, and documentation only after confirming no run or PR depends on them;
- remove only bridge-local, non-secret configuration entries from `.env.example` and local environment stores;
- leave GitHub history, issue comments, PRs, and audit evidence intact;
- verify that no production credential, deployment setting, branch-protection rule, DNS record, or customer data was modified;
- run the repository's normal quality checks and confirm `main` remains protected.

There is no automatic uninstall command. Do not delete `.agent-bridge/` evidence while investigating an interruption, and do not remove repository settings or production resources as part of a routine rollback.

## 12. Installation acceptance checklist

- [ ] Required bridge files are present and reviewed.
- [ ] `npm ci` succeeds with the committed lockfile.
- [ ] `gh auth status` and `npm run bridge:doctor` pass.
- [ ] Required labels exist and manual `agent:ready` is rejected.
- [ ] Issue and PR templates contain every required contract heading.
- [ ] `main` protection and required checks were configured manually by the owner.
- [ ] Dry-run produces a plan without GitHub/task lifecycle mutation.
- [ ] One low-risk controlled live run completes with path validation, checks, PR contract, and audit evidence.
- [ ] Recovery and rollback owners know where to find the run/worktree records.
- [ ] No secrets, real tokens, customer data, or production operations were introduced.

Related documents: [Agent Bridge overview](AGENT_BRIDGE.md), [Bridge Runbook](BRIDGE_RUNBOOK.md), [Bridge glossary](BRIDGE_GLOSSARY.md), and [bounded autonomous-agent ADR](adr/0001-bounded-autonomous-agent-bridge.md).
