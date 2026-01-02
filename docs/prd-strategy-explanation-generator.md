# PRD: Strategy Explanation Generator

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Goal

Provide a deterministic, plain-English explanation of what a strategy does, generated from the strategy’s canvas JSON. This makes strategies easier to understand, document, and share.

---

## 2. Non-Goals

- No AI/LLM generation.
- No manual editing of the generated explanation (read-only).
- No new block types or new strategy logic.
- No multi-asset/multi-timeframe explanations.

---

## 3. User Stories

1. As a user, I can see a clear sentence explaining when a strategy enters and exits.
2. As a user, I can copy/share the explanation along with a strategy.
3. As a user, I can trust the explanation is consistent and regenerated from the current blocks.

---

## 4. UX Requirements

- Show a “Strategy Explanation” section in the strategy editor (read-only text block).
- Provide a small “Copy” action (one-click copy to clipboard).
- If no valid explanation can be generated, show a short fallback message: “This strategy can’t be summarized yet. Add entry/exit blocks.”

---

## 5. Functional Requirements

### 5.1. Generation Triggers

- Generate on load of a strategy version in the editor.
- Regenerate when the strategy definition JSON changes (block add/remove, param change, connection change).

### 5.2. Output Rules

- Deterministic, template-based output.
- Use concise, plain English (avoid jargon when possible).
- Favor short sentences over long nested clauses.

### 5.3. Storage (Optional)

- If persistence is needed (e.g., export), store under `definition_json.metadata.explanation`.
- Generated text is always derived from the current blocks; it can be overwritten on regeneration.

---

## 6. Template Rules

### 6.1. High-Level Structure

Default format (single asset/timeframe assumed):

1. **Entry sentence**
   - “This strategy enters long when {entry_conditions}.”
2. **Exit sentence**
   - “It exits when {exit_conditions}.”
3. **Risk sentence** (only if present)
   - “Risk management: {risk_rules}.”

If multiple entry signals exist, join with “or” (simple list).
If multiple exit rules exist, join with “or”.

### 6.2. Block Phrase Templates

**Price/Inputs**
- `price` (close): “price”
- `price` (open/high/low): “{source} price”
- `volume`: “volume”
- `constant`: “{value}”
- `yesterday_close`: “yesterday’s close”

**Indicators**
- `sma`: “the {period}-day SMA”
- `ema`: “the {period}-day EMA”
- `rsi`: “RSI({period})”
- `macd`: “MACD({fast},{slow},{signal})”
- `bbands`:
  - upper: “upper Bollinger Band ({period})”
  - middle: “middle Bollinger Band ({period})”
  - lower: “lower Bollinger Band ({period})”
- `atr`: “ATR({period})”

**Logic**
- `compare`:
  - “{left} is {operator} {right}”
  - Map operators: `>` → “above”, `<` → “below”, `>=` → “at or above”, `<=` → “at or below”
- `crossover`:
  - crosses_above: “{left} crosses above {right}”
  - crosses_below: “{left} crosses below {right}”
- `and`: “{a} and {b}”
- `or`: “{a} or {b}”
- `not`: “not ({input})”

**Signals / Exits**
- `entry_signal`: use the connected condition phrase
- `exit_signal`: use the connected condition phrase
- `time_exit`: “after {bars} bars in a trade”
- `trailing_stop`: “a trailing stop of {trail_pct}% is hit”
- `stop_loss`: “a stop loss of {percentage}% is hit”
- `take_profit`:
  - If 1 level: “take profit at {profit_pct}%”
  - If multiple: “take profit in {levels}-step ladder at {profit_pct_list}%”
- `max_drawdown`: “max drawdown of {percentage}% is reached”

**Risk**
- `position_size`: “position size is {percentage}% of equity”

### 6.3. Fallbacks

- If a block or connection is missing: use “an unspecified condition”.
- If no entry or exit signals exist: return the fallback message from UX requirements.

---

## 7. Data & Parsing

- Input: `definition_json` with `blocks` and `connections`.
- Build a simple lookup map `{block_id → block}` and `{block_id → input connections}`.
- Recursively resolve phrases from signal blocks back to their inputs.
- Ignore note nodes (`type: "note"`).

---

## 8. Acceptance Criteria

1. For a valid strategy with entry + exit blocks, a readable explanation is shown.
2. The explanation updates when blocks/parameters/connections change.
3. Output is deterministic and fully template-based.
4. No new backend endpoints are required.
5. Optional storage uses `metadata.explanation` and does not affect backtesting.

---

## 9. Open Questions

- Should the explanation be included automatically in JSON export files?
- Should the explanation appear on the strategy list card (shortened) or only in the editor?

---

## 10. Rollout

- Ship behind a simple UI section in the editor.
- No migrations required.
- No changes to the backtest engine.
