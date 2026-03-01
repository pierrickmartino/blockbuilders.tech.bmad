# TST: Plain-English Indicator Labels

## 1. Objective
Validate that Essentials-mode indicator cards show plain-English labels with technical subtitles, retain existing tooltips, satisfy WCAG 2.1 AA contrast for both text levels, and keep non-essential indicators technical-only in All mode.

## 2. Scope
- Strategy editor indicator cards
- Essentials vs All mode label behavior
- Tooltip retention
- Accessibility contrast checks (NFR-09)

## 3. Preconditions / Test Data
- App running locally with strategy editor available.
- Palette supports Essentials and All modes (from existing feature).
- Browser devtools available for style inspection and keyboard focus checks.

## 4. Test Cases

### TC-01 Essentials mode label mapping renders correctly
1. Open strategy editor.
2. Ensure palette is in Essentials mode.
3. Inspect the five essentials indicator cards.

**Expected:**
- Cards show exact pairs:
  - Moving Average / SMA
  - Exponential Moving Average / EMA
  - Momentum Indicator / RSI
  - Volatility Bands / Bollinger Bands
  - Trend & Momentum / MACD

### TC-02 Existing tooltip behavior remains unchanged
1. In Essentials mode, hover each essentials indicator card (or focus via keyboard).
2. Read tooltip content.

**Expected:**
- Tooltip appears for each indicator card.
- Tooltip still provides existing 1–2 sentence explanation.
- No missing or blank tooltip states.

### TC-03 Contrast compliance for primary label (NFR-09)
1. In Essentials mode, inspect computed color/background for primary labels.
2. Measure contrast ratio with accessibility tooling.

**Expected:**
- Each primary label meets WCAG 2.1 AA contrast threshold for normal text.

### TC-04 Contrast compliance for subtitle (NFR-09)
1. In Essentials mode, inspect computed color/background for technical subtitles.
2. Measure contrast ratio with accessibility tooling.

**Expected:**
- Each subtitle meets WCAG 2.1 AA contrast threshold for normal text.

### TC-05 All mode keeps non-essential indicators technical-only
1. Switch palette to All mode.
2. Inspect non-essential indicator cards (e.g., Stochastic, ADX, Ichimoku, OBV, Fibonacci, ATR).

**Expected:**
- Non-essential indicators display existing technical names only.
- No plain-English rename is applied to non-essential indicators.

### TC-06 Keyboard accessibility sanity check
1. Tab through indicator cards in Essentials mode.
2. Confirm focus states and tooltip visibility on focus.

**Expected:**
- Cards remain keyboard reachable.
- Tooltip behavior works on keyboard focus, not only mouse hover.

### TC-07 Responsive text layout sanity check
1. Test mobile viewport width.
2. Verify primary label + subtitle readability and non-overlap.

**Expected:**
- Label hierarchy remains readable.
- No clipped or overlapping text in card list.

## 5. Regression Checklist
- Indicator insertion from cards still works.
- Palette mode toggle behavior unchanged.
- No new backend/API traffic introduced by label rendering changes.

## 6. Exit Criteria
- TC-01 through TC-07 pass.
- No accessibility regressions for indicator cards in light/dark themes.
- Product copy and naming match PRD acceptance criteria exactly.
