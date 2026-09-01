# Online Market Template

## Storefront Foundation

The runnable application uses Node.js 22 and npm 10.5+ (see `.nvmrc`). Install dependencies from the lockfile with `npm ci`, then start the local app with `npm run dev` and open `http://localhost:3000`.

The foundation runs in demo mode by default. Copy `.env.example` to `.env.local` to change `DEMO_MODE` or the non-secret store name. The anonymous cart reads `CART_COOKIE_SECRET` when configured and otherwise falls back to a process-local non-production key so local development and CI can exercise the cart without storing a real secret in the repository. Demo mode is local-only and does not call payment, delivery, or other paid services.

Quality checks:

- `npm run lint` — ESLint
- `npm run typecheck` — strict TypeScript
- `npm test` — Vitest unit tests
- `npm run test:bridge` — Agent Bridge tests
- `npm run build` / `npm run start` — production build and server
- `npm run test:e2e` — Playwright desktop and mobile smoke tests

The application boundary is `src/app`; domain logic belongs in `src/modules` and external adapters belong in `src/providers`. This foundation intentionally contains no database, catalogue, cart, checkout, authentication, or payment functionality.

Тиражований шаблон українського інтернет-магазину: безпечний демонстраційний стенд на безкоштовних тарифах і окремі production-інсталяції для клієнтів.

## Документація

- [Технічний стек і мінімальні версії](docs/STACK.md)
- [Детальний roadmap MVP](docs/ROADMAP.md)
- [Інструкція власнику продукту](docs/OWNER_GUIDE.md)
- [Інструкція покупцю магазину](docs/CUSTOMER_GUIDE.md)
- [Обговорення Agent Bridge](docs/AGENT_BRIDGE.md)
- [Практична інструкція Agent Bridge](docs/BRIDGE_RUNBOOK.md)
- [Agent Bridge installation and verification guide](docs/AGENT_BRIDGE_INSTALLATION.md)
- [Глосарій термінів Agent Bridge](docs/BRIDGE_GLOSSARY.md)
- [Журнал пілота Agent Bridge](docs/BRIDGE_PILOT_LOG.md)
- [ADR автономного Agent Bridge](docs/adr/0001-bounded-autonomous-agent-bridge.md)
- [Локальний Agent Bridge orchestrator](docs/BRIDGE_RUNBOOK.md#8-local-orchestrator-mvp)
- [План вилучення та версіювання Agent Bridge Kit](docs/AGENT_BRIDGE_KIT_PLAN.md)
- [Інструкції AI-агентам](AGENTS.md)

## Межі MVP

Перший реліз — один модульний Next.js-застосунок, а не SaaS і не набір мікросервісів. Він включає каталог, картку товару, кошик, спрощене оформлення, demo-платіж, demo-доставку, замовлення, мінімальну адмінпанель, CSV-імпорт, брендинг і відновлювані demo-дані.

Redis, окремий backend, Meilisearch, ERP, бонусна система, мультимовність і справжні платіжні інтеграції не входять до першого релізу.

## Поточний етап

Розробку магазину призупинено до завершення мінімального Agent Bridge. GitHub Issues є чергою та джерелом істини: браузерний Codex проєктує і формує acceptance criteria, Codex CLI виконує одну готову issue у власній гілці, GitHub Actions незалежно перевіряє контракт, а власник приймає чутливі та глобальні рішення. Практичний процес описано в [Bridge Runbook](docs/BRIDGE_RUNBOOK.md).

## Орієнтир строків

Робочий demo MVP розрахований на **10 робочих днів для одного досвідченого full-stack розробника**, плюс 2–5 днів резерву на дизайн, виправлення та deployment. Це оцінка, а не гарантія: вона передбачає готовий зміст, відсутність нестандартних інтеграцій і суворе дотримання меж MVP.
