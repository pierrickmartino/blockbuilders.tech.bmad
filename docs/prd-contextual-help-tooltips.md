# PRD: Contextual Help & Tooltips

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2025-12-30

---

## 1. Summary

Add lightweight, hover-based tooltips that explain indicators, logic blocks, and performance metrics across the app. Provide small info icons next to technical terms that reveal the definition directly in the tooltip. The goal is to keep users in-app, reduce concept lookup friction, and build confidence for newer traders.

---

## 2. Goals

- Explain **every indicator**, **logic block**, and **metric** where it appears in the UI.
- Provide **in-tooltip definitions** for technical terms using info icons.
- Keep the UI **simple and unobtrusive**.
- Require **no backend changes**.

---

## 3. Non-Goals

- No new analytics or tracking requirements.
- No complex guided tours or onboarding flows.
- No new third-party UI libraries.
- No dynamic content management system.

---

## 4. User Stories

1. **New trader:** “When I hover a block or metric, I can quickly see what it means without leaving the app.”
2. **Intermediate trader:** “I can get the definition right in the tooltip when I see a term I don’t remember.”
3. **Power user:** “The UI stays clean; help content doesn’t block my workflow.”

---

## 5. Scope & Requirements

### 5.1. Tooltip Coverage (Must Have)

**Indicators:** SMA, EMA, RSI, MACD, Bollinger Bands, ATR

**Logic Blocks:** Compare, Crossover, AND, OR, NOT

**Signals & Risk Blocks:** Entry Signal, Exit Signal, Time Exit, Trailing Stop, Position Size, Take Profit, Stop Loss, Max Drawdown

**Metrics:** Total Return, CAGR, Max Drawdown, Number of Trades, Win Rate, Benchmark Return, Alpha, Beta

### 5.2. Placement (Must Have)

- **Strategy Builder**
  - Block palette cards (indicator + logic + signal + risk blocks)
  - Block headers on canvas nodes (same tooltip text)
  - Properties panel labels for block parameters (when applicable)
- **Backtest Results**
  - Metric labels in summary cards/tables

### 5.3. Tooltip Behavior (Must Have)

- Tooltip appears on **hover** (desktop) and **tap** (mobile) if supported by existing patterns.
- Content length: **1–2 sentences** max.
- Language: **plain and concise** (avoid heavy jargon where possible).

### 5.4. In-Tooltip Definitions (Must Have)

- Technical terms display a small **info icon** that reveals the definition directly in the tooltip.
- Tooltip text should contain the term definition without linking out.

---

## 6. Content Requirements

### 6.1. Tooltip Copy Rules

- **Short**: 120 characters or fewer when possible.
- **Actionable**: explain what it measures or signals.
- **Consistent**: same definition across all UI locations.

### 6.2. Terms to Define (Initial Set)

Include entries for at least:
- Moving Average, EMA, RSI, MACD, Bollinger Bands, ATR
- Crossover, Signal, Stop Loss, Take Profit, Trailing Stop
- Drawdown, CAGR, Alpha, Beta, Benchmark Return, Win Rate

---

## 7. Acceptance Criteria

- Every indicator, logic block, and metric listed in **5.1** has a tooltip in all listed locations.
- Info icons are visible and show the correct in-tooltip definitions.
- No new backend endpoints or database changes are introduced.
- UI remains clean and readable on desktop and mobile.
- Tooltip copy is consistent across the app.

---

## 8. Design/UX Notes

- Prefer **native `title` tooltips** or existing lightweight components.
- Avoid overlays that block interactions.
- Keep icons minimal (e.g., a small “i” in a circle).

---

## 9. Implementation Notes (Engineering)

- Reuse existing UI components when possible.
- Centralize tooltip copy in a small, static map to avoid duplication.
- Keep tooltip definitions in a simple, static map (no CMS, no API).

---

## 10. Out of Scope

- Searchable glossary.
- Tooltips for every UI element (only the defined scope).
- Localization or multi-language support.

---

## 11. Open Questions

- Should the info icon always be visible, or only on hover/focus?

---

**End of PRD**
