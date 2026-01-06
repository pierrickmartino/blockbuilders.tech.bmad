# PRD: Seasonality Analysis (Backtest Results)

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Goal

Provide a simple seasonality view that shows strategy performance broken down by **month**, **quarter**, or **day-of-week** to help users spot calendar effects (e.g., “Mondays are bad”, “Q4 outperforms”).

## 2. Non-Goals

- No per-year seasonality breakdowns or filters.
- No advanced statistics (median, variance, significance tests).
- No multi-asset or multi-timeframe aggregation.
- No new data sources beyond existing backtest trades.

## 3. User Stories

- As a trader, I want to see average trade returns by month so I can identify strong/weak months.
- As a trader, I want to compare quarters quickly to spot broad seasonal patterns.
- As a trader, I want to see weekday performance so I can avoid consistently weak days.

## 4. UX Requirements

### 4.1. Placement

- Add a **Seasonality** section to the **Backtest Results** view below the equity curve and above the trades table.

### 4.2. Controls

- Toggle: **Month / Quarter / Weekday** (tabs or segmented buttons).
- Default: **Month**.

### 4.3. Visualization

- **Heatmap** with average return per bucket:
  - Month: 12 cells (Jan–Dec)
  - Quarter: 4 cells (Q1–Q4)
  - Weekday: 7 cells (Mon–Sun)
- Cell label: period name + average return %.
- Tooltip (or inline secondary text): average return %, trade count.
- Color scale: red (negative) → neutral (near 0) → green (positive).
- Empty state: “No trades available for seasonality analysis.”

## 5. Data & Calculations

### 5.1. Source Data

- Use existing trades list: `GET /backtests/{run_id}/trades`.
- Use each trade’s **exit_time** for bucket assignment.

### 5.2. Metric

- **Average Return % per bucket** = mean of `pnl_pct` for trades in the bucket.
- Also compute **trade count** per bucket for display.

### 5.3. Timezone

- Use **UTC** for bucket assignment to keep logic consistent and simple.
- Labels can follow existing UI timezone display rules (no new settings).

## 6. Backend Requirements

- **No new endpoints required.**
- Reuse existing trades list data already returned by the API.

## 7. Frontend Requirements

- Compute aggregates client-side in the backtest results component.
- Add a small helper to bucket trades by month/quarter/weekday and compute averages.
- Render a simple grid heatmap using Tailwind.

## 8. Acceptance Criteria

- [ ] Seasonality section is visible in backtest results with a Month/Quarter/Weekday toggle.
- [ ] Heatmap displays average return % and trade count for each bucket.
- [ ] Buckets are derived from trade **exit_time** in UTC.
- [ ] Empty state is shown when there are no trades.
- [ ] No new backend endpoints or database changes.

## 9. Open Questions

- None.
