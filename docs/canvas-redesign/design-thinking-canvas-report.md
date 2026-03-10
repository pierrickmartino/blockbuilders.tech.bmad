# Design Thinking Canvas Report: Blockbuilders Visual Strategy Editor

**Session:** Design Thinking Applied to Canvas Interaction Redesign
**Facilitator:** Maya (Design Thinking Coach)
**Date:** 2026-03-09
**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Input:** SCAMPER brainstorming report (43 ideas, 6 thematic clusters, 10 top picks)

---

## Phase 1 — Empathize

### 1.1 Léa, the Beginner

**Context:** Léa just completed the Strategy Building Wizard. She picked "Use momentum (RSI)" and clicked "See how it would have performed." The backtest ran. She saw results. Now she's landed on the canvas for the first time, staring at her auto-generated strategy rendered as connected blocks.

**Moment-by-moment experience:**

**First 5 seconds — Orientation shock.** Léa sees a cluster of colored rectangles with lines between them. She recognizes the word "RSI" on one block because the wizard mentioned it, but the other blocks — "Price," "Compare," "Entry Signal" — feel like a circuit board she didn't ask to see. The compact one-line summaries (`RSI (14)`, `Compare: < 30`) are technically accurate but emotionally opaque. She doesn't know what "Compare: < 30" means in context. Her internal monologue: *"I thought I already built this. Why am I looking at wires?"*

**Seconds 5–20 — Searching for her task.** She wants to change the RSI period from 30 to 25. But wait — is 30 the RSI period or the comparison threshold? The RSI block says `RSI (14)` and the Compare block says `Compare: < 30`. She taps the RSI block. The Inspector Panel slides open on the right (or as a sheet on mobile). She sees "Period: 14." That's not 30. She realizes 30 is the threshold on the Compare block, not the RSI block. She needs to change the Compare block's value, not the RSI period. But she came here thinking "change 30 to 25" and now she's confused about which number lives where.

**Seconds 20–45 — Context switching friction.** She taps the Compare block. The Inspector Panel updates. She sees "Operator: <" and "Value: 30" (or however the second input is represented). She changes 30 to 25. But now she's looking at the Inspector Panel, not the canvas. She doesn't see the Compare block update in real time (or if she does, it's a subtle text change on a small node she's not looking at). The connection between "I changed a number in a panel" and "my strategy now behaves differently" is abstract. She hits Save. She doesn't know if that was right. Nothing on the canvas told her what this change *means* — that she just made her strategy more aggressive by entering oversold positions earlier.

**Confidence moments:** The validation checkmarks (✓) on blocks feel reassuring. The fact that her strategy was auto-generated and already valid gives her a safety net. The "What you just learned" card from the backtest results gave her context. If she runs another backtest and sees results change, she'll start to build a mental model.

**Abandonment risk points:**
- If she can't find which block holds the number she wants to change (high risk).
- If she accidentally disconnects a wire while tapping around on mobile (medium risk).
- If she changes a value, runs a backtest, and can't understand why results changed (high risk).
- If the canvas looks "broken" or messy and she doesn't know auto-layout exists (medium risk).

**Core emotional arc:** Curiosity → Confusion → Tentative success → Lingering uncertainty about whether she did the right thing.

---

### 1.2 Marco, the Intermediate

**Context:** Marco is building his 5th strategy from scratch. He knows what an EMA crossover is. Today's goal: combine two entry conditions (EMA 12/26 crossover AND RSI below 40) with AND logic, add a trailing stop at 3%, and set position sizing to 75% of equity.

**Moment-by-moment experience:**

**Minutes 0–2 — Efficient start, then block hunting.** Marco opens a new strategy, picks BTC/USDT daily. He opens the Block Library Bottom Sheet and searches "EMA." He drags two EMA blocks onto the canvas. He knows he needs to connect both to a Price block, so he adds Price first. He connects Price → EMA(12) and Price → EMA(26). This takes four precise tap-and-connect actions. On desktop with a mouse, this is fine. On mobile, each connection is a tap-source-port, tap-target-port sequence that requires finding small circles on block edges. He's done this before so he knows the rhythm, but it still feels *manual* — like filling out a form field by field instead of saying "I want an EMA crossover."

**Minutes 2–5 — Logic wiring is the bottleneck.** Now he needs a Crossover block (direction: crosses_above) connected to both EMA outputs. Then he needs an RSI block connected to Price, a Compare block (< 40) comparing RSI output to a Constant(40), and an AND block combining the Crossover result with the Compare result. That's: 1 Crossover + 1 RSI + 1 Compare + 1 Constant + 1 AND = 5 more blocks, each needing at least one connection. He's mentally holding the full graph topology in his head while physically placing blocks one at a time. The canvas is becoming spatially crowded. He uses auto-layout to tidy up. The logic section (AND, Compare, Crossover) is the most visually confusing because these blocks all look similar — small rectangles with two inputs and one output.

**Minutes 5–8 — Risk management is straightforward but disconnected.** He adds a Trailing Stop block (trail_pct: 3%) and a Position Size block (75%). These don't need connections to the signal chain — they're standalone configuration. But visually, they float near the bottom of the canvas, disconnected from the main flow. He knows they apply globally, but a new user might wonder "is this connected to anything?" The spatial separation between signal logic (top of canvas) and risk rules (bottom) doesn't tell a coherent story.

**Minutes 8–10 — Validation and review.** He hits Validate. Green checkmarks. He scans the canvas and tries to "read" his strategy. But reading requires following wires: Price → EMA(12) → Crossover ← EMA(26), Crossover → AND ← Compare ← RSI ← Price, AND → Entry Signal. It's a graph, not a sentence. He can trace it, but it takes cognitive effort every time. He wishes the canvas had a "read this back to me" view.

**Efficiency wins:** Search in the block library is fast. Auto-layout prevents mess. Keyboard shortcuts (Cmd+S, Cmd+R) save clicks. Copy-paste lets him duplicate block groups if he's iterating on a variant.

**Friction points:**
- Placing logic blocks (AND, OR, Compare) is repetitive and feels like plumbing, not strategy design.
- Each connection is a separate manual action — no "connect these three things" batch operation.
- The canvas doesn't preview what the strategy *does* until he runs a full backtest.
- Switching between the canvas (spatial) and the Inspector (form-based) for every parameter edit breaks flow.

**Core emotional arc:** Confidence → Tedium during logic wiring → Satisfaction at completion → Mild frustration that it took 10 minutes for a pattern he could describe in one sentence.

---

### 1.3 Yuki, the Power User

**Context:** Yuki has 20+ strategies. She just duplicated "RSI Bounce v3" to create "MACD Crossover v1." She wants to rip out the RSI logic, replace it with MACD, adjust the comparison logic, and then A/B compare this version against the original by running backtests on both and viewing results side-by-side.

**Moment-by-moment experience:**

**Minutes 0–1 — Duplication is easy, surgery is not.** She duplicates the strategy (one click from the list). Opens the copy. She sees the full RSI-based canvas. Now she needs to: delete the RSI block, delete the Compare block connected to it, delete the Constant(30) block, add a MACD block, decide which MACD output to use (macd_line, signal_line, or histogram), add a new Crossover block for MACD line vs signal line, and rewire everything to the AND block. This is 6–8 individual actions (delete, add, connect, configure) when conceptually it's one action: "swap RSI oversold condition for MACD crossover condition."

**Minutes 1–4 — Rewiring is the tax.** After deleting the old blocks (multi-select + delete, which works), she adds MACD. But MACD has three outputs (macd_line, signal_line, histogram) and she needs to connect two of them to a Crossover block. She adds the Crossover block, connects MACD's macd_line to Crossover's input_a and MACD's signal_line to input_b. She sets direction to crosses_above. Now she connects Crossover output to the AND block's first input (replacing where the old Compare output was). Each connection is a separate action. She's essentially rebuilding the signal chain by hand.

**Minutes 4–6 — A/B comparison is manual.** She runs a backtest on the new strategy. Then she navigates back to the original strategy, finds its latest backtest, and uses the Backtest Comparison View to place them side-by-side. This works, but it requires: navigate away from editor → find old strategy → find its backtest → open comparison → add new backtest. She wishes she could say "compare this against the previous version" from within the editor.

**What she'd automate if she could:**
- "Swap indicator" as a single action — select an indicator in the signal chain, pick a replacement, auto-rewire.
- "Clone and modify" with a diff view showing what changed between versions.
- Parameter sweep — "run this strategy with RSI periods 10, 14, 20, 30 and show me all results."
- Quick-toggle between strategy versions on the same canvas (version A/B overlay).

**Mental overhead she carries:**
- Remembering which version uses which parameters (she relies on strategy names and notes).
- Keeping track of which backtests correspond to which versions.
- Mentally diff-ing two canvas layouts to spot what changed.

**Core emotional arc:** Efficiency → Impatience with manual rewiring → Satisfaction when comparison confirms her hypothesis → Desire for batch operations and version-aware tools.

---

### 1.4 Shared Emotional Themes

Across all three users, four emotional currents run consistently:

1. **The translation gap.** Users think in *intent* ("enter when RSI is oversold") but the canvas speaks in *components* (Price → RSI → Compare → AND → Entry Signal). Every interaction requires translating between these two languages.

2. **Connection anxiety.** Drawing wires — whether by drag, tap-tap, or proximity — is the most error-prone and least rewarding part of the experience. Nobody gets excited about connecting ports. It's plumbing.

3. **The preview desert.** Between placing blocks and running a full backtest, there's no feedback. Users don't know if their strategy is "good" or even "working" until they commit to a backtest run and wait for results. The canvas is silent.

4. **Spatial chaos vs. narrative clarity.** A free-form graph can look like anything. Users want their strategy to *read* like a story — beginning (data), middle (logic), end (action). The canvas doesn't enforce or even suggest this narrative.

---

## Phase 2 — Define

### 2.1 Problem Statements by User Type

**Léa (Beginner):**
> "When building on the canvas, beginners need a way to understand what each block does and which number to change, because the canvas presents strategy components as an abstract circuit diagram rather than a readable description of trading intent."

**Marco (Intermediate):**
> "When building on the canvas, intermediate users need a way to express multi-condition logic without manually wiring individual blocks, because the one-block-one-wire paradigm makes common patterns (like 'enter when A AND B') tediously mechanical when the user already knows exactly what they want."

**Yuki (Power User):**
> "When building on the canvas, power users need a way to swap, compare, and iterate on strategy components as coherent units, because the current block-level granularity forces them to perform repetitive microsurgery when their mental model operates at the pattern level."

### 2.2 Synthesized Overarching Problem Statement

> **"The canvas speaks in components, but traders think in intent. When any user — beginner, intermediate, or power user — builds a strategy on the canvas, they need a way to express, read, and modify trading logic at the level of meaning ('enter when oversold and trending up') rather than at the level of plumbing ('connect RSI output port to Compare input_a port'). The gap between what the user means and what the canvas shows creates translation overhead that slows beginners, bores intermediates, and frustrates experts."**

---

## Phase 3 — Ideate

Taking the 8 most promising themes from the SCAMPER brainstorming report and crystallizing each into a concrete canvas interaction concept:

### Concept 1: Traffic Light Blocks (from M3)

**What the user sees:** Each block on the canvas has a subtle colored glow — green when its condition is currently true on the most recent candle, red when false, gray when not yet evaluated. During a "live preview" mode, the entire signal chain lights up like a pinball machine, showing which conditions are firing right now.

**What they do:** Toggle "Live Preview" from the toolbar. The canvas fetches the latest candle data for the selected asset/timeframe and evaluates every block's output. No interaction needed — the canvas animates automatically.

**How the canvas responds:** Blocks pulse with color. Wires carrying "true" signals glow brighter than "false" ones. The Entry Signal block shows a prominent "WOULD ENTER" or "WOULD NOT ENTER" badge.

**Serialization:** No change to `{blocks, connections}` JSON. Live preview is a read-only overlay computed from the latest candle data and the existing strategy definition.

### Concept 2: Strategy Health Bar (from C6)

**What the user sees:** A persistent horizontal bar at the top of the canvas with three segments: "Entry ✓" / "Exit ✗" / "Risk ⚠️". Each segment is clickable. The bar updates in real time as blocks are added or removed. Incomplete segments show a coaching prompt: "Your strategy needs an exit condition. Most traders use a Stop Loss — want to add one?"

**What they do:** Click an incomplete segment. The canvas scrolls to the relevant area and opens a contextual suggestion: "Add Stop Loss" / "Add Exit Signal" / "Add Take Profit" with one-tap placement.

**How the canvas responds:** Clicking a suggestion auto-places the recommended block, pre-connected to the appropriate upstream node. The health bar segment turns green.

**Serialization:** No schema change. The health bar reads from the same validation rules already used by `POST /strategies/{id}/validate`.

### Concept 3: Inline Parameter Editing (from S5)

**What the user sees:** Tapping a block opens a small popover *anchored to the block itself* — not a side panel. The popover contains the same controls as the Inspector (sliders, dropdowns, presets) but positioned right where the block lives on the canvas.

**What they do:** Tap a block → popover appears → adjust the slider or type a value → tap away to close. The canvas never loses focus. The Inspector Panel becomes an optional "advanced" view for users who want to see all parameters at once.

**How the canvas responds:** The block's compact label updates in real time as the popover value changes (`RSI (14)` → `RSI (25)` as the slider moves). The popover auto-positions to avoid canvas edges.

**Serialization:** No change. Parameters are written to the same `params` object in the block definition.

### Concept 4: Recipe Cards (from M2)

**What the user sees:** The Block Library includes a "Patterns" tab alongside the existing category tabs. Patterns are composite cards like "RSI Oversold Bounce," "EMA Crossover," or "Bollinger Breakout." Each card has a mini-diagram showing its internal structure (e.g., Price → RSI → Compare → Entry Signal).

**What they do:** Drag a Recipe Card onto the canvas. It expands into its constituent blocks, pre-connected and pre-configured with sensible defaults. Users can then modify any individual block as usual.

**How the canvas responds:** The dropped card animates into a cluster of connected blocks with a subtle group outline. The outline fades after a few seconds, but users can re-select the group to move or delete it as a unit.

**Serialization:** Recipe Cards decompose into standard `{blocks, connections}` on placement. No new schema. The card metadata (which template it came from) can optionally be stored in block metadata but is not required.

### Concept 5: Embedded Logic in Signal Blocks (from E4)

**What the user sees:** The Entry Signal block has a built-in condition list instead of a single boolean input. It shows: "Enter when ALL of these are true: [Condition 1 ▼] [Condition 2 ▼] [+ Add condition]." Each condition slot is a dropdown that references an upstream indicator or comparison. A toggle switches between ALL (AND) and ANY (OR).

**What they do:** Click "+ Add condition" → select from available upstream outputs (e.g., "RSI < 30," "EMA 12 crossed above EMA 26"). The signal block wires itself to those outputs automatically. No separate AND/OR/Compare blocks needed for simple cases.

**How the canvas responds:** The Entry Signal block expands vertically to show its condition list. Wires from source blocks connect automatically. The AND/OR toggle changes the block's internal logic.

**Serialization:** Requires a schema extension. The `entry_signal` block gains an optional `conditions` array: `[{source_block_id, source_port, operator, value, logic: "and"|"or"}]`. The backtest interpreter treats this as equivalent to explicit AND/OR wiring. Backward compatibility: existing strategies with explicit logic blocks continue to work unchanged.

### Concept 6: Candle-by-Candle Debugger (from P2)

**What the user sees:** After running a backtest, a "Replay" button appears on the canvas. Clicking it adds a timeline scrubber at the bottom of the canvas. Each block now shows its computed value for the current candle: `RSI = 28.4`, `Compare(< 30) = TRUE`, `Entry Signal = ACTIVE`.

**What they do:** Drag the timeline scrubber forward and backward through the backtest period. Watch values update on every block. See exactly when and why the strategy entered and exited positions. Click a trade marker on the timeline to jump to that candle.

**How the canvas responds:** Blocks display computed values as overlaid badges. Wires carrying "true" signals highlight. Trade entry/exit points are marked on the timeline. The canvas becomes a step-through debugger for strategy logic.

**Serialization:** No schema change. The debugger reads from existing backtest trade data and equity curve. Block values are computed on-the-fly from the candle data used in the backtest (already stored).

### Concept 7: Proximity Snap Connections (from S1)

**What the user sees:** When dragging a block near a compatible port on another block, a magnetic "snap zone" activates — the port glows, a preview wire appears, and releasing the block within the zone auto-connects them. No need to precisely target a small port circle.

**What they do:** Drag a Compare block near an RSI block's output. The RSI output port glows blue. Release. The connection is made. If multiple ports are compatible, the nearest one wins, with a disambiguation popup if two are equidistant.

**How the canvas responds:** Snap zones are invisible until a block enters them. The preview wire is dashed and semi-transparent until the connection is confirmed. A subtle haptic pulse (on mobile) confirms the snap.

**Serialization:** No change. Connections are stored identically to manually drawn wires.

### Concept 8: Narrative-First Strategy View (from M1)

**What the user sees:** A toggle in the canvas toolbar switches between "Canvas View" (blocks and wires) and "Strategy View" (a plain-English paragraph). The paragraph reads: "This strategy watches BTC/USDT on the daily chart. When the 14-period RSI drops below 25 AND price crosses above the 50-day EMA, it enters a long position using 80% of equity. It exits with a 3% trailing stop." Each clause is clickable — tapping highlights the corresponding blocks on the canvas.

**What they do:** Read the strategy as a paragraph. Click a clause to see which blocks implement it. Toggle back to canvas view to make changes. The narrative updates automatically when blocks are modified.

**How the canvas responds:** In narrative view, the canvas dims and the paragraph overlays it. Clicking a clause causes the canvas to zoom and highlight the relevant blocks underneath. Switching back to canvas view restores full interactivity.

**Serialization:** No change. The narrative is generated deterministically from the existing `{blocks, connections}` definition using the same engine as the Strategy Explanation Generator (already implemented).

---

## Phase 4 — Prototype

### Prototype A: "Guided Zones" — Structured Canvas with Implicit Flow

**Layout paradigm:** Zoned. The canvas is divided into four horizontal swim lanes, always visible: **Data & Indicators** (top) → **Entry Logic** (upper-middle) → **Exit Logic** (lower-middle) → **Risk Management** (bottom). Each zone has a subtle label and background tint. Blocks can only be placed in their appropriate zone (enforced by block category). Within a zone, blocks auto-arrange in a grid.

**Connection model:** Hybrid. Connections *between* zones are implicit — an RSI block in the Indicators zone automatically feeds into any Compare block in the Entry Logic zone that references it. Connections *within* a zone (e.g., Price → SMA) use proximity snapping. Cross-zone wires are rendered as flowing "data rivers" (animated dots) rather than static lines.

**Parameter editing:** Inline popovers anchored to blocks. No Inspector Panel. Long-press for advanced options in a modal.

**Reading order:** Top-to-bottom, left-to-right within each zone. A stranger reads: "Data sources and indicators at top. Entry conditions in the middle. Exit rules below. Risk limits at the bottom." The zones ARE the narrative structure.

**Key tradeoff:** Constrains spatial freedom — power users who want arbitrary layouts can't have them. Gains enormous clarity for beginners and intermediates at the cost of flexibility for the 5% who want free-form.

---

### Prototype B: "Narrative Canvas" — Story-First with Visual Backing

**Layout paradigm:** Hybrid. The primary interface is a structured sentence/paragraph that users build by filling slots: "When [condition group] → Enter long. Exit when [exit conditions]. Risk: [risk rules]." Below the sentence builder, a secondary canvas pane shows the corresponding blocks and wires, auto-generated and auto-laid-out. Users can edit from either surface — changes sync bidirectionally.

**Connection model:** Auto-inferred from the sentence structure. Selecting "RSI < 30" in a condition slot automatically creates and connects the RSI, Compare, and Constant blocks. No manual wiring in the sentence view. The canvas pane below allows manual wiring for advanced overrides.

**Parameter editing:** Inline in the sentence. Clicking "RSI" in the sentence "When RSI(14) < 30" opens a popover to change the period. Clicking "30" opens a number input. The canvas blocks update simultaneously.

**Reading order:** The sentence IS the reading order. It reads like English: "When RSI drops below 25 AND EMA(12) crosses above EMA(26), enter long with 75% of equity. Exit with a 3% trailing stop." The canvas below is a reference diagram, not the primary surface.

**Key tradeoff:** The sentence builder can only express strategies that fit a template structure (condition AND/OR condition → entry, exit rules, risk rules). Unusual or complex topologies (e.g., cascaded logic, multi-output indicators feeding different signal chains) require dropping into the canvas pane. This covers 80%+ of strategies but limits the remaining 20%.

---

### Prototype C: "Smart Blocks" — Enhanced Free-Form with Intelligence

**Layout paradigm:** Free-form (same as today) with two key additions: (1) a persistent Strategy Health Bar at the top that coaches completeness, and (2) an auto-layout that activates on every block addition by default (toggleable). The canvas retains full spatial freedom but actively helps users stay organized.

**Connection model:** Proximity snapping replaces precision wire-drawing. Dragging a block near a compatible port auto-connects. Existing tap-tap mobile connections remain as fallback. Signal blocks gain embedded condition lists (Concept 5) so simple AND/OR logic doesn't require separate blocks. Explicit logic blocks remain available for complex cases.

**Parameter editing:** Dual mode. Default: inline popover on block tap (Concept 3). Optional: Inspector Panel available via a "Details" button on the popover for users who want the full form. The Inspector remains in the codebase but is no longer the primary editing surface.

**Reading order:** Left-to-right by default (auto-layout enforces this). The Strategy Health Bar provides a structural summary. The Narrative View toggle (Concept 8) provides a plain-English readback. Users who disable auto-layout get free-form placement.

**Key tradeoff:** This is an evolutionary approach, not a revolution. It preserves backward compatibility and doesn't force any user to change their workflow. The risk is that it doesn't go far enough — the fundamental "blocks and wires" paradigm remains, and the improvements (snapping, inline editing, health bar) are additive polish rather than a paradigm shift. It may not close the translation gap for beginners as effectively as Prototypes A or B.

---

## Phase 5 — Test

### 5.1 Prototype A: Guided Zones

**Measurable usability metrics:**
1. **Time to first valid strategy (new users):** Measure seconds from canvas load to successful validation. Target: <120 seconds (vs. current estimated 300+ seconds for beginners).
2. **Connection error rate:** Percentage of attempts to connect blocks that result in an invalid or unintended connection. Target: <5% (proximity snapping + zone constraints should prevent most errors).
3. **Blocks placed before first backtest run:** Count of blocks added to reach a testable strategy. Fewer blocks implies the zones and implicit connections reduce manual setup. Target: <8 blocks for a simple RSI strategy.

**Qualitative questions:**
1. "When you look at the canvas, can you tell me in your own words what your strategy does?" (Tests whether zones communicate narrative structure.)
2. "Was there a moment where you felt stuck or unsure what to do next?" (Identifies remaining friction points within the constrained layout.)

**Differentiating scenario:** Ask a beginner to modify a wizard-generated strategy by adding a second entry condition (e.g., "also require EMA crossover"). If zones guide them to the Entry Logic lane and proximity snapping handles the connection, this prototype wins on discoverability. If they struggle to understand how conditions combine within the zone, it loses.

---

### 5.2 Prototype B: Narrative Canvas

**Measurable usability metrics:**
1. **Strategy description accuracy:** After building, ask the user to describe their strategy. Measure how closely their description matches the actual strategy logic. Target: >90% semantic accuracy (the sentence builder should make the strategy self-documenting).
2. **Time to modify one parameter:** Measure seconds from "I want to change the RSI threshold" to the value being updated and saved. Target: <5 seconds (inline sentence editing should be faster than navigating to an Inspector Panel).
3. **Percentage of strategies built entirely in sentence view:** Tracks how often users drop into the canvas pane. Target: >70% (indicates the sentence builder is expressive enough for most strategies).

**Qualitative questions:**
1. "Did you feel like you were writing a trading plan or assembling a diagram?" (Tests whether the narrative framing shifts mental model from engineering to strategy.)
2. "Was there anything you wanted to do that the sentence builder couldn't express?" (Identifies the 20% of cases that require canvas fallback.)

**Differentiating scenario:** Ask an intermediate user to build a strategy with three entry conditions combined with mixed logic (A AND (B OR C)). If the sentence builder can express this clearly, this prototype wins on expressiveness. If the user has to drop into the canvas pane to wire the nested logic, the narrative paradigm has a ceiling.

---

### 5.3 Prototype C: Smart Blocks

**Measurable usability metrics:**
1. **Average connections drawn manually per strategy:** Count of explicit user-initiated connection actions (not auto-connections from proximity snapping or embedded signal conditions). Target: <5 for a strategy with 10+ blocks (down from current 10+ manual connections).
2. **Inspector Panel open rate:** Percentage of parameter edits that go through the Inspector Panel vs. inline popover. Target: <20% Inspector usage (indicates inline editing is preferred and sufficient).
3. **Health Bar interaction rate:** Percentage of users who click a Health Bar segment to add a missing component. Target: >50% of beginners use it at least once (indicates it's discoverable and useful).

**Qualitative questions:**
1. "What did the colored bar at the top of the canvas mean to you?" (Tests whether the Health Bar communicates strategy completeness.)
2. "Compared to the last time you used the canvas, what felt different?" (For returning users, identifies perceived improvement magnitude.)

**Differentiating scenario:** Ask a power user to duplicate a strategy, swap the entry indicator (RSI → MACD), and run a comparison backtest. If embedded signal conditions and proximity snapping reduce the "surgery" steps significantly, this prototype wins on iteration speed. If the user still performs roughly the same number of actions as today, the improvements are cosmetic.

---

## Phase 6 — Implement (Prototype C: Smart Blocks)

Prototype C is selected for implementation analysis because it offers the best balance of impact, feasibility, and migration safety. (See Recommendation section for full reasoning.)

### 6.1 What Can Be Built Within React Flow's Node/Edge Model

**Fully compatible — no React Flow fork needed:**

- **Proximity snapping:** React Flow's `onConnect`, `onConnectStart`, and `onConnectEnd` handlers can detect port proximity during drag events. Custom connection logic can auto-connect when a dragged node's input port enters a threshold distance from a compatible output port. The `isValidConnection` prop already supports type-checking compatibility. Adding a "snap zone" visual (glowing port) is a custom node rendering concern, not a React Flow limitation.

- **Inline popovers:** React Flow nodes are standard React components. A popover can be rendered as part of the node's JSX, triggered by click/tap, and positioned relative to the node using the node's position data. Libraries like Radix UI or the existing shadcn/ui Popover component work within React Flow nodes. No fork needed.

- **Strategy Health Bar:** This is a UI component *outside* the React Flow canvas — positioned absolutely above it. It reads from the same validation state already computed by the frontend. No interaction with React Flow's internals at all.

- **Narrative View toggle:** This replaces the React Flow canvas area with a text component when active. React Flow can be conditionally rendered or hidden. The narrative text is generated from the strategy definition JSON (same as the existing Strategy Explanation Generator). Clicking a clause uses `reactFlowInstance.setCenter()` to zoom to the relevant node when switching back.

- **Traffic Light block overlays:** Custom node components can render colored borders, glowing backgrounds, or badge overlays based on props. A "live preview" mode passes computed values as node data, and the custom node component renders accordingly. React Flow's `setNodes` can update node data without re-rendering the entire canvas.

- **Candle-by-candle debugger:** The timeline scrubber is a standard UI component below the canvas. Scrubbing updates node data (computed values per block) via `setNodes`. React Flow handles re-rendering efficiently. Highlighted wires can use React Flow's `animated` edge prop or custom edge components with conditional styling.

**Requires careful implementation but no fork:**

- **Embedded condition lists in signal blocks:** Entry Signal blocks become taller, dynamically-sized nodes. React Flow supports variable-height nodes, but auto-layout and edge routing may need adjustment when a signal block expands from one line to four. The `nodeTypes` registry allows custom components of any complexity.

- **Recipe Card expansion animation:** Dropping a recipe card that "explodes" into multiple connected nodes requires programmatically adding multiple nodes and edges in a single transaction via `setNodes` and `setEdges`. React Flow supports this, but smooth animation of the expansion requires custom transition logic (CSS transitions on node positions after the batch update).

### 6.2 Changes to `{blocks, connections}` JSON Schema

**No breaking changes required.** All enhancements are backward-compatible extensions:

**Extension 1 — Embedded conditions on signal blocks (optional):**
```json
{
  "id": "entry_1",
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
If `conditions` is present, the backtest interpreter uses it instead of following inbound connections. If absent (legacy strategies), the interpreter follows connections as today. This is purely additive.

**Extension 2 — Recipe Card origin metadata (optional, non-functional):**
```json
{
  "id": "rsi_1",
  "type": "rsi",
  "params": {"period": 14},
  "metadata": {
    "recipe_source": "rsi_oversold_bounce",
    "recipe_placed_at": "2026-03-09T12:00:00Z"
  }
}
```
The `metadata` field is ignored by the interpreter. It exists only for UI grouping hints and analytics. Optional and backward-compatible.

**No other schema changes.** Proximity snapping, inline editing, Health Bar, Narrative View, Traffic Lights, and the debugger all operate on the existing schema without modification.

### 6.3 Feature Survival Assessment

| Existing Feature | Status | Notes |
|---|---|---|
| React Flow canvas with drag-drop | **Survives as-is** | Core substrate unchanged |
| 20 block types (6 categories) | **Survives as-is** | No blocks added or removed |
| Block Library Bottom Sheet | **Survives, extended** | Add a "Patterns" tab for Recipe Cards |
| Inspector Panel | **Survives, demoted** | Becomes secondary to inline popovers; still accessible via "Details" button |
| Compact/Expanded node display | **Survives as-is** | Compact mode is compatible with inline popovers |
| Minimap | **Survives as-is** | Works with all new features |
| Auto-layout | **Survives, enhanced** | Consider making it activate on block addition by default (toggleable) |
| Undo/redo | **Survives as-is** | Must include proximity-snap connections and inline edits in the history stack |
| Copy/paste blocks | **Survives as-is** | Recipe Cards decompose into standard blocks on paste |
| Keyboard shortcuts | **Survives as-is** | No conflicts with new features |
| Autosave | **Survives as-is** | Inline edits trigger the same autosave debounce |
| Visual validation feedback | **Survives, enhanced** | Health Bar adds proactive guidance on top of reactive feedback |
| Connection drawing (drag/tap-tap) | **Adapted** | Proximity snapping becomes primary; manual draw and tap-tap remain as fallbacks |
| Essentials-first palette toggle | **Survives as-is** | Recipe Cards complement Essentials mode |
| Plain-English indicator labels | **Survives as-is** | Narrative View extends this to full strategy descriptions |
| Strategy Explanation Generator | **Adapted** | Becomes the rendering engine for Narrative View (promoted from hidden feature to primary toggle) |
| Strategy Notes/Annotations | **Survives as-is** | Notes coexist with all new features |
| Mobile bottom action bar | **Survives, extended** | Add Live Preview and Narrative View toggles |
| Explicit AND/OR/NOT blocks | **Survives as-is** | Remain available for complex logic; embedded conditions handle simple cases |

**Nothing becomes obsolete.** This is the advantage of the evolutionary approach — all existing features continue to function. The risk is feature surface area growth.

### 6.4 Migration Path for Existing Strategies

**No migration needed.** Existing strategies in the current `{blocks, connections}` format work identically:

1. **Schema backward compatibility:** The interpreter checks for the optional `conditions` field on signal blocks. If absent, it follows connections as before. Existing strategies never have `conditions`, so they execute identically.

2. **UI backward compatibility:** Existing blocks render in the same custom node components. Inline popovers are additive — they appear when you tap a block, but the Inspector Panel remains accessible. Proximity snapping is additive — existing manual connections are preserved.

3. **No data migration:** No Alembic migration needed for the strategy definition JSON stored in `strategy_versions.definition_json`. The JSON structure is extended, not changed. PostgreSQL's JSON type accepts the new optional fields without schema modification.

4. **Progressive adoption:** Users encounter new features organically:
   - Inline popovers appear on next block tap (no opt-in).
   - Health Bar appears on next canvas load (dismissible).
   - Recipe Cards appear in the Block Library on next open.
   - Proximity snapping activates on next connection attempt.
   - Narrative View and Traffic Lights are toggle-based (opt-in).

---

## Recommendation

### Ranking

| Rank | Prototype | Verdict |
|---|---|---|
| **1** | **C — Smart Blocks** | Build this. |
| **2** | B — Narrative Canvas | Valuable ideas; cherry-pick the sentence builder as a future layer on top of Prototype C. |
| **3** | A — Guided Zones | Too constraining for the current user base; revisit if Blockbuilders launches a dedicated "beginner mode" product. |

### Reasoning

**Prototype C wins on three axes simultaneously:**

1. **Feasibility.** Every feature in Prototype C can be built within React Flow's existing node/edge model without forking or replacing the library. The `{blocks, connections}` schema requires only additive optional extensions. No data migration is needed. Existing features survive intact. The implementation is a series of independent, shippable increments — not a rewrite.

2. **Impact breadth.** Prototype C addresses all three user types from the empathy maps: beginners get the Health Bar (proactive guidance), inline editing (no Inspector context switch), and Narrative View (readable strategy summary). Intermediates get proximity snapping (faster wiring), Recipe Cards (common patterns as single units), and embedded signal conditions (less logic-block plumbing). Power users get Traffic Light live preview (instant feedback), the candle-by-candle debugger (deep understanding), and the same iteration speed improvements.

3. **Migration safety.** Prototype C is the only option with zero breaking changes. Prototypes A and B require fundamentally different canvas paradigms — A imposes zone constraints that would need to retroactively classify every existing block into a lane, and B requires translating existing block-wire graphs into sentence structures that may not always have a clean mapping. Prototype C lets every existing strategy open and function identically on day one.

**Why not Prototype B?** The Narrative Canvas is the most intellectually exciting option and may represent the long-term future of strategy authoring. However, it has a critical coverage gap: strategies with complex or unusual topologies (cascaded indicators, multi-output blocks feeding different signal chains, non-standard exit logic combinations) don't fit cleanly into a sentence template. Building the sentence builder is also a significant frontend effort with a new editing paradigm that needs its own testing and iteration cycle. The better path: build Prototype C now, then layer the Narrative View toggle (already in Prototype C) as the seed of a sentence-based editing mode in a future phase. The narrative engine already exists (Strategy Explanation Generator) — promoting it to a primary view is straightforward. Making it *editable* is the hard part, and that can be tackled later with confidence that the underlying block model is solid.

**Why not Prototype A?** Guided Zones would be a strong choice for a greenfield product targeting only beginners. But Blockbuilders already has 20 block types, power users building their 20th strategy variant, and a mature canvas feature set. Imposing zone constraints would frustrate the existing user base and require significant rework of the auto-layout system, block placement logic, and the mental model that returning users have already built. The zone concept could work as an optional "Beginner Canvas Mode" in the future, but as the primary paradigm, it's too limiting.

### Recommended Implementation Order

Phase the work into independent, shippable increments:

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1 | **Strategy Health Bar** | Small | High — proactive coaching, builds on existing validation |
| 2 | **Inline parameter popovers** | Medium | High — eliminates Inspector context switch for most edits |
| 3 | **Proximity snap connections** | Medium | High — biggest UX win for mobile and reduces connection errors |
| 4 | **Narrative View toggle** | Small | Medium — promotes existing explanation generator to primary view |
| 5 | **Recipe Cards in Block Library** | Medium | Medium — reduces block count for common patterns |
| 6 | **Traffic Light live preview** | Medium | High — closes the "preview desert" gap |
| 7 | **Embedded conditions in signal blocks** | Large | Medium — reduces logic block plumbing but requires interpreter changes |
| 8 | **Candle-by-candle debugger** | Large | High — killer differentiator but highest complexity |

---

*Session complete. Three users empathized. One overarching problem defined. Eight interaction concepts crystallized. Three prototypes specified. Test plans designed. Implementation assessed. Prototype C recommended with an eight-phase rollout.*

*"People ignore design that ignores people." — Frank Chimero*
