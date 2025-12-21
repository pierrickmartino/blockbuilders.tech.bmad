# PRD — Backtest Trade Details Drawer + Context Price Chart

## Summary

Improve the **Backtest Results** page by making trades easier to inspect.

When a user clicks a trade in the trades table, open a **drawer** that shows:
- A complete set of trade details (execution, risk, excursions, exit reason)
- A **context price chart** showing the market **10 days before entry and 10 days after exit**, with a **minimum window of 90 days**

This PRD is intentionally simple and scoped to the existing backtest results + trade list flow.

---

## Problem

The current trades table is useful for scanning, but not for understanding **why** a trade made/lost money, whether the stop/exit was good, or what happened around the trade.

Users need:
- Fast access to **trade mechanics** (entry/exit, duration, side, P&L)
- **Risk & excursion** insight (MAE/MFE, R-multiple)
- **Context** (price action around the trade)
- Simple cues for “late exit / weak stop” (entry → peak → exit, entry → trough → exit)

---

## Goals

1. Clicking a trade opens a drawer showing all requested details.
2. Drawer shows a context chart around the trade with the requested window rule.
3. Drawer loads quickly and works on desktop and mobile.
4. Minimal extra complexity: compute metrics once during backtest, and fetch chart data on demand.

---

## Non-goals

- Editing trades or re-running backtests from the drawer
- Adding complex analytics dashboards (distribution charts, clustering, etc.)
- Multi-timeframe or multi-asset context in the chart
- Tick-level or order-book simulation

---

## Primary User Story

> As a user, when I inspect a backtest, I want to click a trade and immediately understand what happened (entry/exit, risk, excursions, and exit reason), and see the surrounding price action so I can judge whether the trade logic is good.

---

## UX / Interaction

### Entry point
- **Backtest Results → Trades table**
- Clicking a row (or pressing Enter/Space when focused) opens the **Trade Drawer**.

### Drawer behavior
- Drawer slides in from the **right** (desktop).
- On mobile, it behaves like a **full-height bottom sheet** (or right drawer if you prefer consistency).
- Close via:
  - `Esc`
  - Close button (top-right)
  - Clicking outside the drawer

### Drawer layout (simple, single column)
1. **Header**
   - “Trade #X”
   - Side badge (LONG / SHORT)
   - Instrument + timeframe (e.g., BTC/USDT · 1h)
2. **Key stats (compact grid)**
   - P&L ($)
   - P&L (%)
   - Duration
   - Exit reason
3. **Execution**
   - Entry timestamp
   - Entry price
   - Exit timestamp
   - Exit price
4. **Risk at entry**
   - Planned SL level (price)
   - Planned TP level (price)
   - Initial risk ($, %, and “stop distance” in price units)
   - R-multiple
5. **Excursions**
   - MAE ($ and %)
   - MFE ($ and %)
   - Entry → peak → exit summary
   - Entry → trough → exit summary
6. **Context chart**
   - Candlestick (or line if candlestick is not available yet)
   - Markers + lines (entry/exit + SL/TP)
   - Highlight holding period

> Keep it one scroll. No tabs unless absolutely needed.

---

## Trade Fields to Display

### Raw fields
- Entry timestamp
- Entry price
- Exit timestamp
- Exit price
- Side (LONG/SHORT)
- P&L ($)
- P&L (%)
- Duration (holding period)
- Reason for exit
- Planned SL/TP levels at entry (even for backtests)

### Derived fields (computed by backtest engine and persisted per trade)
- MAE / MFE in **$** and **%**
- R-multiple (P&L / initial risk)
- Entry → peak → exit
- Entry → trough → exit

---

## Definitions & Calculations (simple, explicit)

Assume each trade stores:
- `qty` (position size in base units, e.g., BTC amount), OR `notional` in quote currency
- `fees_paid` (optional, but recommended)
- `sl_price_at_entry` and `tp_price_at_entry` (planned levels)
- Access to candle highs/lows during the holding period

### P&L ($)
- **Long:** `(exit_price - entry_price) * qty - fees_paid`
- **Short:** `(entry_price - exit_price) * qty - fees_paid`

> If qty is not available, store and use `notional_quote` and calculate via a consistent backtest convention (but prefer storing qty).

### P&L (%)
- `pnl_pct = pnl_usd / (entry_price * qty)`

### Duration
- `exit_ts - entry_ts`
- Display as: `Xd Yh Zm` (e.g., `2d 6h`)

### MAE / MFE
Measure the worst/best **in-trade excursion** relative to entry.

Let:
- `min_low = min(candle.low)` across the holding period
- `max_high = max(candle.high)` across the holding period

**Long**
- MAE (price move): `min_low - entry_price` (negative or zero)
- MFE (price move): `max_high - entry_price` (positive or zero)

**Short**
- MAE (price move): `entry_price - max_high` (negative or zero)
- MFE (price move): `entry_price - min_low` (positive or zero)

Convert to $:
- `mae_usd = mae_price_move * qty`
- `mfe_usd = mfe_price_move * qty`

Convert to % (relative to entry):
- `mae_pct = mae_price_move / entry_price`
- `mfe_pct = mfe_price_move / entry_price`

### R-multiple
Initial risk based on stop distance at entry.

- `risk_per_unit = abs(entry_price - sl_price_at_entry)`
- `initial_risk_usd = risk_per_unit * qty`

- `r_multiple = pnl_usd / initial_risk_usd`

Rules:
- If `sl_price_at_entry` is missing or equals entry: show `—` (not computable)
- If initial risk is ~0 (floating point): show `—`

### Entry → peak → exit (late-exit cue)
Provide a concise “gave back” summary.

For **long**
- `peak_price = max_high`
- `peak_move_pct = (peak_price - entry_price) / entry_price`
- `exit_move_pct = (exit_price - entry_price) / entry_price`
- “Gave back” = `peak_move_pct - exit_move_pct`

For **short**
- `peak_price` means the **most favorable** price (lowest low)
- Use the short equivalents (favorable move is entry - price)

Display example:
- `Peak +3.2% @ 2025-01-12 10:00 → Exit +0.8% (gave back 2.4%)`

Also capture the timestamp of the peak/trough candle for display:
- `peak_ts` (time of max favorable excursion)
- `trough_ts` (time of max adverse excursion)

### Entry → trough → exit (weak-stop cue)
For **long**
- trough = `min_low` (worst adverse)
- `worst_move_pct = (min_low - entry_price) / entry_price`

For **short**
- trough = `max_high` (worst adverse for short)
- `worst_move_pct = (entry_price - max_high) / entry_price`

Display example:
- `Worst -1.1% @ 2025-01-11 05:00 → Exit +0.8%`

---

## Exit Reason (enum)

Persist a single `exit_reason` field per trade:

- `TP_HIT`
- `SL_HIT`
- `SIGNAL_EXIT`
- `TIME_BASED`
- `LIQUIDATION`
- `END_OF_TEST` (position force-closed at end of data)
- `MANUAL` (optional, if backtest supports manual closure)

> Keep it an enum string; map to human labels in UI.

---

## Context Price Chart

### Window rule

We must show:
- at least **10 days before entry**
- at least **10 days after exit**
- and a **minimum total window of 90 days**

Algorithm:
1. Start with:
   - `start = entry_ts - 10d`
   - `end = exit_ts + 10d`
2. If `(end - start) < 90d`, extend **symmetrically** around the midpoint between entry and exit:
   - `needed = 90d - (end - start)`
   - `start -= needed/2`
   - `end += needed/2`
3. Clamp to available candle data bounds (if near beginning/end of dataset).
   - If clamped on one side, extend on the other side to still target 90d when possible.

### Chart content (minimal, high-value)
- Candles for the window (asset + timeframe used in the backtest run)
- Vertical markers:
  - Entry time
  - Exit time
- Horizontal lines:
  - Entry price
  - SL price (planned)
  - TP price (planned)
- Optional highlights (nice-to-have):
  - Shade the holding period between entry and exit
  - Mark peak (max favorable) and trough (max adverse) within holding period

### Data resolution
- Use the **same timeframe** as the backtest (e.g., 1h candles).
- If 90 days at 1h is heavy (~2160 candles), this is still reasonable for on-demand loading.

---

## Backend Requirements

### Backtest engine output (trade object)
Extend each persisted trade JSON record to include:

Required:
- `trade_id` (stable per run; e.g. incremental index or UUID)
- `side`
- `entry_ts`, `entry_price`
- `exit_ts`, `exit_price`
- `qty` (or `notional_quote`, but qty preferred)
- `pnl_usd`, `pnl_pct`
- `duration_seconds`
- `sl_price_at_entry`, `tp_price_at_entry`
- `exit_reason`

Computed + persisted:
- `mae_usd`, `mae_pct`
- `mfe_usd`, `mfe_pct`
- `initial_risk_usd`
- `r_multiple`
- `peak_price`, `peak_ts`
- `trough_price`, `trough_ts`

> Compute these once during the run while you already have the candles in memory.

### API

Keep it simple with two endpoints:

1. **Trades list (existing or new)**
   - `GET /backtests/{run_id}/trades`
   - Returns array of **summary rows** for the table:
     - `trade_id, side, entry_ts, entry_price, exit_ts, exit_price, pnl_usd, pnl_pct, exit_reason`
   - (Optionally include `duration_seconds` for table sorting)

2. **Trade details + chart context**
   - `GET /backtests/{run_id}/trades/{trade_id}`
   - Returns:
     - `trade` (all fields above)
     - `candles` for the computed chart window (start/end rule)
     - `window_start`, `window_end` for debugging

> If candles are already available via a generic candles endpoint, you may return only `window_start/window_end` and have the frontend call the candles endpoint. But the single endpoint above is usually simplest for UI.

### Storage
- Trades are already stored as part of run details JSON in object storage.
- The trade details endpoint can:
  - Read the run’s trade list blob
  - Find the trade by `trade_id`
  - Compute window start/end (if not persisted)
  - Fetch candles for that window (DB cache / provider / candles table)

---

## Frontend Requirements

### Trades table
- Row is clickable and keyboard-accessible.
- Selected row is highlighted.
- Keep existing columns; do not bloat the table.

### Drawer
- Shows skeleton/loading while fetching trade details.
- Clear formatting:
  - Prices: fixed decimals based on asset tick size rules (simple default ok for MVP)
  - Percentages: 2 decimals
- Copy-friendly timestamps (ISO visible on hover, or copy icon is nice-to-have).

### Chart
- Reuse existing chart library if present.
- If you need a minimal candlestick chart quickly:
  - TradingView `lightweight-charts` is a good option (small + purpose-built).
- Markers/lines as described above.

---

## Edge Cases

- **No exit yet** (open trade at end): treat as `END_OF_TEST` and still show chart.
- **Missing SL/TP at entry**: show planned levels as `—`, and R-multiple as `—`.
- **Trade duration very short**: chart still uses minimum 90-day window.
- **Data not available for full window**: clamp and show what exists; still include the 10d-before/after when possible.

---

## Performance Requirements (practical)

- Opening drawer should show details (excluding candles) in **<300ms** typical.
- Candles payload:
  - Keep under ~2500 candles per request for 1h timeframe and 90 days; ok.
- Cache candle queries by `(asset, timeframe, start, end)` in Redis/DB where possible.

---

## Analytics (minimal)

Track:
- `trade_drawer_opened` (run_id, trade_id)
- `trade_drawer_closed`
- (Optional) `trade_drawer_chart_loaded` latency

---

## Acceptance Criteria

1. Clicking a trade opens a drawer with all fields listed in the request.
2. Drawer displays MAE/MFE ($ and %) and R-multiple when SL is available.
3. Drawer shows entry→peak→exit and entry→trough→exit summaries.
4. Drawer shows exit reason and planned SL/TP levels at entry.
5. Chart shows candles from:
   - at least 10d before entry
   - at least 10d after exit
   - at least 90d total window
6. Chart includes entry/exit markers and SL/TP lines (when available).
7. Works on desktop and mobile, and is keyboard accessible.

---

## Implementation Notes (keep it simple)

- Prefer computing all trade metrics during backtest execution (single source of truth).
- Load candles only when the drawer opens (on-demand).
- Avoid adding a new “trade analytics service” or complicated event pipelines.
