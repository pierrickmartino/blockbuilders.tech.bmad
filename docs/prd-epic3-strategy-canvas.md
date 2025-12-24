# PRD – Strategy Canvas (Visual Builder, Epic 3)

## 1. Purpose & Scope

The **Strategy Canvas** is the visual, block-based builder that lets a non-technical retail crypto trader define trading logic **without writing code**. It covers Epic 3 (S3.1–S3.5) from `mvp_plan.md` and the Strategy Canvas requirements in `mvp.md`.  

**Goal for this epic**

> A user can visually build a simple, valid trading strategy (indicators + logic + risk) on a canvas and save it as a strategy version that can be backtested by the system.

This PRD **only** covers:

- Canvas UI & UX.
- Block types and their configuration.
- JSON representation of the strategy graph.
- Validation rules and API interactions needed for saving and validating.

Backtesting execution itself is handled in Epic 4+.

---

## 2. User & Primary Use Case

**User:** Retail crypto tinkerer (no coding skills, basic understanding of indicators).  

**Primary use case**

> “I want to visually combine standard indicators and conditions into entry/exit rules and simple risk parameters, save that as a strategy, and know that the system can backtest it.”

---

## 3. High-Level Requirements

1. Provide a **single-page canvas** where the user can:
   - Drag blocks from a palette onto the canvas.
   - Connect outputs → inputs to define data flow.
   - Configure block parameters in a side panel.
   - See basic validation errors inline.
   - Save the strategy (creating a new version).

2. Represent the strategy as a **simple JSON graph** persisted as `strategy_versions.definition`.  

3. Support the **MVP block palette** (no more) from the main MVP spec:  
   - Inputs: Price (OHLCV), Volume.
   - Indicators: SMA, EMA, RSI, MACD, Bollinger Bands, ATR.
   - Logic: Compare (`>`, `<`, `>=`, `<=`), Crossover, AND, OR, NOT.
   - Position/risk: Position Size (fixed % of virtual balance), Take Profit (TP), Stop Loss (SL).
   - Special nodes: Entry Signal, Exit Signal.

4. Enforce a **simple flow constraint**:
   - Inputs/Indicators → Logic/Signals → Entry/Exit → Risk (TP/SL/Position size).
   - Long-only for MVP.

5. Provide **server-side validation** endpoint used before backtest.

---

## 4. Functional Requirements by Story

### 4.1 S3.1 – Basic Canvas Layout & Block Palette

**Description**

Implement the initial canvas page for editing a single strategy:

- URL: `/strategies/[id]/edit` (Next.js).
- Page is accessible only for authenticated users (Epic 1 dependency).  

**UI Elements**

- **Top bar**
  - Strategy name (read only here or editable inline).
  - Asset & timeframe (read only; set in “strategy metadata” flow from Epic 2).
  - Buttons: `Save`, `Back to list`.

- **Left panel: Block palette**
  - Sections:
    - Inputs
    - Indicators
    - Logic
    - Position & Risk
    - Signals
  - Each item is draggable.

- **Center: Canvas**
  - Pan/scrollable area.
  - Shows all blocks and connections.
  - Support:
    - Drag blocks around.
    - Click to select block.
    - Connect ports by clicking/dragging from output to input.
    - Basic zoom (optional if trivial; otherwise skip).

- **Right panel: Properties**
  - Shows properties of the currently selected block.
  - If no block selected: show short help text.

**Behavior**

- The canvas loads the latest `strategy_version.definition` for the strategy (if any).
- If none exists, create a **blank strategy** with:
  - A Price input block pre-placed.
  - Entry Signal and Exit Signal blocks pre-placed.

**Acceptance Criteria**

- User can drag a block from palette onto canvas.
- User can connect blocks and see connections visually.
- Saving sends JSON strategy graph to backend (see Section 5).
- Reloading the page shows the same layout and connections.

---

### 4.2 S3.2 – Indicator Blocks Configuration

**Description**

Support indicator blocks with configurable parameters and basic validation.  

**Indicator blocks**

- **SMA**
  - Params: `period` (int, default 20, min 1, max 500).
  - Input: price series (default: close).
- **EMA**
  - Params: `period` (int, default 20, min 1, max 500).
  - Input: price series (default: close).
- **RSI**
  - Params: `period` (int, default 14, min 2, max 100).
  - Input: price series (default: close).
- **MACD**
  - Params:
    - `fast_period` (default 12)
    - `slow_period` (default 26)
    - `signal_period` (default 9)
- **Bollinger Bands**
  - Params:
    - `period` (default 20)
    - `stddev` (default 2)
- **ATR**
  - Params:
    - `period` (default 14)

**UI behavior**

- When a block is selected:
  - Right panel shows:
    - Block name.
    - Parameter inputs (number fields with simple labels).
    - Optional select for price source: `Open | High | Low | Close` (default Close).
- All params are required (cannot be empty). Use reasonable defaults.

**Validation**

- Frontend:
  - Numeric fields: ensure value within simple bounds (min/max).
- Backend:
  - Validate that required params exist and are numeric.

**Acceptance Criteria**

- User can add each indicator to canvas.
- User can open properties panel and change params.
- Invalid values (e.g. period 0) show a simple inline error and prevent save until fixed.

---

### 4.3 S3.3 – Logic & Signal Blocks

**Description**

Define blocks that transform indicator outputs into final entry/exit signals.  

**Blocks**

1. **Compare**
   - Inputs:
     - `left` (numeric series)
     - `right` (numeric series or constant)
   - Params:
     - `operator`: one of `>`, `<`, `>=`, `<=`.
   - Output: boolean series.

2. **Crossover**
   - Inputs:
     - `fast` (numeric series)
     - `slow` (numeric series)
   - Params:
     - `direction`: `crosses_above` | `crosses_below`.
   - Output: boolean series (true at cross candle).

3. **AND**
   - Inputs:
     - `a` (boolean series)
     - `b` (boolean series)
   - Output: boolean series.

4. **OR**
   - Inputs:
     - `a` (boolean series)
     - `b` (boolean series)
   - Output: boolean series.

5. **NOT**
   - Inputs:
     - `input` (boolean series)
   - Output: boolean series.

6. **Entry Signal**
   - Inputs:
     - `signal` (boolean series).
   - Output:
     - Special: marks when to open a long position.

7. **Exit Signal**
   - Inputs:
     - `signal` (boolean series).
   - Output:
     - Special: marks when to close an open long position.

**Flow constraints (enforced in UI if simple; at least enforced in backend validation)**

- Indicator outputs can connect only to:
  - Compare, Crossover, or directly to other indicators if needed.
- Logic blocks (AND/OR/NOT/Compare/Crossover) outputs can connect to:
  - Other logic blocks or Entry/Exit Signals.
- Entry/Exit Signal blocks cannot feed back into indicators.

**Acceptance Criteria**

- User can build an example strategy:
  - `Price` → `SMA` → `Compare (Price > SMA)` → `Entry Signal`.
- The JSON graph reflects these block types, inputs, and outputs.
- Parent-child block compatibility is enforced (e.g. no connecting price directly to Entry Signal without logic, if that’s disallowed).

---

### 4.4 S3.4 – Position Sizing & Risk Blocks

**Description**

Let the user specify fixed position size and simple TP/SL settings.  

**Blocks**

1. **Position Size**
   - Params:
     - `type`: `percentage_of_equity` (MVP: only this).
     - `value`: number (e.g. 5 → 5% of virtual account).
   - No inputs (global config).
   - Output:
     - A config object used by backtest engine, not a time series.

2. **Take Profit**
   - Params:
     - `target_rr`: number (e.g. 2.0 = risk:reward 1:2), OR
     - `target_pct`: percentage, pick whichever is simpler.
   - MVP recommendation: **use percentage** to keep engine simple.
     - `take_profit_pct`: e.g. `10` = exit when trade is +10%.
   - No external inputs.

3. **Stop Loss**
   - Params:
     - `stop_loss_pct`: e.g. `5` = exit when trade is -5%.
   - No external inputs.

**UI & behavior**

- These blocks can be placed anywhere on canvas visually, but they don’t have connection ports (or only a “strategy config” port if needed later).
- There must be **at most one** of each block type per strategy (frontend can warn, backend must enforce).

**Acceptance Criteria**

- User can set a fixed % position size.
- User can set TP and SL percentages.
- After save, the backtest config derived from JSON includes these values.

---

### 4.5 S3.5 – Strategy Validation

**Description**

Validate strategies to catch obvious issues before running backtests.  

**API**

- `POST /strategies/{id}/validate`
  - Body: latest strategy JSON (optional if backend loads from DB).
  - Response:
    - `status`: \`"valid"\` | \`"invalid"\`.
    - `errors`: array of:
      - `{ block_id: string | null, code: string, message: string }`.

**Validation rules (MVP)**

1. **Required structure**
   - There is at least:
     - One Entry Signal block.
     - One Exit Signal block.
   - Entry Signal has at least one input connection.
   - Exit Signal has at least one input connection.

2. **Connectivity**
   - All blocks used in signal path:
     - Must have all required inputs connected (where applicable).
   - No “dangling” blocks that feed Entry/Exit with incompatible types.

3. **Parameters**
   - All required block params present and in allowed ranges (indicator periods, TP/SL, etc).
   - Asset & timeframe for the strategy are set (from Epic 2).  

4. **Uniqueness**
   - At most one Position Size, TP, and SL block.

**Frontend behavior**

- When user clicks “Save” or “Run backtest” (Epic 4):
  - Call `validate`.
  - If `invalid`, show:
    - Global banner: “Strategy has issues. Please fix the highlighted blocks.”
    - For each error with `block_id`, show an error badge on that block and inline message in properties panel.

**Acceptance Criteria**

- Invalid strategies (e.g. missing Entry Signal) return clear errors.
- Valid strategies return `status="valid"` and an empty error list.
- Backtest creation (Epic 4) should rely on this validation endpoint; out of scope to implement in this epic but must exist.

---

## 5. Data Model & JSON Structure

**Strategy version model** (in Postgres; detailed in Epic 0/2, summarized here)  

- Table: `strategy_versions`
  - `id` (uuid)
  - `strategy_id` (fk)
  - `created_at`
  - `definition` (JSONB) – canvas graph
  - `comment` (optional short note)

**Suggested JSON schema (MVP-level, not strict)**

```json
{
  "blocks": [
    {
      "id": "block-1",
      "type": "indicator.sma",
      "label": "SMA(20)",
      "position": { "x": 100, "y": 150 },
      "params": {
        "period": 20,
        "source": "close"
      }
    },
    {
      "id": "block-entry",
      "type": "signal.entry",
      "label": "Entry",
      "position": { "x": 600, "y": 200 },
      "params": {}
    }
  ],
  "connections": [
    {
      "from": { "block_id": "block-1", "port": "output" },
      "to": { "block_id": "block-entry", "port": "signal" }
    }
  ],
  "meta": {
    "version": 1,
    "created_at": "2025-01-10T12:34:56Z"
  }
}
```

**Notes**

- Keep schema simple; avoid over-engineering port types. Use:
  - `type` string namespace, e.g. `indicator.sma`, `logic.compare`, `signal.entry`.
- Backend backtest engine (Epic 4) will interpret this graph.

---

## 6. Non-Functional Requirements (for this epic)

1. **Simplicity**
   - Minimal styling using Tailwind; no complex animations.
   - Only required blocks from MVP; no experimental ones.  

2. **Performance**
   - Canvas interactions should feel instant on:
     - Desktop Chrome/Edge/Firefox/Safari.
   - Target: <100ms for typical operations (adding/moving blocks, connecting).

3. **Persistence**
   - Save action should be idempotent:
     - If the same graph is saved multiple times, result is multiple versions (by design) – this is acceptable per MVP.  

4. **Error handling**
   - If save fails:
     - Show clear message: “Could not save strategy. Please try again.”
   - If load fails:
     - Show minimal text: “Could not load strategy. Reload the page or contact support.”

---

## 7. Out of Scope (Explicit)

- Multi-asset or multi-timeframe logic.
- Short-selling, hedging, multiple sub-strategies.
- Custom user-defined indicators.
- Real-time market data on the canvas.
- Strategy sharing / collaboration features.

(All of the above are explicitly out of scope for MVP per `mvp.md`.)  

---

## 8. Dependencies

- **Epic 1** – Authentication (login required).
- **Epic 2** – Strategy CRUD & versioning tables/endpoints.
- **Epic 4** – Backtest engine that consumes `strategy_versions.definition`.
