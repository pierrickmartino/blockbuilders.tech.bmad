# Test Checklist – Drawdown Chart

> Source PRD: `prd-drawdown-chart.md`

## 1. Drawdown Calculation

- [ ] Drawdown % is computed from existing equity curve data (no new API calls)
- [ ] Running peak equity is tracked correctly across all equity curve points
- [ ] Drawdown formula is correct: `drawdown_pct = ((equity - peak) / peak) * 100`
- [ ] Drawdown is 0% at equity peaks
- [ ] Drawdown is negative when equity is below the running peak (underwater)
- [ ] Drawdown series uses the same timestamps as the equity curve

## 2. Maximum Drawdown Period Identification

- [ ] Maximum drawdown period start is identified as the peak before the deepest trough
- [ ] Maximum drawdown period end is the point where equity recovers to the pre-drawdown peak
- [ ] If equity never recovers to the peak, the max drawdown period extends to the end of the series
- [ ] When multiple drawdowns have the same depth, the first occurrence is highlighted
- [ ] Maximum drawdown period is correctly identified for a monotonically decreasing equity curve

## 3. Chart Rendering

- [ ] Drawdown chart renders for completed backtests with equity curve data
- [ ] Chart is displayed alongside the equity curve in backtest results
- [ ] Chart uses the same time range and x-axis as the equity curve
- [ ] Chart renders as a line or area chart below 0% (underwater area)
- [ ] Maximum drawdown period is visually highlighted with a background band or overlay
- [ ] Chart label reads "Drawdown (%)" or similar compact label
- [ ] Chart legend is minimal and clear
- [ ] Chart styling is consistent with existing results charts
- [ ] No new charting library or dependency is introduced

## 4. Tooltip & Interactivity

- [ ] Tooltip shows the timestamp at the hovered point
- [ ] Tooltip shows the drawdown % at the hovered point
- [ ] Tooltip values are formatted consistently (e.g., 2 decimal places)

## 5. Responsiveness

- [ ] Chart renders correctly on desktop viewport
- [ ] Chart renders correctly on tablet viewport
- [ ] Chart renders correctly on mobile viewport
- [ ] Chart does not cause horizontal scroll on any viewport
- [ ] Touch interactions work on mobile (tooltip on tap)

## 6. Edge Cases & Empty States

- [ ] Equity curve with fewer than 2 points: drawdown chart is hidden
- [ ] Equity curve with fewer than 2 points: a short placeholder message is shown instead
- [ ] Equity curve with peak equity of 0: no division-by-zero error occurs
- [ ] Equity curve that only goes up (no drawdowns): chart shows a flat line at 0%
- [ ] Equity curve that only goes down: entire series is one continuous drawdown period
- [ ] Single-point equity curve: chart is hidden gracefully

## 7. No Backend Changes

- [ ] No new backend endpoints are added
- [ ] No new database fields or schema changes are introduced
- [ ] No new backend dependencies are added
- [ ] Drawdown series computation is performed entirely in the frontend
