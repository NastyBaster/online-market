# Детальний roadmap мінімально робочого шаблону

## Ціль релізу 0.1

За 10 робочих днів створити презентаційний магазин, де відвідувач проходить шлях «каталог → товар → кошик → checkout → demo-оплата → замовлення», а demo-адміністратор — «вхід → товар → ціна/залишок → замовлення → статус». Додатковий резерв: 2–5 робочих днів.

## Критерії релізу

- mobile-first storefront із demo-товарами;
- серверний перерахунок кошика;
- demo checkout без списання грошей;
- мінімальна захищена адмінпанель;
- CSV-імпорт із preview помилок;
- брендинг через конфігурацію;
- seed/reset demo;
- базові SEO, accessibility, security headers і E2E;
- документація нового deployment і передачі клієнту.

## Фаза 0 — контракт MVP (день 0, 2–4 години)

### Задачі

- Затвердити одну demo-нішу, назву, палітру та 20–30 товарів.
- Зафіксувати сторінки: home, category, product, cart, checkout, success, login, account/orders, admin/products, admin/orders, admin/settings.
- Підготувати acceptance checklist і список того, що явно не входить у 0.1.
- Визначити один формат CSV та demo-сценарій презентації.

### Вихід

Немає відкритих продуктових питань, які блокують scaffold.

## Фаза 1 — фундамент (дні 1–2)

### Задачі

- Створити Next.js TypeScript-проєкт, ESLint, Prettier, Vitest і Playwright.
- Налаштувати env validation, Prisma, PostgreSQL, міграції та seed.
- Створити layout, дизайн-токени, header, footer, container, кнопки, поля та повідомлення.
- Реалізувати `store-config`, `DEMO_MODE` і feature flags.
- Додати CI: install, lint, typecheck, unit test, build; E2E окремим job.

### Приймання

- чиста БД піднімається однією документованою послідовністю;
- seed створює адміністратора, каталог і налаштування;
- home працює на mobile та desktop;
- жодного секрету в репозиторії.

## Фаза 2 — каталог (дні 3–4)

### Задачі

- Реалізувати Category, Product, ProductVariant, ProductImage та Inventory.
- Створити home, категорію, пошук, товар і breadcrumbs.
- Додати pagination, empty state, unavailable state, image fallback.
- Додати metadata, canonical, sitemap, robots та Product JSON-LD.
- Покрити розрахунок ціни і вибір варіанта unit-тестами.

### Приймання

- користувач знаходить товар категорією або пошуком;
- ціна й залишок надходять із сервера;
- неопублікований товар не доступний через прямий URL;
- сторінка використовує keyboard navigation і коректні labels.

## Фаза 3 — кошик і checkout (дні 5–6)

### Задачі

- Реалізувати анонімний кошик у signed cookie/session.
- Додати add/update/remove, серверний перерахунок і промокод із простим правилом.
- Реалізувати checkout: ім'я, телефон, email, місто, спосіб доставки, коментар.
- Створити Order та immutable OrderItem snapshot.
- Реалізувати demo payment і shipping providers, success/failure сценарії.
- Додати явний demo banner та заборону production providers у demo.

### Приймання

- клієнт не може підмінити ціну запитом;
- подвійна відправка форми не створює два замовлення;
- demo-оплата ніколи не викликає зовнішній банк;
- повний purchase journey проходить E2E.

## Фаза 4 — admin (дні 7–8)

### Задачі

- Реалізувати admin authentication, secure cookie і server-side role checks.
- Списки й форми товарів: create, edit, publish/archive, price, stock, images.
- Список і деталі замовлення; дозволені переходи статусів.
- CSV upload → validation preview → confirm import → report.
- Store settings для назви, контактів, логотипа, кольорів і банера.
- AuditLog для критичних змін.

### Приймання

- неавторизований API-запит до admin отримує відмову;
- SKU не дублюється;
- помилка одного CSV-рядка пояснюється і не пошкоджує інші дані;
- зміна теми не потребує редагування компонента.

## Фаза 5 — demo та передача (дні 9–10)

### Задачі

- Створити demo login з обмеженою роллю та без доступу до секретів.
- Створити reset/seed процедуру і очищення завантажених demo-файлів.
- Додати сторінку demo mailbox або лог повідомлень без реальних відправлень.
- Провести responsive, accessibility, security і smoke review.
- Розгорнути free-tier demo; перевірити cold start і повторний deploy.
- Завершити owner/customer документацію та сценарій презентації.

### Приймання

- demo відновлюється з нуля за інструкцією;
- публічний demo-admin не може змінити ролі чи інтеграції;
- усі критичні E2E проходять у CI;
- немає реальних персональних даних.

## Резерв — дні 11–15

Використовується тільки для виправлень, полірування UX, deployment-проблем, accessibility та документації. Нові функції не додаються.

## Після MVP

### 0.2 — перший клієнт

- production email provider;
- один реальний payment adapter із підписаними ідемпотентними webhook;
- Нова пошта;
- production backup/restore;
- юридичні сторінки та аналітика;
- staging і контрольовані міграції.

### 0.3 — продуктізація

- другий preset бренду;
- автоматизований bootstrap нової інсталяції;
- release versioning і changelog;
- upgrade runbook та матриця клієнтських версій;
- пакети підтримки і SLA.

### 1.0 — тільки після кількох продажів

- магічні посилання для покупців;
- розширені фільтри та PostgreSQL full-text/trigram;
- повернення, refunds, складні промо;
- інтеграція ERP лише за оплаченою потребою.

## Ризики

| Ризик | Контроль |
|---|---|
| Розповзання scope | Усе поза критеріями 0.1 переноситься в backlog |
| Нестабільний free tier | Seed, export, повторний deployment і відсутність SLA-обіцянок |
| Fork на клієнта | Конфігурація, providers, feature flags, єдине ядро |
| Витік demo-секретів | Окреме environment без production credentials |
| Небезпечна адмінка | Server-side RBAC, audit, rate limits, E2E negative tests |
| Залежність від платформи | PostgreSQL, S3 API, стандартні env та export runbook |
