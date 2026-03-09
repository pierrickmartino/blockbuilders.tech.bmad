# Test Checklist – Backtest Results Trades Section

> Source PRD: `prd-backtest-results-trades-section.md`

## 1. Table Rendering (Completed Run with Trades)

- [x] Trades section appears on the Backtest Results page for a completed run
- [x] Section header displays "Trades"
- [ ] Subtitle displays "Showing trades simulated for this run."
- [ ] Table displays Entry time (UTC) column
- [x] Table displays Entry price column
- [ ] Table displays Exit time (UTC) column
- [x] Table displays Exit price column
- [x] Table displays P&L column
- [x] Table displays Side column (default LONG)
- [ ] Column headers include "UTC" label for time columns

## 2. Default Sorting & Page Size

- [ ] Trades are sorted by most recent entry first (descending by entry time) by default
- [x] Default page size is 25 rows
- [x] Page size options include 25, 50, and 100 (if implemented)

## 3. Data Formatting

- [ ] Prices display with appropriate decimals (2-8 depending on asset price) with trailing zeros trimmed
- [x] P&L shows absolute value in quote currency
- [x] P&L shows "+" prefix for positive values
- [x] P&L percentage is displayed if available from the API
- [x] Positive P&L values are colored green (if color styling implemented)
- [x] Negative P&L values are colored red (if color styling implemented)
- [x] Side column shows "LONG" for long trades
- [ ] Time values display in UTC format

## 4. Pagination

- [x] Previous button navigates to the previous page
- [x] Next button navigates to the next page
- [x] "Page X of Y" indicator is displayed (Y = ceil(total/page_size))
- [x] Previous button is disabled on the first page
- [x] Next button is disabled on the last page
- [x] Navigating between pages shows correct trades without duplicates
- [x] Navigating between pages shows correct trades without missing entries
- [x] Total trade count across all pages matches the reported total
- [x] Page size selector changes the number of rows displayed (if implemented)

## 5. API – GET /backtests/{run_id}/trades

- [ ] Endpoint returns paginated trade data with correct response shape: `{ run_id, total, page, page_size, items }`
- [ ] Each trade item includes: id, side, entry_time, entry_price, exit_time, exit_price, pnl, pnl_pct
- [ ] `page` and `page_size` query parameters work correctly
- [ ] Requesting page 1 with page_size 25 returns the first 25 trades
- [ ] Requesting the last page returns remaining trades (may be fewer than page_size)
- [x] Times are returned as ISO-8601 strings with Z suffix (UTC)

## 6. Authentication & Authorization

- [x] Unauthenticated request returns 401
- [x] User cannot fetch trades for a run they do not own (returns 404)
- [x] Requesting trades for a non-existent run returns 404
- [ ] Requesting trades for a run that is not completed returns 409 with status in the message

## 7. Empty State

- [x] If a completed run has 0 trades, the message "No trades were generated for this run." is displayed
- [x] No table or pagination controls are shown when there are 0 trades

## 8. Loading State

- [ ] When run status is Pending, the trades section shows a loading indicator
- [ ] When run status is Running, the trades section shows a loading indicator
- [x] Table is hidden or disabled while data is loading

## 9. Error State

- [x] If trades fail to load, a compact error message is displayed
- [x] Error state includes a "Retry" button
- [x] Clicking "Retry" re-fetches the trades data
- [ ] 500 error from backend shows a user-friendly message

## 10. Responsiveness & Mobile

- [ ] Table is horizontally scrollable on mobile (overflow-x-auto)
- [ ] Table remains readable on narrow viewports
- [ ] Pagination controls are accessible on mobile
- [ ] Table does not break the page layout on any viewport size

## 11. Performance

- [ ] Large trade counts (1,000+ trades) paginate without performance degradation
- [ ] Page navigation is responsive (no UI freezing on page change)
- [ ] Initial load of the trades section does not block rendering of the rest of the page

## 12. Numeric Edge Cases

- [x] Prices do not render as "NaN" for any valid data
- [ ] Very small price values (e.g., 0.00001234) display correctly
- [x] Very large price values (e.g., 99999.99) display correctly
- [ ] P&L of exactly 0 displays correctly (no "+" prefix, no color)
- [x] Missing pnl_pct field is handled gracefully (omitted or computed if unambiguous)

## 13. Page Layout Integration

- [x] Trades section appears after the Equity curve chart in the page layout
- [ ] Metrics overview above remains functional
- [ ] Equity curve chart above remains functional
- [ ] No layout shifts when trades section loads

## 14. Telemetry (Optional)

- [ ] `backtest_trades_loaded` event fires with run_id, total, and page_size
- [ ] `backtest_trades_page_changed` event fires with run_id and page number when navigating
