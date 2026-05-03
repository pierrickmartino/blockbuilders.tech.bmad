# Tasks — in flight

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
