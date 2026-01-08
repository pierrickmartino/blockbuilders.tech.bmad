# PRD: Backtest Data Export (CSV/JSON)

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Add simple export buttons on backtest results pages so users can download trade lists, equity curves, and summary metrics as CSV or JSON for external analysis.

---

## 2. Goals
- Let users export trade lists, equity curves, and summary metrics.
- Support CSV and JSON formats.
- Keep implementation minimal (reuse existing endpoints, no new infrastructure).
- Respect user data ownership with simple, direct downloads.

## 3. Non-Goals
- No scheduled exports or email delivery.
- No export of raw candle data.
- No new data transformations beyond formatting.
- No additional permissions model beyond existing auth.

---

## 4. Target Users
- Traders who want to analyze results in Excel, Python, or other tools.
- Users who want to archive their backtest results externally.

---

## 5. User Stories
1. As a user, I can download my trade list as CSV or JSON.
2. As a user, I can download my equity curve as CSV or JSON.
3. As a user, I can download summary metrics as CSV or JSON.

---

## 6. UX Flow (Minimal)
1. User opens a completed backtest result page.
2. Simple buttons appear in the results toolbar or section header:
   - “Download Trades (CSV/JSON)”
   - “Download Equity Curve (CSV/JSON)”
   - “Download Metrics (CSV/JSON)”
3. Clicking a button downloads a file immediately.

---

## 7. Data Formats

### 7.1 Trade List
**JSON:** array of trade objects from the existing `GET /backtests/{run_id}/trades` response.

**CSV columns (flat, one row per trade):**
- entry_time
- entry_price
- exit_time
- exit_price
- side
- pnl
- pnl_pct
- qty
- stop_loss_price
- take_profit_price
- exit_reason
- mae
- mae_pct
- mfe
- mfe_pct
- r_multiple
- peak_price
- trough_price
- peak_time
- trough_time
- duration

### 7.2 Equity Curve
**JSON:** array of `{timestamp, equity}` from `GET /backtests/{run_id}/equity-curve`.

**CSV columns:**
- timestamp
- equity

### 7.3 Summary Metrics
**JSON:** use the backtest summary object from `GET /backtests/{run_id}`.

**CSV columns (single row):**
- total_return
- cagr
- max_drawdown
- num_trades
- win_rate
- benchmark_return
- alpha
- beta
- initial_balance
- fee_rate
- slippage_rate
- date_from
- date_to

---

## 8. Minimal API Approach
- **No new endpoints.**
- Frontend fetches existing backtest result endpoints and formats CSV/JSON client-side.
- Use existing auth and error handling.

---

## 9. UI Placement (Minimal)
- Backtest results page toolbar or card header.
- Use existing button styles (shadcn/ui Button).
- Keep labels explicit about format.

---

## 10. Acceptance Criteria
- ✅ Export buttons are visible for completed backtests.
- ✅ Trade list, equity curve, and summary metrics export as CSV and JSON.
- ✅ Exports use existing API endpoints with no backend changes.
- ✅ Files download with clear names (e.g., `backtest-{run_id}-trades.csv`).

---

## 11. Implementation Notes
- Keep CSV formatting minimal (comma-separated, header row only).
- Use ISO timestamps for time fields.
- Do not add new dependencies for CSV generation; use simple string join.
