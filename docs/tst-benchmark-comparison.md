# Test Checklist – Benchmark Comparison (Buy-and-Hold)

> Source PRD: `prd-benchmark-comparison.md`

## 1. Benchmark Equity Curve Calculation

- [ ] Benchmark equity curve is computed for every completed backtest
- [ ] Benchmark uses the same asset, timeframe, and date range as the strategy backtest
- [ ] Benchmark uses the same initial balance as the strategy backtest
- [ ] Benchmark buys at the first candle open price
- [ ] Benchmark holds until the last candle close price
- [ ] Benchmark applies no fees and no slippage
- [ ] Equity curve formula is correct: `benchmark_equity[t] = initial_balance * (close[t] / open[first])`
- [ ] Benchmark uses candle close for valuation at each point
- [ ] Benchmark reuses existing candle data (no extra vendor/API calls)

## 2. Benchmark Metrics Calculation

- [ ] Benchmark Return % is calculated as `(benchmark_final_equity - initial_balance) / initial_balance * 100`
- [ ] Alpha is calculated as `strategy total return % - benchmark return %`
- [ ] Beta uses candle-to-candle simple returns: `strategy_returns[t] = (equity[t] / equity[t-1]) - 1`
- [ ] Beta uses candle-to-candle simple returns: `benchmark_returns[t] = (benchmark_equity[t] / benchmark_equity[t-1]) - 1`
- [ ] Beta is calculated as `covariance(strategy_returns, benchmark_returns) / variance(benchmark_returns)`
- [ ] Beta is set to `0` when benchmark variance is 0 (flat benchmark price)
- [ ] Metrics are included in the backtest summary response (`GET /backtests/{run_id}`)

## 3. API & Storage

- [ ] Benchmark equity curve JSON is stored in object storage alongside the strategy equity curve
- [ ] `GET /backtests/{run_id}/benchmark-equity-curve` endpoint exists and returns benchmark curve data
- [ ] `GET /backtests/{run_id}/benchmark-equity-curve` returns 404 for non-existent run IDs
- [ ] `GET /backtests/{run_id}/benchmark-equity-curve` requires authentication
- [ ] `GET /backtests/{run_id}` response includes `benchmark_return`, `alpha`, and `beta` fields
- [ ] Backtest run model/schema is extended with benchmark fields
- [ ] User can only access benchmark data for their own backtests (authorization check)

## 4. UI – Equity Curve Chart

- [ ] Backtest results page renders both strategy and benchmark lines on the same equity curve chart
- [ ] Strategy and benchmark lines are visually distinguishable (different colors/styles)
- [ ] Chart legend clearly labels strategy vs benchmark lines
- [ ] Chart tooltip shows values for both lines at the hovered timestamp
- [ ] Chart renders correctly on desktop viewport
- [ ] Chart renders correctly on mobile viewport (responsive)
- [ ] Chart handles a single-candle backtest gracefully

## 5. UI – Metrics Display

- [ ] Benchmark Return % metric card is displayed in the metrics list
- [ ] Alpha metric card is displayed in the metrics list
- [ ] Beta metric card is displayed in the metrics list
- [ ] Metrics styling is consistent with existing metric cards
- [ ] Positive alpha is visually distinguishable from negative alpha (e.g., color coding)
- [ ] Metrics display correct values matching the API response

## 6. Edge Cases & Negative Tests

- [ ] Backtest with a flat asset price (all closes equal) produces benchmark return of 0%, alpha equals strategy return, beta is 0
- [ ] Backtest with only one candle produces a valid benchmark curve (single point)
- [ ] Benchmark curve endpoint returns appropriate error for incomplete/running backtests
- [ ] No new npm/Python dependencies are introduced
- [ ] Benchmark computation does not slow down backtest execution noticeably (performance sanity check)
