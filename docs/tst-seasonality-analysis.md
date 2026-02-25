# Test Checklist – Seasonality Analysis

> Source PRD: `prd-seasonality-analysis.md`

## 1. Section Visibility & Placement

- [ ] Seasonality section is visible in the Backtest Results view
- [ ] Section appears below the equity curve and above the trades table
- [ ] Section layout is consistent with other result panels

## 2. Toggle Controls

- [ ] Month / Quarter / Weekday toggle is displayed (tabs or segmented buttons)
- [ ] Default selection is Month
- [ ] Clicking Quarter switches the heatmap to quarterly view
- [ ] Clicking Weekday switches the heatmap to weekday view
- [ ] Clicking Month switches back to monthly view
- [ ] Toggle state persists while viewing the same backtest run

## 3. Monthly Heatmap

- [ ] Heatmap displays 12 cells (Jan through Dec)
- [ ] Each cell shows the period name and average return %
- [ ] Tooltip or inline text shows average return % and trade count
- [ ] Cells use correct color scale: red (negative), neutral (near 0), green (positive)
- [ ] Months with no trades show 0% or are visually distinct (neutral color)
- [ ] Average return is correctly computed as mean of `pnl_pct` for trades in each month

## 4. Quarterly Heatmap

- [ ] Heatmap displays 4 cells (Q1 through Q4)
- [ ] Each cell shows the quarter name and average return %
- [ ] Tooltip or inline text shows average return % and trade count
- [ ] Color scale is applied correctly per quarter
- [ ] Quarters with no trades show 0% or are visually distinct

## 5. Weekday Heatmap

- [ ] Heatmap displays 7 cells (Mon through Sun)
- [ ] Each cell shows the weekday name and average return %
- [ ] Tooltip or inline text shows average return % and trade count
- [ ] Color scale is applied correctly per weekday
- [ ] Weekdays with no trades show 0% or are visually distinct

## 6. Data & Calculations

- [x] Trades are sourced from `GET /backtests/{run_id}/trades`
- [ ] Bucket assignment uses trade `exit_time`
- [ ] Bucket assignment uses UTC timezone
- [ ] Average return % per bucket equals mean of `pnl_pct` for trades in that bucket
- [ ] Trade count per bucket is correctly computed
- [ ] Aggregation is performed client-side (no new backend endpoints)

## 7. Empty State

- [ ] When there are no trades, shows "No trades available for seasonality analysis."
- [ ] Empty state renders without layout breakage
- [ ] Toggle is still visible in empty state (user can switch modes)

## 8. Edge Cases

- [ ] Backtest with a single trade: that trade's month/quarter/weekday cell shows data, others are empty
- [ ] Backtest spanning only one month: only that month cell has data
- [ ] Backtest with trades on weekends: Saturday/Sunday cells show data
- [ ] All trades in one bucket: only that bucket has data, others show neutral
- [ ] Very large number of trades (1000+): aggregation completes without visible delay
- [ ] Trades with identical `exit_time`: counted correctly in the same bucket
- [ ] Negative average returns display with correct sign and red coloring

## 9. Responsive Layout

- [ ] Heatmap renders correctly on desktop viewports
- [ ] Heatmap renders correctly on mobile viewports (cells reflow or resize)
- [ ] Toggle controls are usable on mobile (touch-friendly)
- [ ] Labels remain readable on small screens

## 10. Dependencies

- [ ] No new backend endpoints or database changes are required
- [ ] No new charting libraries or dependencies are introduced
- [ ] Heatmap is rendered using Tailwind (simple grid)
