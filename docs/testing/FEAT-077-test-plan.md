# TST: Simplified Default Metrics View

## Functional Tests
- [ ] User with no favorite metrics sees exactly 5 primary metrics on backtest results.
- [ ] The 5 default metrics are exactly: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %.
- [ ] Advanced metrics (Sharpe, Sortino, Calmar, alpha, beta, CAGR, costs, etc.) are not visible before expansion.
- [ ] Clicking "Show detailed analysis" expands a section below primary metrics.
- [ ] Expanded section displays all remaining available advanced metrics.
- [ ] Expanded toggle label changes to "Hide detailed analysis" (if implemented in copy spec).
- [ ] Clicking "Hide detailed analysis" collapses advanced metrics.
- [ ] Reloading the page always returns detailed analysis to collapsed state.

## Favorite Metrics Integration Tests
- [ ] User with pinned/favorite metrics sees pinned metrics as primary (not the default 5 fallback set).
- [ ] Pinned metrics preserve user-defined order.
- [ ] "Show detailed analysis" still reveals full metric set when favorites are present.
- [ ] Missing pinned metric keys are skipped gracefully without UI breakage.

## Edge & Resilience Tests
- [ ] Backtest with partial metric availability renders available primary metrics and does not crash.
- [ ] Metrics API error shows existing plain-language error state.
- [ ] Metrics loading state shows existing skeleton/placeholder behavior.

## UX & Layout Tests
- [ ] Toggle is clearly visible directly under primary metrics.
- [ ] Expanded detailed section appears below primary metrics (not replacing them).
- [ ] Behavior is consistent across desktop, tablet, and mobile breakpoints.
- [ ] Metric cards keep existing styling and spacing in both collapsed and expanded states.

## Regression Tests
- [ ] Existing metric pin/unpin workflow remains unchanged.
- [ ] Existing backtest comparison and chart/trade sections are unaffected by metric visibility toggle.
- [ ] No changes to metric calculations/values compared to baseline before feature.
