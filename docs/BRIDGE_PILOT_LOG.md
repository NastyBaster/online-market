# Agent Bridge pilot log

## Purpose and rules

This log records the first ten Agent Bridge tasks before B0.2 is considered. Each run must be limited to documentation or GitHub metadata, follow the issue lifecycle `agent:validate → agent:ready → agent:running → agent:review → done`, and keep the issue and pull request as the audit record.

Record only observed facts. Do not include secrets, customer data, private local paths, copied prompts, or personal data. A pending field remains pending until its value is available from GitHub or the owner.

## Pilot summary

| Run | Issue | Pull request | Duration | Contract result | Repair cycles | Owner effort | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #4 — Add Agent Bridge pilot log | #5 | Pending | Pass | Pending | Pending | Merged |
| 2 | #10 — Verify Agent Bridge orchestrator dry-run invariants | Pending | Pending | Pass | 0 | Pending | Review |
| 3 | #11 — Add Agent Bridge troubleshooting checklist | #13 | 2m 43.105s | Pass | 1 | Pending | Merged |
| 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 6 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 7 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 8 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 9 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 10 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Detailed pilot run template

Copy this template for each completed run and replace pending fields only with observed values.

```md
### Run <number> — <short title>

- Issue: #<number>
- Pull request: #<number> or Pending
- Scope: documentation or GitHub metadata only
- Lifecycle: `agent:validate` → `agent:ready` → `agent:running` → `agent:review` → `done`
- Contract validation: Pass / Fail / Pending
- Started (UTC): <timestamp or Pending>
- Finished (UTC): <timestamp or Pending>
- Duration: <measured duration or Pending>
- Repair cycles: <count or Pending>
- Owner effort: <measured minutes or Pending>
- Final status: <merged / blocked / pending>
- Checks: <exact commands and results>
- Lessons learned: <observed process improvement or Pending>
```

### Run 2 — verify local orchestrator dry-run invariants

- Issue: #10
- Candidate issue: #11 — Add Agent Bridge troubleshooting checklist
- Pull request: Pending
- Scope: documentation-only verification; no candidate execution
- Lifecycle: `agent:validate` → `agent:ready` → `agent:running` → `agent:review`
- Contract validation: Pass for #10 and #11
- Started (UTC): 2026-08-28
- Finished (UTC): Pending
- Duration: Pending
- Repair cycles: 0
- Owner effort: Pending
- Final status: Review
- Checks: `npm run test:bridge` (9 passing); `npm run bridge:doctor` (pass); `npm run bridge:once -- --dry-run` selected #11 with `wouldClaim: true`; before/after checks confirmed #11 stayed open, unassigned, and `agent:ready`, with no new candidate branch, worktree, commit, pull request, lock, or audit report.
- Lessons learned: Claim the verification issue before dry-run so the oldest eligible issue is the documentation-only candidate; dry-run intentionally creates neither a lock nor an audit report.

### Run 3 — recover troubleshooting-checklist handoff

- Issue: #11
- Pull request: #13
- Scope: documentation-only
- Lifecycle: `agent:validate` → `agent:ready` → `agent:running` → `agent:review` → `done`
- Contract validation: Pass
- Started (UTC): 2026-08-28T07:10:42.520Z
- Finished (UTC): 2026-08-28T07:13:25.625Z
- Duration: 2m 43.105s
- Repair cycles: 1
- Owner effort: Pending
- Final status: Merged
- Checks: `git diff --check`, conflict-marker scan, relative Markdown link validation, changed-path allowlist, and `npm run test:bridge` (9 passing); PR #13 Agent PR contract passed after report-template repair.
- Lessons learned: A child-agent exit is not a handoff. The orchestrator must verify the branch has exactly one open PR and record the PR-backed transition to `agent:review` before reporting success.

## Measurable exit criteria for B0.2

### Incident — live glossary run blocked

- Session: `session-20260828-125831`
- Issue: #16
- Run: `night-20260828125958094-812956`
- Result: blocked before commit because the child exited without changes, push, or PR; the repaired PR gate found zero matching open PRs.
- Evidence: sanitized audit report retained locally; Task 16 worktree retained clean at `de40bcd`.
- Root cause: the parent/child contract did not pass authenticated claim context and the parent incorrectly relied on the child to produce GitHub lifecycle artifacts. Child output and exit code were not persisted, and no progress/heartbeat events were streamed.
- Follow-up: repair issue #17 separates child implementation from parent lifecycle ownership; the Task 16 retry remains pending until that repair is merged.

### Policy incident follow-up

- Issue: #20
- Trigger: PR #19 contained only issue-permitted documentation changes, but the parent repository policy used a filename-specific list and rejected `docs/BRIDGE_GLOSSARY.md`.
- Repair: generalized normalized repository documentation policy with an independent issue-allowlist intersection and conservative metadata/risk rejection.
- Status: Pending merge and final live verification.

### Repair run — parent-owned lifecycle contract

- Issue: #17
- Pull request: Pending
- Scope: local Agent Bridge orchestration, tests, instructions, and pilot documentation
- Lifecycle: `agent:validate` → `agent:ready` → `agent:running` → `agent:review` → `done`
- Contract validation: Pass
- Root cause addressed: the child receives scoped pre-claim context and only edits the supplied worktree; the parent validates, commits, pushes, creates the PR, transitions review, polls checks, merges, verifies closure, cleans, and audits.
- Validation: 12 bridge tests, Node syntax checks, modified-script doctor, dry-run no-mutation, allowlist, conflict-marker, and secret-pattern scans passed.
- Final status: Pending merge

### Run 4 — final repaired auto-merge verification

- Issue: #22
- Run ID: `night-20260828194037373-497293`
- Pull request: Pending
- Scope: Agent Bridge pilot log only
- Lifecycle: observed `agent:running`; `agent:review` and `done` pending parent lifecycle completion
- Contract validation: Pending
- Started (UTC): Pending
- Finished (UTC): Pending
- Duration: Pending
- Repair cycles: Pending
- Owner effort: Pending
- Checks: `git diff --check` passed; conflict-marker scan found no markers; changed-path allowlist passed with only `docs/BRIDGE_PILOT_LOG.md`; relative Markdown link validation passed (0 links); `npm run test:bridge` passed (13 tests). Agent PR contract is pending parent PR creation. `npm run bridge:doctor` could not complete in this child worktree because GitHub CLI authentication is invalid and network access to GitHub is restricted; the required post-merge doctor result remains pending.
- Merge result: Pending
- Cleanup result: Pending
- Final status: Running
- Lessons learned: Pending

### Run 5 — final protected Agent Bridge live verification

- Issue: #34
- Run ID: `night-20260828204233243-489081`
- Pull request: Pending
- Scope: Agent Bridge pilot log only
- Lifecycle: observed `agent:running`; `agent:review` and `done` remain pending parent-owned lifecycle completion
- Contract validation: Pending parent validation
- Started (UTC): 2026-08-28T20:43:04.238Z
- Finished (UTC): Pending
- Duration: Pending
- Repair cycles: Pending
- Owner effort: Pending
- Checks: `git diff --check` passed; conflict-marker scan found no markers; changed-path allowlist passed with only `docs/BRIDGE_PILOT_LOG.md`; relative Markdown link validation passed (0 links); `npm run test:bridge` passed (13 tests). Agent PR contract is pending parent PR creation. `npm run bridge:doctor` did not pass because GitHub CLI authentication is invalid; the main-protection API was unavailable and the worktree is intentionally not clean-main while this child change is present.
- Merge result: Pending
- Cleanup result: Pending
- Final status: Running
- Lessons learned: Pending

B0.2 may be proposed only when all of the following are true:

1. The summary table has ten completed pilot runs, each limited to documentation or GitHub metadata.
2. All ten runs have a linked issue and draft or review PR that follow the recorded lifecycle without a manual `agent:ready` bypass.
3. Every merged run has a passing PR contract check and its required checks recorded in the PR body.
4. The log records a measured duration, contract result, repair-cycle count, owner-effort value, and final status for all ten runs.
5. No pilot run exposes secrets, performs production/deployment actions, or changes repository settings; automatic merge is allowed only for eligible low-risk tasks under an accepted ADR.
6. The owner reviews the aggregate results and explicitly approves a separate B0.2 decision issue.
