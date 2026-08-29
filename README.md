# Online Market Template

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
