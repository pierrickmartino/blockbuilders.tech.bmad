# Test Checklist – Backtest Data Export (CSV/JSON)

> Source PRD: `prd-backtest-data-export-csv-json.md`

## 1. Export Button Visibility

- [x] Export buttons are visible on a completed backtest result page
- [x] Export buttons are NOT visible on a pending backtest run
- [x] Export buttons are NOT visible on a running backtest run
- [x] Export buttons are NOT visible on a failed backtest run
- [x] Buttons use existing shadcn/ui Button styles
- [ ] Button labels explicitly mention the format (e.g., "Download Trades (CSV/JSON)")

## 2. Trade List Export – CSV

- [x] Clicking "Download Trades CSV" downloads a CSV file
- [ ] CSV file has a header row with all required columns: entry_time, entry_price, exit_time, exit_price, side, pnl, pnl_pct, qty, stop_loss_price, take_profit_price, exit_reason, mae, mae_pct, mfe, mfe_pct, r_multiple, peak_price, trough_price, peak_time, trough_time, duration
- [x] CSV data rows match the trades returned by the existing GET /backtests/{run_id}/trades endpoint
- [x] Time fields use ISO-8601 format
- [x] File is named following the pattern `backtest-{run_id}-trades.csv`
- [ ] CSV with 0 trades produces a file with only the header row
- [x] CSV with many trades (500+) downloads correctly without truncation

## 3. Trade List Export – JSON

- [x] Clicking "Download Trades JSON" downloads a JSON file
- [x] JSON content is an array of trade objects matching the existing API response
- [x] File is named following the pattern `backtest-{run_id}-trades.json`
- [x] JSON is valid and parseable
- [ ] JSON with 0 trades produces an empty array `[]`

## 4. Equity Curve Export – CSV

- [x] Clicking "Download Equity Curve CSV" downloads a CSV file
- [x] CSV has header row with columns: timestamp, equity
- [x] Timestamps are in ISO-8601 format
- [x] Equity values are numeric with appropriate decimal precision
- [x] File is named following the pattern `backtest-{run_id}-equity-curve.csv`
- [ ] Empty equity curve produces a file with only the header row

## 5. Equity Curve Export – JSON

- [x] Clicking "Download Equity Curve JSON" downloads a JSON file
- [x] JSON content is an array of `{timestamp, equity}` objects matching the existing API response
- [x] File is named following the pattern `backtest-{run_id}-equity-curve.json`
- [x] JSON is valid and parseable

## 6. Summary Metrics Export – CSV

- [x] Clicking "Download Metrics CSV" downloads a CSV file
- [ ] CSV has a header row with columns: total_return, cagr, max_drawdown, num_trades, win_rate, benchmark_return, alpha, beta, initial_balance, fee_rate, slippage_rate, date_from, date_to
- [x] CSV contains a single data row with correct metric values
- [x] File is named following the pattern `backtest-{run_id}-metrics.csv`
- [x] Date fields (date_from, date_to) use ISO-8601 format

## 7. Summary Metrics Export – JSON

- [x] Clicking "Download Metrics JSON" downloads a JSON file
- [ ] JSON content matches the backtest summary object from the existing API
- [x] File is named following the pattern `backtest-{run_id}-metrics.json`
- [x] JSON is valid and parseable

## 8. Client-Side Generation (No Backend Changes)

- [x] Exports are generated entirely client-side using data from existing API endpoints
- [x] No new backend endpoints are introduced
- [x] Existing auth and error handling are reused for data fetching
- [x] If the underlying API call fails, the user sees an appropriate error message

## 9. CSV Formatting

- [x] CSV uses comma as the delimiter
- [x] CSV values containing commas are properly quoted
- [x] CSV values containing newlines are properly handled
- [x] No trailing commas on rows
- [x] File encoding is UTF-8

## 10. File Download Behavior

- [x] Files download immediately upon button click (no intermediate modal)
- [ ] Downloaded file opens correctly in Excel/Google Sheets (CSV)
- [x] Downloaded JSON file opens correctly in a text editor
- [x] Browser does not navigate away from the page during download
- [x] Multiple exports can be triggered in sequence without issues

## 11. Responsiveness & UI Placement

- [x] Export buttons are accessible on desktop
- [x] Export buttons are accessible on tablet
- [x] Export buttons are accessible on mobile
- [x] Buttons are placed in the results toolbar or section header as specified
- [x] Buttons do not crowd or break the existing layout

## 12. Edge Cases

- [x] Export of a backtest with a single trade works correctly
- [x] Export of a backtest with very large numeric values (high prices) formats correctly
- [x] Export of a backtest with very small numeric values formats correctly
- [x] Fields with null or missing optional values are handled gracefully in CSV (empty cell) and JSON (null)
- [x] No new dependencies are added for CSV generation (simple string join approach)
