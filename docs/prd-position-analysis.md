# PRD: Position Analysis

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Add a **position analysis** panel to backtest results that summarizes **holding behavior** and **capital usage**: average hold time, longest/shortest position, and average position size. This is a lightweight aggregation over the existing trades list to help users distinguish day-trading vs swing strategies without overwhelming detail.

---

## 2. Goals

- Provide a quick, **plain-language** snapshot of holding behavior.
- Highlight **trade frequency vs holding duration** to inform strategy fit.
- Keep implementation **simple** with no new backend endpoints or tables.

---

## 3. Non-Goals

- No advanced analytics (percentiles, distributions, rolling windows).
- No user-configurable filters or date range overrides.
- No additional data storage or caching layers.

---

## 4. User Stories

1. **Day trader:** “I want to see if my strategy mostly holds positions for hours or days.”
2. **Swing trader:** “I want confirmation that my strategy holds for longer periods.”
3. **Beginner:** “I want a simple summary of how often and how large my trades are.”

---

## 5. Scope & Requirements

### 5.1. Placement (Must Have)

- Display in **Backtest Results** near other analysis panels.
- Use the same compact card style as existing metrics widgets.

### 5.2. Data Source (Must Have)

- Source: `GET /backtests/{run_id}/trades`.
- Use `entry_time`, `exit_time`, `entry_price`, and `qty` from each trade.
- Use backtest run `timeframe` to convert duration to **bars**.

### 5.3. Metrics (Must Have)

1. **Average hold time**
   - Compute duration per trade: `exit_time - entry_time`.
   - Report as **bars** and a friendly time unit (hours/days) based on timeframe.
2. **Longest position**
   - Max duration among all trades (bars + time unit).
3. **Shortest position**
   - Min duration among all trades (bars + time unit).
4. **Average position size**
   - Average of `entry_price * qty` across trades (USD notional).

### 5.4. Interpretation Helper (Must Have)

- Show a short note based on average hold time:
  - If average hold time is **<= 1 day**, show: “Holding times suggest a day-trading style.”
  - Otherwise show: “Holding times suggest a swing-trading style.”

### 5.5. Empty & Edge Cases (Must Have)

- If fewer than 2 trades, show “Not enough trades to analyze.”
- If timestamps are missing or invalid, hide the hold-time stats and show a short warning.
- If `qty` or `entry_price` are missing, hide the average position size row only.

---

## 6. UX / Design Notes

- Use a simple list layout (label + value) within a card.
- Keep copy short and avoid extra charts.
- Ensure mobile layout stacks cleanly with other analysis cards.

---

## 7. Acceptance Criteria

- Position analysis panel appears in backtest results.
- Average hold time, longest/shortest positions, and average position size render from trade data.
- Interpretation helper text follows the defined rule.
- Graceful handling of empty or partial data.
- No new backend endpoints or schema changes.

---

## 8. Implementation Notes (Engineering)

- Aggregate in the frontend backtest results view.
- Keep helper functions local to the view (avoid new shared utilities).
- Reuse existing trade fetch and backtest run metadata calls.

---

**End of PRD**
