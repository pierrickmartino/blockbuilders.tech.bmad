# Test Checklist – Backtest Results Equity Curve Chart

> Source PRD: `prd-backtest-results-equity-curve-chart.md`

## 1. Chart Rendering (Completed Run)

- [ ] Given a completed run with equity curve data, a line chart is displayed on the Backtest Results page
- [ ] Chart plots equity (Y-axis) over time (X-axis) correctly
- [ ] X-axis shows a reasonable number of auto-spaced time ticks (not overcrowded)
- [ ] Y-axis shows equity values with currency-like formatting (no currency symbol required)
- [ ] Chart uses Recharts line chart as specified
- [ ] Chart section has the title "Equity curve"

## 2. Tooltip Interaction

- [ ] Hovering over a point on the chart shows a tooltip
- [ ] Tooltip displays the timestamp formatted to user locale (or ISO short)
- [ ] Tooltip displays the equity value rounded to 2 decimal places
- [ ] Tooltip disappears when cursor moves away from the chart

## 3. Loading States

- [ ] When run status is Pending, the chart area shows a skeleton/loading placeholder
- [ ] When run status is Running, the chart area shows a skeleton/loading placeholder
- [ ] Skeleton placeholder has a fixed height (~260-320px) to avoid layout jumps
- [ ] Details are only fetched after run status is "completed"

## 4. Error & Empty States

- [ ] When run status is Failed, the chart is NOT displayed
- [ ] When run status is Failed, an error message from the run is shown instead of the chart
- [ ] When equity curve data is missing for a completed run, "No equity data available for this run" message is displayed
- [ ] When equity data is missing, a "Retry loading" button is shown
- [ ] Clicking "Retry loading" re-fetches the equity curve data
- [ ] 404 response shows "Run not found" message
- [ ] 403 response shows "Not authorized" message
- [ ] 500 or server error shows "Couldn't load chart data" message with retry option

## 5. API Integration

- [ ] GET /backtests/{run_id} returns status, summary_metrics, and error_message fields
- [ ] GET /backtests/{run_id}/details returns equity_curve array
- [ ] Equity curve data shape matches `[{ "ts": "ISO-8601", "equity": float }]`
- [ ] Timestamps in the response are ISO-8601 with UTC
- [ ] Details request is cached client-side to avoid refetch loops

## 6. Responsiveness

- [ ] Chart stretches to fill container width on desktop
- [ ] Chart stretches to fill container width on tablet
- [ ] Chart stretches to fill container width on mobile
- [ ] Chart does not overflow horizontally on any viewport
- [ ] Chart height is fixed (260-320px range) and does not cause layout jumps
- [ ] Touch interactions work on mobile (tooltip on tap)

## 7. Performance

- [ ] Completed run with ~1 year of hourly data (~8,760 points) renders without UI freezing
- [ ] Chart rendering completes within a reasonable timeframe
- [ ] No unnecessary refetch of details data when the page re-renders

## 8. Timezone Handling

- [ ] Timestamps are stored and returned as UTC
- [ ] Timestamps display consistently in the chart (UTC in data, formatted in UI)
- [ ] No timezone-related rendering issues (shifted data points, incorrect labels)

## 9. Page Layout Integration

- [ ] Equity curve section appears in the correct position: after metrics summary, before trades table
- [ ] Page header (run name, strategy name, asset/timeframe, date range) is unaffected
- [ ] Status banner (Pending/Running/Completed/Failed) is unaffected
- [ ] Metrics summary cards remain functional
- [ ] Trades table below the chart remains functional

## 10. Regression

- [ ] Existing backtest results page features are not broken by the chart addition
- [ ] Metrics display correctly alongside the chart
- [ ] Trades table loads and paginates correctly
- [ ] Navigation to/from the backtest results page works as before

## 11. Analytics (Optional)

- [ ] `backtest_chart_viewed` event fires when chart renders successfully
- [ ] `backtest_chart_load_failed` event fires when details fetch fails
