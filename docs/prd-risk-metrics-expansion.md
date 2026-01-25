# PRD: Risk Metrics Expansion

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Add common risk-adjusted metrics to backtest results: **Sharpe ratio**, **Sortino ratio**, **Calmar ratio**, and **maximum consecutive losses**. These metrics must be calculated in the backtest engine and shown in the results summary alongside existing metrics.

---

## 2. Goals

- Provide standard, comparable risk-adjusted metrics for strategy evaluation.
- Keep calculation logic simple and deterministic.
- Display new metrics in the results summary and include them in exports.

---

## 3. Non-Goals

- No new risk analytics beyond the four specified metrics.
- No new charts or tabs dedicated to risk metrics.
- No configurable risk-free rate or benchmark tuning.

---

## 4. User Stories

1. **Trader:** “I can compare strategies using standard risk-adjusted ratios.”
2. **Power user:** “I can see the longest losing streak in results without opening the trade list.”

---

## 5. Scope & Requirements

### 5.1 Metrics (Must Have)

- **Sharpe Ratio**
  - Use per-candle returns from the equity curve.
  - Risk-free rate assumed **0**.
  - Annualize using the timeframe’s periods per year.
  - If standard deviation is 0 or insufficient data, return 0.

- **Sortino Ratio**
  - Use per-candle returns from the equity curve.
  - Downside deviation uses only negative returns.
  - Risk-free rate assumed **0**.
  - Annualize using the timeframe’s periods per year.
  - If downside deviation is 0 or insufficient data, return 0.

- **Calmar Ratio**
  - Use **CAGR / |Max Drawdown|**.
  - If max drawdown is 0, return 0.

- **Maximum Consecutive Losses**
  - Based on trade outcomes (loss if trade PnL < 0).
  - Count the longest losing streak by trade count.
  - If no trades, return 0.

### 5.2 Storage (Must Have)

- Store new metrics on `backtest_runs` alongside existing summary metrics.
- Include them in any summary metrics JSON or export payloads.

### 5.3 UI Placement (Must Have)

- Display in the **results summary** next to existing metrics (return, drawdown, win rate, alpha/beta).
- Use existing metric styling (no new components).

---

## 6. Acceptance Criteria

- Backtest engine calculates Sharpe, Sortino, Calmar, and max consecutive losses.
- Results summary shows all four new metrics for completed runs.
- Metrics appear in CSV/JSON summary export payloads.
- Edge cases (no trades, zero volatility, zero drawdown) return 0 and do not crash.

---

## 7. Implementation Notes (Engineering)

- Keep calculations in the existing backtest engine metrics section.
- Reuse existing return series and trade list data to avoid new queries.
- Avoid new dependencies or helper libraries.

---

## 8. Open Questions

- Should the UI display ratios to two decimal places or three?

---

**End of PRD**
