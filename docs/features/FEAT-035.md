# PRD: Drawdown Chart

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Add a dedicated **drawdown chart** that shows **underwater equity percentage over time** and highlights the **maximum drawdown period**. This chart complements the equity curve by making risk and “pain periods” obvious. It is sourced directly from existing equity curve data and is listed as “optional but desirable” in MVP docs.

---

## 2. Goals

- Make drawdown depth and duration **visually obvious**.
- Help users see **when** drawdowns happen and **how long** they last.
- Keep implementation **simple** by deriving data from the equity curve.

---

## 3. Non-Goals

- No new backend endpoints or database fields.
- No advanced risk analytics (Ulcer index, rolling drawdown stats, etc.).
- No configurable drawdown windows or overlays beyond the max drawdown period highlight.

---

## 4. User Stories

1. **Risk-aware trader:** “I can see exactly when my strategy was underwater and how long it stayed there.”
2. **Beginner:** “I understand that a smooth equity curve can still have painful drawdowns.”
3. **Power user:** “I can quickly identify the maximum drawdown period on the chart.”

---

## 5. Scope & Requirements

### 5.1. Chart Placement (Must Have)

- Display the drawdown chart alongside the equity curve in backtest results.
- Use the same time range and timestamps as the equity curve.

### 5.2. Data Source & Calculation (Must Have)

- Input: existing equity curve array from `GET /backtests/{run_id}/equity-curve`.
- Compute drawdown % per point:
  - Track running peak equity.
  - `drawdown_pct = ((equity - peak) / peak) * 100`.
  - Values are **0% at peaks** and **negative when underwater**.
- Identify the **maximum drawdown period**:
  - Start at peak before the deepest trough.
  - End when equity recovers to that peak (or end of series if never recovered).

### 5.3. Visual Treatment (Must Have)

- Render a simple line or area chart below 0% (underwater).
- Highlight the max drawdown period with a subtle background band or overlay.
- Tooltip shows timestamp and drawdown %.

### 5.4. Empty/Edge Cases (Must Have)

- If equity curve has < 2 points, hide the drawdown chart with a short placeholder message.
- If peak equity is 0 (should not happen), guard to avoid division by zero.

---

## 6. UX / Design Notes

- Keep layout consistent with existing results charts.
- Use existing charting library and styles (no new dependencies).
- Prefer a compact label (e.g., “Drawdown (%)”) and minimal legends.

---

## 7. Acceptance Criteria

- Drawdown chart renders for completed backtests with equity curve data.
- Drawdown values are derived from equity curve points (no new API calls).
- The maximum drawdown period is visually highlighted.
- Chart remains readable on mobile and desktop.
- No new backend endpoints, schema changes, or dependencies.

---

## 8. Implementation Notes (Engineering)

- Compute drawdown series in the frontend results view.
- Reuse the same timestamps used in the equity curve.
- Add a small helper function local to the results chart module (no shared utility unless already needed).

---

## 9. Open Questions

- Should the drawdown chart be shown by default or behind a small “Risk” tab toggle?
- Do we want to show drawdown as negative values (underwater) or absolute magnitude?

---

**End of PRD**
