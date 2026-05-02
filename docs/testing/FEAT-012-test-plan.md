# Test Checklist – Backtest Comparison View

> Source PRD: `prd-backtest-comparison-view.md`

## 1. Run Selection

- [x] User can select exactly 2 backtest runs and open the comparison view
- [x] User can select exactly 3 backtest runs and open the comparison view
- [x] User can select exactly 4 backtest runs and open the comparison view
- [ ] Compare action is disabled when fewer than 2 runs are selected
- [ ] Compare action is disabled when only 1 run is selected
- [ ] Compare action is disabled when 0 runs are selected
- [ ] Helper copy is displayed when fewer than 2 runs are selected explaining the minimum requirement
- [x] User cannot select more than 4 runs for comparison (UI prevents or shows error)
- [x] Selection uses checkbox-based UI consistent with existing list patterns

## 2. Comparison Layout

- [x] Comparison view displays aligned equity curves in a shared chart area with a common time axis
- [x] Comparison view displays a metrics comparison table alongside the chart
- [x] Each run is assigned a distinct color label
- [x] Color labels are used consistently across both the chart and the metrics table
- [ ] Comparison view renders within the existing backtest results area (no new page/route required)
- [x] Header displays "Compare Backtests (2-4)" or equivalent

## 3. Equity Curve Alignment

- [x] Equity curves use the union of timestamps across all selected runs
- [x] If a run is missing a timestamp present in another run, it shows a gap (null) rather than interpolated data
- [ ] No interpolation or smoothing is applied to the curves
- [x] Curves for 2 runs align correctly on the shared time axis
- [x] Curves for 4 runs align correctly on the shared time axis
- [x] Runs with different date ranges display correctly (one curve may start/end before another)

## 4. Metrics Table

- [x] Table displays Total Return % for each run
- [x] Table displays CAGR % for each run
- [x] Table displays Max Drawdown % for each run
- [x] Table displays Sharpe ratio for each run
- [x] Table displays Sortino ratio for each run
- [x] Table displays Calmar ratio for each run
- [x] Table displays Number of Trades for each run
- [x] Table displays Win Rate % for each run
- [x] Table displays Max Consecutive Losses for each run
- [x] Table displays Benchmark Return % for each run
- [x] Table displays Alpha for each run
- [x] Table displays Beta for each run
- [ ] Table has sticky row labels on mobile for horizontal scrolling

## 5. API – POST /backtests/compare

- [x] Endpoint accepts a body with `run_ids` containing 2 UUIDs and returns correct data
- [x] Endpoint accepts a body with `run_ids` containing 3 UUIDs and returns correct data
- [x] Endpoint accepts a body with `run_ids` containing 4 UUIDs and returns correct data
- [x] Endpoint rejects a request with more than 4 run IDs and returns a clear error message
- [x] Endpoint rejects a request with fewer than 2 run IDs and returns a clear error message
- [x] Endpoint rejects a request with 0 run IDs
- [ ] Response shape matches `{ "runs": [ { "run_id", "metrics", "equity_curve" } ] }`
- [x] Response includes metrics and equity curve data for each requested run
- [x] Response payload is minimal (only fields needed for comparison view)

## 6. Authentication & Authorization

- [x] Unauthenticated request to /backtests/compare returns 401
- [x] User cannot compare runs they do not own (returns plain-language error)
- [x] If one run ID in the list belongs to another user, the entire request fails with a clear error
- [x] Invalid/non-existent run ID returns a clear error message identifying the invalid ID

## 7. Empty & Error States

- [ ] If a run has no equity curve data, a warning is displayed and its curve is omitted from the chart
- [x] If a run has no equity curve data, its metrics still appear in the table
- [x] If all selected runs have no equity data, the chart area shows an appropriate message
- [ ] Network error during comparison fetch shows a user-friendly error with retry option
- [x] If one run ID is invalid, the error message is in plain language and identifies the problem

## 8. Responsiveness & Mobile

- [x] Comparison view renders correctly on desktop (wide viewport)
- [x] Comparison view renders correctly on tablet
- [x] Comparison view renders correctly on mobile (narrow viewport)
- [ ] Metrics table is horizontally scrollable on mobile with sticky row labels
- [x] Chart does not overflow the viewport on any screen size

## 9. Performance

- [x] Comparison of 4 runs with large equity curves (~1 year hourly data each) renders without UI freezing
- [x] Chart rendering completes within a reasonable timeframe for typical datasets

## 10. Regression

- [x] Existing backtest list page still functions correctly after adding comparison selection
- [x] Individual backtest result pages are unaffected
- [x] No new dependencies or complicated abstractions introduced
