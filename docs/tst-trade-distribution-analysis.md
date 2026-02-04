# Test Checklist – Trade Distribution Analysis

> Source PRD: `prd-trade-distribution-analysis.md`

## 1. Return Histogram

- [ ] Return histogram renders in the Backtest Results view
- [ ] Histogram uses `pnl_pct` from trades data as the source
- [ ] Win buckets are correctly segmented: 0-5%, 5-10%, 10-20%, >20%
- [ ] Loss buckets are correctly segmented: 0 to -5%, -5 to -10%, -10 to -20%, <-20%
- [ ] A trade with `pnl_pct` exactly 0% is counted in the 0-5% win bucket
- [ ] Each bucket displays the correct trade count
- [ ] Each bucket displays the correct percentage of total trades
- [ ] A trade with `pnl_pct` of 5% is counted in the 5-10% bucket (not 0-5%)
- [ ] A trade with `pnl_pct` of -5% is counted in the -5 to -10% bucket (not 0 to -5%)
- [ ] A trade with `pnl_pct` of 25% is counted in the >20% bucket
- [ ] A trade with `pnl_pct` of -25% is counted in the <-20% bucket
- [ ] Histogram styling is consistent with existing charts in the results view

## 2. Duration Distribution

- [ ] Duration distribution chart renders in the Backtest Results view
- [ ] Duration is computed as `round((exit_time - entry_time) / timeframe_seconds)` in bars
- [ ] Duration buckets are correctly segmented: 1, 2-3, 4-7, 8-14, 15-30, >30
- [ ] Each bucket displays the correct trade count
- [ ] Timeframe from backtest run metadata is used for bar calculation
- [ ] A 1-bar trade is counted in the "1" bucket
- [ ] A 3-bar trade is counted in the "2-3" bucket
- [ ] A 31-bar trade is counted in the ">30" bucket
- [ ] Duration chart styling is consistent with existing charts

## 3. Skew Callout

- [ ] Skew callout text appears below or near the histogram
- [ ] When largest win bucket is 0-5% AND largest loss bucket is -10% or worse, shows: "Distribution skews to small wins and larger losses. Review risk controls."
- [ ] When the above condition is not met, shows: "Distribution looks balanced across buckets."
- [ ] Skew callout updates correctly when data changes (different backtest run)

## 4. Placement & Layout

- [ ] Distribution analysis panel appears in the Backtest Results view near the trades list or existing charts
- [ ] Panel uses the same layout style as other result charts
- [ ] Panel renders correctly on desktop without layout breakage
- [ ] Panel renders correctly on mobile without layout breakage (single-column stacking)
- [ ] Panel labels are short and readable ("Return %" and "Duration (bars)")

## 5. Empty & Edge Cases

- [ ] With fewer than 3 trades, shows "Not enough trades to analyze" placeholder
- [ ] With exactly 3 trades, the analysis renders normally
- [ ] With missing or invalid timestamps, the duration chart is hidden
- [ ] With missing or invalid timestamps, the return histogram still shows
- [ ] With all winning trades, loss buckets show 0 counts
- [ ] With all losing trades, win buckets show 0 counts
- [ ] With a single trade at exactly 0% PnL, it counts as a win (0-5% bucket)

## 6. Data Source

- [ ] Data is sourced from `GET /backtests/{run_id}/trades` endpoint
- [ ] Aggregation is performed client-side (no new backend endpoints)
- [ ] No new backend schema changes are required
- [ ] Existing trade fetch and backtest run metadata calls are reused

## 7. Dependencies

- [ ] No new charting libraries or dependencies are introduced
- [ ] Existing charting library and styles are reused
- [ ] Helper functions are local to the results view (no new shared utilities)
