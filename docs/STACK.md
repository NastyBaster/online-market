# Технічний стек і мінімальні версії

## Зафіксована baseline-конфігурація

Версії нижче — консервативна стартова специфікація шаблону. Перед першим scaffold слід перевірити актуальні release notes і сумісність peer dependencies та зафіксувати точні версії у lockfile.

| Компонент | Мінімум | Політика |
|---|---:|---|
| Node.js | `22.0.0` | Підтримуємо одну LTS-лінію; рекомендується останній patch Node 22 |
| npm | `10.5.0` | Єдиний package manager; commit `package-lock.json` |
| TypeScript | `5.5.0` | `strict: true` |
| Next.js | `15.0.0` | App Router |
| React / React DOM | `19.0.0` | Версії мають збігатися |
| PostgreSQL | `16.0` | Локально й production одна major-версія |
| Prisma / Prisma Client | `6.0.0` | Версії мають збігатися |
| Tailwind CSS | `4.0.0` | Без платної UI-бібліотеки |
| Zod | `3.23.0` | Валідація env, форм і API payload |
| Vitest | `2.0.0` | Unit та integration tests |
| Playwright | `1.48.0` | Критичні E2E-сценарії |

У `package.json` потрібно зафіксувати `engines.node: ">=22 <23"` та `engines.npm: ">=10.5 <12"`. Це не означає, що старші версії гарантовано несумісні; це контрольована матриця, яку ми реально перевіряємо.

## Мінімальна архітектура

- **Next.js:** storefront, admin UI і server-side route handlers в одному deployment.
- **PostgreSQL + Prisma:** каталог, замовлення, користувачі, конфігурація і demo jobs.
- **Tailwind:** токени теми та адаптивний UI.
- **S3-compatible storage:** зображення; локально допускається MinIO або файловий mock.
- **Auth:** гостьовий checkout; для адміністратора — email/password із надійним hash. Magic link для покупця є наступним етапом.
- **Search:** PostgreSQL `ILIKE` для найпершого demo; trigram/full-text після стабілізації схеми.
- **Providers:** `DemoPaymentProvider`, `DemoShippingProvider`, `ConsoleEmailProvider`.

## Мінімальна модель даних

`User`, `Session`, `Category`, `Product`, `ProductVariant`, `ProductImage`, `Inventory`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Shipment`, `PromoCode`, `StoreSettings`, `AuditLog`.

Для MVP один склад і одна валюта UAH. Гроші зберігаються цілим числом у копійках. Час — UTC. SKU унікальний. Видалення товару з історичними замовленнями замінюється архівацією.

## Free-tier demo та production

Demo може працювати на безкоштовних тарифах deployment, PostgreSQL і object storage. Sandbox або власні demo adapters не списують гроші. Безкоштовні тарифи не мають гарантії SLA і можуть змінюватися.

Production клієнта використовує ті самі open-source компоненти, але окремі облікові записи, домен, БД, storage, резервні копії та ключі. Клієнт оплачує інфраструктуру й транзакції напряму або в межах договору підтримки.

## Відкладені технології

NestJS, Redis, BullMQ і Meilisearch додаються лише після вимірюваної потреби. Directus можна підключити, якщо вартість розвитку власної мінімальної адмінпанелі перевищить користь; перед комерційним використанням треба перевірити актуальні умови ліцензії.
