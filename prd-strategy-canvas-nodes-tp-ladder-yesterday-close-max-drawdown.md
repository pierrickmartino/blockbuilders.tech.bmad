# PRD — Strategy Builder Node Updates: TP Ladder Levels, Yesterday Close, Max Drawdown

## Context
Blockbuilders’ MVP strategy canvas is a visual, node-based builder that stores a strategy as a JSON graph (nodes + connections) and powers an OHLCV-based backtest engine. The MVP explicitly includes simple risk limits such as Take Profit (TP) and Stop Loss (SL).

This PRD defines three **small, focused** updates to the strategy creation page’s node palette and runtime.

## Goals
1. **Take Profit (TP) ladder levels**: allow 1–3 TP levels, each closing a **% of the position** (e.g., TP1 close 20% at +30%, TP2 close 30% at +50%).
2. **New Input Node: Yesterday Close**: expose yesterday/previous close as an input for conditions.
3. **New Risk Node: Max Drawdown**: force-exit the position if overall drawdown breaches a threshold.

## Non-goals
To keep the implementation simple, we will **not** add:
- Trailing take profit or trailing stop.
- Complex drawdown modes (per-trade drawdown, per-position drawdown, etc.).
- Multi-asset or multi-timeframe logic.

## Users & Primary Use Cases
- Retail trader building simple rules and wanting basic, understandable risk controls.

### Example strategies enabled
- “Sell 20% at +30%, then let the rest run until exit signal.”
- “If yesterday close > EMA20 AND today close > yesterday close, enter.”
- “If account drawdown exceeds 10%, exit immediately.”

---

## UX / Strategy Builder Changes

### 1) Take Profit node → support multiple “ladder” levels (TP1/TP2/TP3)
**Where:** Position & Risk palette → existing `TakeProfit` node.

#### Properties panel fields
- **TP Levels** *(required)*
  - A list of 1–3 levels (MVP cap: **3**).
  - Each level has:
    - **Profit target (%)** *(required)*: numeric `> 0`.
    - **Close (%) of initial position** *(required)*: integer in `[1, 100]`.
    - **Remove** (not shown if only 1 level).
  - **Add level** button (disabled when 3 levels exist).

#### Validation rules (keep it simple)
- Levels are sorted by **Profit target (%) ascending** when saving/running.
- Profit targets must be **strictly increasing** (no duplicates).
- Sum of **Close (%)** across all levels must be `<= 100`.

#### Node label (compact)
- 1 level: `TP +30% / Close 20%`
- 2–3 levels: `TP x3: 30/20, 50/30, 80/50` (format: `profit/close`)

#### Behavior (predictable)
- Each TP level can trigger **at most once per trade**.
- When a TP level triggers, close the configured **% of the initial position size**.
  - If the remaining open size is smaller than the level’s target size, close **what’s left**.
- Multiple levels can trigger in the **same candle** (e.g., a gap up). Execute them in ascending profit order.
- If total closed reaches 100%, the position is fully closed.
- If total closed is < 100%, the remainder stays open until another exit (SL, MaxDrawdown, signal exit, etc.).

#### Same-candle conflict rule (simple + conservative)
If a risk exit and TP are both hit in the same candle:
- Execute **risk exits first** (Stop Loss, Max Drawdown), then TP levels.

---

### 2) New Input node: “Yesterday Close”
**Where:** Inputs palette.

**Node name**
- `YesterdayClose` (UI label: **Yesterday Close**).

**Output**
- A single numeric output representing the **previous candle close** in the strategy timeframe.
  - Note: if the strategy timeframe is 1D, this is literally yesterday’s close.

**Configuration**
- None (zero-config).

**Edge behavior**
- For the first candle in a backtest (or when previous candle is missing), the node outputs `null`.
- Any comparison using `null` evaluates to **false** (no signal) rather than crashing.

---

### 3) New Risk node: “Max Drawdown”
**Where:** Position & Risk palette (Risk section).

**Properties panel fields**
- **Max drawdown (%)** *(required)*
  - Numeric input in `(0, 100]`.
  - Meaning: maximum allowed equity drawdown from peak equity.

**Node label**
- Example: `Max DD 10%`

**Behavior (simple)**
- Engine tracks **peak equity** and **current equity** (mark-to-market).
- Drawdown% = `(peak_equity - current_equity) / peak_equity * 100`.
- If drawdown% >= threshold **and a position is open**, the engine **closes the position**.
- No extra modes (no “pause trading”, no “stop strategy” in MVP).

---

## Strategy Definition (JSON) Changes
Strategies are stored as a JSON graph (nodes + edges) in `strategy_versions`.

### Node configs (new/updated)

#### Updated: `TakeProfit`
- **New config field:** `levels` (array)
  - Each level: `{ "profit_pct": number, "close_pct": integer }`
  - Constraints (enforced in UI + backend):
    - 1–3 levels
    - `profit_pct > 0`
    - `close_pct` in `[1, 100]`
    - profit targets strictly increasing
    - `sum(close_pct) <= 100`

**Backward compatibility (existing saved strategies)**
- If a strategy has legacy `profit_pct` (+ optional `close_pct`), treat it as:
  - `levels = [{"profit_pct": profit_pct, "close_pct": close_pct || 100}]`

#### New: `YesterdayClose`
- No config.

#### New: `MaxDrawdown`
- Config: `max_drawdown_pct` (number >0 and <=100)

### Example snippet
```json
{
  "nodes": [
    {"id": "i1", "type": "YesterdayClose", "config": {}},
    {
      "id": "r1",
      "type": "TakeProfit",
      "config": {
        "levels": [
          {"profit_pct": 30, "close_pct": 20},
          {"profit_pct": 50, "close_pct": 30},
          {"profit_pct": 80, "close_pct": 50}
        ]
      }
    },
    {"id": "r2", "type": "MaxDrawdown", "config": {"max_drawdown_pct": 10}}
  ]
}
```

---

## Validation Rules
Validation is intentionally minimal.

### TakeProfit
- `profit_pct` must be `> 0`.
- `close_pct` must be an integer in `[1, 100]`.

### YesterdayClose
- No required fields.

### MaxDrawdown
- `max_drawdown_pct` must be `> 0` and `<= 100`.

---

## Backtest Engine Changes

### A) Take Profit ladder execution
When a trade is open and Take Profit is configured with `levels`:
1. Sort levels by `profit_pct` ascending.
2. For each candle, detect which levels are hit (using candle extremes):
   - Long: level is hit if `high >= tp_price(level)`
   - Short (if supported): level is hit if `low <= tp_price(level)`
3. Execute all newly-hit levels in ascending profit order:
   - Compute `tp_price` from entry price:
     - Long: `tp_price = entry_price * (1 + profit_pct/100)`
     - Short: `tp_price = entry_price * (1 - profit_pct/100)`
   - Compute target close quantity from the **initial** position size:
     - `qty_to_close = initial_qty * (close_pct/100)`
     - `qty_to_close = min(qty_to_close, remaining_qty)`
   - Apply fees/slippage exactly like existing exits.
   - Mark the level as “used” for this trade.

**Same-candle conflict rule (simple + conservative)**
If both a risk exit (SL / MaxDrawdown) and one or more TP levels are hit in the same candle:
- Execute risk exits first, then TP levels.

### B) YesterdayClose series
For candle index `t`:
- `YesterdayClose(t) = Close(t-1)` if `t > 0`, else `null`.

### C) Max Drawdown risk exit
At each candle step (after marking-to-market equity):
- Update `peak_equity = max(peak_equity, current_equity)`.
- Compute drawdown%.
- If `drawdown% >= max_drawdown_pct` and a position is open → exit the position using the same exit pricing rules as existing “market exit”/signal exits.

---

## API / Persistence Impact
- No DB migration required if strategy versions are already stored as JSON.
- Only JSON schema handling changes:
  - accept/store `TakeProfit.close_pct`
  - accept/store `YesterdayClose` and `MaxDrawdown` node types

---

## Acceptance Criteria

### Partial Take Profit
- User can configure TP with **Profit target (%)** and **Close (%)**.
- Backtest shows that when TP is hit, only the configured fraction is closed and the remaining position continues.
- Old strategies without `close_pct` still behave as full-exit TP.

### Yesterday Close input
- Node appears in Inputs palette.
- Can be wired into comparisons and used in entry/exit logic.
- For the first candle (no previous close), conditions evaluate to false (no crash).

### Max Drawdown risk
- Node appears in Risk palette.
- When drawdown threshold is breached during a backtest and a position is open, the position is closed.

---

## Minimal Test Cases
1. **TP ladder (3 levels)**: TP1 20% @ +30%, TP2 30% @ +50%, TP3 50% @ +80%. Verify each closes the correct quantity and total closes 100%.
2. **Gap candle triggers multiple levels**: a single candle `high` crosses TP1 + TP2. Verify both execute in ascending order.
3. **Backward compat TP**: load an old TP config (`profit_pct` only). Verify it behaves as a single level with `close_pct = 100`.
4. **Same candle SL + TP**: create a candle where low hits SL and high hits TP; verify SL executes first.
5. **YesterdayClose comparison**: ensure `YesterdayClose(t)` equals `Close(t-1)`.
6. **Max drawdown exit**: force equity peak then drop > threshold; verify exit occurs when a position is open.

## Rollout Plan
- Ensure backward compatibility for existing saved strategies (TP defaults).
- Optionally ship behind a simple feature flag (frontend + backend), but not required.
