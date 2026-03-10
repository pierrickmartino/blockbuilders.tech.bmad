---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - docs/canvas-redesign/PRD-canvas-editor-redesign.md
  - docs/canvas-redesign/architecture-canvas-review.md
  - docs/canvas-redesign/design-thinking-canvas-report.md
  - docs/canvas-redesign/product-brief-canvas-redesign.md
  - docs/canvas-redesign/brainstorming-canvas-report.md
  - docs/canvas-redesign/problem-solving-canvas-report.md
  - docs/canvas-redesign/party-mode-synthesis.md
---

# Canvas Editor Redesign - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Visual Strategy Canvas Editor Redesign (Smart Canvas), decomposing the requirements from the PRD, Architecture Review, Design Thinking Report, and Party Mode Synthesis into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-01: The Block Library Bottom Sheet shall include a "Patterns" tab alongside the existing category tabs (Indicators, Logic, Risk, Signals, Data). The Patterns tab displays recipe cards.
FR-02: Each recipe card in the Patterns tab shall display: a name, a one-line description, a mini-diagram showing constituent blocks and connections, and a difficulty indicator (beginner / intermediate / advanced).
FR-03: Dragging a recipe card onto the canvas shall expand it into its constituent blocks with pre-configured parameters and pre-created connections. The expansion shall produce standard `{blocks, connections}` JSON entries.
FR-04: When a recipe card is dropped within snap range of an existing compatible Input block (Price, Volume), the recipe's internal Input block shall be omitted and its first downstream block shall connect to the existing Input block instead.
FR-05: When a recipe card is dropped with no compatible upstream blocks in range, all constituent blocks (including Input blocks) shall be placed as a self-contained cluster.
FR-06: The initial recipe card catalog shall include at minimum: "RSI Oversold Bounce", "EMA Crossover", and "Bollinger Breakout".
FR-07: Recipe card constituent blocks shall include an optional `metadata.recipe_source` field in their JSON. This field is informational, ignored by the interpreter, and used for UI grouping hints and analytics.
FR-08: When a block is dragged and its input port enters within the snap threshold of a compatible output port on another block, the system shall display a visual snap indicator (port glow + dashed preview wire).
FR-09: The snap threshold shall be 60px on desktop (viewport >= 768px) and 80px on mobile (viewport < 768px).
FR-10: When the block is released within the snap zone of a compatible port, a connection shall be created automatically and stored identically to a manually drawn connection in the `connections` array.
FR-11: When multiple compatible ports are within the snap zone simultaneously, the system shall select the nearest port. If two ports are within 5px of each other, a disambiguation popup shall appear listing the options with block name and port label.
FR-12: Each port on a block shall be rendered with a distinct shape and color based on its data type: boolean -> diamond, amber; numeric array -> circle, blue; price array -> circle, green.
FR-13: When a user drags a wire from an output port, incompatible input ports shall dim visually and display a "no-connect" cursor. Wire completion to an incompatible port shall be blocked by the `isValidConnection` handler.
FR-14: Existing connection methods (drag wire from port to port, tap-tap on mobile) shall remain functional as fallback mechanisms alongside proximity snapping.
FR-15: All connections created via proximity snapping shall be included in the undo/redo history stack.
FR-16: Tapping/clicking a block shall open an inline popover anchored to the block's canvas position. The popover shall contain the same parameter controls (sliders, dropdowns, number inputs, presets) as the current Inspector Panel.
FR-17: The popover shall auto-position to remain fully visible within the canvas viewport.
FR-18: Changes made in the popover shall update the block's compact label in real time (within 100ms).
FR-19: The popover shall include a "Details" button that opens the full Inspector Panel for the selected block.
FR-20: On mobile (viewport < 768px), the popover shall render as a half-screen bottom sheet instead of a floating popover.
FR-21: Tapping/clicking outside the popover shall close it and commit any pending changes.
FR-22: Parameter changes made via inline popover shall be included in the undo/redo history and trigger the existing autosave debounce.
FR-23: The existing auto-layout feature shall remain available and shall function identically with all new block types and connection methods.
FR-24: When a recipe card expands into blocks, the resulting block positions shall follow the current auto-layout direction and shall not overlap existing blocks.
FR-25: Blocks expanded from a recipe card shall display a subtle group outline for 3 seconds after placement. The outline shall fade without user action.
FR-26: The Strategy Health Bar shall be rendered as a persistent horizontal bar above the React Flow canvas area. It shall contain three segments: Entry, Exit, Risk.
FR-27: Each Health Bar segment shall display one of three states: complete (green checkmark), incomplete (red X with coaching text), or warning (amber exclamation with advisory text).
FR-28: Health Bar state shall be computed client-side from the current canvas definition using the same rules as the validation endpoint. It shall update within 200ms of any block addition, removal, or connection change.
FR-29: Clicking an incomplete Health Bar segment shall scroll the canvas to the relevant area and display a contextual suggestion menu with one-tap block placement options.
FR-30: One-tap placement from the Health Bar shall auto-place the block at the appropriate canvas position and create connections to the most logical upstream/downstream blocks.
FR-31: The Health Bar shall be collapsible to a compact icon-only mode. Collapsed/expanded state shall persist in localStorage per user.
FR-32: The canvas toolbar shall include a "Narrative View" toggle. When activated, the canvas area shall dim and a plain-English paragraph shall overlay it, generated from the current strategy definition.
FR-33: The narrative text shall be generated by the existing Strategy Explanation Generator engine (deterministic, template-based). If the strategy is incomplete, the narrative shall display a message indicating what is missing.
FR-34: Each clause in the narrative paragraph shall be clickable. Clicking a clause shall switch back to Canvas View, zoom to the corresponding block(s), and highlight them with a 3-second temporary outline.
FR-35: The canvas toolbar shall include a "Live Preview" toggle. When activated, the system shall fetch the latest candle data for the strategy's asset/timeframe and evaluate each block's output.
FR-36: During Live Preview, blocks with boolean output shall display a colored glow (green = true, red = false). Blocks with numeric output shall display the computed value as a small badge. The Entry Signal block shall display "WOULD ENTER" or "WOULD NOT ENTER."
FR-37: The `entry_signal` and `exit_signal` block types shall support an optional `conditions` array in their `params` object with `logic` field accepting "and" or "or".
FR-38: When `conditions` is present on a signal block, the backtest interpreter shall use it to evaluate the signal. When `conditions` is absent, the interpreter shall follow inbound connections as today. Backward-compatible.
FR-39: The signal block's inline popover shall include a condition list UI with: an ALL/ANY toggle, a list of current conditions with remove buttons, and an "+ Add condition" button.
FR-40: When a condition is added via the signal block's condition list, a connection wire from the source block to the signal block shall be auto-created and visible on the canvas.
FR-41: When a signal block has both embedded conditions and an external manual connection from a logic block, the system shall display a warning banner on the block.
FR-42: After a backtest has completed, a "Replay" button shall appear on the canvas toolbar.
FR-43: Clicking Replay shall display a timeline scrubber at the bottom of the canvas spanning the backtest date range with trade entry/exit markers.
FR-44: For each candle position on the scrubber, each block shall display its computed value for that candle as an overlaid badge. Values shall update within 100ms per scrub step.
FR-45: Clicking a trade marker on the timeline shall jump the scrubber to that candle.
FR-46: Wires carrying a "true" signal at the current scrubber position shall be visually highlighted (brighter color or animated pulse).
FR-47: On mobile (viewport < 768px), the snap threshold for proximity connections shall be 80px (vs. 60px desktop).
FR-48: On mobile, when a snap connection is confirmed, the device shall emit a 50ms vibration pulse (Vibration API, where supported).
FR-49: The Narrative View toggle and Live Preview toggle shall be accessible from the mobile bottom action bar.
FR-50: On mobile, Narrative View shall render as a full-screen overlay with a close button.
FR-51: The `definition_json` output for strategies that do not use embedded conditions or recipe card metadata shall be identical to the current format. No phantom fields shall be added on save.
FR-52: Strategies with embedded conditions shall include the `conditions` array and `logic` field in the signal block's `params`. Strategies without embedded conditions shall omit these fields entirely.
FR-53: The optional `metadata.recipe_source` field, if present on a block, shall be preserved on save and ignored by the interpreter.
FR-54: No Alembic migration is needed for the `strategy_versions.definition_json` column.

**Party Mode Synthesis Additions:**
FR-55: Wizard-generated strategies shall open in Narrative View by default on first load. A clear "Switch to Canvas View" button shall be visible.
FR-56: On mobile, Narrative View shall be the default landing view for all strategies (not just wizard-generated). The full canvas remains accessible via a "Show Canvas" toggle.
FR-57: Clicking a clause in Narrative View shall open the inline popover for the corresponding block (clause-click-to-popover).
FR-58: Numeric values in the narrative text shall be directly editable inline (tap "30" in "drops below 30" to change it).
FR-59: A persistent 2-second "Connected!" indicator shall appear on both blocks when a proximity snap connection is created.

### NonFunctional Requirements

NFR-01: Canvas Render Performance — The canvas shall render an existing 20-block strategy with all new overlays (Health Bar, type-encoded ports) in < 500ms on a mid-range device (e.g., iPhone 13, Pixel 6).
NFR-02: Interaction Latency — Block drag, popover open, and parameter slider updates shall respond within 100ms. Proximity snap visual feedback (port glow, preview wire) shall appear within 50ms of threshold entry.
NFR-03: Live Preview Latency — Traffic Light evaluation shall complete and render all block states within 500ms of toggle activation, for strategies with up to 20 blocks.
NFR-04: Debugger Scrub Performance — Scrubbing the timeline shall update all block value badges within 100ms per candle step for strategies with up to 20 blocks on up to 1095 data points.
NFR-05: Accessibility (WCAG 2.1 AA) — All new canvas interactions shall meet WCAG 2.1 AA contrast ratios. Color-only status indicators shall be supplemented with shapes or text labels.
NFR-06: Responsiveness — The canvas shall support three breakpoints: desktop (>= 1024px), tablet (768-1023px), mobile (< 768px). All new features shall function at all breakpoints. Touch targets >= 44px on mobile.
NFR-07: Data Integrity — The `definition_json` produced by the redesigned canvas must be consumable by the existing Python backtest interpreter without modification (except the targeted `conditions` extension). Identical backtest results for existing strategies.
NFR-08: Undo/Redo Preservation — All new interactions (proximity snap, inline popover edits, recipe card placements, Health Bar additions, embedded condition changes) shall be included in the existing undo/redo history stack.
NFR-09: Autosave Compatibility — All parameter changes and structural changes shall trigger the existing autosave debounce mechanism.
NFR-10: Feature Toggle Safety — Each major feature (Health Bar, Proximity Snapping, Inline Popovers, Narrative View, Live Preview, Recipe Cards, Embedded Conditions, Debugger) shall be independently toggleable via a feature flag.

### Additional Requirements

**From Architecture Review:**
- SmartCanvas wraps existing StrategyCanvas — no rewrite of existing canvas behavior
- Port type mapping is static, defined once in a shared constants file (block type -> port types)
- Proximity snap distance calculations must be throttled to requestAnimationFrame (16ms intervals)
- Live Preview re-evaluation must be debounced (2 seconds after last change)
- Undo transaction API needed: beginUndoTransaction() / commitUndoTransaction() for composite actions (recipe card expansion, Health Bar placement)
- Debugger pre-computation: 20 blocks x 1095 candles x ~8 bytes = ~175 KB in memory
- Client-side TypeScript indicator library recommended (ADR-05) — serves both Traffic Lights and Debugger
- CI performance budget: fail build if 20-block canvas render exceeds 450ms
- Feature flag dependency graph: Embedded Conditions requires Inline Popovers (R-07)
- Interpreter deployment ordering: backend-first for embedded conditions (R-10)
- Cross-language parity tests required: Python indicator outputs vs TypeScript outputs for canonical inputs
- No Alembic migration needed — PostgreSQL JSON column accepts new optional fields

**From Party Mode Synthesis (Revised Priorities & Decisions):**
- Health Bar + Narrative View must ship together as Priority 1 (not separate sprints)
- Embedded Conditions deferred to v2 (not MVP)
- Type-Encoded Port Visuals deferred to v2
- Traffic Light Live Preview deferred to v2
- Candle-by-Candle Debugger is v3
- Recipe Cards are stretch goal for v1
- No dual-mode editor — redesign ships as default canvas
- Mobile: responsive adaptation for v1, not a separate projection

**From Design Thinking Report (UX Patterns):**
- Popover auto-positioning: use Floating UI or Radix-based positioning to avoid canvas edge clipping
- Mobile bottom sheet: use existing shadcn/ui Sheet component for parameter editing on mobile
- Recipe card expansion animation: subtle group outline for 3 seconds, then fade
- Health Bar transitions: segment colors animate with 200ms ease on state changes
- Block selection outline when popover is open
- Narrative View: canvas dims, paragraph overlays, clause-click highlights corresponding blocks

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-01 | Epic 4 | Patterns tab in Block Library |
| FR-02 | Epic 4 | Recipe card display (name, description, mini-diagram, difficulty) |
| FR-03 | Epic 4 | Recipe card expansion into blocks |
| FR-04 | Epic 4 | Recipe card proximity deduplication of Input blocks |
| FR-05 | Epic 4 | Self-contained cluster when no compatible upstream |
| FR-06 | Epic 4 | Initial recipe card catalog (3 cards) |
| FR-07 | Epic 4 | Optional metadata.recipe_source field |
| FR-08 | Epic 3 | Snap indicator (port glow + dashed preview wire) |
| FR-09 | Epic 3 | Snap threshold 60px desktop / 80px mobile |
| FR-10 | Epic 3 | Auto-connection on release within snap zone |
| FR-11 | Epic 3 | Nearest port selection / disambiguation popup |
| FR-12 | Epic 7 | Type-encoded port shapes and colors |
| FR-13 | Epic 7 | Incompatible port dimming and no-connect cursor |
| FR-14 | Epic 3 | Existing connection methods preserved as fallbacks |
| FR-15 | Epic 3 | Snap connections in undo/redo history |
| FR-16 | Epic 2 | Inline popover on block tap/click |
| FR-17 | Epic 2 | Popover auto-positioning |
| FR-18 | Epic 2 | Real-time block label update (< 100ms) |
| FR-19 | Epic 2 | "Details" button to open Inspector Panel |
| FR-20 | Epic 2 | Mobile bottom sheet rendering |
| FR-21 | Epic 2 | Close popover on outside click, commit changes |
| FR-22 | Epic 2 | Popover changes in undo/redo + autosave |
| FR-23 | Epic 4 | Auto-layout preservation |
| FR-24 | Epic 4 | Recipe card expansion follows auto-layout direction |
| FR-25 | Epic 4 | Group outline for 3 seconds after placement |
| FR-26 | Epic 1 | Health Bar above canvas (Entry, Exit, Risk segments) |
| FR-27 | Epic 1 | Three Health Bar states (complete, incomplete, warning) |
| FR-28 | Epic 1 | Client-side Health Bar computation (< 200ms) |
| FR-29 | Epic 1 | Click incomplete segment to scroll + suggestion menu |
| FR-30 | Epic 1 | One-tap placement from Health Bar |
| FR-31 | Epic 1 | Collapsible Health Bar with localStorage persistence |
| FR-32 | Epic 1 | Narrative View toggle in toolbar |
| FR-33 | Epic 1 | Narrative text from Strategy Explanation Generator |
| FR-34 | Epic 1 | Clickable clauses zoom to corresponding blocks |
| FR-35 | Epic 5 | Live Preview toggle in toolbar |
| FR-36 | Epic 5 | Traffic light glow + value badges + WOULD ENTER badge |
| FR-37 | Epic 6 | Optional conditions array on signal blocks |
| FR-38 | Epic 6 | Interpreter recognizes conditions (backward-compatible) |
| FR-39 | Epic 6 | Condition list UI in signal block popover |
| FR-40 | Epic 6 | Auto-wire creation when condition added |
| FR-41 | Epic 6 | Warning for mixed embedded + external conditions |
| FR-42 | Epic 8 | Replay button after backtest completion |
| FR-43 | Epic 8 | Timeline scrubber with trade markers |
| FR-44 | Epic 8 | Per-block value badges (< 100ms per step) |
| FR-45 | Epic 8 | Click trade marker to jump scrubber |
| FR-46 | Epic 8 | Highlighted wires for true signals |
| FR-47 | Epic 3 | Mobile snap threshold 80px |
| FR-48 | Epic 3 | Mobile haptic feedback (50ms vibration) |
| FR-49 | Epic 1 + Epic 5 | Mobile bottom action bar toggles |
| FR-50 | Epic 1 | Mobile Narrative View as full-screen overlay |
| FR-51 | Epic 6 | No phantom fields on save |
| FR-52 | Epic 6 | Conditions array only when used, omitted when not |
| FR-53 | Epic 4 | metadata.recipe_source preserved on save |
| FR-54 | Epic 6 | No Alembic migration needed |
| FR-55 | Epic 1 | Wizard-generated strategies open in Narrative View |
| FR-56 | Epic 1 | Mobile defaults to Narrative View for all strategies |
| FR-57 | Epic 1 | Clause-click opens inline popover |
| FR-58 | Epic 1 | Inline numeric editing in narrative text |
| FR-59 | Epic 3 | 2-second connection confirmation indicator |

## Epic List

### Epic 1: Strategy Comprehension & Guided Completion
Users can understand what their strategy does through a plain-English narrative and see at a glance whether their strategy is complete, with coaching to fix gaps. Health Bar and Narrative View ship together as a unit.
**FRs covered:** FR-26, FR-27, FR-28, FR-29, FR-30, FR-31, FR-32, FR-33, FR-34, FR-49 (Narrative View toggle), FR-50, FR-55, FR-56, FR-57, FR-58
**Phase:** v1 Core (Sprint 1)

### Epic 2: Inline Parameter Editing
Users can edit block parameters directly on the canvas without losing spatial context, making strategy refinement faster and more intuitive. Inspector Panel becomes secondary.
**FRs covered:** FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22
**Phase:** v1 Core (Sprint 2)

### Epic 3: Smart Connections via Proximity Snapping
Users can connect blocks by dragging them near each other, eliminating precise port-to-port wiring. Especially valuable on mobile with increased snap threshold and haptic feedback.
**FRs covered:** FR-08, FR-09, FR-10, FR-11, FR-14, FR-15, FR-47, FR-48, FR-59
**Phase:** v1 Core (Sprint 3)

### Epic 4: Recipe Cards & Pattern Discovery
Users can browse and place common strategy patterns as single units from a Patterns tab in the Block Library, skipping tedious individual block placement and wiring.
**FRs covered:** FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-23, FR-24, FR-25, FR-53
**Phase:** v1 Stretch

### Epic 5: Traffic Light Live Preview
Users can see each block's current evaluation state directly on the canvas, closing the "preview desert" and enabling faster iteration without full backtests.
**FRs covered:** FR-35, FR-36, FR-49 (Live Preview toggle)
**Phase:** v2

### Epic 6: Embedded Conditions in Signal Blocks
Users can define entry/exit logic directly inside signal blocks using a condition list, eliminating separate AND/OR/Compare blocks for common patterns. Only feature requiring interpreter change.
**FRs covered:** FR-37, FR-38, FR-39, FR-40, FR-41, FR-51, FR-52, FR-54
**Phase:** v2

### Epic 7: Type-Encoded Port Visuals
Users can predict valid connections at a glance through distinct port shapes and colors per data type, making invalid wiring visually impossible before attempted.
**FRs covered:** FR-12, FR-13
**Phase:** v2

### Epic 8: Candle-by-Candle Debugger
Users can replay a completed backtest on the canvas, stepping through each candle to see exactly when and why their strategy entered or exited positions.
**FRs covered:** FR-42, FR-43, FR-44, FR-45, FR-46
**Phase:** v3

---

## Epic 1: Strategy Comprehension & Guided Completion

Users can understand what their strategy does through a plain-English narrative and see at a glance whether their strategy is complete, with coaching to fix gaps. Health Bar and Narrative View ship together as a unit.

### Story 1.1: SmartCanvas Wrapper & Feature Flag Infrastructure

As a developer,
I want a SmartCanvas component that wraps the existing StrategyCanvas with feature flag support,
So that all new canvas features can be layered on top without modifying existing behavior.

**Acceptance Criteria:**

**Given** the existing StrategyCanvas renders a strategy
**When** SmartCanvas replaces it as the canvas entry point
**Then** all existing canvas behavior (undo/redo, autosave, copy/paste, minimap, auto-layout, keyboard shortcuts) functions identically
**And** feature flags are checked from PostHog client SDK for each major feature area
**And** with all flags disabled, the canvas behaves identically to the current implementation

### Story 1.2: Health Bar - Strategy Completeness Display

As a beginner,
I want a persistent bar showing whether my strategy has Entry, Exit, and Risk components,
So that I can see at a glance what my strategy is missing without running validation.

**Acceptance Criteria:**

**Given** the canvas is loaded with a strategy
**When** the Health Bar renders above the React Flow canvas
**Then** it displays three segments: Entry, Exit, Risk
**And** each segment shows one of: complete (green checkmark), incomplete (red X with coaching text), or warning (amber exclamation with advisory text)

**Given** the user adds or removes a block or connection
**When** the canvas state changes
**Then** the Health Bar re-evaluates client-side within 200ms using the same rules as the validation endpoint
**And** segment state transitions animate with 200ms ease

**Given** the user clicks the minimize control on the Health Bar
**When** the bar collapses
**Then** it shows only icons without coaching text
**And** the collapsed/expanded state persists in localStorage

**Given** the Health Bar feature flag is disabled
**When** the canvas loads
**Then** no Health Bar is rendered

### Story 1.3: Health Bar - Guided Block Placement

As a beginner,
I want to click an incomplete Health Bar segment and get one-tap block placement suggestions,
So that I can quickly add missing components without searching the Block Library.

**Acceptance Criteria:**

**Given** the Health Bar Exit segment shows incomplete
**When** I click the Exit segment
**Then** the canvas scrolls to the area where an exit block would logically be placed
**And** a contextual suggestion menu appears with options like "Add Stop Loss", "Add Exit Signal", "Add Trailing Stop"

**Given** I click "Add Stop Loss" from the suggestion menu
**When** the block is placed
**Then** a Stop Loss block auto-places at an appropriate canvas position
**And** connections to the most logical upstream/downstream blocks are auto-created
**And** the Health Bar Exit segment updates to complete
**And** the placement is a single undo step (uses beginUndoTransaction/commitUndoTransaction)
**And** autosave is triggered

### Story 1.4: Narrative View - Read-Only Toggle

As any user,
I want to toggle a Narrative View that shows my strategy as a plain-English paragraph,
So that I can verify what my strategy does without tracing wires.

**Acceptance Criteria:**

**Given** I am on the canvas
**When** I click the "Narrative View" toggle in the toolbar
**Then** the canvas area dims and a plain-English paragraph overlays it
**And** the narrative is generated by the existing Strategy Explanation Generator engine (deterministic, template-based)

**Given** the strategy is incomplete (no entry signal)
**When** I toggle Narrative View
**Then** it displays: "This strategy is incomplete. Add an entry condition to see the narrative."

**Given** I switch back to Canvas View
**When** I modify a block parameter
**Then** the Narrative View reflects the change the next time I toggle to it

**Given** the Narrative View feature flag is disabled
**When** the canvas loads
**Then** no Narrative View toggle appears in the toolbar

### Story 1.5: Narrative View - Clause Navigation

As any user,
I want to click a clause in the Narrative View to see which blocks implement it,
So that I can navigate between the narrative and the visual representation.

**Acceptance Criteria:**

**Given** the Narrative View is active and displays "When the 14-period RSI drops below 25..."
**When** I click the clause "14-period RSI drops below 25"
**Then** the view switches back to Canvas View
**And** the canvas zooms to the RSI and Compare blocks using setCenter/fitView
**And** the corresponding blocks are highlighted with a 3-second temporary outline that fades automatically

### Story 1.6: Narrative View - Default Modes & Mobile

As a new user or mobile user,
I want to land in Narrative View by default when appropriate,
So that I understand my strategy before seeing the canvas graph.

**Acceptance Criteria:**

**Given** a wizard-generated strategy is opened for the first time
**When** the canvas loads
**Then** Narrative View is active by default
**And** a clear "Switch to Canvas View" button is visible
**And** the user's view preference is persisted in localStorage for subsequent visits

**Given** I am on a mobile device (viewport < 768px)
**When** I open any strategy
**Then** Narrative View is the default landing view
**And** a "Show Canvas" toggle is accessible
**And** the full canvas remains available

**Given** I am on mobile with Narrative View active
**When** the narrative renders
**Then** it displays as a full-screen overlay with a close button (not a dimmed canvas with overlay text)

**Given** the mobile bottom action bar
**When** Narrative View is available
**Then** the Narrative View toggle is accessible from the mobile bottom action bar

### Story 1.7: Narrative View - Inline Parameter Editing

As any user,
I want to edit numeric values directly within the narrative text,
So that I can make parameter changes without switching views.

**Acceptance Criteria:**

**Given** the Narrative View displays "drops below 30"
**When** I tap/click the number "30"
**Then** an inline input appears replacing the number
**And** I can type a new value (e.g., 25)
**And** on confirm (Enter or blur), the corresponding block's parameter updates
**And** the narrative text updates to reflect the change
**And** the change triggers autosave and is included in undo/redo history

**Given** the Narrative View displays a clause like "14-period RSI drops below 25"
**When** I click anywhere on the clause (not a number)
**Then** the corresponding block is selected on the canvas
**And** the Inspector Panel opens for that block (enhanced to inline popover in Epic 2)

**Given** a non-numeric parameter (e.g., operator < or >, dropdown values)
**When** displayed in the narrative
**Then** it is not inline-editable in this version (deferred to future iteration)

---

## Epic 2: Inline Parameter Editing

Users can edit block parameters directly on the canvas without losing spatial context, making strategy refinement faster and more intuitive. Inspector Panel becomes secondary.

### Story 2.1: Inline Parameter Popover on Block Tap

As any user,
I want to edit block parameters in a popover anchored to the block itself,
So that I can adjust parameters without losing spatial context on the canvas.

**Acceptance Criteria:**

**Given** I tap/click a block on the canvas
**When** the popover opens
**Then** it is anchored to the block's canvas position (not in a side panel)
**And** it contains the same controls (sliders, dropdowns, number inputs, presets) as the current Inspector Panel
**And** the popover auto-positions to remain fully visible (no clipping at canvas edges) using Floating UI or Radix positioning

**Given** I adjust a slider or input in the popover
**When** the value changes
**Then** the block's compact label updates in real time within 100ms (e.g., `RSI (14)` → `RSI (25)`)

**Given** I tap/click outside the popover
**When** the popover closes
**Then** the parameter change is committed
**And** the change is included in undo/redo history
**And** autosave debounce is triggered

**Given** the Inline Popovers feature flag is disabled
**When** I tap a block
**Then** the existing Inspector Panel opens as it does today

### Story 2.2: Mobile Bottom Sheet Parameter Editing

As a mobile user,
I want parameter editing to appear as a bottom sheet,
So that I can edit without the popover being occluded by the keyboard.

**Acceptance Criteria:**

**Given** I am on a mobile device (viewport < 768px)
**When** I tap a block
**Then** parameter controls render as a half-screen bottom sheet (using existing shadcn/ui Sheet component)
**And** the block's label on the canvas remains visible above the sheet and updates in real time

**Given** the bottom sheet is open and I adjust a parameter
**When** the software keyboard opens
**Then** the sheet scrolls to keep the active input visible (using visualViewport API)

**Given** I swipe down on the sheet
**When** it closes
**Then** changes are committed, undo/redo and autosave are triggered

### Story 2.3: Inspector Panel as Secondary View

As a power user,
I want to access the full Inspector Panel when I need all parameters at once,
So that the inline popover doesn't limit my editing capabilities.

**Acceptance Criteria:**

**Given** the inline popover is open
**When** I click the "Details" button on the popover
**Then** the Inspector Panel opens in its current location with the same block selected
**And** the popover closes

**Given** the Inspector Panel is open
**When** I edit a parameter there
**Then** the block's canvas label and any open popover update in real time

**Given** no popover is open
**When** I use the existing keyboard shortcut or menu action for the Inspector
**Then** it opens as it does today

---

## Epic 3: Smart Connections via Proximity Snapping

Users can connect blocks by dragging them near each other, eliminating precise port-to-port wiring. Especially valuable on mobile with increased snap threshold and haptic feedback.

### Story 3.1: Proximity Snap Detection & Visual Feedback

As any user,
I want to see visual feedback when I drag a block near a compatible port,
So that I know a connection will be created before I release.

**Acceptance Criteria:**

**Given** I am dragging a block on the canvas
**When** its input port enters within 60px of a compatible output port on another block
**Then** the compatible port glows with a highlight color
**And** a dashed preview wire appears between the ports
**And** visual feedback appears within 50ms of threshold entry

**Given** snap detection is running during drag
**When** distance calculations are performed
**Then** they are throttled to requestAnimationFrame (16ms intervals) to prevent jank

**Given** the dragged block is not near any compatible port
**When** I look at other blocks
**Then** snap zones are invisible — no glow, no preview wire

**Given** existing connection methods (drag wire from port, tap-tap on mobile)
**When** I attempt them
**Then** they function identically as fallback mechanisms alongside proximity snapping

**Given** the Proximity Snapping feature flag is disabled
**When** I drag blocks
**Then** no snap detection occurs and connections work as they do today

### Story 3.2: Snap Connection Creation & Disambiguation

As any user,
I want blocks to auto-connect when I release them in a snap zone,
So that I don't have to precisely target small port circles.

**Acceptance Criteria:**

**Given** the preview wire is showing and I release the block within the snap zone
**When** the connection is created
**Then** it is stored identically to a manually drawn connection in the `connections` array
**And** the dashed preview wire becomes a solid wire

**Given** I release the block outside any snap zone
**When** the block lands
**Then** no connection is created and the block stays at the release position

**Given** multiple compatible ports are within the snap zone
**When** I release the block
**Then** the nearest compatible port is selected
**And** if two ports are within 5px of each other, a disambiguation popup appears listing the options with block name and port label

**Given** a snap connection is created
**When** I invoke undo
**Then** the connection is removed and the block returns to its pre-drop position
**And** the connection is included in the undo/redo history stack

### Story 3.3: Mobile Snap Enhancements & Connection Confirmation

As a mobile user,
I want larger snap zones and haptic feedback for proximity connections,
So that touch-based strategy building is less frustrating.

**Acceptance Criteria:**

**Given** I am on a mobile device (viewport < 768px)
**When** I drag a block near a compatible port
**Then** the snap threshold is 80px (vs. 60px on desktop)

**Given** a snap connection is confirmed on mobile
**When** the connection is created
**Then** the device emits a 50ms vibration pulse (Vibration API)
**And** failure to vibrate is non-blocking

**Given** a proximity snap connection is created (desktop or mobile)
**When** the connection confirms
**Then** a persistent 2-second "Connected!" indicator appears on both blocks
**And** the indicator fades after 2 seconds without user action

---

## Epic 4: Recipe Cards & Pattern Discovery

Users can browse and place common strategy patterns as single units from a Patterns tab in the Block Library, skipping tedious individual block placement and wiring.

### Story 4.1: Patterns Tab in Block Library

As an intermediate user,
I want to browse pre-built strategy patterns in the Block Library,
So that I can discover common patterns without knowing the individual blocks.

**Acceptance Criteria:**

**Given** I open the Block Library Bottom Sheet
**When** I navigate to the "Patterns" tab
**Then** I see a list of recipe cards alongside the existing category tabs (Indicators, Logic, Risk, Signals, Data)

**Given** a recipe card is displayed
**When** I look at it
**Then** it shows: a name, a one-line description, a mini-diagram (simple SVG) showing constituent blocks and connections, and a difficulty indicator (beginner / intermediate / advanced)

**Given** the initial catalog
**When** the Patterns tab loads
**Then** at minimum three cards are available: "RSI Oversold Bounce" (Price → RSI(14) → Compare(< 30) → Entry Signal), "EMA Crossover" (Price → EMA(12) + EMA(26) → Crossover → Entry Signal), and "Bollinger Breakout" (Price → BBands(20,2) → Compare(price > upper) → Entry Signal)

### Story 4.2: Recipe Card Expansion onto Canvas

As an intermediate user,
I want to drag a recipe card onto the canvas and have it expand into pre-connected blocks,
So that I skip the tedious process of placing and wiring 4+ blocks individually.

**Acceptance Criteria:**

**Given** I drag a recipe card from the Patterns tab onto the canvas
**When** I release it with no compatible upstream blocks in range
**Then** all constituent blocks (including Input blocks) appear as a self-contained cluster
**And** blocks are pre-connected with sensible default parameters
**And** block positions follow the current auto-layout direction (left→right or top→bottom) and do not overlap existing blocks
**And** a subtle group outline appears for 3 seconds then fades

**Given** the recipe card expansion
**When** the blocks are placed
**Then** each block includes an optional `metadata.recipe_source` field (e.g., `"rsi_oversold_bounce"`)
**And** the metadata is preserved on save and ignored by the interpreter

**Given** recipe card blocks have been placed
**When** I tap any individual block
**Then** I can edit its parameters via the inline popover as usual

**Given** recipe card expansion creates multiple nodes and edges
**When** the expansion occurs
**Then** it is wrapped in a single undo transaction (beginUndoTransaction/commitUndoTransaction)
**And** undo removes all constituent blocks and connections in one step
**And** autosave is triggered after expansion

**Given** auto-layout is disabled and the drop would cause overlap
**When** blocks are placed
**Then** they are placed with a 20px offset to avoid exact overlap

### Story 4.3: Recipe Card Proximity Deduplication

As a user,
I want recipe cards to reuse existing Input blocks on the canvas,
So that I don't end up with duplicate Price blocks.

**Acceptance Criteria:**

**Given** a Price block already exists on the canvas
**When** I drop an "RSI Oversold Bounce" recipe card within snap range of the Price block's output
**Then** the recipe's internal Price block is omitted
**And** the recipe's RSI block connects to the existing Price block instead

**Given** I drop a recipe card near multiple Input blocks
**When** deduplication runs
**Then** only Input blocks (Price, Volume) are deduplicated — indicator and logic blocks within the recipe are always placed as new blocks

**Given** the existing auto-layout feature
**When** recipe cards are expanded
**Then** auto-layout functions identically with the expanded blocks

---

## Epic 5: Traffic Light Live Preview

Users can see each block's current evaluation state directly on the canvas, closing the "preview desert" and enabling faster iteration without full backtests.

### Story 5.1: Live Preview Toggle & Evaluation Engine

As any user,
I want to toggle Live Preview to see what my strategy "thinks" right now,
So that I can understand my strategy's behavior without running a full backtest.

**Acceptance Criteria:**

**Given** I am on the canvas
**When** I click the "Live Preview" toggle in the toolbar
**Then** the system fetches the latest candle data for the strategy's asset/timeframe
**And** evaluates each block's output using the client-side TypeScript indicator library (or server-side endpoint per OQ-01 resolution)
**And** evaluation completes and renders all block states within 500ms

**Given** Live Preview is active and I edit a parameter or add a block
**When** a structural or parameter change occurs
**Then** re-evaluation is debounced at 2 seconds after the last change
**And** a manual "Refresh" button is available as override

**Given** a network error occurs while fetching candle data
**When** Live Preview is toggled on
**Then** a non-blocking toast notification informs me
**And** the canvas remains in normal (non-preview) mode

**Given** the Live Preview feature flag is disabled
**When** the canvas loads
**Then** no Live Preview toggle appears

### Story 5.2: Traffic Light Block Overlays & Value Badges

As any user,
I want each block to display its evaluation state as visual overlays,
So that I can see at a glance which conditions are firing.

**Acceptance Criteria:**

**Given** Live Preview is active
**When** blocks are evaluated
**Then** blocks with boolean output display a colored glow: green if true, red if false, gray if not yet evaluated
**And** blocks with numeric output display the computed value as a small badge (e.g., "28.4")

**Given** the Entry Signal block is evaluated
**When** its condition is met on the latest candle
**Then** it shows a prominent "WOULD ENTER" badge
**And** when not met, it shows "WOULD NOT ENTER"

**Given** Live Preview is toggled off
**When** returning to normal editing
**Then** all traffic light glows and value badges are removed within 200ms

**Given** the mobile bottom action bar
**When** Live Preview is available
**Then** the Live Preview toggle is accessible from the mobile bottom action bar

---

## Epic 6: Embedded Conditions in Signal Blocks

Users can define entry/exit logic directly inside signal blocks using a condition list, eliminating separate AND/OR/Compare blocks for common patterns. Only feature requiring interpreter change.

### Story 6.1: Interpreter Extension for Embedded Conditions (Backend)

As a developer,
I want the backtest interpreter to recognize embedded conditions on signal blocks,
So that users can define logic inline without the interpreter breaking.

**Acceptance Criteria:**

**Given** an `entry_signal` or `exit_signal` block with a `conditions` array in `params`
**When** the interpreter processes the signal block
**Then** it evaluates the conditions with the specified `logic` ("and" or "or")
**And** treats embedded conditions as equivalent to explicit AND/OR wiring

**Given** an existing strategy without the `conditions` field
**When** the interpreter processes it
**Then** it follows inbound connections exactly as today — zero behavior change

**Given** a strategy with embedded conditions
**When** a backtest is run
**Then** results are identical to an equivalent strategy using explicit Compare → AND → Entry Signal wiring
**And** a dedicated regression test suite validates byte-identical backtest outputs for both representations

**Given** the PostgreSQL JSON column for `strategy_versions.definition_json`
**When** the new optional fields are stored
**Then** no Alembic migration is needed — the JSON type accepts them without schema modification

**Given** this backend change
**When** deployed
**Then** it is deployed before the frontend feature flag is enabled (backend-first deployment)

### Story 6.2: Condition List UI in Signal Block Popover

As an intermediate user,
I want to add conditions directly inside the Entry Signal block's popover,
So that I don't need separate AND/OR/Compare blocks for common patterns.

**Acceptance Criteria:**

**Given** I tap the Entry Signal block and the inline popover opens
**When** I see the condition list UI
**Then** it shows: an ALL/ANY toggle, a list of current conditions with remove buttons, and an "+ Add condition" button

**Given** I click "+ Add condition"
**When** the condition picker opens
**Then** it lists available upstream block outputs (e.g., "RSI(14) output", "Crossover(EMA12, EMA26) output") with operators (<, >, <=, >=) and value fields where applicable

**Given** I select "RSI(14) < 30" as a condition
**When** I confirm
**Then** a wire from the RSI block to the Entry Signal block is auto-created on the canvas
**And** the condition appears in the signal block's condition list

**Given** I toggle from ALL to ANY
**When** the change is saved
**Then** the signal block's `params.logic` updates from "and" to "or"
**And** the Narrative View updates accordingly

**Given** I remove all embedded conditions from a signal block
**When** the strategy is saved
**Then** the `conditions` and `logic` fields are removed entirely from `params` (not left as empty arrays)

**Given** strategies that do not use embedded conditions
**When** saved
**Then** the `definition_json` is identical to the current format — no phantom fields added

### Story 6.3: Mixed Conditions Warning

As a user,
I want a warning when I have both embedded conditions and external manual wiring on a signal block,
So that I understand the evaluation behavior and can resolve the ambiguity.

**Acceptance Criteria:**

**Given** a signal block has embedded conditions in `params.conditions`
**When** an external manual connection from a logic block also feeds into the signal block
**Then** a warning banner is displayed on the block: "This signal block has both embedded conditions and an external input. The external input will be treated as an additional AND condition."

**Given** the warning is displayed
**When** the user removes either the external wire or the embedded conditions
**Then** the warning disappears

---

## Epic 7: Type-Encoded Port Visuals

Users can predict valid connections at a glance through distinct port shapes and colors per data type, making invalid wiring visually impossible before attempted.

### Story 7.1: Type-Encoded Port Shapes & Colors

As a beginner,
I want ports to have distinct shapes and colors per data type,
So that I can predict valid connections without trial and error.

**Acceptance Criteria:**

**Given** a block is on the canvas
**When** I look at its ports
**Then** each port has a distinct visual shape and color: boolean → diamond, amber (#F59E0B); numeric array → circle, blue (#3B82F6); price array → circle, green (#10B981)

**Given** the port type mapping
**When** it is defined
**Then** it uses a shared constants file consumed by both the port renderer and the `isValidConnection` handler

**Given** WCAG 2.1 AA requirements
**When** port visuals are rendered
**Then** color-only indicators are supplemented with distinct shapes (not relying on color alone)

### Story 7.2: Incompatible Port Dimming During Wire Drag

As a beginner,
I want incompatible ports to dim when I'm dragging a wire,
So that I can see which connections are valid before completing them.

**Acceptance Criteria:**

**Given** I start dragging a wire from a boolean output port
**When** I hover over an incompatible numeric input port
**Then** the target port dims visually and shows a "no-connect" cursor
**And** the wire cannot snap or complete to the incompatible port

**Given** I start dragging from a boolean output
**When** I hover over a compatible boolean input
**Then** the target port brightens
**And** the wire can complete

**Given** the `isValidConnection` handler
**When** an incompatible connection is attempted
**Then** it is blocked — wire completion is prevented

---

## Epic 8: Candle-by-Candle Debugger

Users can replay a completed backtest on the canvas, stepping through each candle to see exactly when and why their strategy entered or exited positions.

### Story 8.1: Debugger Timeline Scrubber & Trade Markers

As a power user,
I want a timeline scrubber to step through my backtest candle by candle,
So that I can see exactly when my strategy made decisions.

**Acceptance Criteria:**

**Given** a backtest has completed
**When** I click "Replay" on the canvas toolbar
**Then** a timeline scrubber appears at the bottom of the canvas spanning the backtest date range
**And** trade entry/exit points are marked on the timeline

**Given** the timeline has trade markers
**When** I click a trade marker
**Then** the scrubber jumps to that candle

**Given** the backtest has no trades
**When** I activate Replay
**Then** the scrubber works normally but no trade markers appear
**And** a subtle notice reads: "No trades were executed during this period."

**Given** the Debugger feature flag is disabled
**When** a backtest completes
**Then** no Replay button appears

### Story 8.2: Per-Block Value Badges & Wire Highlighting

As a power user,
I want each block to display its computed value at the current scrubber position,
So that I can trace exactly how my strategy evaluated each candle.

**Acceptance Criteria:**

**Given** the scrubber is at candle N
**When** I look at each block
**Then** it displays its computed value for that candle as an overlaid badge (e.g., RSI = 28.4, Compare(< 30) = TRUE, Entry Signal = ACTIVE)

**Given** I drag the scrubber forward or backward
**When** block values change
**Then** badges update within 100ms per scrub step
**And** values are pre-computed on debugger activation (not computed on every scrub step)
**And** memory budget: ~175 KB for 20 blocks x 1095 candles

**Given** a trade entry occurs at candle N
**When** I scrub to N
**Then** the Entry Signal block shows "ENTERED" with a green pulse
**And** the timeline marks candle N with an entry marker

**Given** wires carry a "true" signal at the current scrubber position
**When** the scrubber is at that candle
**Then** those wires are visually highlighted (brighter color or animated pulse)
