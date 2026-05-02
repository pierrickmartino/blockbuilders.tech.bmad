# Test Checklist – Multiple Entry/Exit Conditions

> Source PRD: `prd-multiple-entry-exit-conditions.md`

## 1. Multiple Entry Signal Nodes – Canvas Builder

- [x] User can place multiple Entry Signal nodes on the canvas from the signal palette
- [x] Each Entry Signal node can be independently wired to different logic outputs
- [ ] Multiple Entry Signal nodes are visually distinguishable on the canvas
- [x] Removing one Entry Signal node does not affect other Entry Signal nodes
- [x] Validation requires at least one entry_signal block

## 2. Multiple Exit Signal Nodes – Canvas Builder

- [x] User can place multiple Exit Signal nodes on the canvas from the signal palette
- [x] Each Exit Signal node can be independently wired to different logic outputs
- [ ] Multiple Exit Signal nodes are visually distinguishable on the canvas
- [x] Removing one Exit Signal node does not affect other Exit Signal nodes

## 3. Time Exit Node – Canvas Builder

- [x] Time Exit node is available in the Risk/Exit palette section
- [x] Time Exit node has a "Bars in trade" property field
- [ ] "Bars in trade" field requires an integer >= 1
- [ ] "Bars in trade" field rejects zero, negative, decimal, or non-numeric values
- [x] Node label displays correctly (e.g., "Time Exit 10 bars")
- [x] Node label updates when the bars parameter changes
- [ ] Time Exit node can be placed and wired on the canvas

## 4. Trailing Stop Node – Canvas Builder

- [x] Trailing Stop node is available in the Risk/Exit palette section
- [x] Trailing Stop node has a "Trail (%)" property field
- [x] "Trail (%)" field requires a numeric value > 0 and <= 100
- [x] "Trail (%)" field rejects zero, negative, values over 100, and non-numeric input
- [x] Node label displays correctly (e.g., "Trail 5%")
- [x] Node label updates when the trail_pct parameter changes
- [ ] Trailing Stop node can be placed and wired on the canvas

## 5. Validation Rules

- [x] Strategy with at least one entry_signal is valid (entry requirement met)
- [x] Strategy with zero entry_signal blocks fails validation with clear error
- [x] Strategy with at least one exit condition (exit_signal, time_exit, trailing_stop, stop_loss, take_profit, max_drawdown) is valid
- [x] Strategy with no exit_signal but a time_exit is valid
- [x] Strategy with no exit_signal but a trailing_stop is valid
- [x] Strategy with no exit_signal but a stop_loss is valid
- [x] Strategy with no exit condition at all fails validation with clear error
- [ ] Time Exit bars parameter validation: integer >= 1
- [x] Trailing Stop trail_pct parameter validation: > 0 and <= 100
- [ ] Existing block parameter bounds remain unchanged

## 6. Strategy Definition JSON

- [x] JSON schema allows multiple `entry_signal` blocks in the block list
- [x] JSON schema allows multiple `exit_signal` blocks in the block list
- [x] `time_exit` block type is recognized: `{"type": "time_exit", "params": {"bars": N}}`
- [x] `trailing_stop` block type is recognized: `{"type": "trailing_stop", "params": {"trail_pct": N}}`
- [x] Strategy JSON with multiple entry/exit signals round-trips correctly (save and reload)
- [x] No DB migration is required (definitions stored as JSON)

## 7. Backtest Engine – Entry Evaluation (OR Semantics)

- [x] Entry A true, Entry B false: trade opens (OR semantics)
- [x] Entry A false, Entry B true: trade opens (OR semantics)
- [x] Entry A true, Entry B true: trade opens (single entry, no double-open)
- [x] Entry A false, Entry B false: no trade opens
- [x] Three or more entry signals: trade opens if any one is true
- [x] Single entry signal: behaves identically to the previous single-entry logic

## 8. Backtest Engine – Exit Evaluation (OR Semantics)

- [x] Exit signal true, time_exit not reached, trailing_stop not hit: trade closes (signal)
- [x] Exit signal false, time_exit reached: trade closes (time_exit)
- [x] Exit signal false, trailing_stop hit: trade closes (trailing_stop)
- [x] Multiple exit signals: trade closes if any one exit_signal is true
- [x] All exit conditions false: trade remains open
- [x] Exit via stop_loss still works alongside new exit types
- [x] Exit via take_profit still works alongside new exit types
- [x] Exit via max_drawdown still works alongside new exit types

## 9. Backtest Engine – Time Exit Logic

- [x] Position opens, bars_in_trade starts at 0 on entry candle
- [ ] bars_in_trade increments by 1 each subsequent candle while position is open
- [x] When bars_in_trade >= configured bars value, exit is triggered
- [x] Time Exit with bars=1: exits after 1 bar in position
- [ ] Time Exit with bars=3: exits after exactly 3 bars in position
- [x] Time Exit with large bars value (e.g., 100): position stays open until bar count reached or other exit triggers first
- [x] bars_in_trade resets to 0 on new trade entry

## 10. Backtest Engine – Trailing Stop Logic

- [x] highest_close_since_entry is tracked starting from the entry candle
- [x] highest_close updates when a new candle's close exceeds the current highest
- [x] Trailing stop price = highest_close * (1 - trail_pct / 100)
- [x] Exit triggers when candle low <= trailing stop price
- [ ] Exit occurs at the next candle's open (not the current candle)
- [ ] Example: highest_close=100, trail=5% -> stop at 95. Candle low=94 -> exit on next open
- [x] Trailing stop with trail_pct=1%: tight trail, exits on small pullback
- [x] Trailing stop with trail_pct=50%: wide trail, requires large drawdown to trigger
- [x] highest_close_since_entry resets on new trade entry

## 11. Exit Reason Priority (Same-Candle Conflicts)

- [ ] stop_loss and exit_signal both hit on same candle: exit_reason = "stop_loss" (priority 1)
- [x] trailing_stop and time_exit both hit on same candle: exit_reason = "trailing_stop" (priority 2)
- [ ] max_drawdown and signal both hit on same candle: exit_reason = "max_drawdown" (priority 3)
- [x] time_exit and signal both hit on same candle: exit_reason = "time_exit" (priority 4)
- [x] signal and take_profit both hit on same candle: exit_reason = "signal" (priority 5)
- [ ] take_profit alone triggers: exit_reason = "take_profit" (priority 6)
- [x] end_of_data: exit_reason = "end_of_data" (priority 7)
- [x] Exit reason is recorded correctly in the trade record

## 12. API & Persistence

- [x] No new DB migration is required
- [ ] Trade `exit_reason` enum includes "trailing_stop"
- [ ] Trade `exit_reason` enum includes "time_exit"
- [x] Validation logic updated to accept multiple entry/exit signals
- [x] Interpreter logic updated to handle OR semantics for entry signals
- [x] Interpreter logic updated to handle OR semantics for exit signals + exit rules

## 13. State Tracking

- [x] `bars_in_trade` state variable is initialized on trade entry
- [x] `bars_in_trade` increments correctly each candle while in position
- [x] `bars_in_trade` resets when a new trade is opened
- [x] `highest_close_since_entry` state variable is initialized on trade entry
- [x] `highest_close_since_entry` updates correctly each candle while in position
- [x] `highest_close_since_entry` resets when a new trade is opened
- [x] State tracking does not interfere with existing state variables (equity, position, etc.)

## 14. Backward Compatibility

- [x] Existing strategies with a single entry_signal and single exit_signal still work unchanged
- [x] Existing strategies without time_exit or trailing_stop are unaffected
- [ ] Existing backtest results are not altered by the engine changes
- [x] Loading an old strategy JSON with single entry/exit does not produce errors

## 15. Edge Cases

- [x] Strategy with only time_exit as exit condition (no exit_signal): valid and backtests correctly
- [x] Strategy with only trailing_stop as exit condition: valid and backtests correctly
- [x] Strategy with time_exit + trailing_stop + stop_loss but no exit_signal: valid
- [x] Strategy with many entry signals (5+) and many exit signals (5+): performs without errors
- [x] Trailing stop with trail_pct=100: stop price is 0, effectively never triggers (or handles gracefully)
- [x] Time exit with bars=1: immediate exit on the next candle after entry
- [x] Entry and exit conditions both true on the same candle: entry takes precedence when not in a position, exit takes precedence when in a position
- [x] Backtesting with no trades triggered: completes without errors
