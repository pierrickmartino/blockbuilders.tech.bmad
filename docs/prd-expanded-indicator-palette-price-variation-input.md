# PRD: Expanded Indicator Palette & Price Variation Input

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Expand the indicator palette with commonly requested indicators (**Stochastic**, **ADX**, **Ichimoku Cloud**, **OBV**, **Fibonacci retracements**) and add a new input block for **price variation %** between the previous close and current price. Keep the palette curated and the canvas simple while adding only indicators requested by multiple users.

---

## 2. Goals

- Add five new indicator blocks with parameter configuration, backtest calculations, and tests.
- Add a simple price-variation input block (percent change vs previous close).
- Keep the palette curated and avoid overwhelming the canvas.
- Maintain minimal, readable implementations with no new dependencies.

---

## 3. Non-Goals

- No “everything indicator” catalog or user-defined indicators.
- No new charting panels or visual overlays beyond existing indicator cards.
- No multi-timeframe indicators or multi-asset overlays.
- No advanced Fibonacci tools (drawing, anchoring, custom pivot selection).

---

## 4. User Stories

1. **Trader:** “I can use common indicators like Stochastic and ADX in my visual strategy.”
2. **Trader:** “I can measure percentage price change from yesterday’s close as an input.”
3. **Builder:** “The palette stays small and curated so I can find blocks quickly.”

---

## 5. Scope & Requirements

### 5.1 Indicator Blocks (Must Have)

Add the following indicators to the block palette, properties panel, and backtest engine:

- **Stochastic Oscillator**
  - Parameters: %K period (default 14), %D period (default 3), smoothing (default 3).
  - Outputs: %K, %D.
- **ADX (Average Directional Index)**
  - Parameters: period (default 14).
  - Outputs: ADX, +DI, -DI.
- **Ichimoku Cloud**
  - Parameters: conversion period (default 9), base period (default 26), span B period (default 52), displacement (default 26).
  - Outputs: conversion line, base line, leading span A, leading span B.
- **OBV (On-Balance Volume)**
  - Parameters: none (simple cumulative).
  - Output: OBV series.
- **Fibonacci Retracements (Simple)**
  - Parameters: lookback period (default 50), levels (fixed: 0.236, 0.382, 0.5, 0.618, 0.786).
  - Outputs: price levels derived from high/low within lookback.

### 5.2 Price Variation Input Block (Must Have)

- **Block name:** Price Variation % (or similar).
- **Definition:** Percent change between the previous candle close and the current candle close.
  - Formula: `((close - prev_close) / prev_close) * 100`.
  - Allows negative values.
- **Parameters:** None (keep it minimal).
- **Output:** Numeric series usable in comparisons, thresholds, and logic blocks.

### 5.3 Palette Curation Rules (Must Have)

- Add indicators only when requested by multiple users.
- Keep the palette minimal and grouped by category.
- Prefer incremental additions over large one-time expansions.

### 5.4 UI & UX (Must Have)

- Each indicator block appears in the palette with a short description tooltip.
- Properties panel exposes only the required parameters (no advanced toggles).
- Default values should match standard trading conventions.

### 5.5 Backtest Engine (Must Have)

- Implement indicator calculations in the existing indicator module.
- Ensure deterministic outputs and stable handling of warmup periods.
- Reuse existing array/series utilities; no new external libraries.

### 5.6 Tests (Must Have)

- Add unit tests for each indicator output shape and a few known-value checks.
- Add tests for the price variation % input block.
- Keep tests minimal and focused (no complex fixtures).

### 5.7 Documentation (Must Have)

- Update `docs/product.md` to reflect the curated palette and new planned indicators.
- Update strategy guide / help docs with short explanations and parameter defaults.

---

## 6. Acceptance Criteria

- New indicator blocks appear in the palette and properties panel with correct defaults.
- Backtest engine calculates Stochastic, ADX, Ichimoku, OBV, and Fibonacci levels.
- Price Variation % input block returns correct signed percentages.
- Tests cover each new indicator and the new input block.
- Documentation reflects the expanded palette and keeps the curated policy explicit.

---

## 7. Implementation Notes (Engineering)

- Keep calculations in `backend/app/backtest/indicators.py` (or existing indicator module).
- Avoid new storage fields; keep indicator outputs transient during backtests.
- Minimize UI changes by reusing existing block configuration patterns.

---

## 8. Open Questions

- Should Fibonacci retracement levels be selectable, or remain fixed for simplicity?
- Should Ichimoku outputs be exposed as separate selectable outputs or a single block output tuple?

---

**End of PRD**
