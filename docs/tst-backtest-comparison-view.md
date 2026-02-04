# Test Checklist – Backtest Comparison View

> Source PRD: `prd-backtest-comparison-view.md`

## 1. Run Selection

- [ ] User can select exactly 2 backtest runs and open the comparison view
- [ ] User can select exactly 3 backtest runs and open the comparison view
- [ ] User can select exactly 4 backtest runs and open the comparison view
- [ ] Compare action is disabled when fewer than 2 runs are selected
- [ ] Compare action is disabled when only 1 run is selected
- [ ] Compare action is disabled when 0 runs are selected
- [ ] Helper copy is displayed when fewer than 2 runs are selected explaining the minimum requirement
- [ ] User cannot select more than 4 runs for comparison (UI prevents or shows error)
- [ ] Selection uses checkbox-based UI consistent with existing list patterns

## 2. Comparison Layout

- [ ] Comparison view displays aligned equity curves in a shared chart area with a common time axis
- [ ] Comparison view displays a metrics comparison table alongside the chart
- [ ] Each run is assigned a distinct color label
- [ ] Color labels are used consistently across both the chart and the metrics table
- [ ] Comparison view renders within the existing backtest results area (no new page/route required)
- [ ] Header displays "Compare Backtests (2-4)" or equivalent

## 3. Equity Curve Alignment

- [ ] Equity curves use the union of timestamps across all selected runs
- [ ] If a run is missing a timestamp present in another run, it shows a gap (null) rather than interpolated data
- [ ] No interpolation or smoothing is applied to the curves
- [ ] Curves for 2 runs align correctly on the shared time axis
- [ ] Curves for 4 runs align correctly on the shared time axis
- [ ] Runs with different date ranges display correctly (one curve may start/end before another)

## 4. Metrics Table

- [ ] Table displays Total Return % for each run
- [ ] Table displays CAGR % for each run
- [ ] Table displays Max Drawdown % for each run
- [ ] Table displays Sharpe ratio for each run
- [ ] Table displays Sortino ratio for each run
- [ ] Table displays Calmar ratio for each run
- [ ] Table displays Number of Trades for each run
- [ ] Table displays Win Rate % for each run
- [ ] Table displays Max Consecutive Losses for each run
- [ ] Table displays Benchmark Return % for each run
- [ ] Table displays Alpha for each run
- [ ] Table displays Beta for each run
- [ ] Table has sticky row labels on mobile for horizontal scrolling

## 5. API – POST /backtests/compare

- [ ] Endpoint accepts a body with `run_ids` containing 2 UUIDs and returns correct data
- [ ] Endpoint accepts a body with `run_ids` containing 3 UUIDs and returns correct data
- [ ] Endpoint accepts a body with `run_ids` containing 4 UUIDs and returns correct data
- [ ] Endpoint rejects a request with more than 4 run IDs and returns a clear error message
- [ ] Endpoint rejects a request with fewer than 2 run IDs and returns a clear error message
- [ ] Endpoint rejects a request with 0 run IDs
- [ ] Response shape matches `{ "runs": [ { "run_id", "metrics", "equity_curve" } ] }`
- [ ] Response includes metrics and equity curve data for each requested run
- [ ] Response payload is minimal (only fields needed for comparison view)

## 6. Authentication & Authorization

- [ ] Unauthenticated request to /backtests/compare returns 401
- [ ] User cannot compare runs they do not own (returns plain-language error)
- [ ] If one run ID in the list belongs to another user, the entire request fails with a clear error
- [ ] Invalid/non-existent run ID returns a clear error message identifying the invalid ID

## 7. Empty & Error States

- [ ] If a run has no equity curve data, a warning is displayed and its curve is omitted from the chart
- [ ] If a run has no equity curve data, its metrics still appear in the table
- [ ] If all selected runs have no equity data, the chart area shows an appropriate message
- [ ] Network error during comparison fetch shows a user-friendly error with retry option
- [ ] If one run ID is invalid, the error message is in plain language and identifies the problem

## 8. Responsiveness & Mobile

- [ ] Comparison view renders correctly on desktop (wide viewport)
- [ ] Comparison view renders correctly on tablet
- [ ] Comparison view renders correctly on mobile (narrow viewport)
- [ ] Metrics table is horizontally scrollable on mobile with sticky row labels
- [ ] Chart does not overflow the viewport on any screen size

## 9. Performance

- [ ] Comparison of 4 runs with large equity curves (~1 year hourly data each) renders without UI freezing
- [ ] Chart rendering completes within a reasonable timeframe for typical datasets

## 10. Regression

- [ ] Existing backtest list page still functions correctly after adding comparison selection
- [ ] Individual backtest result pages are unaffected
- [ ] No new dependencies or complicated abstractions introduced
