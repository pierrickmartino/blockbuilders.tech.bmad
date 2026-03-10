# Problem Solving Report: Canvas Interaction Bottlenecks & Design Principles

**Session:** Systematic Problem Analysis — Visual Strategy Canvas
**Analyst:** Dr. Quinn (Creative Problem Solver)
**Date:** 2026-03-09
**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Inputs:** SCAMPER Brainstorming Report (43 ideas), Design Thinking Canvas Report (3 prototypes), Product Documentation (current architecture)

---

## Preamble

The evidence from both prior sessions converges on a single, recurring signal: the canvas speaks in plumbing, but traders think in intent. This report applies four systematic problem-solving methods to crack open that signal, find the root mechanisms, and derive actionable design principles. No surface explanation accepted. Every chain digs until it hits bedrock.

---

## Method 1 — Root Cause Analysis (5 Whys)

### Problem 1: "Beginners don't know which blocks to use or in what order"

**Why #1:** Because the Block Library presents 20 block types organized by technical category (Input, Indicator, Logic, Signal, Risk) rather than by trading intent.
**Why #2:** Because the category system reflects the *interpreter's computational taxonomy* (how the engine processes blocks), not the *trader's mental model* (what decision am I making?).
**Why #3:** Because the canvas was designed outward from the backtest engine's needs — the serialization format `{blocks, connections}` dictated the UI vocabulary, not the other way around.
**Why #4:** Because there was no intermediate abstraction layer between "what the trader means" and "what the interpreter consumes." The UI is a direct visual projection of the interpreter's data model.
**Why #5:** Because the system treats the strategy definition as a single representation that must serve two masters — human authoring and machine execution — with no translation layer between them.

**ROOT CAUSE:** The canvas UI is a direct visual projection of the interpreter's internal data model. There is no intent-to-implementation translation layer. The trader is forced to think in the engine's language instead of their own.

**Design Principle → "Intent Layer First":** Insert an abstraction between trading intent and engine plumbing. The user should express *what they want to happen* ("enter when oversold and trending up"); the system should translate that into blocks, connections, and parameters. The canvas becomes a visualization of the translation, not the authoring surface itself.

---

### Problem 2: "Users make invalid connections and don't understand why until validation fails"

**Why #1:** Because validation is a batch operation triggered after construction is complete, not a continuous constraint during construction.
**Why #2:** Because the connection model allows any port-to-port link to be drawn before type-checking occurs — the canvas permits the action, then retroactively rejects it.
**Why #3:** Because React Flow's default connection model is permissive by design — it's a general-purpose graph editor, not a typed signal-flow tool. The `isValidConnection` guard exists but only fires *during* the drag, not as a preventive constraint on what's even draggable.
**Why #4:** Because the block port system uses generic input/output semantics rather than encoding type compatibility into the visual affordance of the port itself. A boolean port looks identical to a numeric port. A price-array port looks identical to an RSI-array port.
**Why #5:** Because the system relies on *rejection after action* rather than *prevention through affordance*. The user must learn the type system by trial and error, not by visual inspection.

**ROOT CAUSE:** The connection system is permissive-then-punitive instead of constrained-by-design. Ports lack visual type encoding, so users cannot predict valid connections from appearance alone. Errors are discovered after the fact rather than made impossible in advance.

**Design Principle → "Make Invalidity Impossible, Not Merely Detectable":** Encode type compatibility directly into visual affordances — port shapes, colors, snap zones that only activate for compatible types. The goal is that a user can *never* complete an invalid connection, because the interface physically prevents it. Validation shifts from retroactive error reporting to proactive impossibility of error.

---

### Problem 3: "The canvas doesn't communicate what the strategy will do"

**Why #1:** Because the canvas is a static graph with no runtime data flowing through it. Until a backtest runs, every block is inert.
**Why #2:** Because there is a hard temporal boundary between "authoring mode" (canvas) and "evaluation mode" (backtest). You build in silence, then you run and wait.
**Why #3:** Because fetching and evaluating live candle data per block would require the frontend to replicate indicator computation — a capability that currently lives exclusively in the Python backend interpreter.
**Why #4:** Because the architecture draws a clean separation between frontend (presentation) and backend (computation), with no lightweight evaluation path that could run in the browser for preview purposes.
**Why #5:** Because the system was designed for correctness of batch execution, not for continuous feedback during authoring. Preview and execution were treated as the same problem with the same cost, rather than recognizing that approximate, partial, delayed preview is vastly more valuable than no preview at all.

**ROOT CAUSE:** The system conflates "preview" with "execution." Because full backtesting is expensive and server-side, and no lightweight preview path exists, the canvas operates in a feedback vacuum. The user builds blind until they commit to a full backtest.

**Design Principle → "Continuous Partial Feedback":** Build a lightweight, approximate evaluation path that can show *something* during authoring — even if it's just the current candle's values flowing through blocks, or a cached recent evaluation overlaid on the graph. Perfect accuracy is not required for preview; directional correctness is sufficient. The cost of approximate feedback is trivially small compared to the cost of zero feedback.

---

### Problem 4: "Parameter configuration feels disconnected from the canvas context"

**Why #1:** Because tapping a block opens the Inspector Panel in a different screen region (side panel or bottom sheet), forcing a visual context switch away from the block being edited.
**Why #2:** Because the Inspector Panel was designed as a universal form renderer — it works for any block type by reflecting its parameter schema — but it has no awareness of the block's spatial context on the canvas.
**Why #3:** Because parameter editing was modeled after IDE property panels (VS Code, Figma), where a separate panel is the norm. But those tools operate on *selected objects in a familiar medium*; here, the blocks themselves are unfamiliar, so losing spatial context during editing is disorienting.
**Why #4:** Because the feedback loop between "change a parameter" and "see the effect" requires a full backtest round-trip. Changing RSI period from 14 to 25 produces no immediate visual consequence — the block label updates, but nothing else changes. The edit feels abstract because it *is* abstract — it has no visible result.
**Why #5:** Because the system has no mechanism to show the *meaning* of a parameter value in situ. "RSI period 14" is just a number. The user has no way to see, on the canvas itself, what RSI(14) looks like on their chosen asset — how fast it oscillates, where it was recently, whether 14 vs. 25 produces materially different signals.

**ROOT CAUSE:** Parameter editing is spatially and semantically disconnected from its consequences. The edit happens in one place (panel), the block lives in another (canvas), and the effect is invisible until a separate operation (backtest) is invoked. Three disconnections compound into one experience: "I changed a number and nothing happened."

**Design Principle → "Edit Where You See, See What You Changed":** Parameters should be edited inline on the block itself (spatial connection), and the block should immediately reflect the parameter's effect — even if only as a sparkline, a range indicator, or a textual interpretation ("Short-term momentum — oscillates faster, more signals"). Editing a parameter should produce a visible consequence within 500ms, on the block, without leaving the canvas.

---

### Problem 5: "Mobile canvas use feels like a compromise rather than a designed experience"

**Why #1:** Because the mobile canvas is a responsive adaptation of the desktop canvas — same interaction paradigm (drag, connect, inspect) scaled down to a smaller viewport.
**Why #2:** Because the fundamental interaction unit on desktop is "precise pointer on a large surface," while on mobile it's "imprecise finger on a small surface." Scaling one to the other doesn't change the interaction *paradigm*, only the *precision*.
**Why #3:** Because the canvas metaphor itself — a 2D spatial graph with nodes and edges — is inherently a large-surface concept. A graph that requires panning to see, zooming to target, and precision to connect is fighting the medium on a phone.
**Why #4:** Because the mobile experience was designed as a *subset* of desktop (remove features, enlarge targets, add gestures) rather than as an *alternative representation* of the same underlying strategy.
**Why #5:** Because the system assumes the canvas IS the strategy, rather than recognizing that the canvas is one *projection* of the strategy. On a phone, a different projection — a card stack, a sentence builder, a linear flow — could represent the identical `{blocks, connections}` JSON far more naturally.

**ROOT CAUSE:** Mobile is treated as a degraded desktop rather than a first-class form factor with its own optimal representation. The canvas graph metaphor is intrinsically hostile to small-screen, touch-first interaction, and no alternative projection of the strategy data model exists.

**Design Principle → "One Model, Multiple Projections":** The strategy definition (`{blocks, connections}` JSON) is the source of truth. The canvas graph is one projection. A sentence builder is another. A card stack is another. Each projection is optimized for its medium. Mobile doesn't get a shrunken canvas — it gets a representation designed for fingers and small screens, backed by the same data model that the desktop canvas uses.

---

## Method 2 — Theory of Constraints

### The Pipeline

```
Stage 1          Stage 2         Stage 3        Stage 4          Stage 5          Stage 6         Stage 7                Stage 8
Understand   →   Choose      →   Place on   →   Connect      →   Configure    →   Validate    →   Comprehend the     →   Run
what's           blocks          canvas         blocks           parameters                       whole strategy         backtest
possible
```

### Bottleneck Map by User Type

| Stage | Beginner | Intermediate | Power User |
|-------|----------|--------------|------------|
| 1. Understand what's possible | **BLOCKED** — doesn't know what blocks exist or what they do | Smooth — knows indicator concepts | Smooth — knows everything |
| 2. Choose blocks | **BLOCKED** — overwhelmed by 20 options, can't map intent to block type | Moderate friction — knows what to search for, but hunting through categories | Smooth — knows exactly what to grab |
| 3. Place on canvas | Low friction | Low friction | Low friction |
| 4. Connect blocks | **BLOCKED** — doesn't understand port types, makes invalid connections | **BOTTLENECK** — tedious repetition, "plumbing" | Moderate friction — repetitive microsurgery |
| 5. Configure parameters | High friction — doesn't know what numbers to pick | Low friction — knows parameter ranges | Low friction |
| 6. Validate | Moderate — confusing error messages | Low friction | Low friction |
| 7. Comprehend whole strategy | **BLOCKED** — can't "read" the graph as a trading plan | **BOTTLENECK** — must trace wires mentally to verify intent | Moderate — must trace complex graphs |
| 8. Run backtest | Low friction (single button) | Low friction | Low friction |

### The Single Constraint

**Stage 4 (Connect Blocks)** is the throughput bottleneck that constrains the majority of users. Here's why:

For **beginners**, stages 1–2 are also blocked, but those are solvable with progressive disclosure (the Essentials palette already exists, the wizard already works). The moment a beginner gets past choosing blocks, connection is where they hit an unrecoverable wall — they cannot predict which ports are compatible, they draw invalid wires, and validation punishes them after the fact.

For **intermediates** — the largest active user cohort — connection is unambiguously the bottleneck. They know what they want. They can find blocks fast. But wiring A → B → C → AND → Entry Signal is five to eight separate manual actions for a pattern they could describe in one sentence. Every strategy requires traversing this bottleneck, and it scales linearly with strategy complexity.

For **power users**, connection is still the friction point when performing surgery (swap indicator, rewire signal chain), even though they navigate it competently.

**Relieving the connection bottleneck improves throughput for all three user types simultaneously.** No other single stage has this property.

### Three Ways to Relieve the Constraint

**Relief 1 — Implicit Connection by Proximity and Type (eliminate the action).**
When a block is placed near a compatible upstream block, the connection forms automatically. The system infers topology from spatial proximity and type compatibility. The user's job shifts from "draw wires" to "arrange blocks" — and auto-layout can even handle the arrangement. This eliminates the bottleneck action entirely for simple strategies and reduces it to edge-case overrides for complex ones.

**Relief 2 — Pattern-Level Placement (batch past the bottleneck).**
Recipe Cards / composite patterns let the user place "RSI Oversold Bounce" as a single action, which expands into 4 pre-connected blocks. The user skips the bottleneck for every common pattern. Instead of connecting one block at a time, they place one card that represents five connections. This doesn't eliminate the bottleneck — it batches past it.

**Relief 3 — Embedded Logic in Signal Blocks (remove the most painful connections).**
The AND/OR/Compare/Constant blocks exist solely to wire logic between indicators and signals. Embedding a condition list directly in the Entry/Exit Signal block eliminates the most confusing connection category — logic wiring — for the majority of strategies. The user says "Enter when RSI < 30 AND EMA crossover" inside the signal block; the system creates the internal connections. This removes the highest-friction subset of connections (logic plumbing) while preserving explicit wiring for advanced cases.

**Recommended combination:** Apply all three. Relief 1 handles spatial connection. Relief 2 handles common patterns. Relief 3 handles logic complexity. Together, they reduce manual connection actions from ~10 per strategy to ~1–2 edge-case overrides.

---

## Method 3 — TRIZ Contradiction Analysis

### Contradiction 1: Free-form vs. Structured

**The canvas should be free-form** (drag anywhere, creative spatial expression) **AND structured** (enforce valid signal flow, prevent errors).

**TRIZ Principle Applied: #1 — Segmentation + #15 — Dynamization.**
Segment the canvas into soft zones (Data, Indicators, Logic, Signals, Risk) that provide structure but are not rigid walls. Zones are visual guides — tinted background lanes with labels — that suggest where blocks should live. Auto-layout defaults to placing blocks in their appropriate zone. However, the user *can* drag blocks anywhere; the zone system is advisory, not enforced. When a block is outside its natural zone, a subtle visual cue (dimmed label, dotted outline) indicates it's out of place, but the action isn't blocked.

**Dynamization** means the level of structure adapts to the user. A new user sees strong zone guides (visible labels, snap-to-zone on drop). A returning user who has toggled "free layout" in preferences sees faint zone lines. A power user who disables zones entirely gets a blank canvas. The structure is a spectrum, not a binary.

**Resolution:** Soft advisory zones that default to structured but yield to user intent. Structure is a default, not a constraint. The canvas starts opinionated and becomes permissive as the user demonstrates competence.

---

### Contradiction 2: Comprehensive vs. Simple

**The canvas should be comprehensive** (20 block types, all indicators, full flexibility) **AND simple** (feel like 5 concepts, not 20 options).

**TRIZ Principle Applied: #5 — Merging + #3 — Local Quality.**
Merge blocks into higher-level composites (Recipe Cards) that present as single concepts but decompose into constituent blocks when expanded. "RSI Oversold Bounce" feels like one concept. It *is* four blocks. The user sees the concept; the system manages the blocks. This is merging.

Local Quality means different users see different levels of resolution at the same time. The Essentials palette (already implemented) shows 5 indicators. The full palette shows 20 blocks. Recipe Cards show ~8 common patterns. Each "view" of the block library is locally appropriate for its audience. The underlying system is comprehensive; the surface presented to each user is simple.

**Resolution:** Layered abstraction — concepts (Recipe Cards) on top, blocks underneath. Essentials mode for beginners, full mode for power users, pattern mode for intermediates. The system is always 20 blocks; the user sees 5, 8, or 20 depending on their chosen resolution level.

---

### Contradiction 3: Visual vs. Executable

**The canvas should be visual** (the canvas IS the strategy representation) **AND executable** (what you see must map precisely to what the engine runs).

**TRIZ Principle Applied: #32 — Color Changes + #28 — Replace Mechanical System.**
Use color, animation, and dynamic visual overlays to bridge the gap between static visual representation and dynamic execution behavior. Traffic Light blocks (green/red glow based on current candle evaluation) make the visual representation *partially executable* — you can see the strategy "thinking" without running a full backtest. Animated data-flow dots along wires show signal direction and state.

Replace the mechanical (static, structural) representation with an informational one: the Narrative View toggle translates the visual graph into a plain-English paragraph that reads as an executable specification. "When RSI drops below 30 AND price crosses above EMA(50), enter long." This narrative is generated deterministically from the same JSON the engine consumes — so it is, by construction, a faithful representation of what the engine will run. The visual and the narrative are two renderings of the same executable truth.

**Resolution:** Make the visual representation dynamic (live evaluation overlays) and provide a parallel textual representation (Narrative View) that is provably equivalent to the executable definition. The user can cross-reference visual and textual to build confidence that what they see is what will run.

---

### Contradiction 4: Self-contained blocks vs. Context-aware flow

**Blocks should be self-contained** (each block understandable alone) **AND context-aware** (blocks gain meaning from their connections and position).

**TRIZ Principle Applied: #17 — Another Dimension + #24 — Intermediary.**
Add another dimension of information to each block: an inline annotation layer that shows the block's *role in the strategy*, not just its *type*. An RSI block standing alone says "RSI (14)." An RSI block connected into an entry signal chain says "RSI (14) — Entry condition: oversold detector." The annotation is computed from the block's position in the connection graph and displayed as a subtitle. The block is self-contained (you can read its type and parameters in isolation) AND context-aware (its role annotation tells you why it's there).

The intermediary is the Strategy Explanation Generator, which already computes a plain-English description of the strategy. Extend it to generate per-block role descriptions that are displayed as context-sensitive subtitles on the canvas. The block doesn't need to *know* its context — the intermediary computes it and injects it as a visual annotation.

**Resolution:** Blocks carry both identity (type + parameters, static) and role (position-dependent annotation, computed). The block is self-contained for what it IS; the annotation layer provides context for what it DOES in this strategy.

---

### Contradiction 5: Desktop-optimized vs. Touch-first

**The canvas should be desktop-optimized** (precise mouse control, large viewport) **AND touch-first** (fat fingers, small screen, gesture-based).

**TRIZ Principle Applied: #1 — Segmentation + #35 — Parameter Change (transform the physical state).**
Segment the strategy representation into multiple projections, each optimized for its input medium. The desktop projection is the 2D graph canvas. The mobile projection is a vertical card stack or sentence builder. Both projections serialize to the identical `{blocks, connections}` JSON. Switching devices is seamless because the underlying model is device-agnostic; only the projection changes.

Parameter Change means transforming the *physical state* of the interface: on desktop, the strategy is a spatial graph (2D, pointer-precise). On mobile, the same strategy transforms into a linear sequence (1D, swipe-navigable). The information is identical; the dimensionality changes to match the input device. This is not responsive scaling — it's a genuine phase transition in the UI's physical form.

**Resolution:** Don't make one canvas work on both surfaces. Build two projections — spatial graph for desktop, linear flow for mobile — backed by one data model. Each projection is first-class for its medium. Cross-device editing is seamless because edits in either projection update the shared JSON.

---

## Method 4 — Systems Thinking Map

### Information Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Block        │ ──> │ Canvas      │ ──> │ Strategy JSON     │ ──> │ Python       │
│ Library      │     │ (React Flow)│     │ {blocks,          │     │ Interpreter  │
│              │     │             │     │  connections}      │     │              │
│ 20 types     │     │ Nodes +     │     │                    │     │ Indicator    │
│ 6 categories │     │ Edges       │     │ Stored per version │     │ computation  │
└─────────────┘     └──────┬──────┘     └─────────┬──────────┘     └──────┬───────┘
                           │                      │                       │
                           v                      v                       v
                    ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
                    │ Inspector    │     │ Validation        │     │ Simulation   │
                    │ Panel        │     │ Endpoint          │     │ Engine       │
                    │              │     │ POST /validate    │     │              │
                    │ Params in,   │     │                    │     │ Trades,      │
                    │ JSON out     │     │ Errors or ✓       │     │ Equity curve │
                    └──────────────┘     └──────────────────┘     └──────┬───────┘
                                                                         │
                                                                         v
                                                                  ┌──────────────┐
                                                                  │ Results UI   │
                                                                  │              │
                                                                  │ Metrics,     │
                                                                  │ Charts,      │
                                                                  │ Trade list   │
                                                                  └──────────────┘
```

### Feedback Loops

**Loop A — Validation Correction Loop (reactive, slow):**
Canvas → Save → Validate → Error list → User reads error → User guesses fix → Canvas edit → Save → Validate again.
*Cycle time: 30–120 seconds per error. User must translate between error text and spatial canvas location.*

**Loop B — Backtest Iteration Loop (very slow):**
Canvas → Save version → Configure backtest → Run → Wait for queue + execution → View results → Interpret metrics → Decide what to change → Return to canvas → Edit blocks → Repeat.
*Cycle time: 2–10 minutes per iteration. This is the primary learning loop for the entire product, and it is the slowest.*

**Loop C — Explanation Comprehension Loop (passive, underused):**
Canvas → Strategy Explanation Generator → Plain-English text → User reads → "Ah, that's what my strategy does" → Return to canvas with improved mental model.
*Currently hidden/secondary. Not integrated into the authoring flow. The explanation only confirms what was already built — it doesn't guide construction.*

**Loop D — Template/Wizard Bootstrap Loop (one-shot):**
Wizard questions → Auto-generated strategy JSON → Canvas pre-populated → User modifies.
*Only fires once per wizard use. After the initial bootstrap, the user is in the canvas for all subsequent edits.*

### Delay Points

| Delay Point | Where | Duration | Impact |
|---|---|---|---|
| **Preview desert** | Between placing blocks and seeing any behavioral output | Entire authoring session (minutes to hours) | Users build blind. The longest and most damaging delay in the system. |
| **Validation round-trip** | Between making a connection and learning it's invalid | 5–30 seconds (save + validate) | Errors compound. User may make 3 invalid connections before discovering the first. |
| **Backtest queue** | Between clicking "Run" and seeing results | 10–60 seconds depending on date range and queue | Breaks the iteration flow. User loses context while waiting. |
| **Inspector context switch** | Between deciding to edit a parameter and finding the right control | 2–5 seconds per edit | Adds up across dozens of edits per session. Cumulative cognitive tax. |
| **Comprehension rebuild** | Returning to a strategy after days away and re-understanding it | 1–5 minutes of tracing wires | The canvas doesn't help you remember what you built or why. |

### Leverage Points

**Leverage Point 1 (Highest Impact): Close the preview desert.**

The preview desert — the total absence of behavioral feedback during authoring — is the single largest delay in the system. It forces every user to complete the full Build → Save → Backtest → Wait → Interpret → Return cycle before getting *any* signal about whether their strategy makes sense.

Introducing even a crude preview (Traffic Light blocks showing current-candle evaluation, or a mini equity curve updating on parameter change) would:
- Give beginners immediate "is this working?" confidence
- Let intermediates iterate 10x faster on parameter tuning
- Enable power users to spot logical errors before committing to a full backtest
- Transform Loop B from a 2–10 minute cycle into a 5–15 second cycle for simple checks

**Cascading effects:** Faster feedback → more iterations per session → faster learning → better strategies → higher retention → more backtests run → more data for the product team.

**Leverage Point 2 (Second Highest): Eliminate manual connection drawing.**

Connection drawing is the throughput bottleneck (Method 2) and the source of the most error-prone interactions (Method 1, Problem 2). Every block placed requires 1–3 connection actions. A 10-block strategy requires ~8–12 connections, each a potential point of failure.

Replacing manual wiring with proximity snapping + implicit flow + embedded signal conditions would:
- Remove the highest-friction action from the entire pipeline
- Eliminate the entire category of "invalid connection" errors
- Reduce canvas construction time by 40–60%
- Make mobile strategy building viable (connections are the most hostile interaction on touch)

**Cascading effects:** Fewer connections → fewer errors → less validation frustration → shorter time-to-first-backtest → lower abandonment → more strategies built per user.

**Leverage Point 3 (Third Highest): Make the strategy readable as narrative.**

The Narrative View toggle (promoting the existing Strategy Explanation Generator to a primary view) is a small implementation effort with disproportionate impact because it:
- Gives beginners a way to verify their strategy without tracing wires
- Gives intermediates a "read this back to me" sanity check
- Gives power users a quick diff-by-reading when comparing versions
- Bridges the translation gap (Method 1, Problem 3) by providing the intent-level representation that the canvas lacks
- Reduces the comprehension rebuild delay from minutes to seconds

**Cascading effects:** Readable strategies → better self-correction → fewer "why did my backtest do that?" confusion → better mental models → more confident editing → more experimentation → more engagement.

---

## Synthesis: Converged Root Causes

Across all four methods, the same structural issues surface repeatedly. Here they are, distilled:

**1. No intent layer.** The canvas maps directly to the interpreter's data model. There is no intermediate representation of trading intent. This is the root cause of beginner confusion (Method 1, Problem 1), the comprehension gap (Method 1, Problem 3), and the visual-executable contradiction (Method 3, Contradiction 3).

**2. Permissive-then-punitive interaction model.** The canvas allows any action, then retroactively rejects invalid ones through batch validation. This creates the invalid-connection problem (Method 1, Problem 2), compounds the validation delay (Method 4), and is the mechanism behind Contradiction 1 (free-form vs. structured).

**3. Feedback vacuum during authoring.** No behavioral signal exists between block placement and backtest completion. This is the preview desert (Method 4), the root cause of parameter disconnection (Method 1, Problem 4), and the deepest leverage point in the system.

**4. One representation for all contexts.** The 2D graph canvas is the only strategy projection. It serves desktop and mobile, beginners and experts, authoring and comprehension — and serves none of them optimally. This drives the mobile compromise (Method 1, Problem 5), Contradiction 5 (desktop vs. touch), and Contradiction 2 (comprehensive vs. simple).

**5. Connection drawing as throughput bottleneck.** Manual port-to-port wiring is the single action that constrains the entire pipeline for the majority of users (Method 2). It is also the most error-prone, the least rewarding, and the most hostile to mobile interaction.

---

## Top 5 Design Principles

These principles are derived from the convergence of all four methods. Each principle addresses multiple root causes simultaneously. They are ordered by expected impact.

### Principle 1: "Continuous Partial Feedback"

*The canvas must show behavioral consequences during authoring, not only after backtesting.*

The user should never build in silence. Even approximate, delayed, or partial feedback (a traffic light on a block, a sparkline of recent values, a "would enter today: yes/no" badge) is orders of magnitude more valuable than no feedback at all. Design for a 500ms feedback loop on parameter changes and a 5-second feedback loop on structural changes. Full backtest accuracy is not required for preview; directional correctness is sufficient.

*Root causes addressed: Feedback vacuum (#3), preview desert (Method 4 Leverage Point 1), parameter disconnection (Problem 4), visual-executable contradiction (Contradiction 3).*

### Principle 2: "Make Invalidity Impossible, Not Merely Detectable"

*The interface should prevent invalid states through affordance design, not catch them through after-the-fact validation.*

Encode type compatibility into visual port shapes and snap-zone behavior. If a boolean output and a numeric input are incompatible, their ports should be visually distinct and physically unable to connect — not connectable with a later validation error. Shift the system from permissive-then-punitive to constrained-by-design. Validation still exists as a safety net, but it should almost never fire because the interface has already made the errors impossible.

*Root causes addressed: Permissive-then-punitive model (#2), invalid connections (Problem 2), free-form vs. structured contradiction (Contradiction 1), connection bottleneck (#5).*

### Principle 3: "One Model, Multiple Projections"

*The strategy definition JSON is the single source of truth. The 2D graph canvas is one projection. Other projections — sentence builder, card stack, narrative view — are equally valid and optimized for their context.*

Desktop gets a spatial graph. Mobile gets a linear flow. Beginners get a guided sentence builder. Power users get the full canvas. All projections read and write the same `{blocks, connections}` JSON. Switching between projections is seamless because they are views, not separate implementations. This dissolves the desktop-vs-mobile contradiction and the comprehensive-vs-simple contradiction simultaneously.

*Root causes addressed: One representation for all contexts (#4), mobile compromise (Problem 5), desktop vs. touch contradiction (Contradiction 5), comprehensive vs. simple contradiction (Contradiction 2).*

### Principle 4: "Intent Layer First"

*Users should express trading intent ("enter when oversold and trending up"), and the system should translate that into blocks and connections — not the other way around.*

The primary authoring surface should operate at the level of trading decisions, not graph plumbing. The canvas is a *visualization* of intent, not the *entry point* for intent. This means: Recipe Cards that package common patterns as single concepts, embedded condition lists in signal blocks that accept plain-language conditions, a Narrative View that is editable (long-term), and a Strategy Health Bar that coaches in trading terms ("your strategy needs an exit condition") rather than graph terms ("entry_signal block has no input connection").

*Root causes addressed: No intent layer (#1), beginner block confusion (Problem 1), connection bottleneck (#5), self-contained vs. context-aware contradiction (Contradiction 4).*

### Principle 5: "Edit Where You See, See What You Changed"

*Parameter editing must happen in spatial proximity to the block, and parameter changes must produce an immediately visible consequence on the block itself.*

Inline popovers replace the Inspector Panel as the primary editing surface. The block updates its visual representation (label, sparkline, role annotation) in real time as parameters change. The Inspector Panel survives as an advanced/secondary view, but the default experience is: tap block → popover appears anchored to block → change value → see block update → close popover. No context switch. No panel. No waiting for a backtest to see if the change mattered.

*Root causes addressed: Parameter disconnection (Problem 4), Inspector context switch delay (Method 4), continuous feedback principle (#1 above).*

---

## Relationship to Prototype C (Smart Blocks)

The Design Thinking report recommended Prototype C (Smart Blocks) for implementation. These five principles validate and sharpen that recommendation:

- **Principle 1** maps directly to Traffic Light Blocks and the Candle-by-Candle Debugger in Prototype C.
- **Principle 2** maps to Proximity Snap Connections and Embedded Signal Conditions.
- **Principle 3** extends Prototype C's Narrative View toggle into a broader multi-projection architecture — and specifically validates the Design Thinking report's note that the Narrative Canvas (Prototype B) should be layered onto Prototype C in a future phase.
- **Principle 4** maps to Recipe Cards, the Strategy Health Bar, and Embedded Signal Conditions.
- **Principle 5** maps directly to Inline Parameter Popovers.

Prototype C is the correct vehicle. These principles are its compass.

---

*Analysis complete. Five root causes identified across four methods. Five design principles derived from convergence. All roads lead to the same conclusion: close the feedback loop, eliminate the wiring tax, and let traders think in intent.*

*"The significant problems we face cannot be solved at the same level of thinking we used when we created them." — Albert Einstein*

*AHA! — And there it is. The canvas was designed at the level of the interpreter. The solution lives at the level of the trader. Different level of thinking. Different representation. Same underlying model.*
