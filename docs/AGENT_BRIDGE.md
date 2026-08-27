# Agent Bridge: затверджена архітектура MVP

## Рішення

GitHub є єдиним джерелом істини. Агенти не передають прихований контекст один одному: архітектурне рішення живе в issue/ADR, реалізація — у branch/commit/PR, перевірка — у CI та review. Email лише повідомляє про подію.

```text
Власник ↔ браузерний Codex
            │ проєктування, ADR, готова issue
            ▼
      GitHub Issues / Project
            │ agent:validate → validation → agent:ready → claim
            ▼
        Codex CLI (дешева модель)
            │ branch, code, tests, draft PR
            ▼
      GitHub Actions + GitHub Codex
            │ contract checks + optional review
            ▼
   браузерний Codex / власник: acceptance
            │
            ▼
        owner merge або bounded low-risk auto-merge
```

## Ролі

### Браузерний Codex — Architect

- обговорює вимоги з власником;
- декомпонує roadmap на малі issues;
- фіксує scope, acceptance criteria, allowed paths, перевірки й ризики;
- готує ADR для глобальних рішень;
- перевіряє PR проти issue та створює follow-up issue замість розширення scope.

Він не є каналом зберігання стану: важливе рішення має потрапити в GitHub.

### Codex CLI — Implementer

- бере тільки одну `agent:ready` issue;
- claim-ить її перед роботою;
- працює в `agent/<issue>-<slug>`;
- читає `AGENTS.md`, змінює лише дозволений scope, запускає checks;
- відкриває draft PR за шаблоном і переводить issue у `agent:review`;
- не працює з production secrets; може merge-ити лише eligible low-risk PR за [ADR 0001](adr/0001-bounded-autonomous-agent-bridge.md) після всіх required checks.

### Власник — Product owner і Security authority

- приймає глобальні рішення та ADR;
- контролює credentials, billing, DNS і production;
- погоджує high-risk задачі;
- приймає глобальні рішення, high-risk work і merge поза bounded low-risk policy.

### GitHub Actions — Dispatcher/Policy bot

- валідовує контракт issue при `agent:validate` та після редагування ready issue;
- відхиляє неповну задачу до початку витратної агентної роботи;
- валідовує структуру PR та зв'язок з issue;
- запускає незалежні тести;
- не приймає архітектурних рішень і не merge-ить.

### GitHub Codex — optional Reviewer

Його безпечна роль у MVP — додатковий review конкретного PR: пошук дефектів, невиконаних acceptance criteria та ризиків. Його зауваження є review input, а не наказом CLI і не дозволом на merge. Автоматичний ланцюг «бот коментує → CLI безмежно виправляє» заборонений; максимум один repair cycle, потім рішення власника.

Точні тригери, доступність і permissions GitHub Codex залежать від підключеної поверхні та плану. До офіційного підтвердження їх не вбудовуємо в критичний workflow.

## Машина станів

```text
draft → agent:validate → agent:ready → agent:running → agent:review → done
                                         └──────────────→ agent:blocked
review changes requested → agent:validate (один контрольований repair cycle)
```

- `agent:validate`: owner передав повний контракт на quarantine-перевірку; CLI ніколи не claim-ить цей стан.
- `agent:ready`: workflow успішно перевірив повний контракт; issue доступна implementer.
- `agent:running`: один implementer володіє lease.
- `agent:review`: draft/ready PR відкритий, реалізація завершена.
- `agent:blocked`: потрібне рішення, secret або зовнішня зміна; причина записана коментарем.
- `done`: PR прийнято й issue закрито.

## Контракт задачі

Issue form у `.github/ISSUE_TEMPLATE/agent-task.yml` вимагає Goal, Context, In scope, Out of scope, Acceptance criteria, Allowed paths, Required checks, Security/data constraints, Dependencies і Human decision. Власник додає лише `agent:validate`; workflow `.github/workflows/agent-issue-contract.yml` додає `agent:ready` тільки після успіху, відхиляє ручне додавання `agent:ready` і повторно перевіряє ready issue після редагування.

## Контракт результату

`.github/pull_request_template.md` вимагає issue reference, summary, changes, checks, migrations/config, screenshots, risks, rollback і handoff. `.github/workflows/agent-pr-contract.yml` перевіряє структуру та посилання `Closes #<number>`.

## Безпека

- protected `main`, required PR, review і CI;
- мінімальні permissions workflow;
- GitHub App замість довгоживучого PAT на етапі автоматичного runner;
- окремий worktree і branch на run;
- allowlist команд та директорій;
- жодних secrets у fork PR;
- timeout, concurrency limit, lease і audit trail;
- deployment, production migration і high-risk merge тільки з human approval; bounded low-risk merge регулює [ADR 0001](adr/0001-bounded-autonomous-agent-bridge.md).

## Етапи реалізації

### B0.1 — реалізовано цим набором змін

- issue form і config;
- PR template;
- issue/PR contract workflows;
- labels manifest;
- runbook ролей і ручного claim/handoff.

### B0.2 — після перевірки вручну

- bootstrap labels командою `gh`;
- branch protection і required checks;
- GitHub Project board;
- локальна команда, яка читає issue та готує ізольований worktree;
- структурований `agent-report.json`.

### B0.3 — тільки після 10 успішних ручних задач

- self-hosted runner;
- GitHub App із короткоживучими токенами;
- автоматичний claim/lease/heartbeat;
- один дозволений repair cycle;
- бюджети часу й вартості та аварійний stop.

## Acceptance criteria Bridge MVP

1. Неповна issue не зберігає `agent:ready`, а CLI не claim-ить `agent:validate`.
2. Повна issue однозначно передається CLI без усного контексту.
3. CLI працює в окремій гілці й відкриває draft PR за шаблоном.
4. PR contract і незалежні checks видимі в GitHub.
5. Власник може зупинити процес, не видаючи production secrets.
6. Жоден агент або бот не може автоматично merge у `main`, крім eligible low-risk task за accepted ADR і лише після всіх required checks.
7. Архітектурне рішення відтворюється з issue/ADR/PR без історії чатів.
