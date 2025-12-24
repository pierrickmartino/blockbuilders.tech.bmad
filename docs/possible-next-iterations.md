# Possible Next Iterations (Out-of-Scope Items)

Grouped by suggested priority for future improvements. If you want a different prioritization scheme, let me know and I will re-sort.

## Priority 1 – Core product expansion
- Multi-asset or multi-timeframe logic/portfolios (canvas + backtest engine + scheduling) — `prd-epic3-strategy-canvas.md`, `prd-epic4-backtesting-engine-and-runs.md`, `prd-epic5-scheduled-re-backtests.md`
- Short-selling, hedging, multiple sub-strategies — `prd-epic3-strategy-canvas.md`
- Complex order types (OCO, trailing stops, etc.) — `prd-epic4-backtesting-engine-and-runs.md`
- Real-time/tick-level paper trading or live order simulation — `prd-epic4-backtesting-engine-and-runs.md`, `prd-epic5-scheduled-re-backtests.md`
- Custom user-defined indicators — `prd-epic3-strategy-canvas.md`
- Backtest creation inside Epic 3 (explicitly deferred to Epic 4) — `prd-epic3-strategy-canvas.md`

## Priority 2 – Automation & platform/ops
- Intraday or “every X minutes” scheduling — `prd-epic5-scheduled-re-backtests.md`
- Per-user cron/time-of-day scheduling configuration — `prd-epic5-scheduled-re-backtests.md`
- Notifications (email/Telegram/etc.) — `prd-epic5-scheduled-re-backtests.md`
- Billing/quota enforcement beyond simple soft limits — `prd-epic4-backtesting-engine-and-runs.md`
- Complex observability stack (Prometheus, tracing, etc.) — `prd-epic0-foundation-environment.md`
- Multi-environment config beyond dev + simple prod-like — `prd-epic0-foundation-environment.md`
- Additional user-facing workflows beyond stack health (auth/strategies/backtests) in Epic 0 — `prd-epic0-foundation-environment.md`

## Priority 3 – UX/insights & collaboration
- Drawdown chart — `prd-backtest-results-equity-curve-chart.md`
- Compare multiple runs on one chart — `prd-backtest-results-equity-curve-chart.md`
- Save/export chart images — `prd-backtest-results-equity-curve-chart.md`
- Advanced analytics (factor attribution, etc.) — `prd-epic4-backtesting-engine-and-runs.md`
- Real-time market data on the canvas — `prd-epic3-strategy-canvas.md`
- Strategy sharing/collaboration — `prd-epic3-strategy-canvas.md`
