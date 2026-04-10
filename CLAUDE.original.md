# CLAUDE.md

**Blockbuilders** — web-based no-code strategy lab for retail crypto traders to visually build and backtest strategies for major pairs. Post-MVP iteration; preserve simplicity-first intent.

## Stack
- **Frontend:** Next.js 16.x (App Router) + TypeScript, Tailwind CSS — see `frontend/CLAUDE.md`
- **Backend:** FastAPI 0.129.x monolith, Python 3.12, Postgres, Redis, S3-compatible storage — see `backend/CLAUDE.md`
- Single deployable backend unit; worker mode for background jobs

## Architecture
- One module > many micro-modules; add to existing files before creating new ones
- No microservices, Kubernetes, gRPC, or new infrastructure
- Strategy metadata (non-execution data) lives under top-level `metadata` key
- Strategy tags: relational tables, **not** inside strategy version JSON
- Credits/add-ons: simple integer fields on user record (no extra tables)
- Import/export: JSON only, explicit validation

## Non-negotiable principles
- Trade-off order: **Correctness → Simplicity → Fewer lines → Performance**
- No abstractions, configs, or features "for later" (YAGNI)
- Functions/components <40–50 lines; early returns over deep nesting
- Plain-language error messages: what went wrong + next action + help link if available
- Market data quality: explicit validation + stored metadata; warn users, never silently fail
- Prefer in-app notifications over email for time-sensitive updates; email/webhook only on explicit opt-in

## Secure baseline versions
- Next.js **16.x**, FastAPI **0.129.x**, Python **3.12**
- On version upgrades: smoke test OAuth callback, login, strategy creation, backtest run

## Spec precedence (highest → lowest)
1. `docs/product.md` — current product truth
2. `docs/prd-*.md` — feature-level PRDs
3. `docs/phase2.md` — current iteration scope
4. `docs/mvp.md` — MVP baseline + guardrails
5. `docs/mvp_plan.md` — backlog seed (not authoritative)

- "MVP only" → use `docs/mvp.md` as sole truth
- New feature outside active spec → update `docs/phase2.md` (goal, non-goals, AC) first
- New feature → create `docs/prd-<feature>.md` + update `docs/product.md`

## MVP scope
**In scope:** canvas builder (single asset/timeframe, MA/EMA/RSI/MACD/BB/ATR, simple logic/TP/SL), OHLCV backtesting, strategy/result history, scheduled re-backtests, email/password auth, soft usage limits.

**Out of scope:** real-time trading, multi-asset/timeframe strategies, marketplace/monetization, complex billing, advanced analytics. Asset expansion beyond BTC/USDT + ETH/USDT requires explicit listing in `docs/product.md`.

Post-MVP features require explicit definition in `product.md` or `phase2.md`.

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
- Unused configuration options "for future flexibility"
- Repeat identical instructions in `frontend/CLAUDE.md` or `backend/CLAUDE.md`
