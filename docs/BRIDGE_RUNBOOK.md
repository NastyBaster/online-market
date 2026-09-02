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
5. Власник додає `agent:ready`. Workflow перевіряє контракт.

Якщо label автоматично видалено, прочитайте bot comment, доповніть issue і повторно додайте `agent:ready`.

### Сесії Architect та Implementer

Власник не керує життєвим циклом чатів вручну — потрібну дію завжди оголошує агент.

- Нова продуктова issue починається в новій Architect-сесії. Агент пише `СЕСІЯ: ВІДКРИТИ НОВУ` і надає компактний handoff замість повної історії попередніх PR.
- Реалізація issue виконується в окремій CLI implementation-сесії. Її prompt посилається на `AGENTS.md` та повний GitHub issue замість дублювання всього контракту.
- Independent review виконується в новій CLI review-сесії. Implementation agent не перевіряє і не merge-ить власну роботу.
- Один bounded repair cycle можна продовжити в review/repair-контексті лише для того самого PR. Новий scope потребує нової issue та нової сесії.
- Після merge, закриття або остаточного блокування агент пише `СЕСІЮ ЗАВЕРШЕНО — наступну issue починайте в новому чаті.`

Мінімальний handoff містить: repository, актуальний `main` SHA, номер і стан issue/PR, результат checks, невирішене рішення власника та наступну bounded задачу. Не копіюйте повні terminal transcripts, email metadata чи описи давно merged PR: фактичний стан відновлюється з GitHub.

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
5. Для змін поверніть issue у `agent:ready` із консолідованим списком. Дозволено один автоматизований repair cycle.
6. Merge виконує тільки власник.

## 6. Blocked і аварійна зупинка

Implementer ставить `agent:blocked` і залишає один коментар із: blocking condition, already tried, потрібне рішення та безпечний default. Він не публікує secret і не продовжує небезпечну дію.

Для зупинки: зніміть `agent:ready`/`agent:running`, скасуйте workflow, відкличте тимчасовий token, закрийте draft PR і збережіть audit trail. Не видаляйте історію інциденту.

## 7. Пілот

Перші 10 задач повинні змінювати лише документацію або GitHub metadata. Вимірюйте час власника, кількість уточнень, contract failures, repair cycles і помилкові зміни. Self-hosted автоматизація дозволяється лише після окремого рішення власника за результатами пілоту.
