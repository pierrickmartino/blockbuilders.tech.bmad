# Test Checklist – Expanded Indicator Palette & Price Variation Input

> Source PRD: `prd-expanded-indicator-palette-price-variation-input.md`

## 1. Stochastic Oscillator

### 1.1 Palette & Properties
- [ ] Stochastic Oscillator block appears in the indicator palette
- [ ] Block has a short description tooltip in the palette
- [ ] Properties panel exposes %K period (default 14), %D period (default 3), smoothing (default 3)
- [ ] Default values match standard trading conventions

### 1.2 Backtest Calculation
- [ ] Stochastic outputs %K and %D series
- [ ] Calculation is correct for a known test case (manual verification)
- [ ] Warmup period is handled correctly (no output for initial candles)
- [ ] Output is deterministic (same input produces same output)

### 1.3 Tests
- [ ] Unit test verifies output shape (two series: %K and %D)
- [ ] Unit test verifies known-value calculation

## 2. ADX (Average Directional Index)

### 2.1 Palette & Properties
- [ ] ADX block appears in the indicator palette
- [ ] Block has a short description tooltip in the palette
- [ ] Properties panel exposes period (default 14)
- [ ] Default value matches standard trading conventions

### 2.2 Backtest Calculation
- [ ] ADX outputs ADX, +DI, and -DI series
- [ ] Calculation is correct for a known test case (manual verification)
- [ ] Warmup period is handled correctly
- [ ] Output is deterministic

### 2.3 Tests
- [ ] Unit test verifies output shape (three series: ADX, +DI, -DI)
- [ ] Unit test verifies known-value calculation

## 3. Ichimoku Cloud

### 3.1 Palette & Properties
- [ ] Ichimoku Cloud block appears in the indicator palette
- [ ] Block has a short description tooltip in the palette
- [ ] Properties panel exposes conversion period (default 9), base period (default 26), span B period (default 52), displacement (default 26)
- [ ] Default values match standard Ichimoku conventions

### 3.2 Backtest Calculation
- [ ] Ichimoku outputs conversion line, base line, leading span A, and leading span B
- [ ] Calculation is correct for a known test case (manual verification)
- [ ] Warmup period is handled correctly (especially for span B with 52-period lookback)
- [ ] Displacement (leading shift) is applied correctly
- [ ] Output is deterministic

### 3.3 Tests
- [ ] Unit test verifies output shape (four series)
- [ ] Unit test verifies known-value calculation

## 4. OBV (On-Balance Volume)

### 4.1 Palette & Properties
- [ ] OBV block appears in the indicator palette
- [ ] Block has a short description tooltip in the palette
- [ ] No parameters are exposed (simple cumulative calculation)

### 4.2 Backtest Calculation
- [ ] OBV outputs a single cumulative series
- [ ] OBV adds volume on up-close candles and subtracts on down-close candles
- [ ] OBV is unchanged on equal-close candles
- [ ] Calculation is correct for a known test case (manual verification)
- [ ] Output is deterministic

### 4.3 Tests
- [ ] Unit test verifies output shape (single series)
- [ ] Unit test verifies known-value calculation

## 5. Fibonacci Retracements (Simple)

### 5.1 Palette & Properties
- [ ] Fibonacci Retracements block appears in the indicator palette
- [ ] Block has a short description tooltip in the palette
- [ ] Properties panel exposes lookback period (default 50)
- [ ] Levels are fixed: 0.236, 0.382, 0.5, 0.618, 0.786
- [ ] Levels are not user-configurable (fixed for simplicity)

### 5.2 Backtest Calculation
- [ ] Fibonacci outputs price levels derived from high/low within the lookback period
- [ ] Levels are calculated as: low + (high - low) * level_ratio
- [ ] Lookback window correctly identifies the high and low within the period
- [ ] Calculation is correct for a known test case (manual verification)
- [ ] Output is deterministic
- [ ] Handles case where high equals low (flat price) without error

### 5.3 Tests
- [ ] Unit test verifies output shape (five level series)
- [ ] Unit test verifies known-value calculation

## 6. Price Variation % Input Block

### 6.1 Palette & Properties
- [ ] Price Variation % block appears in the input palette
- [ ] Block has a short description tooltip
- [ ] No parameters are exposed (minimal design)

### 6.2 Calculation
- [ ] Output is computed as `((close - prev_close) / prev_close) * 100`
- [ ] Positive values are returned for price increases
- [ ] Negative values are returned for price decreases
- [ ] Zero is returned when close equals previous close
- [ ] First candle output is handled gracefully (no previous close available)
- [ ] Output is a numeric series usable in comparisons, thresholds, and logic blocks

### 6.3 Tests
- [ ] Unit test verifies correct positive percentage
- [ ] Unit test verifies correct negative percentage
- [ ] Unit test verifies zero change case
- [ ] Unit test verifies edge case with first candle

## 7. Canvas Integration

- [ ] All new blocks can be dragged onto the canvas
- [ ] All new blocks can be connected to logic blocks
- [ ] All new blocks can be connected to comparison blocks
- [ ] Block outputs are selectable when multiple outputs exist (e.g., ADX: ADX, +DI, -DI)
- [ ] Removing a new block from the canvas works correctly
- [ ] Strategy JSON with new blocks saves and loads correctly

## 8. Backtest Engine Integration

- [ ] Strategies using new indicators produce backtest results without errors
- [ ] New indicators work alongside existing indicators (MA, EMA, RSI, MACD, Bollinger, ATR)
- [ ] Combining multiple new indicators in one strategy works correctly
- [ ] Backtest warmup period accounts for the longest indicator lookback in the strategy

## 9. Palette Curation

- [ ] Palette remains organized by category
- [ ] New indicators are grouped in the correct category
- [ ] Price Variation % is grouped with input blocks
- [ ] Palette does not feel overwhelming with the additions

## 10. Dependencies & Implementation

- [ ] No new external libraries are introduced
- [ ] Calculations are in the existing indicator module
- [ ] Indicator outputs are transient during backtests (no new storage fields)
- [ ] Existing block configuration patterns are reused in the UI

## 11. Documentation

- [ ] `docs/product.md` is updated to reflect the expanded palette
- [ ] Curated policy is explicitly documented
- [ ] Parameter defaults are documented for each indicator
