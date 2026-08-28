# Agent Bridge pilot log

## Purpose and rules

This log records the first ten Agent Bridge tasks before B0.2 is considered. Each run must be limited to documentation or GitHub metadata, follow the issue lifecycle `agent:validate → agent:ready → agent:running → agent:review → done`, and keep the issue and pull request as the audit record.

Record only observed facts. Do not include secrets, customer data, private local paths, copied prompts, or personal data. A pending field remains pending until its value is available from GitHub or the owner.

## Pilot summary

| Run | Issue | Pull request | Duration | Contract result | Repair cycles | Owner effort | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #4 — Add Agent Bridge pilot log | #5 | Pending | Pass | Pending | Pending | Merged |
| 2 | #10 — Verify Agent Bridge orchestrator dry-run invariants | Pending | Pending | Pass | 0 | Pending | Review |
| 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
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

## Measurable exit criteria for B0.2

B0.2 may be proposed only when all of the following are true:

1. The summary table has ten completed pilot runs, each limited to documentation or GitHub metadata.
2. All ten runs have a linked issue and draft or review PR that follow the recorded lifecycle without a manual `agent:ready` bypass.
3. Every merged run has a passing PR contract check and its required checks recorded in the PR body.
4. The log records a measured duration, contract result, repair-cycle count, owner-effort value, and final status for all ten runs.
5. No pilot run exposes secrets, performs production/deployment actions, or changes repository settings; automatic merge is allowed only for eligible low-risk tasks under an accepted ADR.
6. The owner reviews the aggregate results and explicitly approves a separate B0.2 decision issue.
