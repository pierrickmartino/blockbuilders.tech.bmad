# Test Checklist – Position Analysis

> Source PRD: `prd-position-analysis.md`

## 1. Average Hold Time

- [ ] Average hold time is computed from `exit_time - entry_time` across all trades
- [ ] Average hold time is reported in bars (using backtest run timeframe)
- [ ] Average hold time is also shown in a friendly time unit (hours or days) based on timeframe
- [ ] Calculation is correct for a known set of trades (manual verification)
- [ ] Average hold time updates correctly when viewing different backtest runs

## 2. Longest Position

- [ ] Longest position shows the maximum duration among all trades
- [ ] Duration is displayed in bars and a friendly time unit
- [ ] Correct trade is identified as the longest when multiple trades exist

## 3. Shortest Position

- [ ] Shortest position shows the minimum duration among all trades
- [ ] Duration is displayed in bars and a friendly time unit
- [ ] Correct trade is identified as the shortest when multiple trades exist

## 4. Average Position Size

- [ ] Average position size is computed as the average of `entry_price * qty` across trades
- [ ] Value is displayed in USD notation
- [ ] Calculation is correct for a known set of trades (manual verification)

## 5. Interpretation Helper

- [ ] When average hold time is <= 1 day, shows: "Holding times suggest a day-trading style."
- [ ] When average hold time is > 1 day, shows: "Holding times suggest a swing-trading style."
- [ ] Helper text updates correctly for different backtest runs
- [ ] Boundary case: average hold time exactly 1 day shows day-trading message

## 6. Placement & Layout

- [ ] Position analysis panel appears in Backtest Results near other analysis panels
- [ ] Panel uses the same compact card style as existing metrics widgets
- [ ] Layout is a simple list (label + value) within a card
- [ ] Panel stacks cleanly with other analysis cards on mobile
- [ ] Panel renders correctly on desktop viewports

## 7. Empty & Edge Cases

- [ ] With fewer than 2 trades, shows "Not enough trades to analyze."
- [ ] With exactly 2 trades, the analysis renders normally
- [ ] With missing or invalid timestamps, hold-time stats are hidden with a short warning
- [ ] With missing `qty` or `entry_price`, the average position size row is hidden (other metrics still show)
- [ ] With all trades having the same duration, longest = shortest = average
- [ ] With a single very long trade and a single very short trade, min/max are correct

## 8. Data Source

- [ ] Data is sourced from `GET /backtests/{run_id}/trades` endpoint
- [ ] `entry_time`, `exit_time`, `entry_price`, and `qty` fields are used
- [ ] Backtest run `timeframe` is used for bar conversion
- [ ] Aggregation is performed client-side (no new backend endpoints)
- [ ] No new backend schema changes are required

## 9. Dependencies

- [ ] No new dependencies or libraries are introduced
- [ ] Helper functions are local to the results view (no new shared utilities)
- [ ] Existing trade fetch and backtest run metadata calls are reused
