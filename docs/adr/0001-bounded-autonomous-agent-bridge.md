# ADR 0001: Bounded autonomous Agent Bridge execution

## Status

Accepted

## Context

The first manual Agent Bridge pilot completed in issue #4 and pull request #5. The owner has explicitly authorized a bounded overnight run in which eligible low-risk Agent Bridge tasks may be created, implemented, checked, and merged without a per-task approval.

## Decision

Agent Bridge may automatically merge a low-risk task only when all of these conditions hold:

- the task has a complete issue contract and follows the label lifecycle;
- its allowed paths and diff are limited to documentation, GitHub metadata, or other explicitly approved low-risk paths;
- all required local and GitHub checks are successful, with no pending or failed required check;
- the task has at most two repair cycles and is inside the configured time budget;
- one run owns one issue, one implementation PR, and concurrency remains one;
- the run records its ID, issue, branch, commit, checks, repairs, and outcome without secrets or private paths.

Risk classes are:

| Class | Handling |
| --- | --- |
| Low | May auto-merge only under the conditions above and explicit local auto-merge configuration. |
| Medium | Requires explicit owner configuration for the task plus stronger task-specific checks; it does not inherit low-risk auto-merge permission. |
| High | Requires a human decision and remains `agent:blocked`; it cannot auto-merge. |

Automatic merge is never permitted for secrets, billing, DNS, repository permissions or branch protection, destructive data changes, production migrations or deployment, production integrations, force-push, or direct pushes to `main`.

A night run defaults to concurrency 1, at most 3 tasks, 90 minutes per task, and at most 2 repair cycles. It stops the entire run after a condition fails again after the second repair cycle, after authentication or GitHub availability is lost, when `main` changes unexpectedly, or when the worktree is not clean.

## Consequences

Low-risk tasks can complete without a manual merge step, while the audit trail and required checks remain mandatory. This reduces owner intervention but does not broaden access to sensitive systems. Medium and high-risk work remains explicitly gated.

## Alternatives considered

- Keep every merge human-only: rejected for this bounded overnight run because the owner explicitly accepted low-risk autonomous merge.
- Allow all Agent Bridge tasks to auto-merge: rejected because risk, scope, and production impact require different controls.
