# Agent Bridge: варіант для обговорення

> Цей документ — архітектурна пропозиція, не план негайної реалізації. Автоматизація не ввімкнена.

## Проблема

Зараз власник вручну переносить завдання й звіти між браузерним Codex/ChatGPT, локальним Codex CLI у VS Code та GitHub. Мета bridge — зробити GitHub джерелом істини й автоматизувати передачу контексту без автономного merge небезпечних змін.

## Рекомендація: GitHub Issues + pull requests як протокол

Не потрібно змушувати агентів напряму «розмовляти». Надійнішим мостом є структуровані артефакти:

```text
Owner / browser planning
        ↓ issue з acceptance criteria
GitHub Project queue
        ↓ локальний runner забирає ready issue
Codex CLI → branch → commit → pull request
        ↓ CI + machine-readable report
Browser/Codex review → review comments або follow-up issue
        ↓
Owner approval → merge
```

GitHub App/бот тут є диспетчером подій і прав, але не обов'язково агентом, який приймає продуктові рішення.

## Мінімальний протокол issue

Labels: `agent:ready`, `agent:running`, `agent:review`, `agent:blocked`, `priority:*`, `area:*`, `risk:high`.

Issue template має містити:

- Goal;
- Context;
- In scope / Out of scope;
- Acceptance criteria;
- Allowed paths;
- Required checks;
- Security/data constraints;
- Dependencies;
- Human decision required.

Задача виконується агентом тільки за label `agent:ready`. Після claim бот атомарно ставить `agent:running`, assignee і comment із run ID, щоб два runner не виконали її одночасно.

## Звіт агента

Pull request має посилатися на issue і містити:

- summary;
- changed files;
- migrations/config changes;
- exact test commands and results;
- screenshots для UI;
- risks and known limitations;
- rollback;
- unresolved questions.

Додатково runner може завантажувати `agent-report.json` за версіонованою JSON Schema. Це дозволить ботам читати результат без ненадійного парсингу Markdown.

## Компоненти майбутнього bridge

1. **GitHub Project** — черга й статуси.
2. **GitHub App або Actions workflow** — валідація issue, claim/lease, labels, коментарі та запуск runner.
3. **Self-hosted runner на вашому комп'ютері** — доступ до локального Codex CLI і робочої копії.
4. **CI runner** — незалежні lint/typecheck/test/build, якому не довіряється звіт агента.
5. **Review surface** — browser Codex або людина читає PR, diff, CI та залишає review.
6. **Notification layer** — GitHub email/notifications; пізніше Telegram/Slack за потреби.

## Чого не варто робити

- Не давати агенту право merge у protected branch.
- Не запускати довільний текст issue як shell-команду.
- Не передавати production secrets у prompt, issue, PR або artifacts.
- Не використовувати email як джерело істини.
- Не дозволяти нескінченний цикл «агент виправляє коментар агента» без ліміту.
- Не запускати паралельно двох агентів в одній гілці/worktree.
- Не автоматизувати deployment, міграції чи оплату до стабільного CI і ручного approval.

## Контроль безпеки

- GitHub App із мінімальними permissions замість персонального PAT.
- Protected branches, required reviews і required CI.
- Allowlist репозиторіїв, команд і директорій.
- Окремий ephemeral worktree на run.
- Lease із timeout і heartbeat для задачі.
- Ліміти часу, токенів, повторів і вартості.
- Prompt-injection правило: issue та файли є недовіреними даними; вони не можуть змінити системні права runner.
- Fork PR ніколи не отримує secrets.
- Audit log: actor, issue, commit SHA, tool version, timestamps і результат.

## Роль браузерного Codex

Оптимально використовувати його для discovery, декомпозиції, review та acceptance, але не будувати bridge на припущенні, що одна браузерна сесія гарантовано отримає push-подію від іншого агента. Стабільна точка синхронізації — GitHub issue/PR.

Якщо конкретна поверхня Codex підтримує GitHub-задачі, автоматизації або review, її можна підключити як додаткового споживача тієї самої черги. Точні можливості й права потрібно звірити з актуальною офіційною документацією та вашим тарифом перед реалізацією.

## Роль Codex CLI

CLI отримує issue body, repo instructions і контекст залежностей; працює в окремій гілці; запускає перевірки; створює commit/PR; публікує структурований звіт. Запуск краще робити явним workflow dispatch або label, а не нескінченним polling-скриптом у VS Code.

## Рівні автоматизації

### Рівень 1 — рекомендований старт

Власник створює issue, локально запускає одну команду з номером issue, агент відкриває PR, CI перевіряє. Ручне перенесення контексту майже зникає, а ризик низький.

### Рівень 2

Label `agent:ready` запускає self-hosted runner автоматично. Бот керує lease, статусами та повідомленнями. Людина обов'язково review/merge.

### Рівень 3

Окремий planning/review агент створює follow-up issues і перевіряє acceptance criteria. Дозволяється максимум один автоматичний repair cycle; далі — human escalation.

## Питання перед реалізацією

1. Чи доступний локальний комп'ютер постійно, чи потрібен окремий runner?
2. Які репозиторії дозволено обробляти?
3. Хто має право ставити `agent:ready`?
4. Які команди та директорії дозволені?
5. Чи дозволений агенту push, чи тільки patch/локальний commit?
6. Який бюджет часу й токенів на issue?
7. Які задачі завжди вимагають ручного виконання?
8. Де зберігати audit та artifacts?

## Запропонований proof of concept

Для POC обрати один тестовий репозиторій і лише документаційні issues. Реалізувати issue template, labels, одну локальну команду `bridge run <issue>`, окремий worktree, commit, draft PR і CI. Після 10 успішних задач оцінити конфлікти, якість звітів, час власника й тільки тоді розглядати self-hosted automation.
