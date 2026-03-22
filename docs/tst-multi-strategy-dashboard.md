# Test Checklist -- Multi-Strategy Dashboard

> Source PRD: `prd-multi-strategy-dashboard.md`

## 1. Strategy List Display

- [x] Dashboard shows all user strategies in a table (desktop) or card grid (mobile)
- [x] Each row/card displays: strategy name, asset, timeframe
- [x] Each row/card displays latest backtest metrics: Total Return %, Max Drawdown %, Win Rate %, Trades count
- [x] Each row/card displays last run date/time (or "Never" if no runs exist)
- [x] Strategies with no backtest runs show "--" for all metric fields
- [x] Strategies with no backtest runs show "Never" for last run date

## 2. Quick Actions

- [x] "Open" action navigates to the strategy editor
- [ ] "Duplicate" action creates a copy of the strategy
- [x] "Archive" action archives the strategy
- [x] Quick actions are accessible from each row/card
- [x] Quick actions work correctly and update the list

## 3. Sorting

- [x] Default sort is by performance (Total Return %, descending)
- [x] User can sort by Total Return % (descending)
- [x] User can sort by last run date (descending, most recent first)
- [x] User can sort by asset (A to Z)
- [x] Sorting is applied client-side without additional API calls
- [x] Sort selection persists while the page is open
- [x] Strategies with no metrics sort correctly (e.g., "Never" runs at bottom for date sort)

## 4. Filters -- Asset

- [x] Asset dropdown filter is present above the list
- [x] Selecting an asset filters the list to only strategies with that asset
- [x] "All" option shows all strategies regardless of asset
- [ ] Dropdown lists only assets that exist in the user's strategies

## 5. Filters -- Performance Bucket

- [x] Performance filter options: All, Positive, Negative
- [x] "Positive" shows only strategies with Total Return > 0
- [x] "Negative" shows only strategies with Total Return < 0
- [x] "All" shows all strategies
- [x] Strategies with no runs (null metrics) are handled appropriately in each bucket

## 6. Filters -- Last Run

- [x] Last run filter options: All, Last 7 days, Last 30 days, Never
- [x] "Last 7 days" shows strategies run within the last 7 days
- [x] "Last 30 days" shows strategies run within the last 30 days
- [x] "Never" shows only strategies that have never been run
- [x] "All" shows all strategies

## 7. Filter Combinations

- [x] Multiple filters can be applied simultaneously (e.g., asset + performance bucket)
- [x] Clearing one filter does not reset other active filters
- [x] Combined filters produce the correct intersection of results
- [x] Empty results from combined filters show an appropriate empty state

## 8. Search

- [x] Search by strategy name works (existing behavior)
- [x] Search combines correctly with sort and filter selections
- [x] Clearing search restores filtered/sorted list

## 9. Data & API

- [ ] Dashboard uses `GET /strategies` as the sole data source
- [ ] No new backend endpoints are called
- [x] Existing query params (`search`, `include_archived`) work as before
- [x] All sorting and filtering happens client-side

## 10. Empty State

- [x] User with no strategies sees an empty state
- [x] Empty state includes a quick create action or wizard entry
- [x] Filters that produce zero results show a contextual empty message

## 11. Responsive Design

- [x] Desktop: table layout with columns for all fields
- [ ] Mobile: stacked cards with the same fields in a compact layout
- [x] Sorting and filter controls are accessible on mobile
- [ ] Table/cards do not cause horizontal scroll on mobile
- [ ] Metrics are readable at all breakpoints

## 12. Performance

- [x] List renders quickly for users with many strategies (50+, 200+)
- [x] Client-side sorting does not cause noticeable lag
- [x] Client-side filtering does not cause noticeable lag
- [x] No extra API calls are made when sorting or filtering

## 13. Edge Cases

- [x] Strategy with a very long name does not break layout
- [x] Strategy list updates correctly after duplicating or archiving a strategy
- [x] Archived strategies are shown/hidden based on `include_archived` parameter
- [x] Metrics display handles edge values (e.g., 0% return, 0 trades, very large numbers)
