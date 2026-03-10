# PRD: Visual Strategy Canvas Editor Redesign

**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Author:** PM Agent (BMad Method)
**Date:** 2026-03-09
**Status:** Draft — Ready for Architectural Review
**Version:** 1.0

**References:**
- Product Brief: `product-brief-canvas-redesign.md`
- Brainstorming Report: `brainstorming-canvas-report.md` (43 ideas, 6 clusters)
- Design Thinking Report: `design-thinking-canvas-report.md` (3 prototypes, Prototype C selected)
- Problem-Solving Report: `problem-solving-canvas-report.md` (5 root causes, 5 design principles)
- Current Product Documentation: `product.md` (Sections 3–5, 11)

---

## 1. Overview

**Feature Name:** Smart Canvas — Visual Strategy Editor Redesign

**One-Line Description:** An evolutionary enhancement of the existing React Flow canvas that reduces manual wiring, provides live behavioral feedback during authoring, and lets traders read, edit, and comprehend strategies at the level of trading intent rather than graph plumbing.

**Problem It Solves:** The current canvas maps directly to the backtest interpreter's internal data model (`{blocks, connections}` JSON) with no intermediate layer representing trading intent. This forces users to translate between their mental model ("enter when oversold and trending up") and graph-level operations (place block, draw wire, configure parameter, repeat). Manual port-to-port wiring is the throughput bottleneck constraining all user types. The total absence of behavioral feedback during authoring means users build blind until they commit to a full backtest. The result: a canvas that enables strategy construction without supporting strategy comprehension.

---

## 2. Goals & Non-Goals

### Goals

| ID | Goal | Metric | Baseline | Target |
|----|------|--------|----------|--------|
| G-01 | Reduce time to first valid strategy for new users | Median seconds from first canvas load to successful validation | ~300s (estimated) | < 120s |
| G-02 | Reduce manual connection actions per strategy | Average explicit user-initiated connections per strategy | ~10 (typical 10-block strategy) | < 3 |
| G-03 | Reduce invalid-connection error rate for beginners | % of connection attempts producing an error | 15–25% (estimated) | < 5% |
| G-04 | Shift parameter editing to inline | % of parameter edits via Inspector Panel vs. inline popovers | ~100% Inspector | < 20% Inspector |
| G-05 | Improve strategy comprehension accuracy | Semantic accuracy of user's verbal description vs. actual logic, for users who have used Narrative View ≥1 time | Not measured | > 85% |

### Non-Goals

This PRD does NOT cover:

- **Backtest engine changes.** No modifications to the Python interpreter, simulation logic, or execution model — except one targeted, backward-compatible extension to recognize the `conditions` array on signal blocks (see FR-37).
- **New block types.** The 20 existing block types remain unchanged. No indicators, logic blocks, or risk blocks are added or removed.
- **Backend API additions** beyond a single lightweight preview evaluation endpoint (for Traffic Light blocks, if server-side computation is chosen — see Open Question OQ-01).
- **Data management.** No changes to candle storage, CryptoCompare integration, or S3/MinIO.
- **Subscription, billing, or plan changes.** No new paywalled features.
- **Strategy Building Wizard.** The wizard's output opens on the redesigned canvas, but the wizard flow itself is untouched.
- **Backtest results UI.** Equity curves, trade tables, metrics display, and comparison views are downstream consumers and are out of scope.
- **Mobile-native projection.** A fully alternative mobile representation (card stack, linear flow) is deferred to a future phase. This PRD covers incremental mobile improvements only.
- **Collaborative editing.** Multi-user real-time canvas is out of scope.

---

## 3. User Stories

### 3.1 Strategy Health Bar & Guided Completion

**US-01: Proactive strategy completeness coaching**
As a beginner, I want the canvas to show me what my strategy is missing so that I can build a valid, backtest-ready strategy without memorizing the required components.

Acceptance Criteria:
- Given an empty canvas, when I open the editor, then a persistent Health Bar is visible at the top showing segments for Entry, Exit, and Risk, each with a status indicator (complete, incomplete, warning).
- Given a canvas with an entry signal but no exit condition, when I look at the Health Bar, then the Exit segment shows an incomplete status with coaching text: "Your strategy needs an exit condition. Most traders use a Stop Loss — want to add one?"
- Given I click an incomplete Health Bar segment, when the suggestion menu appears, then I can one-tap to add the recommended block, which is auto-placed and pre-connected to the appropriate upstream node.
- Given I add a valid exit condition, when the canvas re-evaluates, then the Health Bar Exit segment updates to complete within 200ms.

Notes: The Health Bar reads from the same validation rules used by `POST /strategies/{id}/validate`. It is rendered outside the React Flow canvas area (positioned absolutely above it). Health Bar state is computed client-side from the current canvas definition — no API call is needed for real-time updates.

---

**US-02: Health Bar dismissibility for experienced users**
As a power user, I want to dismiss or minimize the Health Bar so that it does not consume vertical space when I already know what I'm doing.

Acceptance Criteria:
- Given the Health Bar is visible, when I click a minimize control, then the bar collapses to a compact single-line indicator showing only icons (✓, ✗, ⚠️) without coaching text.
- Given the Health Bar is minimized, when I click expand, then it restores to full coaching mode.
- Given I dismiss the Health Bar, when I reopen the same strategy, then the bar respects my last-used state (minimized or expanded), persisted via localStorage.

---

### 3.2 Inline Parameter Editing

**US-03: Inline parameter popover on block tap**
As any user, I want to edit block parameters directly on the block itself so that I don't lose spatial context by switching to a separate Inspector Panel.

Acceptance Criteria:
- Given I tap/click a block on the canvas, when the popover opens, then it is anchored to the block's position (not in a side panel) and contains the same controls currently in the Inspector Panel (sliders, dropdowns, presets, number inputs).
- Given I adjust a slider in the popover, when the value changes, then the block's compact label updates in real time (e.g., `RSI (14)` → `RSI (25)`) within 100ms.
- Given the popover is open and I tap/click elsewhere on the canvas, when the popover closes, then the parameter change is committed and included in the autosave cycle.
- Given the block is near the canvas edge, when the popover opens, then it auto-positions to remain fully visible (no clipping).

Notes: The popover uses the same parameter schema that currently drives the Inspector Panel. On mobile, the popover should render as a bottom sheet anchored to the tapped block's context.

---

**US-04: Inspector Panel as secondary advanced view**
As a power user, I want to access the full Inspector Panel when I need to see all parameters at once, so that the inline popover doesn't limit me.

Acceptance Criteria:
- Given the inline popover is open, when I click a "Details" or "Advanced" button on the popover, then the Inspector Panel opens in its current location (side panel / bottom sheet) with the same block selected.
- Given the Inspector Panel is open, when I edit a parameter there, then the block's canvas label and any open popover update in real time.
- Given no popover is open, when I use the existing keyboard shortcut or menu action for the Inspector, then it opens as it does today.

---

### 3.3 Proximity Snap Connections

**US-05: Auto-connect by proximity**
As any user, I want blocks to connect automatically when I drag them near a compatible port so that I don't have to precisely target small port circles.

Acceptance Criteria:
- Given I am dragging a block on the canvas and a compatible output port on another block is within the snap threshold (default: 60px), when the snap zone activates, then the compatible port glows with a highlight color and a dashed preview wire appears between the ports.
- Given the preview wire is showing and I release the block within the snap zone, then the connection is created and stored identically to a manually drawn wire.
- Given I release the block outside any snap zone, then no connection is created.
- Given multiple compatible ports are within the snap zone, when I release, then the nearest compatible port is selected. If two ports are equidistant (within 5px), a disambiguation popup appears listing the options.
- Given I release the block and a snap connection is created, when I invoke undo, then the connection is removed and the block returns to its pre-drop position.

Notes: Snap zones are invisible until a block enters them. On mobile, haptic feedback (if available via the Vibration API) confirms the snap. Existing manual drag-to-connect and tap-tap connection modes remain available as fallbacks.

---

**US-06: Type-encoded port visuals**
As a beginner, I want to see at a glance which ports are compatible so that I can predict valid connections without trial and error.

Acceptance Criteria:
- Given a block is on the canvas, when I look at its ports, then each port has a distinct visual shape and color encoding its data type: boolean ports are diamond-shaped and amber; numeric-array ports are circular and blue; price-array ports are circular and green.
- Given I start dragging a wire from a boolean output port, when I hover over an incompatible numeric input port, then the target port dims and shows a "no-connect" cursor. The wire cannot snap or complete.
- Given I start dragging from a boolean output, when I hover over a compatible boolean input, then the target port brightens and the wire can complete.

Notes: The type-shape mapping must be documented in the block library's visual legend and in contextual help. Exact colors and shapes should be confirmed with the UX designer, but the principle is: distinct shape + distinct color per type family. The `isValidConnection` prop on React Flow is already available for type-checking; this story extends it with visual affordances.

---

### 3.4 Narrative View Toggle

**US-07: Read strategy as plain-English paragraph**
As any user, I want to toggle a view that shows my strategy as a readable paragraph so that I can verify what my strategy does without tracing wires.

Acceptance Criteria:
- Given I am on the canvas, when I click the "Narrative View" toggle in the toolbar, then the canvas dims and a plain-English paragraph overlays it, generated from the current `{blocks, connections}` definition.
- Given the narrative reads "When the 14-period RSI drops below 25 AND price crosses above the 50-day EMA, enter long…", when I click the clause "14-period RSI drops below 25", then the canvas un-dims, zooms to the RSI and Compare blocks, and highlights them with a temporary outline.
- Given I switch back to Canvas View, when I modify a block parameter, then the Narrative View updates to reflect the change the next time I toggle to it.
- Given the strategy has no entry signal, when I toggle Narrative View, then it displays: "This strategy is incomplete. Add an entry condition to see the narrative."

Notes: The narrative is generated by the existing Strategy Explanation Generator engine (deterministic, template-based, no AI). The toggle is a toolbar button (not a separate page). On mobile, Narrative View replaces the canvas entirely (full-screen overlay with a close button).

---

### 3.5 Recipe Cards (Pattern-Level Placement)

**US-08: Browse and place recipe cards**
As an intermediate user, I want to drag a pre-built pattern like "RSI Oversold Bounce" onto the canvas as a single unit so that I skip the tedious process of placing and wiring 4+ blocks individually.

Acceptance Criteria:
- Given I open the Block Library, when I navigate to a "Patterns" tab, then I see a list of recipe cards with names, short descriptions, and mini-diagrams showing internal structure.
- Given I drag "RSI Oversold Bounce" onto the canvas, when I release, then 4 blocks appear (Price → RSI(14) → Compare(< 30) → Entry Signal) pre-connected with sensible default parameters.
- Given the blocks have expanded from a recipe card, when I tap any individual block, then I can edit its parameters via the inline popover as usual.
- Given I select all blocks from the expanded recipe card, when I delete, then all blocks and their internal connections are removed.

Notes: Recipe cards decompose into standard `{blocks, connections}` JSON on placement. No new schema field is required. An optional `metadata.recipe_source` field on each block can be stored for analytics but is ignored by the interpreter. Initial recipe cards: "RSI Oversold Bounce," "EMA Crossover," "Bollinger Breakout" (matching the existing template library).

---

**US-09: Recipe card proximity interaction**
As a user, I want recipe card blocks to snap-connect to existing blocks on the canvas so that adding a recipe near my Price block automatically uses my existing data source.

Acceptance Criteria:
- Given a Price block already exists on the canvas, when I drop an "RSI Oversold Bounce" recipe card within snap range of the Price block's output, then the recipe's internal Price block is omitted and its RSI block connects to the existing Price block instead.
- Given no compatible upstream block exists, when I drop the recipe card, then all constituent blocks (including its own Price block) are placed as a self-contained cluster.

Notes: This deduplication logic applies only to Input blocks (Price, Volume). Indicator and logic blocks within the recipe are always placed as new blocks, even if a duplicate exists on the canvas, to avoid ambiguity.

---

### 3.6 Traffic Light Live Preview

**US-10: See current-candle evaluation on blocks**
As any user, I want each block to show whether its condition is currently true or false so that I can understand what my strategy "thinks" without running a full backtest.

Acceptance Criteria:
- Given I toggle "Live Preview" from the canvas toolbar, when the latest candle data is fetched and evaluated, then each block displays a colored glow: green if its output is true / above threshold on the latest candle, red if false / below threshold, gray if not yet evaluated or if the block has no boolean output.
- Given Live Preview is active, when a block with numeric output is evaluated (e.g., RSI), then the block displays its computed value as a small badge (e.g., "28.4") in addition to the traffic light glow.
- Given the Entry Signal block is evaluated, when its condition is met on the latest candle, then it shows a prominent "WOULD ENTER" badge. When not met, it shows "WOULD NOT ENTER."
- Given Live Preview is toggled off, when I return to normal editing, then all traffic light glows and value badges are removed within 200ms.
- Given a network error occurs while fetching candle data, when Live Preview is toggled on, then a non-blocking toast notification informs me and the canvas remains in normal (non-preview) mode.

Notes: Traffic Light evaluation requires either a new lightweight backend endpoint or a client-side JavaScript indicator library. See OQ-01 for the feasibility decision. Evaluation latency target: < 500ms from toggle-on to all blocks showing state.

---

### 3.7 Embedded Conditions in Signal Blocks

**US-11: Define entry/exit logic inside the signal block**
As an intermediate user, I want to add multiple conditions directly inside the Entry Signal block so that I don't need separate AND/OR/Compare blocks for common patterns.

Acceptance Criteria:
- Given I tap the Entry Signal block, when the inline popover opens, then I see a condition list UI: "Enter when ALL of these are true: [Condition 1 ▼] [+ Add condition]" with a toggle between ALL (AND) and ANY (OR).
- Given I click "+ Add condition", when the condition picker opens, then it lists available upstream outputs (e.g., "RSI(14) output", "Crossover(EMA12, EMA26) output") with operators (< , >, crosses above, crosses below) and value fields where applicable.
- Given I select "RSI(14) < 30" as a condition, when I confirm, then a wire from the RSI block to the Entry Signal block is auto-created, and the condition appears in the signal block's condition list.
- Given I toggle from ALL to ANY, when the change is saved, then the signal block's internal logic switches from AND to OR, and the Narrative View updates accordingly.
- Given I have 2 embedded conditions and I also have a manual wire from an external AND block into the Entry Signal, when both are present, then a warning appears: "This signal block has both embedded conditions and an external input. The external input will be treated as an additional AND condition with the embedded list." (See OQ-03 for conflict resolution.)

Notes: Requires a schema extension. The `entry_signal` and `exit_signal` block types gain an optional `conditions` array in their `params` (see FR-37 for exact schema). The backtest interpreter must be updated to recognize this field. Backward compatibility: existing strategies without `conditions` execute identically via their external wiring.

---

### 3.8 Candle-by-Candle Debugger

**US-12: Step through strategy decisions candle by candle**
As a power user, I want to replay a completed backtest on the canvas, stepping through each candle, so that I can see exactly when and why my strategy entered or exited.

Acceptance Criteria:
- Given a backtest has completed, when I click "Replay" on the canvas, then a timeline scrubber appears at the bottom of the canvas spanning the backtest date range.
- Given the scrubber is at candle N, when I look at each block, then it displays its computed value for that candle as an overlaid badge (e.g., RSI = 28.4, Compare(< 30) = TRUE, Entry Signal = ACTIVE).
- Given I drag the scrubber forward, when block values change, then badges update within 100ms per scrub step.
- Given a trade entry occurs at candle N, when I scrub to N, then the Entry Signal block shows "ENTERED" with a green pulse, and the timeline marks candle N with an entry marker.
- Given I click a trade marker on the timeline, then the scrubber jumps to that candle.
- Given the backtest has no trades, when I activate Replay, then the scrubber works normally but no trade markers appear, and a subtle notice reads: "No trades were executed during this period."

Notes: The debugger reads from existing backtest trade data and equity curve stored in S3/MinIO. Per-block computed values must be either (a) stored during the backtest run (increases storage cost) or (b) recomputed client-side from candle data (requires client-side indicator library). See OQ-01 and OQ-02. This is the highest-complexity feature in this PRD and is scoped as the final implementation phase.

---

### 3.9 Mobile Canvas Interaction

**US-13: Touch-friendly proximity snapping**
As a mobile user, I want blocks to snap-connect when I drag them near each other so that I don't have to target tiny port circles with my finger.

Acceptance Criteria:
- Given I am on a mobile device (< 768px), when I drag a block near a compatible port, then the snap threshold is increased to 80px (vs. 60px on desktop) to accommodate finger imprecision.
- Given a snap connection is made on mobile, when available, then the device vibrates briefly (Vibration API, 50ms pulse) to confirm.
- Given the existing tap-tap connection mode, when I attempt it, then it still works as a fallback alongside proximity snapping.

---

**US-14: Mobile inline editing as bottom sheet**
As a mobile user, I want parameter editing to appear as a bottom sheet anchored to context so that I can edit without losing sight of my strategy.

Acceptance Criteria:
- Given I tap a block on mobile, when the editing UI opens, then it renders as a half-screen bottom sheet (not a popover that may be occluded by the keyboard).
- Given the bottom sheet is open, when I adjust a parameter, then the block's label on the canvas updates in real time (visible above the sheet).
- Given I swipe down on the sheet, when it closes, then changes are committed.

---

### 3.10 Migration & Backward Compatibility

**US-15: Existing strategies render identically**
As a returning user, I want all my existing strategies to open and function exactly as before so that the redesign doesn't break anything I've built.

Acceptance Criteria:
- Given an existing strategy stored as `{blocks, connections}` JSON without the new `conditions` field on signal blocks, when I open it on the redesigned canvas, then all blocks, connections, parameters, and layout positions render identically to the current canvas.
- Given I open an existing strategy and do not modify it, when I save, then the `definition_json` output is byte-equivalent to the existing stored version (no phantom field additions).
- Given I run a backtest on an existing strategy opened in the redesigned canvas, when results return, then they are identical to a backtest run on the same strategy in the current canvas.

Notes: This is a hard constraint. The redesign must not modify the serialization of existing strategies. New optional fields (`conditions`, `metadata.recipe_source`) are only added when the user explicitly uses the corresponding new feature.

---

**US-16: Wizard-generated strategies work in the new canvas**
As a new user who just completed the wizard, I want my auto-generated strategy to render correctly on the redesigned canvas with the Health Bar, inline editing, and all new features available.

Acceptance Criteria:
- Given a strategy generated by the wizard, when it opens on the redesigned canvas, then the Health Bar reflects the strategy's completeness (typically green for Entry, may be yellow/red for Exit/Risk depending on wizard output).
- Given the wizard-generated strategy, when I tap a block, then the inline popover opens and allows editing.
- Given the wizard-generated strategy, when I toggle Live Preview, then Traffic Light evaluation works on all blocks.

---

## 4. Functional Requirements

### Block Library & Placement

**FR-01:** The Block Library Bottom Sheet shall include a "Patterns" tab alongside the existing category tabs (Indicators, Logic, Risk, Signals, Data). The Patterns tab displays recipe cards.

**FR-02:** Each recipe card in the Patterns tab shall display: a name, a one-line description, a mini-diagram showing constituent blocks and connections, and a difficulty indicator (beginner / intermediate / advanced).

**FR-03:** Dragging a recipe card onto the canvas shall expand it into its constituent blocks with pre-configured parameters and pre-created connections. The expansion shall produce standard `{blocks, connections}` JSON entries.

**FR-04:** When a recipe card is dropped within snap range of an existing compatible Input block (Price, Volume), the recipe's internal Input block shall be omitted and its first downstream block shall connect to the existing Input block instead.

**FR-05:** When a recipe card is dropped with no compatible upstream blocks in range, all constituent blocks (including Input blocks) shall be placed as a self-contained cluster.

**FR-06:** The initial recipe card catalog shall include at minimum: "RSI Oversold Bounce" (Price → RSI(14) → Compare(< 30) → Entry Signal), "EMA Crossover" (Price → EMA(12) + EMA(26) → Crossover(crosses_above) → Entry Signal), and "Bollinger Breakout" (Price → BBands(20, 2) → Compare(price > upper) → Entry Signal).

**FR-07:** Recipe card constituent blocks shall include an optional `metadata.recipe_source` field in their JSON. This field is informational, ignored by the interpreter, and used for UI grouping hints and analytics.

### Connection / Linking Behavior

**FR-08:** When a block is dragged and its input port enters within the snap threshold of a compatible output port on another block, the system shall display a visual snap indicator (port glow + dashed preview wire).

**FR-09:** The snap threshold shall be 60px on desktop (viewport ≥ 768px) and 80px on mobile (viewport < 768px).

**FR-10:** When the block is released within the snap zone of a compatible port, a connection shall be created automatically and stored identically to a manually drawn connection in the `connections` array.

**FR-11:** When multiple compatible ports are within the snap zone simultaneously, the system shall select the nearest port. If two ports are within 5px of each other, a disambiguation popup shall appear listing the options with block name and port label.

**FR-12:** Each port on a block shall be rendered with a distinct shape and color based on its data type: boolean → diamond, amber (#F59E0B); numeric array → circle, blue (#3B82F6); price array → circle, green (#10B981). The exact palette may be adjusted by UX, but the principle of distinct shape + distinct color per type family is required.

**FR-13:** When a user drags a wire from an output port, incompatible input ports shall dim visually and display a "no-connect" cursor. Wire completion to an incompatible port shall be blocked by the `isValidConnection` handler.

**FR-14:** Existing connection methods (drag wire from port to port, tap-tap on mobile) shall remain functional as fallback mechanisms alongside proximity snapping.

**FR-15:** All connections created via proximity snapping shall be included in the undo/redo history stack.

### Parameter Editing

**FR-16:** Tapping/clicking a block shall open an inline popover anchored to the block's canvas position. The popover shall contain the same parameter controls (sliders, dropdowns, number inputs, presets) as the current Inspector Panel.

**FR-17:** The popover shall auto-position to remain fully visible within the canvas viewport. If the block is near an edge, the popover shifts to the opposite side or adjusts its anchor point.

**FR-18:** Changes made in the popover shall update the block's compact label in real time (within 100ms).

**FR-19:** The popover shall include a "Details" button that opens the full Inspector Panel for the selected block. The Inspector Panel remains available as a secondary editing surface.

**FR-20:** On mobile (viewport < 768px), the popover shall render as a half-screen bottom sheet instead of a floating popover.

**FR-21:** Tapping/clicking outside the popover shall close it and commit any pending changes.

**FR-22:** Parameter changes made via inline popover shall be included in the undo/redo history and trigger the existing autosave debounce.

### Layout & Auto-Arrangement

**FR-23:** The existing auto-layout feature shall remain available and shall function identically with all new block types and connection methods.

**FR-24:** When a recipe card expands into blocks, the resulting block positions shall follow the current auto-layout direction (left → right or top → bottom, based on user preference) and shall not overlap existing blocks.

**FR-25:** Blocks expanded from a recipe card shall display a subtle group outline for 3 seconds after placement. The outline shall fade without user action.

### Validation Behavior

**FR-26:** The Strategy Health Bar shall be rendered as a persistent horizontal bar above the React Flow canvas area. It shall contain three segments: Entry, Exit, Risk.

**FR-27:** Each Health Bar segment shall display one of three states: complete (green checkmark), incomplete (red X with coaching text), or warning (amber exclamation with advisory text).

**FR-28:** Health Bar state shall be computed client-side from the current canvas definition using the same rules as the validation endpoint. It shall update within 200ms of any block addition, removal, or connection change.

**FR-29:** Clicking an incomplete Health Bar segment shall scroll the canvas to the relevant area and display a contextual suggestion menu with one-tap block placement options.

**FR-30:** One-tap placement from the Health Bar shall auto-place the block at the appropriate canvas position and create connections to the most logical upstream/downstream blocks.

**FR-31:** The Health Bar shall be collapsible to a compact icon-only mode. Collapsed/expanded state shall persist in localStorage per user.

### Visual Feedback & Comprehension

**FR-32:** The canvas toolbar shall include a "Narrative View" toggle. When activated, the canvas area shall dim and a plain-English paragraph shall overlay it, generated from the current strategy definition.

**FR-33:** The narrative text shall be generated by the existing Strategy Explanation Generator engine (deterministic, template-based). If the strategy is incomplete, the narrative shall display a message indicating what is missing.

**FR-34:** Each clause in the narrative paragraph shall be clickable. Clicking a clause shall switch back to Canvas View, zoom to the corresponding block(s), and highlight them with a 3-second temporary outline.

**FR-35:** The canvas toolbar shall include a "Live Preview" toggle. When activated, the system shall fetch the latest candle data for the strategy's asset/timeframe and evaluate each block's output.

**FR-36:** During Live Preview, blocks with boolean output shall display a colored glow (green = true, red = false). Blocks with numeric output shall display the computed value as a small badge. The Entry Signal block shall display "WOULD ENTER" or "WOULD NOT ENTER." Evaluation latency: < 500ms from toggle-on to all blocks showing state.

### Embedded Conditions (Signal Block Extension)

**FR-37:** The `entry_signal` and `exit_signal` block types shall support an optional `conditions` array in their `params` object. The schema is:

```json
{
  "type": "entry_signal",
  "params": {
    "conditions": [
      {
        "source_block_id": "rsi_1",
        "source_port": "output",
        "operator": "<",
        "value": 30
      },
      {
        "source_block_id": "crossover_1",
        "source_port": "output"
      }
    ],
    "logic": "and"
  }
}
```

The `logic` field accepts `"and"` or `"or"`. Each condition references an existing block by ID and port. Conditions with boolean source blocks (crossover, compare) omit `operator` and `value`. Conditions with numeric source blocks require `operator` (one of `<`, `>`, `<=`, `>=`) and `value` (number).

**FR-38:** When `conditions` is present on a signal block, the backtest interpreter shall use it to evaluate the signal, treating it as equivalent to explicit AND/OR wiring. When `conditions` is absent, the interpreter shall follow inbound connections as today. This behavior must be backward-compatible: existing strategies without `conditions` must execute identically.

**FR-39:** The signal block's inline popover shall include a condition list UI with: an ALL/ANY toggle, a list of current conditions with remove buttons, and an "+ Add condition" button that opens a picker listing available upstream block outputs.

**FR-40:** When a condition is added via the signal block's condition list, a connection wire from the source block to the signal block shall be auto-created and visible on the canvas.

**FR-41:** When a signal block has both embedded conditions and an external manual connection from a logic block, the system shall display a warning banner on the block (see OQ-03 for resolution approach).

### Candle-by-Candle Debugger

**FR-42:** After a backtest has completed, a "Replay" button shall appear on the canvas toolbar.

**FR-43:** Clicking Replay shall display a timeline scrubber at the bottom of the canvas spanning the backtest date range. Trade entry/exit points shall be marked on the timeline.

**FR-44:** For each candle position on the scrubber, each block shall display its computed value for that candle as an overlaid badge. Values shall update within 100ms per scrub step.

**FR-45:** Clicking a trade marker on the timeline shall jump the scrubber to that candle.

**FR-46:** Wires carrying a "true" signal at the current scrubber position shall be visually highlighted (brighter color or animated pulse).

### Mobile-Specific Behavior

**FR-47:** On mobile (viewport < 768px), the snap threshold for proximity connections shall be 80px (vs. 60px desktop).

**FR-48:** On mobile, when a snap connection is confirmed, the device shall emit a 50ms vibration pulse (Vibration API, where supported). Failure to vibrate is non-blocking.

**FR-49:** The Narrative View toggle and Live Preview toggle shall be accessible from the mobile bottom action bar.

**FR-50:** On mobile, Narrative View shall render as a full-screen overlay with a close button (not a dimmed canvas with overlay text).

### Backward Compatibility & Serialization

**FR-51:** The `definition_json` output for strategies that do not use embedded conditions or recipe card metadata shall be identical to the current format. No phantom fields shall be added on save.

**FR-52:** Strategies with embedded conditions shall include the `conditions` array and `logic` field in the signal block's `params`. Strategies without embedded conditions shall omit these fields entirely (not include them as empty arrays).

**FR-53:** The optional `metadata.recipe_source` field, if present on a block, shall be preserved on save and ignored by the interpreter.

**FR-54:** No Alembic migration is needed for the `strategy_versions.definition_json` column. The PostgreSQL JSON type accepts the new optional fields without schema modification.

---

## 5. Non-Functional Requirements

**NFR-01 — Canvas Render Performance:** The canvas shall render an existing 20-block strategy with all new overlays (Health Bar, type-encoded ports) in < 500ms on a mid-range device (e.g., iPhone 13, Pixel 6).

**NFR-02 — Interaction Latency:** Block drag, popover open, and parameter slider updates shall respond within 100ms. Proximity snap visual feedback (port glow, preview wire) shall appear within 50ms of threshold entry.

**NFR-03 — Live Preview Latency:** Traffic Light evaluation shall complete and render all block states within 500ms of toggle activation, for strategies with up to 20 blocks.

**NFR-04 — Debugger Scrub Performance:** Scrubbing the timeline shall update all block value badges within 100ms per candle step for strategies with up to 20 blocks on a dataset of up to 3 years of daily candles (~1095 data points).

**NFR-05 — Accessibility (WCAG 2.1 AA):** All new canvas interactions (port type colors, Health Bar states, traffic light glows, narrative text) shall meet WCAG 2.1 AA contrast ratios. Color-only status indicators shall be supplemented with shapes or text labels (e.g., traffic light glow uses color + shape badge + text badge).

**NFR-06 — Responsiveness:** The canvas shall support three breakpoints: desktop (≥ 1024px), tablet (768–1023px), mobile (< 768px). All new features shall function at all breakpoints. Touch targets shall be ≥ 44px on mobile.

**NFR-07 — Data Integrity:** The `definition_json` produced by the redesigned canvas must be consumable by the existing Python backtest interpreter without modification (except the targeted `conditions` extension per FR-38). Running any existing strategy on the redesigned canvas and backtesting it must produce identical results to running it on the current canvas.

**NFR-08 — Undo/Redo Preservation:** All new interactions (proximity snap connections, inline popover edits, recipe card placements, Health Bar one-tap additions, embedded condition changes) shall be included in the existing undo/redo history stack.

**NFR-09 — Autosave Compatibility:** All parameter changes (inline popover, embedded conditions) and structural changes (proximity snap connections, recipe card placements) shall trigger the existing autosave debounce mechanism.

**NFR-10 — Feature Toggle Safety:** Each major feature (Health Bar, Proximity Snapping, Inline Popovers, Narrative View, Live Preview, Recipe Cards, Embedded Conditions, Debugger) shall be independently toggleable via a feature flag, allowing incremental rollout and instant rollback.

---

## 6. Interaction Specifications

### 6.1 Adding a Block (via Recipe Card)

**Trigger:** User drags a recipe card from the Patterns tab of the Block Library onto the canvas.

**Steps:**
1. User opens Block Library Bottom Sheet.
2. User navigates to "Patterns" tab.
3. User long-presses (mobile) or drags (desktop) a recipe card.
4. User drags onto the canvas.
5. System detects drop position and checks for compatible nearby Input blocks within snap range.

**Feedback:**
- During drag: ghost outline shows the recipe card's expanded footprint on the canvas.
- On drop (compatible Input block nearby): constituent blocks appear with connections, omitting the recipe's internal Input block and connecting to the existing one. Subtle group outline fades over 3 seconds.
- On drop (no compatible Input block nearby): all constituent blocks appear as a self-contained cluster with the same group outline.

**Edge Cases:**
- Recipe card dropped on top of existing blocks: auto-layout shifts existing blocks to make room. If auto-layout is disabled, blocks are placed with a 20px offset to avoid exact overlap.
- Recipe card dropped outside the visible canvas area: placement is constrained to the current viewport bounds.
- Undo after recipe card placement: all constituent blocks and their connections are removed in a single undo step.

### 6.2 Connecting Blocks (Proximity Snap)

**Trigger:** User drags a block on the canvas and its port enters the snap zone of a compatible port on another block.

**Steps:**
1. User picks up a block (drag on desktop, long-press-drag on mobile).
2. System continuously checks distances between the dragged block's ports and all other blocks' ports.
3. When distance < snap threshold and types are compatible, snap indicator activates.
4. User releases block.

**Feedback:**
- Snap zone active: target port glows with type-appropriate color. Dashed preview wire appears.
- Multiple compatible ports in range: nearest port wins. Equidistant case (< 5px difference): disambiguation popup appears.
- Incompatible port nearest: no glow, no wire. If user manually drags a wire to it, "no-connect" cursor appears and wire cannot complete.
- Connection confirmed: solid wire replaces dashed preview. On mobile: haptic pulse.
- Connection rejected (user releases outside any snap zone): block lands at release position with no new connection.

**Edge Cases:**
- Block has multiple input ports (e.g., Compare has input_a and input_b): each port is independently evaluated for snap proximity. The port closest to the dragging block's output is preferred.
- Self-connection: a block's output port cannot snap to its own input port. This is filtered at the `isValidConnection` level.
- Snap during recipe card expansion: proximity snapping applies to the auto-placement of recipe blocks, not just user drag actions.

### 6.3 Editing Parameters (Inline Popover)

**Trigger:** User taps/clicks a block on the canvas.

**Steps:**
1. User taps a block.
2. Popover appears anchored to the block (desktop) or as bottom sheet (mobile).
3. User adjusts parameters (slider, dropdown, number input).
4. Block label updates in real time.
5. User taps outside popover to close.

**Feedback:**
- Popover open: block shows a subtle selection outline. Other blocks remain visible and interactive (panning/zooming still works).
- Parameter change: block compact label updates instantly (e.g., `SMA (20)` → `SMA (50)`). If Live Preview is active, the traffic light state re-evaluates within 500ms.
- Popover close: selection outline removed. Change committed, autosave triggered.

**Edge Cases:**
- Keyboard opens on mobile and covers the bottom sheet: sheet scrolls to keep the active input visible.
- User taps another block while popover is open: first popover closes, second popover opens for the new block. This is a single undo step for the first block's changes.
- User taps a canvas note (annotation) while popover is open: popover closes, note editing activates.

### 6.4 Validating (Health Bar Proactive + Reactive)

**Trigger (Proactive):** Continuous — Health Bar updates on every canvas change.
**Trigger (Reactive):** User clicks "Validate" button (existing flow).

**Steps (Proactive):**
1. User adds, removes, or connects a block.
2. Health Bar re-evaluates client-side within 200ms.
3. Segments update to reflect completeness.

**Steps (Reactive — clicking incomplete segment):**
1. User clicks the "Exit ✗" segment.
2. Canvas scrolls to the area where an exit block would logically be placed.
3. Contextual suggestion menu appears: "Add Stop Loss," "Add Exit Signal," "Add Trailing Stop."
4. User taps "Add Stop Loss."
5. Stop Loss block is auto-placed and pre-connected.
6. Health Bar Exit segment updates to complete.

**Feedback:**
- Health Bar transitions: segment colors animate (200ms ease) when state changes.
- Auto-placed block from Health Bar: block appears with a subtle entrance animation (fade + slide). Connection to upstream block is auto-created.
- Validation errors from reactive validation (POST /validate): existing inline canvas error highlighting remains unchanged; Health Bar provides the proactive summary.

**Edge Cases:**
- User has an exit condition that is connected but the connection is invalid (wrong type): Health Bar shows Exit as warning (⚠️) with text: "Exit condition exists but has an invalid connection."
- User has multiple entry signals: Health Bar Entry shows complete. The Health Bar does not count or limit the number of each type — it only checks for presence.

---

## 7. Migration Plan

### No Schema Migration Required

The `strategy_versions.definition_json` column uses PostgreSQL's JSON type, which accepts any valid JSON. The new optional fields (`conditions`, `logic`, `metadata.recipe_source`) are purely additive. No Alembic migration is needed.

### Interpreter Extension

The Python backtest interpreter requires a targeted, backward-compatible change:

1. When processing an `entry_signal` or `exit_signal` block, check for the presence of `params.conditions`.
2. If `conditions` is present and non-empty, evaluate the signal using the embedded conditions list with the specified `logic` (AND/OR). Create internal virtual connections from source blocks.
3. If `conditions` is absent or empty, follow inbound connections as today.
4. **Regression test requirement:** Every existing strategy in the test suite must produce identical backtest results after this interpreter change. Add a dedicated regression test that serializes the output of all test strategies before and after the change and asserts byte-equality.

### Rendering Backward Compatibility

Existing strategies render identically because:

- The Health Bar reads the canvas definition without modifying it.
- Inline popovers are UI-only; the underlying parameter schema is unchanged.
- Proximity snapping is an interaction method; stored connections are identical to manual connections.
- Narrative View, Traffic Lights, and the Debugger are read-only overlays.
- Type-encoded ports are visual-only; the port data model is unchanged.

### Wizard Output Compatibility

Wizard-generated strategies produce standard `{blocks, connections}` JSON. They render on the redesigned canvas without modification. The Health Bar will reflect their completeness, and all new features (inline editing, Narrative View, Live Preview) work out of the box.

### No Deprecation Period Needed

Because the redesign is evolutionary (all existing features survive, all existing interactions remain as fallbacks), there is no need for a dual-mode canvas or deprecation period. The redesigned canvas replaces the current canvas in a single deployment. Feature flags (NFR-10) provide rollback safety.

---

## 8. MVP Scope vs. Future Iterations

### MVP (v1) — Ship in this redesign phase

| Priority | Feature | Effort | Rationale |
|----------|---------|--------|-----------|
| 1 | Strategy Health Bar (FR-26 through FR-31) | Small | Highest impact-to-effort ratio. Builds on existing validation. |
| 2 | Inline Parameter Popovers (FR-16 through FR-22) | Medium | Eliminates the #1 daily friction point (Inspector context switch). |
| 3 | Proximity Snap Connections (FR-08 through FR-15) | Medium | Biggest UX win for connection creation. Critical for mobile. |
| 4 | Narrative View Toggle (FR-32 through FR-34) | Small | Promotes existing explanation generator. Small build, high comprehension value. |
| 5 | Recipe Cards in Block Library (FR-01 through FR-07) | Medium | Reduces block count for common patterns. Templates infrastructure exists. |
| 6 | Traffic Light Live Preview (FR-35 through FR-36) | Medium–Large | Closes the "preview desert" — the single largest feedback gap. Depends on OQ-01 resolution. |

### v2 — Build after v1 is validated

| Feature | Rationale |
|---------|-----------|
| Embedded Conditions in Signal Blocks (FR-37 through FR-41) | Requires interpreter change. Ship after v1 to isolate risk. High value for reducing logic-block plumbing. |
| Type-Encoded Port Visuals (FR-12, FR-13) | Valuable for error prevention but requires design iteration. Can ship incrementally after proximity snapping proves its value. |

### v3 — Build after v2

| Feature | Rationale |
|---------|-----------|
| Candle-by-Candle Debugger (FR-42 through FR-46) | Highest complexity. Highest differentiation. Requires either stored per-block values or client-side indicator library. Ship as the capstone. |

### Future (Parked)

| Idea | Source | Why Parked |
|------|--------|------------|
| Alternative mobile projection (card stack / sentence builder) | Problem-Solving Report, Principle 3 | Significant engineering effort. Evaluate after v1 mobile improvements. |
| Editable Narrative View (bi-directional sentence ↔ canvas) | Design Thinking Report, Prototype B | Exciting long-term vision but high complexity. Seed planted with read-only Narrative View in v1. |
| Guided Zones / swim lanes | Design Thinking Report, Prototype A | Too constraining for current user base. Revisit if a dedicated "beginner mode" is built. |
| Voice-driven block creation | Brainstorming S6 | Cool differentiator but niche. Revisit when voice UX matures. |
| Multiplayer canvas / collaboration | Brainstorming P4 | Requires real-time sync infrastructure. Not aligned with current solo-builder model. |
| Risk-first build flow | Brainstorming R1 | Valuable pedagogical idea. Consider as a wizard variant or onboarding experiment. |
| Parameter sweep / batch backtest | Brainstorming (Yuki persona) | Backend-intensive. Out of scope for canvas redesign; belongs in a backtesting PRD. |
| Strategy diff view | Brainstorming P3 | Useful for power users. Low urgency. |

---

## 9. Technical Constraints & Dependencies

### React Flow Capabilities

All features in this PRD are implementable within React Flow's existing API:

- **Custom node components:** Support inline popovers, traffic light overlays, value badges, type-encoded ports, and recipe card expansion animations.
- **`isValidConnection` prop:** Supports type-checking for port compatibility (FR-13).
- **`onConnectStart` / `onConnectEnd` handlers:** Support proximity snap detection during drag events (FR-08).
- **`setNodes` / `setEdges` batch updates:** Support recipe card expansion (multiple nodes + edges in one transaction) and debugger value updates.
- **`setCenter` / `fitView`:** Support Narrative View clause-click zoom and Health Bar segment-click navigation.
- **Custom edge components:** Support animated/highlighted wires for debugger and Live Preview.
- **No fork required.** All features use React Flow's public API.

### `definition_json` Schema Compatibility

The `{blocks, connections}` schema is extended with two optional, additive fields:

1. `params.conditions` and `params.logic` on signal blocks (FR-37). The interpreter must be updated (FR-38).
2. `metadata.recipe_source` on any block (FR-07). Ignored by the interpreter.

No existing fields are modified, removed, or retyped.

### Existing Features That Must Be Preserved

Every feature listed in Product Documentation Section 4 must continue to function. The critical preservation list:

| Feature | Status | Notes |
|---------|--------|-------|
| Undo/redo | Must include all new interactions | NFR-08 |
| Copy/paste blocks | Works unchanged | Recipe card blocks are standard after expansion |
| Keyboard shortcuts | No conflicts | New toggles (Narrative, Live Preview) may get shortcuts |
| Autosave | Must trigger on all new edits | NFR-09 |
| Minimap | Works unchanged | New overlays don't affect minimap rendering |
| Auto-layout | Works unchanged | Must handle expanded recipe cards |
| Block Library search | Works unchanged | Patterns tab is additive |
| Compact/expanded nodes | Works unchanged | Popovers work with both modes |
| Strategy Notes | Works unchanged | Notes coexist with all new features |
| Mobile bottom action bar | Extended | Add Narrative View and Live Preview toggles |

### Mobile Framework Constraints

- No native APIs beyond the Vibration API (for snap confirmation).
- Bottom sheet rendering for popovers uses existing shadcn/ui Sheet component.
- Touch event handling for proximity snapping uses React Flow's existing touch support.

---

## 10. Open Questions

**OQ-01: Traffic Light evaluation path — server-side or client-side?**
The current architecture has no browser-side indicator computation. Traffic Light blocks require either (a) a new backend endpoint that evaluates the strategy against the latest candle and returns per-block values (latency budget: < 500ms including network), or (b) a client-side JavaScript/TypeScript indicator library that mirrors the Python backend's indicator implementations. Decision needed from engineering. Server-side is simpler to build but introduces a network dependency. Client-side is faster but requires maintaining parity with the Python library.

**OQ-02: Debugger data source — stored or recomputed?**
The candle-by-candle debugger needs per-block computed values for every candle in the backtest range. Options: (a) store per-block values during the backtest run (increases S3 storage proportional to blocks × candles), or (b) recompute client-side from candle data using a JS indicator library (requires the same library from OQ-01). If OQ-01 is resolved as client-side, OQ-02 is answered automatically. If OQ-01 is server-side, a separate decision is needed.

**OQ-03: Mixed conditions and external wiring on signal blocks.**
When a signal block has both embedded `conditions` and an external manual wire from a logic block, what is the evaluation behavior? Proposed resolution: the external wire is treated as an additional AND condition appended to the embedded list. A warning is displayed on the block. The user can resolve by either removing the external wire or removing the embedded conditions. Needs validation from the interpreter team.

**OQ-04: Recipe card catalog governance.**
Who authors and maintains recipe cards? Initial set (3 cards) can be seeded alongside the existing strategy templates. Future cards could come from the community marketplace. The authoring format and approval process need definition. This PRD scopes only the initial 3 cards.

**OQ-05: Feature flag granularity for rollout.**
NFR-10 requires independent feature flags. Should flags be user-level (opt-in beta), cohort-level (percentage rollout), or plan-level (Pro/Premium get features first)? Recommendation: use PostHog feature flags with percentage rollout, but this needs alignment with the product team's rollout philosophy.

**OQ-06: Traffic Light evaluation frequency.**
When Live Preview is active and the user is editing (moving blocks, changing parameters), should the traffic light re-evaluate on every change, on a debounced interval (e.g., 2 seconds after last change), or only when the user manually re-triggers? Recommendation: debounced at 2 seconds after last structural or parameter change, with a manual "Refresh" button as override.

---

*This PRD is ready for architectural review and story breakdown. All requirements are traceable to the product brief's design principles and success metrics. The MVP scope is deliberately conservative — ship the Health Bar, inline editing, proximity snapping, Narrative View, Recipe Cards, and Traffic Lights first; validate; then layer embedded conditions and the debugger.*

*"Plans are worthless, but planning is everything." — Dwight Eisenhower. The canvas redesign is planned. Now let's build it.*
