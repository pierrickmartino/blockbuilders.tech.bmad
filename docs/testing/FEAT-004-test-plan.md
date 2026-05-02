# Test Checklist – Strategy Canvas (Epic 3)

> Source PRD: `prd-epic3-strategy-canvas.md`

---

## 1. Canvas Layout & Basic Interactions (S3.1)

### 1.1 Page & Navigation

- [x] Canvas page is accessible at `/strategies/[id]/edit`
- [x] Page requires authentication; unauthenticated users are redirected to login
- [x] Page loads only if the user owns the strategy; otherwise shows an error or redirects

### 1.2 Top Bar

- [x] Strategy name is displayed in the top bar
- [x] Asset and timeframe are displayed (read-only labels or inline edit)
- [x] "Save" button is present and functional
- [x] "Back to list" button navigates to the strategies list

### 1.3 Block Palette (Left Panel)

- [x] Left panel displays block categories: Inputs, Indicators, Logic, Position & Risk, Signals
- [x] Each category contains the correct blocks as defined in the MVP spec
- [x] Blocks are draggable from the palette onto the canvas

### 1.4 Canvas Interactions

- [x] Blocks can be dragged from the palette and placed on the canvas
- [x] Blocks can be repositioned by dragging on the canvas
- [x] Canvas is pannable/scrollable
- [x] Clicking a block selects it (visual indicator of selection)
- [x] Connections can be created by clicking/dragging from an output port to an input port
- [x] Connections are displayed visually as lines/curves between blocks
- [x] (Optional) Basic zoom in/out works if implemented

### 1.5 Properties Panel (Right Panel)

- [x] When a block is selected, the right panel shows its properties
- [x] When no block is selected, the right panel shows help text
- [x] Properties panel updates when a different block is selected

### 1.6 Initial State

- [x] Loading a strategy with an existing version displays the saved blocks and connections
- [x] Loading a strategy with no versions creates a blank canvas with pre-placed Price input, Entry Signal, and Exit Signal blocks
- [x] Reloading the page preserves the same layout and connections (after save)

---

## 2. Indicator Blocks Configuration (S3.2)

### 2.1 SMA Block

- [x] SMA block can be added to the canvas from the palette
- [x] Properties panel shows `period` parameter (default 20)
- [x] `period` accepts integer values between 1 and 500
- [x] `period` rejects values outside range (0, -1, 501) with inline error
- [x] Price source selector is available (Open, High, Low, Close; default Close)

### 2.2 EMA Block

- [x] EMA block can be added to the canvas
- [x] Properties panel shows `period` parameter (default 20)
- [ ] `period` accepts integer values between 1 and 500
- [ ] `period` rejects values outside range with inline error
- [x] Price source selector is available (default Close)

### 2.3 RSI Block

- [x] RSI block can be added to the canvas
- [x] Properties panel shows `period` parameter (default 14)
- [ ] `period` accepts integer values between 2 and 100
- [ ] `period` rejects values outside range with inline error

### 2.4 MACD Block

- [x] MACD block can be added to the canvas
- [x] Properties panel shows `fast_period` (default 12), `slow_period` (default 26), `signal_period` (default 9)
- [ ] Each parameter validates as a positive integer
- [ ] Invalid values show inline errors

### 2.5 Bollinger Bands Block

- [x] Bollinger Bands block can be added to the canvas
- [x] Properties panel shows `period` (default 20) and `stddev` (default 2)
- [ ] Parameters validate correctly

### 2.6 ATR Block

- [x] ATR block can be added to the canvas
- [x] Properties panel shows `period` (default 14)
- [ ] Parameter validates correctly

### 2.7 General Indicator Behavior

- [ ] All indicator blocks have input ports for receiving price data
- [x] All indicator blocks have output ports for sending computed values
- [x] All parameters are required and use reasonable defaults
- [x] Empty parameter fields prevent saving until fixed

---

## 3. Logic & Signal Blocks (S3.3)

### 3.1 Compare Block

- [x] Compare block can be added to the canvas
- [x] Has two input ports: `left` and `right` (numeric series or constant)
- [x] Properties panel shows operator selector: `>`, `<`, `>=`, `<=`
- [x] Output port produces a boolean series

### 3.2 Crossover Block

- [x] Crossover block can be added to the canvas
- [x] Has two input ports: `fast` and `slow` (numeric series)
- [x] Properties panel shows direction selector: `crosses_above`, `crosses_below`
- [x] Output port produces a boolean series

### 3.3 AND Block

- [x] AND block can be added to the canvas
- [x] Has two input ports: `a` and `b` (boolean series)
- [x] Output port produces a boolean series

### 3.4 OR Block

- [x] OR block can be added to the canvas
- [x] Has two input ports: `a` and `b` (boolean series)
- [x] Output port produces a boolean series

### 3.5 NOT Block

- [x] NOT block can be added to the canvas
- [x] Has one input port: `input` (boolean series)
- [x] Output port produces a boolean series

### 3.6 Entry Signal Block

- [x] Entry Signal block can be added to the canvas (or is pre-placed)
- [x] Has one input port: `signal` (boolean series)
- [x] Represents when to open a long position

### 3.7 Exit Signal Block

- [x] Exit Signal block can be added to the canvas (or is pre-placed)
- [x] Has one input port: `signal` (boolean series)
- [x] Represents when to close an open long position

### 3.8 Flow Constraints

- [ ] Indicator outputs can connect to Compare, Crossover, or other indicators
- [ ] Logic block outputs can connect to other logic blocks or Entry/Exit Signal blocks
- [ ] Entry/Exit Signal blocks cannot feed back into indicators
- [ ] Incompatible connections are prevented or flagged (e.g., connecting Price directly to Entry Signal without logic)

---

## 4. Position Sizing & Risk Blocks (S3.4)

### 4.1 Position Size Block

- [x] Position Size block can be added to the canvas
- [ ] Properties panel shows `type` (fixed to `percentage_of_equity` for MVP) and `value` (percentage)
- [ ] Value validates as a positive number
- [x] Block does not have connection input ports (global config)
- [ ] At most one Position Size block is allowed per strategy

### 4.2 Take Profit Block

- [x] Take Profit block can be added to the canvas
- [ ] Properties panel shows `take_profit_pct` parameter
- [ ] Value validates as a positive number
- [ ] At most one Take Profit block is allowed per strategy

### 4.3 Stop Loss Block

- [x] Stop Loss block can be added to the canvas
- [ ] Properties panel shows `stop_loss_pct` parameter
- [ ] Value validates as a positive number
- [ ] At most one Stop Loss block is allowed per strategy

### 4.4 Uniqueness Enforcement

- [ ] Adding a second Position Size block shows a warning or is prevented
- [ ] Adding a second Take Profit block shows a warning or is prevented
- [ ] Adding a second Stop Loss block shows a warning or is prevented
- [x] Backend validation enforces at most one of each type

---

## 5. Strategy Validation (S3.5)

### 5.1 API Tests – `POST /strategies/{id}/validate`

- [x] Valid strategy with Entry Signal, Exit Signal, and connected logic returns `{ "status": "valid", "errors": [] }`
- [x] Strategy missing Entry Signal block returns `{ "status": "invalid" }` with a descriptive error
- [x] Strategy missing Exit Signal block returns `{ "status": "invalid" }` with a descriptive error
- [x] Entry Signal with no input connection returns an error
- [x] Exit Signal with no input connection returns an error
- [x] Block with missing required parameters returns an error referencing the `block_id`
- [x] Block with parameters outside allowed ranges returns an error
- [x] Duplicate Position Size / TP / SL blocks return an error
- [ ] Dangling blocks feeding Entry/Exit with incompatible types return an error
- [x] Auth and ownership are enforced

### 5.2 UI Validation Feedback

- [x] When validation fails, a global banner is shown: "Strategy has issues. Please fix the highlighted blocks."
- [ ] Error badges are shown on blocks with issues
- [x] Properties panel shows inline error messages for blocks with validation errors
- [ ] After fixing all issues, re-validation returns valid status and clears all error indicators

---

## 6. Save & Load (JSON Persistence)

### 6.1 Save Flow

- [x] Clicking "Save" sends the strategy graph as JSON to the backend (`POST /strategies/{id}/versions`)
- [x] JSON includes `blocks` array with block `id`, `type`, `label`, `position`, and `params`
- [x] JSON includes `connections` array with `from` and `to` port references
- [x] Save creates a new version (append-only; no in-place update)
- [x] Save success shows a confirmation message or indicator
- [ ] Save failure shows a clear error: "Could not save strategy. Please try again."

### 6.2 Load Flow

- [x] Loading the canvas page fetches the latest strategy version definition
- [x] All blocks are restored to their saved positions
- [x] All connections are restored
- [x] All block parameters are restored to their saved values
- [ ] Load failure shows a clear error: "Could not load strategy. Reload the page or contact support."

---

## 7. Example Strategy Flow (Integration)

- [ ] User can build a complete example: `Price` -> `SMA` -> `Compare (Price > SMA)` -> `Entry Signal`
- [ ] User can build exit logic: `Price` -> `RSI` -> `Compare (RSI > 70)` -> `Exit Signal`
- [x] The resulting JSON graph correctly represents the block types, connections, and parameters
- [x] Saving and reloading the strategy preserves the complete flow
- [x] Validation passes for a correctly wired strategy

---

## 8. Performance & Non-Functional

- [ ] Adding/moving blocks and connecting ports responds in under 100ms on desktop
- [ ] Canvas works correctly in Chrome, Edge, Firefox, and Safari
- [ ] Canvas layout is usable on tablet/mobile viewports (basic responsiveness)
- [ ] No complex animations; styling uses Tailwind
- [ ] Only MVP blocks are available; no experimental or extra blocks

---

## 9. Edge Cases

- [ ] Deleting a block removes all its connections
- [ ] Disconnecting a connection updates the JSON graph correctly
- [ ] Adding many blocks (e.g., 20+) does not cause performance degradation
- [ ] Rapidly clicking "Save" does not create corrupted versions
- [ ] Navigating away without saving prompts the user or the canvas gracefully handles unsaved state
- [ ] Canvas handles a strategy definition JSON with unknown block types gracefully (e.g., from a newer version)
- [x] Block with all default parameters can be saved without modification
