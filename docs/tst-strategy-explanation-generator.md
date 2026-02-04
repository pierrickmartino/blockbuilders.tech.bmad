# Test Checklist -- Strategy Explanation Generator

> Source PRD: `prd-strategy-explanation-generator.md`

## 1. Explanation Display

- [ ] A "Strategy Explanation" section is visible in the strategy editor
- [ ] The explanation text is read-only (user cannot edit it inline)
- [ ] A "Copy" action is available next to the explanation text
- [ ] Clicking "Copy" copies the explanation to the clipboard
- [ ] Copy action provides visual feedback (e.g., brief "Copied" confirmation)
- [ ] When no valid explanation can be generated, the fallback message is shown: "This strategy can't be summarized yet. Add entry/exit blocks."

## 2. Generation Triggers

- [ ] Explanation is generated on load of a strategy version in the editor
- [ ] Explanation regenerates when a block is added to the canvas
- [ ] Explanation regenerates when a block is removed from the canvas
- [ ] Explanation regenerates when a block parameter changes
- [ ] Explanation regenerates when a connection is added between blocks
- [ ] Explanation regenerates when a connection is removed between blocks
- [ ] Explanation updates immediately in the UI after any trigger

## 3. Output Rules -- Determinism

- [ ] The same strategy definition always produces the exact same explanation text
- [ ] Regenerating the explanation without changes produces identical output
- [ ] Output uses plain English without excessive jargon
- [ ] Output uses short sentences over long nested clauses

## 4. Template Structure -- Entry Sentence

- [ ] Strategy with entry blocks produces "This strategy enters long when {entry_conditions}."
- [ ] Multiple entry signals are joined with "or"
- [ ] Entry conditions reference the correct block parameters (e.g., indicator periods)

## 5. Template Structure -- Exit Sentence

- [ ] Strategy with exit blocks produces "It exits when {exit_conditions}."
- [ ] Multiple exit rules are joined with "or"
- [ ] Exit conditions reference the correct block parameters

## 6. Template Structure -- Risk Sentence

- [ ] Risk sentence only appears when risk blocks are present
- [ ] Risk sentence format: "Risk management: {risk_rules}."
- [ ] Position size block generates "position size is {percentage}% of equity"
- [ ] When no risk blocks exist, no risk sentence is shown

## 7. Block Phrase Templates -- Price/Inputs

- [ ] `price` (close) renders as "price"
- [ ] `price` (open) renders as "open price"
- [ ] `price` (high) renders as "high price"
- [ ] `price` (low) renders as "low price"
- [ ] `volume` renders as "volume"
- [ ] `constant` renders as the constant value (e.g., "70")
- [ ] `yesterday_close` renders as "yesterday's close"

## 8. Block Phrase Templates -- Indicators

- [ ] `sma` renders as "the {period}-day SMA" with correct period value
- [ ] `ema` renders as "the {period}-day EMA" with correct period value
- [ ] `rsi` renders as "RSI({period})" with correct period value
- [ ] `macd` renders as "MACD({fast},{slow},{signal})" with correct parameter values
- [ ] `bbands` upper renders as "upper Bollinger Band ({period})"
- [ ] `bbands` middle renders as "middle Bollinger Band ({period})"
- [ ] `bbands` lower renders as "lower Bollinger Band ({period})"
- [ ] `atr` renders as "ATR({period})" with correct period value

## 9. Block Phrase Templates -- Logic

- [ ] `compare` with `>` renders as "{left} is above {right}"
- [ ] `compare` with `<` renders as "{left} is below {right}"
- [ ] `compare` with `>=` renders as "{left} is at or above {right}"
- [ ] `compare` with `<=` renders as "{left} is at or below {right}"
- [ ] `crossover` crosses_above renders as "{left} crosses above {right}"
- [ ] `crossover` crosses_below renders as "{left} crosses below {right}"
- [ ] `and` renders as "{a} and {b}"
- [ ] `or` renders as "{a} or {b}"
- [ ] `not` renders as "not ({input})"

## 10. Block Phrase Templates -- Signals and Exits

- [ ] `entry_signal` uses the connected condition phrase
- [ ] `exit_signal` uses the connected condition phrase
- [ ] `time_exit` renders as "after {bars} bars in a trade"
- [ ] `trailing_stop` renders as "a trailing stop of {trail_pct}% is hit"
- [ ] `stop_loss` renders as "a stop loss of {percentage}% is hit"
- [ ] `take_profit` with 1 level renders as "take profit at {profit_pct}%"
- [ ] `take_profit` with multiple levels renders as "take profit in {levels}-step ladder at {profit_pct_list}%"
- [ ] `max_drawdown` renders as "max drawdown of {percentage}% is reached"

## 11. Fallbacks and Edge Cases

- [ ] Missing block or connection uses "an unspecified condition" as placeholder
- [ ] Strategy with no entry signals shows the fallback message
- [ ] Strategy with no exit signals shows the fallback message
- [ ] Strategy with only note nodes shows the fallback message
- [ ] Note nodes (type "note") are ignored during explanation generation
- [ ] Disconnected blocks that are not part of any signal chain are ignored
- [ ] Strategy with only entry but no exit blocks generates entry sentence and fallback for exit

## 12. Data and Parsing

- [ ] Generator correctly parses `definition_json` with `blocks` and `connections`
- [ ] Generator builds a lookup map of `{block_id -> block}` correctly
- [ ] Generator builds a lookup map of `{block_id -> input connections}` correctly
- [ ] Recursive resolution from signal blocks back to inputs works for multi-level chains
- [ ] Circular connections (if possible) do not cause infinite loops

## 13. Optional Storage

- [ ] If stored, explanation is placed under `definition_json.metadata.explanation`
- [ ] Stored explanation does not affect backtesting execution
- [ ] Stored explanation is overwritten when regenerated
- [ ] Strategy validation ignores the `metadata.explanation` field

## 14. Complex Strategy Scenarios

- [ ] Strategy with SMA crossover entry + RSI exit generates correct multi-block explanation
- [ ] Strategy combining AND/OR logic produces correctly nested condition text
- [ ] Strategy with multiple entry conditions joined by OR reads naturally
- [ ] Strategy with stop loss + take profit + trailing stop lists all risk rules
- [ ] Strategy with Bollinger Bands referencing upper and lower bands distinguishes them correctly

## 15. Non-Goals Verification

- [ ] No AI/LLM is used for generation (output is purely template-based)
- [ ] Explanation text is read-only (no manual editing)
- [ ] No new backend endpoints are created for this feature
- [ ] No new block types are introduced
