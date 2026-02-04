# Test Checklist -- Multi-Strategy Dashboard

> Source PRD: `prd-multi-strategy-dashboard.md`

## 1. Strategy List Display

- [ ] Dashboard shows all user strategies in a table (desktop) or card grid (mobile)
- [ ] Each row/card displays: strategy name, asset, timeframe
- [ ] Each row/card displays latest backtest metrics: Total Return %, Max Drawdown %, Win Rate %, Trades count
- [ ] Each row/card displays last run date/time (or "Never" if no runs exist)
- [ ] Strategies with no backtest runs show "--" for all metric fields
- [ ] Strategies with no backtest runs show "Never" for last run date

## 2. Quick Actions

- [ ] "Open" action navigates to the strategy editor
- [ ] "Duplicate" action creates a copy of the strategy
- [ ] "Archive" action archives the strategy
- [ ] Quick actions are accessible from each row/card
- [ ] Quick actions work correctly and update the list

## 3. Sorting

- [ ] Default sort is by performance (Total Return %, descending)
- [ ] User can sort by Total Return % (descending)
- [ ] User can sort by last run date (descending, most recent first)
- [ ] User can sort by asset (A to Z)
- [ ] Sorting is applied client-side without additional API calls
- [ ] Sort selection persists while the page is open
- [ ] Strategies with no metrics sort correctly (e.g., "Never" runs at bottom for date sort)

## 4. Filters -- Asset

- [ ] Asset dropdown filter is present above the list
- [ ] Selecting an asset filters the list to only strategies with that asset
- [ ] "All" option shows all strategies regardless of asset
- [ ] Dropdown lists only assets that exist in the user's strategies

## 5. Filters -- Performance Bucket

- [ ] Performance filter options: All, Positive, Negative
- [ ] "Positive" shows only strategies with Total Return > 0
- [ ] "Negative" shows only strategies with Total Return < 0
- [ ] "All" shows all strategies
- [ ] Strategies with no runs (null metrics) are handled appropriately in each bucket

## 6. Filters -- Last Run

- [ ] Last run filter options: All, Last 7 days, Last 30 days, Never
- [ ] "Last 7 days" shows strategies run within the last 7 days
- [ ] "Last 30 days" shows strategies run within the last 30 days
- [ ] "Never" shows only strategies that have never been run
- [ ] "All" shows all strategies

## 7. Filter Combinations

- [ ] Multiple filters can be applied simultaneously (e.g., asset + performance bucket)
- [ ] Clearing one filter does not reset other active filters
- [ ] Combined filters produce the correct intersection of results
- [ ] Empty results from combined filters show an appropriate empty state

## 8. Search

- [ ] Search by strategy name works (existing behavior)
- [ ] Search combines correctly with sort and filter selections
- [ ] Clearing search restores filtered/sorted list

## 9. Data & API

- [ ] Dashboard uses `GET /strategies` as the sole data source
- [ ] No new backend endpoints are called
- [ ] Existing query params (`search`, `include_archived`) work as before
- [ ] All sorting and filtering happens client-side

## 10. Empty State

- [ ] User with no strategies sees an empty state
- [ ] Empty state includes a quick create action or wizard entry
- [ ] Filters that produce zero results show a contextual empty message

## 11. Responsive Design

- [ ] Desktop: table layout with columns for all fields
- [ ] Mobile: stacked cards with the same fields in a compact layout
- [ ] Sorting and filter controls are accessible on mobile
- [ ] Table/cards do not cause horizontal scroll on mobile
- [ ] Metrics are readable at all breakpoints

## 12. Performance

- [ ] List renders quickly for users with many strategies (50+, 200+)
- [ ] Client-side sorting does not cause noticeable lag
- [ ] Client-side filtering does not cause noticeable lag
- [ ] No extra API calls are made when sorting or filtering

## 13. Edge Cases

- [ ] Strategy with a very long name does not break layout
- [ ] Strategy list updates correctly after duplicating or archiving a strategy
- [ ] Archived strategies are shown/hidden based on `include_archived` parameter
- [ ] Metrics display handles edge values (e.g., 0% return, 0 trades, very large numbers)
