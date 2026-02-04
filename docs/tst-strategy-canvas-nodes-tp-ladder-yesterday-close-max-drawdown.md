# Test Checklist – Strategy Builder Node Updates: TP Ladder Levels, Yesterday Close, Max Drawdown

> Source PRD: `prd-strategy-canvas-nodes-tp-ladder-yesterday-close-max-drawdown.md`

## 1. Take Profit Ladder – UI & Configuration

- [ ] TP node appears in Position & Risk palette
- [ ] Properties panel shows "TP Levels" with ability to add 1–3 levels
- [ ] Each level has "Profit target (%)" and "Close (%) of initial position" fields
- [ ] "Add level" button appears when fewer than 3 levels exist
- [ ] "Add level" button is disabled when 3 levels already exist
- [ ] "Remove" button is hidden when only 1 level exists
- [ ] "Remove" button is visible when 2 or more levels exist
- [ ] Removing a level updates the list correctly

## 2. Take Profit Ladder – Validation Rules

- [ ] `profit_pct` must be > 0; reject 0 or negative values
- [ ] `close_pct` must be an integer in [1, 100]; reject 0, negative, decimal, or > 100
- [ ] Profit targets must be strictly increasing (no duplicates allowed)
- [ ] Sum of `close_pct` across all levels must be <= 100
- [ ] Validation error shown when profit targets are not strictly increasing
- [ ] Validation error shown when sum of close_pct exceeds 100
- [ ] Levels are auto-sorted by profit target ascending when saving/running

## 3. Take Profit Ladder – Node Label Display

- [ ] Single level displays as `TP +30% / Close 20%`
- [ ] Two levels display in compact format `TP x2: 30/20, 50/30`
- [ ] Three levels display in compact format `TP x3: 30/20, 50/30, 80/50`

## 4. Take Profit Ladder – Backtest Engine Execution

- [ ] Each TP level triggers at most once per trade
- [ ] Long position: level is hit when `high >= entry_price * (1 + profit_pct/100)`
- [ ] Close quantity is calculated from **initial** position size: `initial_qty * (close_pct/100)`
- [ ] If remaining qty < target close qty, close what's left
- [ ] When total closed reaches 100%, position is fully closed
- [ ] When total closed < 100%, remainder stays open until another exit
- [ ] Fees/slippage applied to TP exits exactly like existing exits
- [ ] TP levels marked as "used" after triggering (no re-trigger)

## 5. Take Profit Ladder – Multi-Level Same-Candle Scenarios

- [ ] Gap candle crossing multiple TP levels executes them in ascending profit order
- [ ] All newly-hit levels in a single candle execute correctly
- [ ] Position sizes are reduced cumulatively as each level triggers

## 6. Take Profit Ladder – Same-Candle Conflict Rule

- [ ] When SL and TP are both hit in the same candle, SL executes first
- [ ] When MaxDrawdown and TP are both hit in the same candle, MaxDrawdown executes first
- [ ] After risk exit, TP levels apply to any remaining position (if any)

## 7. Take Profit Ladder – Backward Compatibility

- [ ] Old strategy with legacy `profit_pct` only loads correctly
- [ ] Legacy config treated as `levels = [{profit_pct: X, close_pct: 100}]`
- [ ] Old strategy with legacy `profit_pct` + `close_pct` converts to single-level array
- [ ] Converted strategies behave identically to their original behavior
- [ ] No DB migration needed (JSON schema only)

## 8. Yesterday Close – UI & Configuration

- [ ] YesterdayClose node appears in Inputs palette
- [ ] Node UI label displays "Yesterday Close"
- [ ] Node has zero configuration (no properties panel fields)
- [ ] Node has a single numeric output handle

## 9. Yesterday Close – Wiring & Logic

- [ ] YesterdayClose can be wired into comparison nodes
- [ ] YesterdayClose can be used in entry logic conditions
- [ ] YesterdayClose can be used in exit logic conditions
- [ ] Connections validate correctly (numeric output to numeric input)

## 10. Yesterday Close – Backtest Engine

- [ ] `YesterdayClose(t) = Close(t-1)` for candle index t > 0
- [ ] For first candle (t=0), YesterdayClose outputs `null`
- [ ] Any comparison using `null` evaluates to **false** (no signal generated)
- [ ] No crash or error when YesterdayClose is null on first candle
- [ ] Works correctly across different strategy timeframes (1h, 4h, 1D, etc.)

## 11. Max Drawdown – UI & Configuration

- [ ] MaxDrawdown node appears in Position & Risk palette (Risk section)
- [ ] Properties panel shows "Max drawdown (%)" as required field
- [ ] Node label displays as `Max DD X%` (e.g., `Max DD 10%`)

## 12. Max Drawdown – Validation

- [ ] `max_drawdown_pct` must be > 0; reject 0 or negative
- [ ] `max_drawdown_pct` must be <= 100; reject > 100
- [ ] Non-numeric input rejected
- [ ] Empty field shows validation error

## 13. Max Drawdown – Backtest Engine Execution

- [ ] Drawdown calculated as `(entry_price - close_price) / entry_price * 100` for long positions
- [ ] Position is closed at candle close when drawdown% >= threshold
- [ ] Max Drawdown evaluates at **candle close** (not intra-candle like SL)
- [ ] Only triggers when a position is open (no action when no position)
- [ ] Position fully exits when MaxDrawdown triggers
- [ ] Fees/slippage applied to MaxDrawdown exits like other exits

## 14. JSON Schema & Persistence

- [ ] TakeProfit node config accepts `levels` array field
- [ ] YesterdayClose node type accepted and stored with empty config `{}`
- [ ] MaxDrawdown node type accepted and stored with `max_drawdown_pct` field
- [ ] Existing strategies without new node types load without errors
- [ ] Strategy validation endpoint accepts all three new/updated node configs

## 15. Minimal Test Cases (from PRD)

- [ ] **TP ladder (3 levels)**: TP1 20% @ +30%, TP2 30% @ +50%, TP3 50% @ +80% — each closes correct quantity, total closes 100%
- [ ] **Gap candle triggers multiple levels**: single candle high crosses TP1 + TP2, both execute in ascending order
- [ ] **Backward compat TP**: old TP config (profit_pct only) behaves as single level with close_pct=100
- [ ] **Same candle SL + TP**: candle where low hits SL and high hits TP — SL executes first
- [ ] **YesterdayClose comparison**: YesterdayClose(t) equals Close(t-1)
- [ ] **Max drawdown exit**: equity drop > threshold triggers exit when position is open

## 16. Edge Cases

- [ ] TP with single level at close_pct=100 behaves as full exit (same as legacy)
- [ ] TP with sum of close_pct < 100 leaves residual position open
- [ ] MaxDrawdown at exactly the threshold value (boundary test)
- [ ] MaxDrawdown with no open position does nothing
- [ ] YesterdayClose on a very short backtest (1-2 candles)
- [ ] Multiple risk nodes (SL + MaxDrawdown) on the same strategy
- [ ] TP ladder + MaxDrawdown + SL all configured together
