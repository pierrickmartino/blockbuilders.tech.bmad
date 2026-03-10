# Product Brief: Visual Strategy Canvas Redesign

**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Author:** Analyst Agent (BMad Method)
**Date:** 2026-03-09
**Status:** Ready for PRD
**Inputs:** SCAMPER Brainstorming Report, Design Thinking Canvas Report, Problem-Solving Canvas Report, Current Product Documentation

---

## 1. Problem Summary

Three independent analysis sessions — brainstorming (43 ideas), design thinking (3 prototypes), and systematic problem-solving (4 methods) — converge on the same structural diagnosis: the canvas speaks in plumbing, but traders think in intent. The visual strategy editor maps directly to the backtest interpreter's internal data model (`{blocks, connections}` JSON), with no intermediate layer that represents what the trader actually means. This forces every user — beginner, intermediate, and power user — to translate between their trading logic ("enter when oversold and trending up") and graph-level operations (place RSI block, draw wire to Compare block, set threshold, draw wire to AND block, draw wire to Entry Signal). Manual port-to-port wiring is the throughput bottleneck that constrains all user types simultaneously, and the total absence of behavioral feedback during authoring means users build blind until they commit to a full backtest. The result is a canvas that is technically capable but experientially opaque — it enables strategy construction without supporting strategy comprehension.

---

## 2. Vision Statement

Building a trading strategy on the canvas should feel like describing your trading idea to a knowledgeable partner who sketches it out, shows you what it would do, and helps you refine it — not like wiring a circuit board in silence.

---

## 3. Target Users & Jobs-to-Be-Done

### Léa — The Beginner

- **Primary job:** Understand, modify, and gain confidence in a wizard-generated strategy so she can run a meaningful backtest and learn from the results.
- **Current biggest frustration:** She cannot tell which block holds which number, cannot predict which connections are valid, and receives no feedback about what her changes mean until she runs a full backtest. The canvas looks like a circuit diagram she didn't ask to see.
- **"Done well" looks like:** Léa can read her strategy as a plain-English paragraph, tap any clause to see the relevant block, change a parameter inline on the block itself, and immediately see a visual signal (a traffic light glow, a "would enter today" badge) that tells her the change did something. She never encounters an invalid-connection error because the interface prevented it.

### Marco — The Intermediate

- **Primary job:** Express multi-condition entry/exit logic quickly and iterate on parameters by comparing backtest results, without spending 10 minutes on wiring that he could describe in one sentence.
- **Current biggest frustration:** Logic wiring. Combining two entry conditions with AND logic requires placing 5+ blocks and drawing 5+ connections, each a manual action. The canvas doesn't preview what the strategy does, so every parameter tweak requires a full backtest round-trip to see the effect.
- **"Done well" looks like:** Marco drags a "RSI Oversold Bounce" recipe card onto the canvas and it expands into pre-connected blocks. He adds a second condition inside the Entry Signal block's built-in condition list — no separate AND block needed. A live traffic-light overlay shows him which conditions are firing on the latest candle. He tweaks a parameter and sees the block update within 500ms.

### Yuki — The Power User

- **Primary job:** Rapidly iterate on strategy variants — swap indicators, compare versions, replay decision logic candle-by-candle — at the pattern level, not the block level.
- **Current biggest frustration:** "Indicator surgery." Swapping RSI for MACD requires deleting 3 blocks, adding 2, and manually rewiring 4+ connections — a sequence of 8+ individual actions for what is conceptually a single operation. No candle-level debugger exists to understand why the strategy made specific decisions.
- **"Done well" looks like:** Yuki uses recipe cards and embedded signal conditions to swap patterns as coherent units. She replays a backtest candle-by-candle on the canvas, watching each block display its computed value and seeing exactly when and why entries and exits fired. She toggles Narrative View for a quick sanity-check read of the full strategy.

---

## 4. Design Principles

1. **Continuous Partial Feedback** — The canvas must show behavioral consequences during authoring, not only after backtesting. Even approximate, delayed, or partial feedback (a traffic light on a block, a "would enter today" badge) is orders of magnitude more valuable than no feedback at all.

2. **Make Invalidity Impossible, Not Merely Detectable** — Encode type compatibility into visual affordances (port shapes, snap zones, color) so users can never complete an invalid connection. Shift from permissive-then-punitive to constrained-by-design. Validation becomes a safety net that almost never fires.

3. **One Model, Multiple Projections** — The `{blocks, connections}` JSON is the single source of truth. The 2D graph canvas is one projection. A narrative paragraph is another. A card stack could be another. Each projection is optimized for its context (desktop vs. mobile, authoring vs. comprehension). Switching between projections is seamless.

4. **Intent Layer First** — Users express trading intent ("enter when oversold and trending up"); the system translates that into blocks and connections. The canvas is a visualization of intent, not the entry point for intent. Recipe cards, embedded condition lists, and the Strategy Health Bar all operate at the intent level.

5. **Edit Where You See, See What You Changed** — Parameter editing happens inline on the block (not in a disconnected Inspector Panel), and changes produce an immediately visible consequence on the block itself within 500ms. No context switch, no waiting for a backtest.

6. **Guided Freedom** — The canvas suggests structure (soft advisory zones, auto-layout defaults, a Health Bar that coaches completion) but never blocks creativity. Structure is a default that yields to user intent. New users see strong guidance; experienced users can disable it.

7. **Reduce the Wiring Tax** — Manual port-to-port connection drawing is the single highest-friction action on the canvas. Every design decision should aim to reduce the number of manual connections required: proximity snapping, implicit flow, embedded conditions, and recipe cards all attack this bottleneck from different angles.

---

## 5. Proposed Direction

The recommended approach is an **evolutionary enhancement of the existing free-form canvas** (Prototype C: "Smart Blocks" from the Design Thinking report), not a paradigm replacement. The existing React Flow canvas, block type catalog, and `{blocks, connections}` JSON schema are preserved. Seven capabilities are layered on top: (1) a Strategy Health Bar that proactively coaches users toward a complete strategy; (2) inline parameter popovers anchored to each block, replacing the Inspector Panel as the default editing surface; (3) proximity snap connections that auto-wire compatible blocks when dragged near each other; (4) a Narrative View toggle that renders the strategy as a plain-English paragraph with clickable clauses; (5) Recipe Cards in the Block Library that package common multi-block patterns as single draggable units; (6) Traffic Light live preview that shows each block's current-candle evaluation state as a colored glow; and (7) an embedded condition list in signal blocks that lets users define AND/OR logic inside the Entry/Exit Signal block without separate logic blocks. A candle-by-candle debugger is scoped as the final phase, highest-complexity, highest-differentiation feature. This approach was selected because it delivers the strongest combined impact across all three user types, requires zero breaking changes to the backend or data schema, and preserves full backward compatibility with every existing strategy.

---

## 6. Success Metrics

### Quantitative

1. **Time to first valid strategy (new users):** Median time from first canvas load to successful validation. Baseline: estimate 300+ seconds. Target: < 120 seconds.

2. **Manual connections per strategy:** Average number of explicit user-initiated connection actions per strategy (excluding auto-connections from proximity snapping or embedded conditions). Baseline: ~10 for a typical 10-block strategy. Target: < 3.

3. **Validation error rate:** Percentage of connection attempts that result in an invalid-connection error. Baseline: estimate 15–25% for beginners. Target: < 5%.

4. **Inspector Panel open rate:** Percentage of parameter edits routed through the Inspector Panel vs. inline popovers. Target: < 20% Inspector usage (indicating inline editing is the preferred path).

### Qualitative

5. **Strategy comprehension accuracy:** After building, ask users "In your own words, what does your strategy do?" Score semantic accuracy of their description against actual strategy logic. Target: > 85% accuracy for users who have used Narrative View at least once.

6. **Builder confidence rating:** Post-session survey question: "How confident are you that the strategy you built will do what you intended?" (1–5 scale). Target: mean ≥ 4.0 across all user types.

---

## 7. Scope Boundaries

### In Scope

- Canvas interaction model: connection drawing, block placement, parameter editing UX
- Canvas feedback systems: live preview overlays, traffic light states, Health Bar coaching
- Canvas reading aids: Narrative View toggle, block role annotations
- Block Library enhancements: Recipe Cards tab, pattern-level placement
- Signal block UX: embedded condition lists in Entry/Exit Signal blocks
- Canvas debugging: candle-by-candle replay with per-block computed values
- Mobile canvas projection: evaluating alternative representations (card stack, linear flow) for the same `{blocks, connections}` model

### Out of Scope

- **Backtest engine:** No changes to the Python interpreter, simulation logic, or execution model
- **Block type catalog:** No new indicator or logic block types added or removed (the 20 existing types remain unchanged)
- **Backend API:** No new endpoints required for canvas features (except a lightweight preview evaluation endpoint if server-side computation is needed for Traffic Light blocks)
- **Data management:** No changes to candle storage, CryptoCompare integration, or S3/MinIO
- **Subscription/billing:** No plan changes or new paywalled features
- **Strategy Building Wizard:** No changes to the wizard flow (the wizard's output strategy opens on the redesigned canvas, but the wizard itself is untouched)
- **Backtest results UI:** No changes to equity curves, trade tables, metrics display, or comparison views (these are downstream consumers of the strategy, not the authoring surface)

### Constraints

- **React Flow (XyFlow):** The canvas must remain built on React Flow. No library replacement or fork. All enhancements must work within React Flow's node/edge model, custom node components, and existing API surface.
- **`{blocks, connections}` JSON schema:** The strategy definition format stored in `strategy_versions.definition_json` must remain backward-compatible. Extensions (e.g., `conditions` array on signal blocks, `metadata` on any block) are allowed only as optional additive fields. Existing strategies must open and function identically without migration.
- **Backtest interpreter compatibility:** Any new canvas feature (embedded conditions, recipe cards) must produce JSON that the existing Python interpreter can consume, or must include a corresponding interpreter extension that is backward-compatible.
- **Existing feature preservation:** Every feature listed in Section 4 of the product documentation (undo/redo, copy/paste, auto-layout, minimap, keyboard shortcuts, mobile bottom bar, compact nodes, autosave, etc.) must continue to function. Nothing becomes obsolete.

---

## 8. Risks & Open Questions

1. **Traffic Light evaluation path:** The current architecture has no lightweight, browser-side indicator computation. Traffic Light blocks require either (a) a new backend endpoint that evaluates the strategy against the latest candle and returns per-block values, or (b) a client-side JavaScript implementation of the core indicators (SMA, EMA, RSI, etc.). The PRD must determine which path is feasible within performance and maintenance constraints. If server-side, latency must stay under 500ms. If client-side, the indicator library must be kept in sync with the Python backend to avoid divergent results.

2. **Embedded conditions and interpreter changes:** Adding a `conditions` array to signal blocks requires the Python backtest interpreter to recognize and process this new field. While the schema extension is additive and backward-compatible, the interpreter change introduces risk of regression in existing backtest behavior. The PRD must specify the interpreter change precisely and mandate regression testing against existing strategy definitions.

3. **Recipe Card decomposition fidelity:** When a recipe card expands into constituent blocks, the resulting block positions, connection wiring, and default parameter values must produce a valid, backtest-ready sub-graph. Edge cases — such as recipe cards placed near existing blocks that trigger unintended proximity snaps — need explicit handling rules. The PRD should define the card-to-block expansion contract.

4. **Mobile projection feasibility:** The analysis strongly recommends an alternative canvas representation for mobile (card stack, linear flow) rather than a responsive shrink of the desktop graph. Building a second projection that reads and writes the same `{blocks, connections}` JSON is architecturally sound but represents significant frontend engineering effort. The PRD must decide whether the mobile projection is part of this redesign phase or deferred, and if deferred, what incremental mobile improvements ship in the interim.

5. **Adoption risk for returning users:** Proximity snapping, inline popovers, and the Health Bar change the default interaction patterns for existing users. While all features are additive (manual wiring, Inspector Panel, and current layout behavior remain available), the changed defaults may disorient returning users. The PRD should specify whether new features are introduced gradually (feature flags, opt-in toggles) or ship as the new default with a "what's new" onboarding moment.

---

*This brief is the sole input required for the PM agent to produce a full PRD for the canvas editor redesign. All analysis, prototyping, and problem-solving findings have been distilled into actionable direction. The three analysis reports remain available as reference material for deeper context on any section.*
