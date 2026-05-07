# Tasks — in flight

## Market page polish pass (in flight)

- [x] Write polish plan for market page
- [x] Receive implementation approval
- [x] Make market list hierarchy and scanability feel composed
- [x] Flatten sentiment panel density while preserving source states
- [x] Tune chart panel controls and data summary polish
- [x] Verify lint from `frontend/` via local ESLint binary (0 errors, existing warnings elsewhere)
- [x] Verify TypeScript from `frontend/` via local TypeScript binary (`tsc --noEmit` clean)
- [x] Manual visual smoke stopped at user direction

## Market page hardening pass (in flight)

- [x] Write hardening plan for market page
- [x] Receive implementation approval
- [x] Harden market ticker and sentiment polling against stale responses
- [x] Harden market page overflow, empty, error, and live status states
- [x] Harden chart inspection panel accessible data fallback and edge states
- [x] Verify lint from `frontend/` via bundled Node runtime (0 errors, existing warnings elsewhere)
- [x] Verify TypeScript from `frontend/` via bundled Node runtime (`tsc --noEmit` clean)
- [x] Manual smoke: long symbols, empty filter, API failure, mobile width, keyboard inspect (skipped at user direction)

## Market page layout pass (in flight)

- [x] Write layout plan for market page
- [x] Receive implementation approval
- [x] Make asset list the primary market page object
- [x] Add explicit chart inspection affordances
- [x] Flatten sentiment section hierarchy
- [x] Verify lint from `frontend/` via bundled Node runtime (0 errors, existing warnings elsewhere)
- [x] Manual smoke: loading, error, empty filter, mobile width, keyboard sort/inspect (skipped at developer direction)

## Dashboard distill pass (in flight)

- [x] Write dashboard distillation plan
- [x] Receive implementation approval
- [x] Remove redundant dashboard shortcuts and copy
- [x] Update Dashboard Storybook docs to match distilled structure
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)
- [ ] Manual smoke: empty data, API failure, mobile width, keyboard flow (blocked: frontend dependencies absent)

## Dashboard hardening pass (in flight)

- [x] Write hardening plan for dashboard page
- [x] Receive implementation approval
- [x] Harden dashboard async fetches, edge-case copy, and clone recovery
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH; `frontend/node_modules` absent)
- [ ] Manual smoke: long names, empty data, API failure, mobile width, keyboard flow (blocked: frontend dependencies absent)

## Dashboard clarify pass (in flight)

- [x] Write copy-focused plan for dashboard clarification
- [x] Receive implementation approval
- [x] Tighten dashboard headline, primary action copy, states, and messages
- [x] Update Dashboard Storybook docs to match current implementation
- [ ] Verify lint (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)

## Dashboard flagship polish (in flight)

- [x] Align dashboard page to the design system polish checklist
- [x] Fix responsive strategy rows, touch targets, and state tokens
- [x] Remove visible dashboard shell drift in the sidebar
- [ ] Verify lint and local rendering (blocked: no npm/pnpm/yarn/corepack on PATH and no frontend/node_modules)

## FEAT-103 — Dashboard Toast Notifications (in flight)

Frontend
- [x] Add `import { toast } from "sonner"` and remove unused `CheckCircle2` import
- [x] Delete `successMessage` state, its `useEffect` auto-dismiss timer, and `setSuccessMessage(null)` calls
- [x] Replace `setSuccessMessage(...)` calls in `handleClone` with `toast.success(...)`
- [x] Replace `setError(...)` in `handleClone` catch with `toast.error(...)`
- [x] Remove `{successMessage && (...)}` JSX block; gate inline error alert on `error && strategiesLoadFailed`
- [x] Confirm `loadStrategies` still clears `error` on retry start (no change needed)

Verification
- [ ] Manual smoke: duplicate success toast (AC-001), partial-refresh toast (AC-002), duplicate failure toast (AC-003), layout stability (AC-004), toast dismissal (AC-005), blocking load error inline (AC-006), mobile 360px viewport (AC-007) — requires running dev server
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)

---

## FEAT-102 — Pandas TA Indicator Calculation Parity (done)

Backend
- [x] Add `pandas==3.0.2`, `numpy==2.4.4`, `pandas-ta-classic==0.5.44` to `requirements.txt`
- [x] New `app/backtest/_ta_adapter.py` — `to_series` / `from_series` adapter (list ↔ pandas Series, None ↔ NaN)
- [x] Rewrite `app/backtest/indicators.py` — 10 indicator functions replaced with thin pandas-ta-classic wrappers; `fibonacci_retracements` and `price_variation_pct` retained as-is
- [x] Update `tests/test_indicators.py` — 5 tests adjusted to match pandas-ta behavior (OBV index-0, ATR init, stochastic flat price, Ichimoku ISB displacement)
- [x] Add `synthetic_ohlcv_candles` fixture to `tests/conftest.py` (seeded GBM, 252 candles)
- [x] New `tests/test_pandas_ta_indicators.py` — 32 parity/regression tests (TC-01 through TC-08)
- [x] Fix warmup boundary in `tests/test_chart_data.py` — RSI(14) first valid at index 13, not 14

Verification
- [x] `pytest tests/test_pandas_ta_indicators.py -v` → 29 passed (post C1-C4 fix rewrite)
- [x] `pytest tests/test_indicators.py -v` → 51 passed
- [x] `pytest tests/ --ignore=tests/test_billing.py -v` → 226 passed, 3 pre-existing auth failures (unrelated)

C1–C4 structural fixes (2026-05-04)
- [x] C1: moved `os.environ` + `app.main` import to module level; added `engine`/`session`/`client` fixtures — TC-06 no longer lazy-imports app inside test body
- [x] C2: TC-01 rewritten to use `interpret_strategy()` + `run_backtest()` + signal parity loop (AC-1 backtest path now exercised)
- [x] C3: TC-02 calls `GET /market/chart-data` for MACD/Bollinger/Stochastic/ADX/Ichimoku; TC-03 Fibonacci via HTTP (AC-2/AC-3 HTTP path now exercised)
- [x] C4: TC-07 calls `run_backtest()` twice and compares `num_trades`, `total_return_pct`, `final_balance`, `win_rate_pct`, trade `pnl`/`entry_price`/`exit_price` (AC-7 now exercised)
- [x] TC-08 upgraded to call `GET /market/chart-data` twice and compare responses

Code-review findings fixed (2026-05-04)
- [x] C1-fix: `indicators.py` Bollinger column lookup uses prefix search (`startswith`) instead of `:.1f` format — prevents KeyError for std_dev like 2.25
- [x] M1-fix: TC-01 (12 tests) now uses `from_series(ta.*, n)` raw reference for all indicators — no longer self-referential against `ind.*`
- [x] M2-fix: TC-02 restructured as `TestTC02SingleSeriesChartDataParity` with 5 HTTP tests (SMA/EMA/RSI/ATR/OBV) against raw `ta.*` reference
- [x] M3-fix: TC-03 restructured as `TestTC03MultiSeriesChartDataParity` (MACD/Bollinger/Stochastic/ADX/Ichimoku/Fibonacci) against raw `ta.*`/`_fib_ref()` pure-math — no longer self-referential

Verification (post code-review fixes)
- [x] `pytest tests/test_pandas_ta_indicators.py -v` → 40 passed
- [x] `pytest tests/ --ignore=tests/test_billing.py -v` → 237 passed, 3 pre-existing auth failures (unrelated)

---

## FEAT-101 — Backtest Toast Notifications (done)

Frontend
- [x] Install `sonner ^2.0.7` (`package.json` + `package-lock.json`)
- [x] Mount `<Toaster position="top-right" richColors />` in `src/app/layout.tsx`
- [x] Replace single-backtest inline banner with `toast.success(…)` in backtest page
- [x] Replace batch-backtest inline banner with `toast.success(…)` in backtest page
- [x] Replace shortcut guidance inline banner with `toast.info(…)` in backtest page
- [x] Remove `statusMessage` state declaration and `{statusMessage && (…)}` JSX block

Verification
- [x] `npm run lint` → 0 errors
- [x] `npx tsc --noEmit` → clean
- [x] `npm run build` → clean
- [ ] Manual smoke: single-run toast, batch-run toast, shortcut toast, failure (no toast) — requires running dev server

---

## FEAT-100 — Market Indicator Inspection Chart (done)

Backend
- [x] `GET /market/chart-data` (`app/api/chart.py`) returning candles + indicator series
- [x] Pydantic schemas (`ChartCandle`, `IndicatorPoint`, `IndicatorSeries`, `ChartDataStatus`, `ChartDataResponse`) in `app/schemas/market.py`
- [x] Indicator parser supporting all 11 strategy indicators (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, ADX, Ichimoku, OBV, Fibonacci) with multi-output series
- [x] Tests: 10 cases under `tests/test_chart_data.py` (auth, validation, alignment, warm-up null, multi-output)

Frontend
- [x] Types (`src/types/chart.ts`)
- [x] Indicator catalog sourced from `BLOCK_REGISTRY` (`src/lib/chart-indicators.ts`)
- [x] `useChartData` hook
- [x] `MarketChartPanel` slide-over (~80% viewport on md+) with candlestick + volume + price overlay + oscillator pane + tooltip readout + indicator selector + empty/error/loading states
- [x] Wired into `app/(app)/market/page.tsx` via clickable pair labels (filter/sort state preserved)

Verification
- [x] `pytest tests/test_chart_data.py -q` → 10 passed
- [x] `npx tsc --noEmit` → clean
- [x] `npm run lint` → no errors/warnings introduced by FEAT-100 files

Risks / gaps
- Frontend test runner not present in this repo (no `npm test` script); per direction, no Vitest/RTL added — TC-01/02/03/04/07/09/10 cannot be auto-verified, only via manual + Storybook.
- 11 unrelated backend tests still fail on main (`test_api_auth`, `test_billing`) — pre-existing 401/403 idiom & Stripe webhook setup, untouched by this feature.
