# Test Checklist – Multiple Entry/Exit Conditions

> Source PRD: `prd-multiple-entry-exit-conditions.md`

## 1. Multiple Entry Signal Nodes – Canvas Builder

- [ ] User can place multiple Entry Signal nodes on the canvas from the signal palette
- [ ] Each Entry Signal node can be independently wired to different logic outputs
- [ ] Multiple Entry Signal nodes are visually distinguishable on the canvas
- [ ] Removing one Entry Signal node does not affect other Entry Signal nodes
- [ ] Validation requires at least one entry_signal block

## 2. Multiple Exit Signal Nodes – Canvas Builder

- [ ] User can place multiple Exit Signal nodes on the canvas from the signal palette
- [ ] Each Exit Signal node can be independently wired to different logic outputs
- [ ] Multiple Exit Signal nodes are visually distinguishable on the canvas
- [ ] Removing one Exit Signal node does not affect other Exit Signal nodes

## 3. Time Exit Node – Canvas Builder

- [ ] Time Exit node is available in the Risk/Exit palette section
- [ ] Time Exit node has a "Bars in trade" property field
- [ ] "Bars in trade" field requires an integer >= 1
- [ ] "Bars in trade" field rejects zero, negative, decimal, or non-numeric values
- [ ] Node label displays correctly (e.g., "Time Exit 10 bars")
- [ ] Node label updates when the bars parameter changes
- [ ] Time Exit node can be placed and wired on the canvas

## 4. Trailing Stop Node – Canvas Builder

- [ ] Trailing Stop node is available in the Risk/Exit palette section
- [ ] Trailing Stop node has a "Trail (%)" property field
- [ ] "Trail (%)" field requires a numeric value > 0 and <= 100
- [ ] "Trail (%)" field rejects zero, negative, values over 100, and non-numeric input
- [ ] Node label displays correctly (e.g., "Trail 5%")
- [ ] Node label updates when the trail_pct parameter changes
- [ ] Trailing Stop node can be placed and wired on the canvas

## 5. Validation Rules

- [ ] Strategy with at least one entry_signal is valid (entry requirement met)
- [ ] Strategy with zero entry_signal blocks fails validation with clear error
- [ ] Strategy with at least one exit condition (exit_signal, time_exit, trailing_stop, stop_loss, take_profit, max_drawdown) is valid
- [ ] Strategy with no exit_signal but a time_exit is valid
- [ ] Strategy with no exit_signal but a trailing_stop is valid
- [ ] Strategy with no exit_signal but a stop_loss is valid
- [ ] Strategy with no exit condition at all fails validation with clear error
- [ ] Time Exit bars parameter validation: integer >= 1
- [ ] Trailing Stop trail_pct parameter validation: > 0 and <= 100
- [ ] Existing block parameter bounds remain unchanged

## 6. Strategy Definition JSON

- [ ] JSON schema allows multiple `entry_signal` blocks in the block list
- [ ] JSON schema allows multiple `exit_signal` blocks in the block list
- [ ] `time_exit` block type is recognized: `{"type": "time_exit", "params": {"bars": N}}`
- [ ] `trailing_stop` block type is recognized: `{"type": "trailing_stop", "params": {"trail_pct": N}}`
- [ ] Strategy JSON with multiple entry/exit signals round-trips correctly (save and reload)
- [ ] No DB migration is required (definitions stored as JSON)

## 7. Backtest Engine – Entry Evaluation (OR Semantics)

- [ ] Entry A true, Entry B false: trade opens (OR semantics)
- [ ] Entry A false, Entry B true: trade opens (OR semantics)
- [ ] Entry A true, Entry B true: trade opens (single entry, no double-open)
- [ ] Entry A false, Entry B false: no trade opens
- [ ] Three or more entry signals: trade opens if any one is true
- [ ] Single entry signal: behaves identically to the previous single-entry logic

## 8. Backtest Engine – Exit Evaluation (OR Semantics)

- [ ] Exit signal true, time_exit not reached, trailing_stop not hit: trade closes (signal)
- [ ] Exit signal false, time_exit reached: trade closes (time_exit)
- [ ] Exit signal false, trailing_stop hit: trade closes (trailing_stop)
- [ ] Multiple exit signals: trade closes if any one exit_signal is true
- [ ] All exit conditions false: trade remains open
- [ ] Exit via stop_loss still works alongside new exit types
- [ ] Exit via take_profit still works alongside new exit types
- [ ] Exit via max_drawdown still works alongside new exit types

## 9. Backtest Engine – Time Exit Logic

- [ ] Position opens, bars_in_trade starts at 0 on entry candle
- [ ] bars_in_trade increments by 1 each subsequent candle while position is open
- [ ] When bars_in_trade >= configured bars value, exit is triggered
- [ ] Time Exit with bars=1: exits after 1 bar in position
- [ ] Time Exit with bars=3: exits after exactly 3 bars in position
- [ ] Time Exit with large bars value (e.g., 100): position stays open until bar count reached or other exit triggers first
- [ ] bars_in_trade resets to 0 on new trade entry

## 10. Backtest Engine – Trailing Stop Logic

- [ ] highest_close_since_entry is tracked starting from the entry candle
- [ ] highest_close updates when a new candle's close exceeds the current highest
- [ ] Trailing stop price = highest_close * (1 - trail_pct / 100)
- [ ] Exit triggers when candle low <= trailing stop price
- [ ] Exit occurs at the next candle's open (not the current candle)
- [ ] Example: highest_close=100, trail=5% -> stop at 95. Candle low=94 -> exit on next open
- [ ] Trailing stop with trail_pct=1%: tight trail, exits on small pullback
- [ ] Trailing stop with trail_pct=50%: wide trail, requires large drawdown to trigger
- [ ] highest_close_since_entry resets on new trade entry

## 11. Exit Reason Priority (Same-Candle Conflicts)

- [ ] stop_loss and exit_signal both hit on same candle: exit_reason = "stop_loss" (priority 1)
- [ ] trailing_stop and time_exit both hit on same candle: exit_reason = "trailing_stop" (priority 2)
- [ ] max_drawdown and signal both hit on same candle: exit_reason = "max_drawdown" (priority 3)
- [ ] time_exit and signal both hit on same candle: exit_reason = "time_exit" (priority 4)
- [ ] signal and take_profit both hit on same candle: exit_reason = "signal" (priority 5)
- [ ] take_profit alone triggers: exit_reason = "take_profit" (priority 6)
- [ ] end_of_data: exit_reason = "end_of_data" (priority 7)
- [ ] Exit reason is recorded correctly in the trade record

## 12. API & Persistence

- [ ] No new DB migration is required
- [ ] Trade `exit_reason` enum includes "trailing_stop"
- [ ] Trade `exit_reason` enum includes "time_exit"
- [ ] Validation logic updated to accept multiple entry/exit signals
- [ ] Interpreter logic updated to handle OR semantics for entry signals
- [ ] Interpreter logic updated to handle OR semantics for exit signals + exit rules

## 13. State Tracking

- [ ] `bars_in_trade` state variable is initialized on trade entry
- [ ] `bars_in_trade` increments correctly each candle while in position
- [ ] `bars_in_trade` resets when a new trade is opened
- [ ] `highest_close_since_entry` state variable is initialized on trade entry
- [ ] `highest_close_since_entry` updates correctly each candle while in position
- [ ] `highest_close_since_entry` resets when a new trade is opened
- [ ] State tracking does not interfere with existing state variables (equity, position, etc.)

## 14. Backward Compatibility

- [ ] Existing strategies with a single entry_signal and single exit_signal still work unchanged
- [ ] Existing strategies without time_exit or trailing_stop are unaffected
- [ ] Existing backtest results are not altered by the engine changes
- [ ] Loading an old strategy JSON with single entry/exit does not produce errors

## 15. Edge Cases

- [ ] Strategy with only time_exit as exit condition (no exit_signal): valid and backtests correctly
- [ ] Strategy with only trailing_stop as exit condition: valid and backtests correctly
- [ ] Strategy with time_exit + trailing_stop + stop_loss but no exit_signal: valid
- [ ] Strategy with many entry signals (5+) and many exit signals (5+): performs without errors
- [ ] Trailing stop with trail_pct=100: stop price is 0, effectively never triggers (or handles gracefully)
- [ ] Time exit with bars=1: immediate exit on the next candle after entry
- [ ] Entry and exit conditions both true on the same candle: entry takes precedence when not in a position, exit takes precedence when in a position
- [ ] Backtesting with no trades triggered: completes without errors
