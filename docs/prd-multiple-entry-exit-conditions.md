# PRD — Multiple Entry/Exit Conditions

## Context
The MVP strategy schema allows a single entry signal and a single exit signal. Users commonly need **multiple independent entries** (A OR B) and **multiple exit reasons** (signal OR time-based OR trailing stop). This PRD defines the smallest changes to the schema, builder, and backtest engine to support that.

## Goals
1. Allow **multiple entry_signal blocks** with OR semantics.
2. Allow **multiple exit_signal blocks** with OR semantics.
3. Add two simple exit rule blocks: **Time Exit** and **Trailing Stop**.
4. Keep the implementation minimal: no new abstractions, no extra DB tables.

## Non-goals
- Complex order types (limit/stop-limit).
- Multi-asset or multi-timeframe strategies.
- Short selling or position reversal logic.
- Advanced trailing stop modes (ATR-based, chandelier, etc.).

## Users & Primary Use Cases
- Traders building strategies like:
  - “Enter on MA cross OR RSI oversold.”
  - “Exit on signal OR after 10 bars OR trailing stop of 5%.”

---

## UX / Strategy Builder Changes

### 1) Allow multiple Entry Signal and Exit Signal nodes
**Where:** Signal section of the palette.

**Behavior**
- Multiple **Entry Signal** nodes can be placed and wired.
- Multiple **Exit Signal** nodes can be placed and wired.
- Validation requires **at least one** entry signal and **at least one** exit condition (see Validation section).

### 2) New Exit Rule node: Time Exit
**Where:** Risk/Exit palette.

**Properties panel fields**
- **Bars in trade** (required)
  - Integer `>= 1`.

**Node label**
- Example: `Time Exit 10 bars`

**Behavior (simple)**
- Exit when the position has been open for **N bars**.

### 3) New Exit Rule node: Trailing Stop
**Where:** Risk/Exit palette.

**Properties panel fields**
- **Trail (%)** (required)
  - Numeric `> 0` and `<= 100`.

**Node label**
- Example: `Trail 5%`

**Behavior (simple)**
- Track the **highest close** since entry.
- Trailing stop price = `highest_close * (1 - trail_pct/100)`.
- If a candle’s **low** crosses the trailing stop price, exit at the **next candle open**.

---

## Strategy Definition (JSON) Changes

### Multiple signal blocks
The strategy graph already stores blocks as a list. The change is **validation + interpreter behavior**:
- Allow multiple `entry_signal` blocks.
- Allow multiple `exit_signal` blocks.
- Interpret **entry** as OR across all entry signals.
- Interpret **exit** as OR across all exit signals + exit rules.

### New block types

#### `time_exit`
```json
{"type": "time_exit", "params": {"bars": 10}}
```

#### `trailing_stop`
```json
{"type": "trailing_stop", "params": {"trail_pct": 5}}
```

---

## Validation Rules (Minimal)
- **Entry:** at least one `entry_signal` block.
- **Exit:** at least one exit condition among `exit_signal`, `time_exit`, `trailing_stop`, `stop_loss`, `take_profit`, `max_drawdown`.
- **Time Exit:** `bars` must be integer `>= 1`.
- **Trailing Stop:** `trail_pct` must be `> 0` and `<= 100`.
- Keep existing block parameter bounds unchanged.

---

## Backtest Engine Changes

### A) Entry evaluation
- Collect all entry_signal outputs.
- `entry_trigger = OR(entry_signal_outputs)`.

### B) Exit evaluation
- Collect all exit_signal outputs.
- Compute additional exit rules:
  - **Time Exit:** `bars_in_trade >= bars`.
  - **Trailing Stop:** `low <= highest_close_since_entry * (1 - trail_pct/100)`.
- `exit_trigger = OR(exit_signal_outputs, time_exit, trailing_stop, stop_loss, take_profit, max_drawdown)`.

### C) Exit reason priority (deterministic)
If multiple exit reasons hit on the same candle, record the first match in this priority order:
1. `stop_loss`
2. `trailing_stop`
3. `max_drawdown`
4. `time_exit`
5. `signal`
6. `take_profit` (full exit)
7. `end_of_data`

### D) State tracking additions
- Track `bars_in_trade` starting at 0 on the entry candle and increment each candle while the trade is open.
- Track `highest_close_since_entry` for trailing stop.

---

## API / Persistence Impact
- No DB migration required (strategy definitions stored as JSON).
- Update validation and interpreter logic only.
- Update trade `exit_reason` enum to include: `trailing_stop`, `time_exit`.

---

## Acceptance Criteria
1. User can add **multiple entry signals** and **multiple exit signals**; engine treats them as OR.
2. User can add a **Time Exit** node; trade exits after N bars in a position.
3. User can add a **Trailing Stop** node; trade exits when price drops by trailing % from the highest close.
4. A strategy with **no exit_signal** but a **time_exit** and/or **trailing_stop** is valid.
5. Exit reason is deterministic and recorded using the priority order above.

---

## Minimal Test Cases
1. **Entry OR**: Entry A true, Entry B false → trade opens. Entry A false, Entry B true → trade opens.
2. **Exit OR**: Exit signal true OR Time Exit reached OR Trailing Stop hit → trade closes.
3. **Time Exit**: bars=3, position opens → exit after 3 bars.
4. **Trailing Stop**: highest_close=100, trail=5% → stop price 95. Candle low 94 → exit on next open.
5. **Multiple exit reasons same candle**: stop loss and exit signal both hit → exit_reason is `stop_loss`.
