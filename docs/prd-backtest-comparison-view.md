# PRD: Backtest Comparison View

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Add a **Backtest Comparison View** that lets users select **2–4 backtest runs** and view them **side-by-side** with aligned equity curves and a metric comparison table. This helps users quickly understand how parameter tweaks or strategy variants change performance.

---

## 2. Goals

- Make it **fast to compare** multiple backtest runs in one place.
- Align equity curves by timestamp so differences are visually obvious.
- Keep the implementation **small and simple** (reuse existing data and UI patterns).

---

## 3. Non-Goals

- No advanced statistical analysis (correlation, significance testing, etc.).
- No custom chart overlays beyond the aligned curves.
- No more than 4 runs at once.

---

## 4. User Stories

1. **Iterating trader:** “I can compare a new parameter set against my baseline backtest.”
2. **Strategy tinkerer:** “I can see which variant has the smoother equity curve.”
3. **Learner:** “I can scan the metrics table to understand why one run outperformed another.”

---

## 5. Scope & Requirements

### 5.1. Selection & Limits (Must Have)

- Users can select **2–4 backtest runs** from the backtest history list.
- Selection is checkbox-based (reuse existing list patterns).
- If fewer than 2 runs are selected, the compare action is disabled with helper copy.

### 5.2. Comparison Layout (Must Have)

- **Aligned equity curves** in a shared chart area (same time axis).
- **Metrics comparison table** showing key summary metrics per run.
- Each run has a color label used consistently in chart + table.

### 5.3. Metrics (Must Have)

Use existing summary metrics from `backtest_runs`, including at least:
- Total Return %, CAGR %, Max Drawdown %
- Sharpe, Sortino, Calmar
- Number of Trades, Win Rate %, Max Consecutive Losses
- Benchmark Return %, Alpha, Beta

### 5.4. Data Fetching (Must Have)

- Add a **multi-run compare endpoint** that returns summary metrics and equity curves for multiple run IDs in one request.
- Limit to **max 4 run IDs**; reject larger requests with a clear error message.

**Proposed Endpoint:**
- `POST /backtests/compare`
  - Body: `{ "run_ids": ["uuid1", "uuid2", ...] }`
  - Returns: `{ "runs": [ { "run_id": "...", "metrics": {...}, "equity_curve": [...] } ] }`

### 5.5. Alignment Rules (Must Have)

- Use the **union of timestamps** across runs.
- If a run is missing a timestamp, use `null` and let the chart handle gaps.
- No interpolation or smoothing.

### 5.6. Empty/Error States (Must Have)

- If a run has no equity data, show a concise warning and omit its curve.
- If any run ID is invalid or not owned by the user, return a plain-language error.

---

## 6. UX / Design Notes

- Keep the comparison view in the existing backtest results area.
- Use a simple header: “Compare Backtests (2–4)”.
- Table can be a basic grid with sticky row labels on mobile.
- Reuse existing chart components and Tailwind styles.

---

## 7. Acceptance Criteria

- User can select 2–4 runs and open the comparison view.
- Equity curves are aligned on the same time axis.
- Metrics table shows all required metrics for each run.
- Requesting more than 4 runs returns a clear error message.
- No new dependencies or complicated abstractions added.

---

## 8. Implementation Notes (Engineering)

- Backend: add `/backtests/compare` endpoint that fetches metrics from `backtest_runs` and equity curves from S3/MinIO in a single call.
- Frontend: reuse existing charts and summary metric renderers; keep new components minimal and local.
- Keep response payload small; include only fields needed for the comparison view.

---

## 9. Open Questions

- Should the comparison view allow exporting the comparison table as CSV?
- Should users be able to save a comparison set for later reuse?

---

**End of PRD**
