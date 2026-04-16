# CLAUDE.md

**Blockbuilders** — web no-code strategy lab, retail crypto traders build/backtest strategies visually, major pairs. Post-MVP iteration; keep simplicity-first.

## Claude principles
- Enter plan mode for any 3+ step task
- Write plan to tasks/todo.md before any implementation
- When given a bug: just fix it. No hand-holding.
- After any correction, update tasks/lessons.md
- Never mark done without proving it works

## Stack
- **Frontend:** Next.js 16.x (App Router) + TypeScript, Tailwind CSS — see `frontend/CLAUDE.md`
- **Backend:** FastAPI 0.129.x monolith, Python 3.12, Postgres, Redis, S3-compatible storage — see `backend/CLAUDE.md`
- Single deployable backend; worker mode for background jobs
- On version upgrade: smoke test OAuth callback, login, strategy creation, backtest run

## Architecture
- One module > many micro-modules; add to existing files before new ones
- No microservices, Kubernetes, gRPC, new infra
- Strategy metadata (non-execution) under top-level `metadata` key
- Strategy tags: relational tables, **not** in strategy version JSON
- Credits/add-ons: simple integer fields on user record (no extra tables)
- Import/export: JSON only, explicit validation

## Non-negotiable principles
- Trade-off order: **Correctness → Simplicity → Fewer lines → Performance**
- No abstractions/configs/features "for later" (YAGNI)
- Functions/components <40–50 lines; early returns over deep nesting
- Plain-language errors: what wrong + next action + help link if available
- Market data: explicit validation + stored metadata; warn users, never silent fail
- Prefer in-app notifications over email for time-sensitive; email/webhook only explicit opt-in

## Spec precedence (highest → lowest)
1. `docs/product.md` — current product truth
2. `docs/prd-*.md` — feature PRDs
3. `docs/phase2.md` — current iteration scope
4. `docs/mvp.md` — MVP baseline + guardrails
5. `docs/mvp_plan.md` — backlog seed (not authoritative)

- "MVP only" → `docs/mvp.md` sole truth
- New feature outside active spec → update `docs/phase2.md` (goal, non-goals, AC) first
- New feature → create `docs/prd-<feature>.md` + update `docs/product.md`

## MVP scope
**In scope:** canvas builder (single asset/timeframe, MA/EMA/RSI/MACD/BB/ATR, simple logic/TP/SL), OHLCV backtesting, strategy/result history, scheduled re-backtests, email/password auth, soft usage limits.

**Out of scope:** real-time trading, multi-asset/timeframe strategies, marketplace/monetization, complex billing, advanced analytics. Asset expansion beyond BTC/USDT + ETH/USDT need explicit listing in `docs/product.md`.

Post-MVP features need explicit definition in `product.md` or `phase2.md`.

## Doc hygiene — update on every feature change
When adding/changing features, update `docs/product.md` + matching `docs/prd-*.md` and `docs/tst-*.md`:

| Feature area | Sections to update |
|---|---|
| New PRD/feature | 17.1 + relevant sections; create matching `tst-*.md` |
| Dashboard / strategy list / bulk actions | 9.3, 13 |
| Strategy performance by period grid | 9.3, 13, 17.1 |
| Multi-period batch backtesting | 5.1, 9.4, 13, 16.1, 17.1 |
| Canvas (UX, health bar, SmartCanvas, undo/redo, toolbar, editor header) | 4, 9.3, 13, 16.1, 17 |
| Backtest (visualizations, comparison, exports, metrics, narrative, warnings, education) | 5.4–5.5, 9.13, 13, 17.1 |
| Billing / user tiers | 2.3–2.4, 13 |
| Onboarding / post-signup routing / wizard | 2.1, 4.4, 9.2, 9.3, 9.13, 11, 13, 17.1 |
| Indicator palette / block library / inline popover / bottom sheet | 4, 9.3, 13, 17.1 |
| Notifications / analytics / structured logging | 9.5, 9.13, 9.14, 11, 13, 17.1 |
| Asset universe expansion | 3.4, 6.2, 13, 14.1, 16.1, 17 |
| Storybook / design system | 13, 16.1, 17.1 |

## Never do (unless user insists + spec allows)
- New global utilities or core abstractions
- New major library or framework
- Complex HOCs when simple inline works
- Unused config options "for future flexibility"
- Repeat identical instructions in `frontend/CLAUDE.md` or `backend/CLAUDE.md`