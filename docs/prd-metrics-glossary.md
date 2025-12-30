# PRD: Metrics Glossary Page

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2025-02-14

---

## 1. Summary

Create a dedicated Metrics Glossary page that explains every performance metric shown in backtests (e.g., CAGR, max drawdown, win rate, Sharpe ratio). The page is a **simple static reference** with **formulas**, **interpretation guidelines**, **good vs bad ranges**, and **short examples**. It includes **client-side search** to filter metrics and help users learn without leaving the app.

---

## 2. Goals

- Explain **every backtest metric** in one place with clear, plain-language definitions.
- Show **formulas** and **interpretation guidance** (including “good” vs “bad” ranges).
- Provide **short examples** to make metrics intuitive.
- Keep the page **static, fast, and simple** (no backend changes).
- Reduce confusion and improve trust in backtest results.

---

## 3. Non-Goals

- No backend changes or new APIs.
- No dynamic content management or admin tooling.
- No personalization or user-specific recommendations.
- No advanced analytics beyond the existing metric set.

---

## 4. User Stories

1. **New trader:** “I can look up any metric on the results screen and understand what it means.”
2. **Intermediate trader:** “I can see what a good range looks like and how to interpret it.”
3. **Power user:** “I can quickly search and jump to a metric definition.”

---

## 5. Scope & Requirements

### 5.1. Page Location (Must Have)

- Add a **single static page** under the main app, e.g. `/metrics-glossary`.
- Page is accessible from the results UI (link placement defined in design/UX section).

### 5.2. Search (Must Have)

- A **simple client-side search input** filters the metric list by name and keywords.
- No backend or external search services.

### 5.3. Content Structure (Must Have)

Each metric entry includes:
- **Name**
- **Definition** (1–2 short paragraphs)
- **Formula** (plain text or simple math)
- **Interpretation** (what it tells you)
- **Good vs Bad ranges** (with a short caveat)
- **Example** (one short, realistic scenario)

### 5.4. Metrics List (Initial Set)

Include every metric displayed in backtests, starting with:
- Total Return %
- CAGR %
- Max Drawdown %
- Win Rate %
- Number of Trades
- Benchmark Return %
- Alpha
- Beta
- Sharpe Ratio

> If any metric is not currently displayed in the UI, it should only be included if/when the UI exposes it.

---

## 6. Content Guidance

### 6.1. “Good vs Bad” Ranges

- Use **lightweight, conservative ranges**, always noting **“context matters.”**
- Example guidance (for copywriting, not hard validation rules):
  - **CAGR:** > 10% is strong, 0–10% is modest, < 0% is losing.
  - **Max Drawdown:** < 20% is generally manageable, > 40% is risky.
  - **Win Rate:** > 55% is strong, 45–55% is average, < 45% is weak.
  - **Sharpe Ratio:** > 1.0 is good, 0.5–1.0 is acceptable, < 0.5 is poor.

### 6.2. Examples

- Keep examples **short and concrete**, e.g.
  - “Strategy A: 18% CAGR, 12% max drawdown, Sharpe 1.2 → steady growth with moderate risk.”

---

## 7. UX / Design Notes

- **Simple layout**: single-column, readable typography.
- Use **cards or sections** per metric; no complex UI.
- Search input at the top; filtered list below.
- **Anchor links** per metric (e.g., `#cagr`, `#max-drawdown`) for deep linking.
- Use existing styles and components where possible.

---

## 8. Acceptance Criteria

- A dedicated **/metrics-glossary** page exists with static content.
- All backtest metrics listed in **5.4** have entries with definition, formula, interpretation, ranges, and an example.
- Search input filters metric entries instantly (client-side only).
- No backend changes, new dependencies, or database updates.
- Page is readable on mobile and desktop.

---

## 9. Implementation Notes (Engineering)

- Prefer **static data array** + map render.
- Keep filtering simple (case-insensitive substring match on title + keywords).
- Reuse existing UI layout components; no new libraries.

---

## 10. Open Questions

- Where should the primary link live (results page header, sidebar, or footer)?
- Should the glossary be linked in the main navigation or only from results?

---

**End of PRD**
