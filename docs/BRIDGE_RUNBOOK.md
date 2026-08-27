# Agent Bridge Runbook

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
