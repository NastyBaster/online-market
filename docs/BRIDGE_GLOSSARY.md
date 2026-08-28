# Agent Bridge glossary

Short operational definitions for the bounded Agent Bridge lifecycle. For the
full procedure, see the [Bridge Runbook](BRIDGE_RUNBOOK.md).

- **Architect** — plans a small task with the owner, records its scope and acceptance criteria, and reviews the result against the issue.
- **Implementer** — the Codex CLI or implementation child that changes only the claimed task's allowed paths and runs its checks.
- **Owner** — the product and security authority for global decisions, credentials, production, and merges outside the bounded low-risk policy.
- **Issue contract** — the required task description: goal, scope, acceptance criteria, allowed paths, checks, constraints, dependencies, and human decisions.
- **PR contract** — the required pull-request report: issue reference, summary, changes, checks, migrations/configuration, risks, rollback, and handoff.
- **`agent:validate`** — the owner requests workflow validation of an issue contract; implementers never claim this state.
- **`agent:ready`** — the workflow has validated the complete issue contract and the issue may be claimed.
- **`agent:running`** — exactly one implementer currently owns the task lease.
- **`agent:review`** — implementation has a draft or review-ready PR and awaits the review/merge lifecycle.
- **`agent:blocked`** — progress needs an owner decision, a secret, or an external change; the reason is recorded in a comment.
- **Run ID** — a unique identifier recorded with a run's comments, audit events, branch, checks, repairs, and outcome.
- **Claim** — the atomic assignment of one ready issue to one implementer, including assignee, branch, run comment, and `agent:running`.
- **Lease** — the temporary exclusive right held by the implementer that prevents a second implementer from working the same running issue.
- **Durable handoff** — a verified transition to `agent:review` only after exactly one open PR for the run branch is recorded in the audit report and handoff comment.
- **Worktree** — the isolated Git working directory created for one run and its task branch.
- **Repair cycle** — one controlled return from review changes to validation, then ready state and implementation; the bounded run permits at most two repairs.
- **Dry-run** — a no-mutation preview that selects and validates candidate work without claiming an issue or creating run artifacts.
- **Auto-merge** — policy-gated merge allowed only for eligible low-risk work when configured and all required checks, clean PR, and scope conditions pass.
- **Audit report** — the local, sanitized run record containing lifecycle evidence, checks, repairs, and outcome.
- **Doctor** — `npm run bridge:doctor`, which checks local prerequisites before a bridge run.
- **`bridge:once`** — `npm run bridge:once`, which processes no more than one ready issue; it is dry-run by default.
- **`bridge:watch`** — `npm run bridge:watch`, the bounded polling loop that stops at its configured task limit or a blocked task.
- **Kill switch** — the emergency stop: press `Ctrl+C`, preserve the worktree and audit report, then inspect state before any resume.
