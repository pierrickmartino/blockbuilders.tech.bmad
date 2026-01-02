# PRD – Benchmark Comparison (Buy-and-Hold)

**Status:** Implemented
**Owner:** Product
**Last Updated:** 2025-12-28

---

## 1. Goal

Let users compare a strategy’s performance against a **buy-and-hold benchmark** for the same asset and backtest period. This provides immediate context on whether the strategy adds value.

---

## 2. Non-Goals

- No multi-asset benchmarks.
- No factor models or advanced attribution.
- No new charting library.
- No intraday/tick-level benchmark simulation (use existing OHLCV candles only).

---

## 3. User Story

“As a trader, I want to see my strategy vs buy-and-hold on the same equity chart and a simple alpha/beta comparison so I can quickly judge whether the strategy is better than just holding.”

---

## 4. Functional Requirements

### 4.1. Benchmark Equity Curve

- For every backtest, compute a **buy-and-hold equity curve** using the same asset, timeframe, and date range.
- Use the same initial balance as the strategy backtest.
- Use simple holding logic:
  - Buy at the first candle open.
  - Hold until the last candle close.
  - Apply no fees and no slippage (keep it simple).

### 4.2. Metrics

- **Benchmark Return %** = (benchmark_final_equity - initial_balance) / initial_balance * 100.
- **Alpha** = strategy total return % − benchmark return %.
- **Beta** = covariance(strategy_returns, benchmark_returns) / variance(benchmark_returns).
  - Use candle-to-candle simple returns.
  - If benchmark variance is 0, set beta to `0`.

### 4.3. API & Storage

- Store benchmark equity curve in object storage alongside the strategy equity curve.
- Expose a new endpoint to fetch benchmark equity curve:
  - `GET /backtests/{run_id}/benchmark-equity-curve`
- Include `benchmark_return`, `alpha`, and `beta` in backtest summary response (`GET /backtests/{run_id}`).

### 4.4. UI

- **Backtest Results Page**
  - Show **strategy vs benchmark** on the same equity curve chart.
  - Add the three metrics (benchmark return, alpha, beta) to the metrics list.
- Keep styling consistent with existing charts and metrics cards.

---

## 5. Data & Calculations

### 5.1. Benchmark Equity Curve

- Use existing candle data already fetched for the backtest.
- Equity curve point for each candle:
  - `benchmark_equity[t] = initial_balance * (close[t] / open[first])`
  - Use the candle close for valuation.

### 5.2. Returns Series (for Beta)

- `strategy_returns[t] = (equity[t] / equity[t-1]) - 1`
- `benchmark_returns[t] = (benchmark_equity[t] / benchmark_equity[t-1]) - 1`

---

## 6. Acceptance Criteria

- [ ] Backtest summary includes benchmark return, alpha, beta.
- [ ] New benchmark equity curve endpoint returns data.
- [ ] Backtest results chart renders strategy and benchmark lines.
- [ ] Metrics display shows benchmark return, alpha, beta.
- [ ] No new dependencies.
- [ ] Uses existing candles (no extra vendor calls).

---

## 7. Minimal Implementation Plan

1. **Backend**
   - Compute benchmark equity curve during backtest execution.
   - Store curve JSON next to strategy equity curve.
   - Calculate benchmark return, alpha, beta.
   - Extend backtest run model + response schema.
   - Add endpoint for benchmark curve.

2. **Frontend**
   - Fetch benchmark curve alongside strategy curve.
   - Plot both on existing chart.
   - Render metrics in existing summary grid.

---

## 8. Open Questions

- None (keep defaults and logic minimal).
