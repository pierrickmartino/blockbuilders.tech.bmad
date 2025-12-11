# prd_epic3_strategy_canvas_visual_builder.md

## 1. Overview

This PRD defines the MVP implementation of the **Strategy Canvas (Visual Builder)**, corresponding to **Epic 3 – Strategy Canvas** in `mvp_plan.md`.

The Strategy Canvas is a **simple, block-based editor** that lets a non-technical trader visually define a single-asset, single-timeframe strategy, including indicators, logic, and basic risk settings, which can then be backtested.

The guiding principle: **keep it as simple as possible** while enabling the end-to-end flow  
**Build → Backtest → Inspect → Tweak** for one asset/timeframe.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Let a user **visually define** a strategy without writing code.
- Support only **one asset** and **one timeframe per strategy** (enforced).
- Provide a **limited, opinionated block palette**:
  - Price & volume inputs
  - Core indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR)
  - Basic logic (comparisons, crossovers, AND/OR/NOT)
  - Simple position sizing & risk (fixed size, TP, SL)
- Persist canvas configurations as **strategy versions** in the backend.
- Ensure strategies are **validatable** and usable by the Backtesting Engine (Epic 4).

### 2.2 Non-Goals (for this epic)

- No multi-asset or multi-timeframe strategies.
- No advanced UX (collaboration, comments, live co-editing, etc.).
- No marketplace/sharing logic.
- No complex analytics inside the canvas itself (analytics live on backtest results pages).

---

## 3. Users & Key Use Cases

Primary user: **Retail crypto tinkerer** – non-technical trader with basic indicator knowledge (RSI, MAs).

Core use cases for this epic:

1. **Create & view a strategy visually**
   - “I see blocks representing my indicators and logic on a canvas.”

2. **Configure indicators and logic**
   - “I can set RSI period, MA length, and conditions like ‘RSI < 30 AND Price above 200 SMA’.”

3. **Define simple risk**
   - “I can say ‘use 5% of account per trade’ with a fixed TP/SL.”

4. **Save and reuse**
   - “I can come back later and see/edit the same block structure.”

5. **Validate before running**
   - “If something is missing or broken, the canvas tells me before I backtest.”

These map to stories S3.1–S3.5 in `mvp_plan.md`.

---

## 4. Scope

### 4.1 In Scope

- **Strategy Editor Page** with:
  - Canvas area (nodes + connections).
  - Block palette.
  - Block configuration panel.
  - Basic toolbar (save, undo/redo optional, zoom/pan optional but nice-to-have).

- **Block types** (MVP set from `mvp.md` & `mvp_plan.md`):
  - Inputs:
    - Price (OHLCV, default: Close)
    - Volume
  - Indicator blocks:
    - SMA
    - EMA
    - RSI
    - MACD
    - Bollinger Bands
    - ATR
  - Logic / signal blocks:
    - Comparisons: `>`, `<`, `>=`, `<=`
    - Crossover: “crosses above”, “crosses below”
    - Boolean: `AND`, `OR`, `NOT`
  - Position & risk blocks:
    - Fixed position size (e.g. % of virtual balance)
    - Take Profit
    - Stop Loss
  - Special output nodes:
    - `Entry Signal`
    - `Exit Signal` (optional but recommended for clarity)

- **Persistence & versioning**:
  - Canvas state stored as a **JSON graph** attached to a `strategy_version`.

- **Validation**:
  - Backend validation ensuring strategies are structurally sound and backtestable (S3.5).

### 4.2 Out of Scope (for now)

- Custom script blocks or user-defined indicators.
- Dragging blocks between different strategies.
- Multi-output risk setups (e.g., scaling in/out, partial TP).
- Multi-leg, multi-symbol spreads, or options.

---

## 5. High-Level UX

### 5.1 Entry Point

- From **Strategy List** (Epic 2), the user clicks on a strategy row → navigates to  
  `/strategies/{id}/edit` (Strategy Editor).
- A new strategy (S2.1) opens the editor with a **blank canvas** and:
  - Asset/timeframe pre-selected and **non-editable** here (read-only labels).

### 5.2 Layout (desktop-first)

- **Left sidebar**: Block palette
- **Center**: Canvas (node graph)
- **Right sidebar**: Properties panel (block configuration & validation messages)
- **Top bar**:
  - Strategy name (editable text)
  - Asset & timeframe (labels)
  - Buttons: `Save`, `Validate` (optional if validation runs automatically on save)
  - Simple status text: “Saved at 14:22” / “Unsaved changes”

### 5.3 Canvas Behavior (minimal)

- Add block: drag from palette or click to spawn near center.
- Move block: click & drag.
- Connect blocks: drag from output port to input port; simple visual highlight on valid targets.
- Delete block: keyboard `Delete` or trash icon in properties panel.
- Zoom/pan: nice-to-have; if added, use simple mouse wheel zoom + drag canvas.

---

## 6. Functional Requirements

### 6.1 Strategy Graph Representation

**FR-1** – Graph data model  
- Each strategy version stores a **single JSON graph** with:  
  - `nodes`: list of blocks with:
    - `id` (string/UUID)
    - `type` (e.g. `price`, `sma`, `rsi`, `compare`, `and`, `position_size`)
    - `config` (key-value dict for parameters)
    - `position` (x,y on canvas; front-end only concern)
  - `edges`: list of connections:
    - `source_node_id`, `source_port`
    - `target_node_id`, `target_port`
- JSON is persisted via existing strategy versioning mechanism (`strategy_versions` table).

**FR-2** – Single asset/timeframe  
- Asset & timeframe **are not encoded as blocks**; they come from strategy metadata (Epic 2) and are enforced as single values per strategy.

### 6.2 Block Palette & Configuration

**FR-3** – Indicator blocks (S3.2)  
- The palette must contain at minimum:
  - SMA, EMA, RSI, MACD, Bollinger Bands, ATR.
- Each block exposes a **simple configuration form** in the properties panel:
  - Common fields:
    - `period` (integer; e.g. default 14 for RSI, 20 for MA/Bollinger).
    - `source` (dropdown: `Close` [default], `Open`, `High`, `Low`, `Volume` where applicable).
  - Bollinger:
    - `period`
    - `std_dev` (default 2.0)
  - MACD:
    - `fast_period` (default 12)
    - `slow_period` (default 26)
    - `signal_period` (default 9)
- Required fields must be clearly indicated (simple red border + message).

**FR-4** – Logic blocks (S3.3)  
- Compare block:
  - Inputs: `left`, `right` (numeric streams).
  - Config: operator (`>`, `<`, `>=`, `<=`).
  - Output: boolean stream.
- Crossover block:
  - Inputs: `a`, `b` (numeric streams).
  - Config: direction (`crosses_above`, `crosses_below`).
  - Output: boolean stream that is `true` on candle(s) where crossover occurred.
- Boolean blocks:
  - AND / OR:
    - Inputs: `a`, `b` (boolean).
    - Output: boolean.
  - NOT:
    - Input: `value` (boolean).
    - Output: boolean.

**FR-5** – Position & risk blocks (S3.4)  
- PositionSize block:
  - Config: `size_pct` (% of virtual account, e.g. 1–100).
- TakeProfit block:
  - Config: `tp_pct` (target % gain from entry, e.g. 2%).
- StopLoss block:
  - Config: `sl_pct` (max % loss from entry, e.g. 1%).
- MVP supports **long-only** strategies; the backtest engine interprets these as long entries only.

**FR-6** – Entry & Exit signal nodes  
- Canvas must provide fixed “sink” nodes:
  - `Entry Signal`:
    - Single boolean input. When `true`, strategy opens a long position with defined position size & risk.
  - `Exit Signal`:
    - Single boolean input. When `true`, strategy closes existing long position.
- There can be only one of each per graph (system-created, not deletable).

### 6.3 Canvas Operations (S3.1)  

**FR-7** – Basic interactions  
- Users can:
  - Add a block from palette.
  - Move blocks around.
  - Connect outputs to inputs (only compatible types: numeric→numeric, boolean→boolean).
  - Delete blocks (except Entry/Exit nodes).
- The UI prevents cycles that would break backtest execution (or at least validation catches them).

**FR-8** – Save & versioning integration  
- `Save`:
  - Sends the current graph JSON to backend to create a **new `strategy_version`** (Epic 2 S2.4).
  - Backend returns version id + timestamp.
- On successful save:
  - Top bar shows “Saved at hh:mm”.
  - Local “dirty” flag reset.

### 6.4 Validation (S3.5)  

**FR-9** – Validation rules  
At minimum, validation checks:

1. **Entry signal present & connected**
   - `Entry Signal` node exists and receives a boolean input.
2. **Required configs set**
   - No indicator or risk block is missing a required parameter.
3. **Type correctness**
   - Numeric blocks only receive numeric inputs; boolean blocks only receive boolean inputs.
4. **No unbounded cycles**
   - Graph has no cycles that the engine cannot resolve.
5. **Asset & timeframe set**
   - Strategy must have valid `asset` and `timeframe` from metadata (Epic 2 S2.1).

**FR-10** – Validation UX  
- When the user clicks `Validate` or runs a backtest:
  - If valid:
    - Show a small success banner: “Strategy is valid”.
  - If invalid:
    - Show a banner with a short summary.
    - Highlight problematic blocks:
      - Red outline around block.
      - Error text in properties panel (“RSI period must be > 0”, “Entry Signal is not connected”, etc.).

---

## 7. Integration & Dependencies

### 7.1 Dependencies on other epics

- **Epic 2 – Strategy Management**:
  - Creating strategies (name, asset, timeframe).
  - Listing strategies & versions.
- **Epic 4 – Backtesting Engine & Runs**:
  - Consumes the JSON graph produced here to generate trades.

### 7.2 Backend expectations

- Backend exposes endpoints (names illustrative, not strict):
  - `GET /strategies/{id}` – returns strategy metadata + latest version graph.
  - `POST /strategies/{id}/versions` – saves new strategy version with graph.
  - Optionally: `POST /strategies/{id}/validate` – returns validation result.
- Graph format is stable and documented enough so the backtest engine can:
  - Build indicator instances.
  - Build signal pipeline.
  - Read position size & risk parameters.

---

## 8. Non-Functional Requirements (Canvas-Specific)

- **Performance**:
  - Canvas interactions (drag, connect, delete) must feel instant; all done client-side.
  - Save operation should complete in < 500 ms under typical conditions.
- **Reliability**:
  - A broken save should not lose current graph:
    - If API returns error, keep local state and show a simple message (“Save failed, please retry.”).
- **Simplicity**:
  - UI text and labels should use everyday language:
    - “Take Profit (%) from entry” instead of jargon.
  - Limit options to sensible defaults; avoid long config forms.

---

## 9. Success Criteria

This epic is “done” when:

1. A new user can:
   - Create a strategy (Ep.2).
   - Build a simple strategy on the canvas (Price + MA + RSI + logic).
   - Save it and see it again later with blocks restored.
2. Validation prevents obviously broken strategies from being backtested.
3. The backtesting engine (Epic 4) can run at least one end-to-end example using the graph produced by the canvas and produce results consistent with expectations (same assumptions as `mvp.md`).

All of the above while keeping the UI **minimal, understandable, and non-intimidating** for a non-technical crypto tinkerer.
