# Agent Bridge Kit: extraction and versioning plan

Status: future plan. This document defines the boundary and acceptance bar for extracting the proven project-local Bridge into a reusable repository and npm CLI. It does not extract code, publish a package, or authorize automation in this repository.

## 1. Extraction decision and scope

Extraction is allowed only after both gates are recorded in the source project:

1. the bounded batch implementation has passed its checks and doctor/preflight; and
2. at least one real storefront task has completed through the full issue-to-handoff path.

The first kit release is a single-repository installation. It is an orchestration tool, not a hosted service or multi-tenant SaaS product. The kit must preserve the current fail-closed ownership, clean-main, worktree, audit, cleanup, and handoff invariants. See [Agent Bridge architecture](AGENT_BRIDGE.md), [installation guide](AGENT_BRIDGE_INSTALLATION.md), and [ADR 0001](adr/0001-bounded-autonomous-agent-bridge.md).

## 2. Boundary: kit code versus project policy

The standalone repository owns the mechanism:

- CLI parsing, exit codes, structured output, schema validation, and safe defaults;
- once/batch lifecycle orchestration, leases, heartbeats, process identity, worktree handling, bounded time/concurrency, and cleanup;
- GitHub API/CLI adapters, sanitized audit records, contract checks, and reusable workflow definitions;
- compatibility tests, migration tooling, documentation, and release artifacts.

The installed project owns the policy:

- issue and PR templates, labels, repository branch name, allowed paths, and merge authority;
- required quality commands and checks, task budget/limits within kit hard caps, and whether automation may merge;
- task prompt/contract fields, project-specific runner configuration, and application secrets;
- provider integrations, deployment rules, and any storefront or domain logic.

The kit may validate policy but must not invent or silently override it. A missing or ambiguous policy is a doctor failure. The project remains the authority for what an agent may change; the kit remains the authority for safe execution mechanics.

## 3. Standalone repository layout

The proposed repository is `agent-bridge-kit`:

```text
agent-bridge-kit/
  src/
    cli.ts              # stable command adapters
    core/               # lifecycle and bounded execution
    ownership/          # lease, heartbeat, child registration
    process/            # OS-specific identity proof
    providers/          # GitHub and command-runner interfaces
    config/             # versioned schema and migration
    audit/              # sanitized records and report formats
  test/
    unit/
    integration/
    bootstrap/          # fresh empty repository acceptance fixture
  workflows/
    agent-issue-contract.yml
    agent-pr-contract.yml
    agent-quality.yml
  templates/
    agent-task.yml
    pull_request.md
  docs/
    configuration.md
    upgrade.md
    security.md
  package.json
  package-lock.json
  tsconfig.json
  CHANGELOG.md
  LICENSE
```

The npm package is `agent-bridge-kit`; its executable is `agent-bridge`. Runtime state stays in the target repository's ignored `.agent-bridge/` directory. No runtime state, credentials, application data, or project source is stored in the package repository.

## 4. Stable CLI surface

The initial public surface is deliberately small. Commands return `0` only for a completed operation, `1` for a failed check/run, and `2` for invalid arguments or configuration. JSON output is available with `--json`; human output must never include secrets or raw payloads.

| Command | Responsibility | Default safety behavior |
| --- | --- | --- |
| `agent-bridge init` | Create or update the project-local config, ignored runtime directory, and opt-in workflow/template files | Refuses to overwrite non-generated files; prints a diff/confirmation summary |
| `agent-bridge doctor` | Read-only check of Node/Git/GitHub access, config, labels, branch protection, clean synchronized base, and runner composition | Never claims issues, creates branches, calls an agent, or changes GitHub state |
| `agent-bridge once` | Plan or execute at most one validated issue through claim, isolated worktree, checks, handoff, and audit | Dry-run unless explicitly enabled by project policy; auto-merge off |
| `agent-bridge batch` | Run validated `once` jobs sequentially under one lease and bounded task/time limits | Dry-run by default, concurrency fixed at 1, stops on first blocked/failed/cleanup error |

Global options are limited to `--config <path>`, `--json`, `--dry-run`, `--yes` (only for non-destructive generated files), and `--help`/`--version`. There is no `watch` command in the first standalone public API; it can be proposed later as a separate compatibility-reviewed feature. Deprecated aliases must emit a warning for one minor line and be removed only in a major release.

## 5. Project-local configuration and ownership

`init` creates `.agent-bridge/config.yml` (or a user-selected path). The kit owns the schema, parser, defaults, migration version, and validation. The project owner owns the values. Configuration is versioned with `schemaVersion`, and unknown keys are errors unless explicitly placed under a namespaced `extensions` map.

Minimum schema:

```yaml
schemaVersion: 1
repository:
  baseBranch: main
  issueLabels: { ready: agent:ready, running: agent:running, review: agent:review, blocked: agent:blocked }
  allowedPaths: ["README.md", "docs/**/*.md"]
  requiredChecks: [lint, typecheck, test]
policy:
  autoMerge: false
  allowHighRisk: false
  maxTasks: 2
  maxMinutes: 180
runner:
  command: npm
  args: ["run", "bridge:once"]
```

The example is illustrative, not a promise that every project uses npm or these checks. Secrets are never valid config values. Environment variables may supply secret references to the external runner, but the kit may only pass them through and must redact names/values from reports. Config changes are reviewed as policy changes; kit upgrades never rewrite policy silently.

## 6. Reusable GitHub workflows

The kit repository publishes versioned workflow templates that consuming repositories invoke by a pinned tag or commit:

- issue-contract: validate required issue fields, allowed paths, checks, risk, and security constraints before `agent:ready`;
- PR-contract: validate issue linkage, changed-path allowlist, report fields, and required checks;
- quality: run kit unit/integration/bootstrap tests and the consuming project's configured checks;
- optional release: build, test, provenance/signature verification, changelog validation, and npm publication with protected environment approval.

Reusable workflows receive only explicit inputs and least-privilege permissions. They do not receive production credentials, alter branch protection, bypass reviews, or merge by default. A consumer pins the workflow reference, reviews updates, and upgrades it separately from the npm package when needed.

## 7. Versioning, releases, and upgrades

Use SemVer for the npm package and a conventional changelog:

- patch: bug/security fixes that preserve CLI, config, audit, and workflow contracts;
- minor: backward-compatible commands, fields, checks, or opt-in capabilities;
- major: removal/renaming, changed defaults, incompatible schema/audit formats, or changed security/permission behavior.

The CLI and config schema have independent compatibility identifiers. Every release publishes package tarball checksums, supported Node versions, migration notes, and a signed/provenance-attested artifact where the registry supports it. The `latest` tag is released only after all matrix and bootstrap checks pass; pre-releases use `next`.

Upgrade procedure: install the intended version in CI first, run `agent-bridge doctor --json`, review the reported config migration, apply the generated migration in a separate commit, run the fresh-repository bootstrap test, then enable the new version for normal runs. The kit must support reading the previous config schema for at least one major line and must offer an explicit rollback to the prior package/config pair. Runtime audit formats are append-only; readers accept the previous two formats.

## 8. Compatibility matrix

The first supported matrix is:

| Host | Node/npm baseline | Git/GitHub CLI | Support level |
| --- | --- | --- | --- |
| Windows 11 x64 | Node 22 LTS / npm 10+ | Git 2.4+, `gh` current supported release | required; PowerShell process-identity adapter tested |
| Ubuntu 22.04/24.04 x64 | Node 22 LTS / npm 10+ | Git 2.4+, `gh` current supported release | required; `/proc` identity adapter tested |
| macOS 13+ arm64/x64 | Node 22 LTS / npm 10+ | Git 2.4+, `gh` current supported release | required; native identity adapter tested |

Unsupported OSes, shell-only environments without the required identity adapter, and unverified Node majors fail closed with an actionable doctor result. CI tests native path, newline, signal, process identity, and shell behavior on each required OS; no platform is described as supported until the bootstrap suite passes there.

## 9. Bootstrap acceptance tests

Release acceptance must create a genuinely fresh, empty temporary Git repository on each OS, initialize a local bare remote or disposable test remote, install the package from the candidate tarball, and run the minimum vertical scenario:

1. `agent-bridge init --yes` creates only documented generated files and an ignore rule.
2. A fixture adds a minimal issue/PR policy and harmless local quality commands; no real secret or production integration is used.
3. `agent-bridge doctor --json` passes and output contains only sanitized diagnostics.
4. `agent-bridge once --dry-run` plans one eligible task without claiming, branching, opening a PR, or writing GitHub mutations.
5. `agent-bridge batch --dry-run` plans sequential execution, acquires/releases its local lease, and leaves a clean tree.
6. A fully mocked safe run verifies claim, isolated worktree, quality checks, audit, handoff, and cleanup; failure fixtures verify fail-closed behavior.
7. Re-running `init`, interrupted execution, malformed runtime state, duplicate ownership, and upgrade/rollback are tested.

The suite must run against a fresh repository rather than this storefront repository. A release cannot claim bootstrap support based only on unit tests or a copied existing `.agent-bridge` directory.

## 10. Migration from the project-local Bridge

Migration is a staged, reversible change:

1. Freeze the known-good local Bridge behavior and record the extraction gates and current versions.
2. Copy tests and interfaces into the kit first; preserve sanitized audit fixtures and security regression cases.
3. Add the kit config/workflow files to a disposable clone and pass bootstrap tests.
4. Run the installed CLI in doctor and dry-run mode beside the local implementation; compare plans and reports without executing both.
5. Pin the package and reusable workflows in this project, retain the local implementation as a temporary fallback, and run one authorized storefront task.
6. Remove local implementation only in a separate reviewed change after equivalence, handoff, and rollback are demonstrated.

Migration does not transfer issues, tokens, runtime locks, worktrees, or audit files between installations. Existing `.agent-bridge` runtime state is not imported; stop active runs and preserve their evidence before switching implementations.

## 11. Security boundaries

The kit must fail closed on missing ownership, ambiguous process identity, malformed runtime state, dirty/unsynchronized base, invalid contract, unexpected paths, failed cleanup, or unavailable required checks. It must use least-privilege GitHub permissions, exact repository/branch/run identity, atomic local ownership records, bounded time and concurrency, and sanitized audit output.

The kit never reads, prints, commits, or uploads secrets, payment data, OTPs, or unnecessary personal data. It never performs deployment, production migration, DNS/settings changes, credential provisioning, force-push, branch-protection bypass, or real payment/SMS/shipping operations. Auto-merge remains opt-in and is independently constrained by repository policy and the issue contract; human approval remains mandatory for high-risk work.

## 12. Prerequisites, non-goals, and open decisions

Extraction prerequisites are: the two gates in section 1, passing source-project quality and doctor checks, a reviewed security regression suite, a confirmed owner for package/workflow releases, and a documented rollback. The owner must decide the package registry, signing/provenance service, support window, and whether auto-merge is enabled for any policy class before publication.

Non-goals for the first kit are a hosted control plane, multi-tenancy, agent model hosting, arbitrary CI orchestration, deployment management, secret management, issue prioritization, continuous watch mode, platform support outside the matrix, or application/storefront features. Each requires a separate decision and acceptance contract.

## Definition of done for extraction

- the standalone repository builds from a clean checkout and publishes a versioned, reproducible package;
- the four CLI commands, config schema, exit codes, audit compatibility, and workflow inputs are documented and tested;
- bootstrap acceptance passes in a fresh empty repository on Windows, Linux, and macOS;
- migration and rollback are demonstrated in this project without changing Bridge behavior;
- security review confirms no secret leakage, permission bypass, unsafe cleanup, or unsupported-functionality promise.
