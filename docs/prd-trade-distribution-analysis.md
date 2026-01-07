# PRD: Trade Distribution Analysis

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Add a **trade distribution analysis** panel in backtest results showing a **histogram of trade returns** and a **distribution of trade durations**. This helps users see if a strategy wins small and loses big (or vice versa) and understand typical holding time. Data is derived from the existing trades list with simple aggregation and charting.

---

## 2. Goals

- Show **return distribution** beyond win rate.
- Show **duration distribution** (how long trades last).
- Provide a **simple skew callout** to flag “many small wins, few large losses.”
- Keep implementation **lightweight** with no new backend endpoints.

---

## 3. Non-Goals

- No new metrics tables or stored aggregates.
- No custom bin configuration by users.
- No advanced statistics (skewness, kurtosis, Monte Carlo, etc.).

---

## 4. User Stories

1. **Risk-aware trader:** “I can see if my strategy’s wins are small and losses are large.”
2. **Beginner:** “I understand how long trades typically last.”
3. **Power user:** “I can quickly spot skewed distributions without digging into raw trades.”

---

## 5. Scope & Requirements

### 5.1. Placement (Must Have)

- Display in the **Backtest Results** view near the trades list or existing charts.
- Use the same layout style as other result charts.

### 5.2. Data Source (Must Have)

- Source: `GET /backtests/{run_id}/trades`.
- Use `pnl_pct` for return buckets.
- Use `entry_time` + `exit_time` to compute duration.
- Use backtest run `timeframe` (from existing run metadata) to convert duration to **bars**.

### 5.3. Return Histogram Buckets (Must Have)

Keep buckets simple and fixed:

**Wins:**
- 0% to 5%
- 5% to 10%
- 10% to 20%
- >20%

**Losses:**
- 0% to -5%
- -5% to -10%
- -10% to -20%
- <-20%

**Rules:**
- `pnl_pct` exactly 0% counts as a win bucket (0–5%).
- Display counts and percentages per bucket.

### 5.4. Duration Distribution (Must Have)

Compute **duration in bars**:

```
bar_duration = round((exit_time - entry_time) / timeframe_seconds)
```

Buckets (bars):
- 1
- 2–3
- 4–7
- 8–14
- 15–30
- >30

### 5.5. Skew Callout (Must Have)

Show a short text note based on bucket counts:

- If the **largest win bucket** is 0–5% and the **largest loss bucket** is -10% or worse, show:
  - “Distribution skews to small wins and larger losses. Review risk controls.”
- Otherwise show a neutral note:
  - “Distribution looks balanced across buckets.”

### 5.6. Empty & Edge Cases (Must Have)

- If there are fewer than 3 trades, show a compact “Not enough trades to analyze” placeholder.
- If timestamps are missing or invalid, hide the duration chart only (still show return histogram).

---

## 6. UX / Design Notes

- Use the existing charting library and styles.
- Prefer simple bar charts with minimal labels.
- Keep legends short (e.g., “Return %” and “Duration (bars)”).

---

## 7. Acceptance Criteria

- Return histogram renders using trade `pnl_pct` data.
- Duration distribution renders using entry/exit timestamps and timeframe.
- Skew callout appears with the defined rules.
- Works on mobile and desktop without layout breakage.
- No new backend endpoints or schema changes.

---

## 8. Implementation Notes (Engineering)

- Implement aggregation in the frontend backtest results module.
- Keep helper functions local to the results view (no new shared utilities unless already needed).
- Reuse existing trade fetch and backtest run metadata calls.

---

## 9. Open Questions

- Should the skew callout be shown only when there are at least 10 trades?

---

**End of PRD**
