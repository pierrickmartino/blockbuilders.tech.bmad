# Party Mode Synthesis: Canvas Editor Redesign

**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Session:** Party Mode — Cross-Functional Stress Test & Final Synthesis
**Date:** 2026-03-10
**Status:** Complete — Ready for Implementation
**Participants:** Carson (Brainstorming Coach), Maya (Design Thinking Coach), Dr. Quinn (Problem Solver), PM, Architect, Yuki (Power User), Léa (Beginner User)

**Input Documents:**
- Brainstorming Report (43 ideas, 6 clusters)
- Design Thinking Report (3 prototypes, Prototype C selected)
- Problem-Solving Report (5 root causes, 5 design principles)
- Product Brief
- PRD v1.0
- Architecture Review

---

## 1. Consensus Decisions

These points were agreed upon by all agents without dispute.

**1.1 — Prototype C (Smart Blocks) is the correct model.** The evolutionary enhancement of the existing React Flow canvas is technically sound, migration-safe, and addresses all three user types. No agent advocated for switching to Prototype A (Guided Zones) or Prototype B (Narrative Canvas) as the primary model. The free-form canvas survives; intelligence is layered on top.

**1.2 — Health Bar and Narrative View must ship together.** The Health Bar addresses strategy completeness; the Narrative View addresses strategy comprehension. Separating them leaves beginners with a valid strategy they can't understand. These are complementary, not sequential.

**1.3 — No dual-mode editor.** The redesign ships as the default canvas, not as an opt-in alternative alongside the current editor. Feature flags provide per-feature rollback without the maintenance burden of two permanent codebases. Running two editor modes fragments documentation, doubles QA surface, and delays full adoption.

**1.4 — Interpreter extension deploys backend-first.** The embedded conditions interpreter change (FR-38) is a one-way door. Once deployed, it stays deployed regardless of frontend rollback decisions. It's backward-compatible and has no side effects on strategies without `conditions`. Deployment order: backend first, frontend feature flag second.

**1.5 — Mobile strategy is responsive adaptation for v1, not a separate projection.** Building a card-stack or linear-flow mobile editor is architecturally clean but represents 4–6 weeks of dedicated frontend work. The v1 approach — increased snap thresholds, bottom sheet popovers, haptic feedback, and full-screen Narrative View — is pragmatically correct. Instrument mobile usage post-launch; invest in a separate projection only if mobile building sessions exceed 30% of total.

**1.6 — The candle-by-candle debugger is the North Star feature.** Every architectural decision in earlier phases — especially OQ-01 (client-side vs. server-side evaluation) — should be made with the debugger in mind. Client-side indicator library is recommended specifically because it serves both Traffic Lights (Phase 3) and the Debugger (Phase 5) without throwaway infrastructure.

**1.7 — Connection confirmation indicator required.** Proximity snapping can create connections as a side effect of dragging. A persistent 2-second "Connected!" indicator on both blocks prevents phantom connections going unnoticed. This is a small addition with significant UX safety value.

---

## 2. Resolved Debates

**2.1 — Priority order: Narrative View elevated**

*Debate:* The PRD placed Narrative View at priority 4 (after Health Bar, Inline Popovers, and Proximity Snapping). Dr. Quinn argued that Narrative View addresses the deeper root cause — comprehension — and should rank higher. The PM initially defended the PRD order.

*Resolution:* Narrative View moves to priority 1, coupled with the Health Bar as a single shippable unit. The argument that convinced everyone: Léa's first experience is comprehension, not construction. She arrives from the wizard with a pre-built strategy and needs to *read* it before she can *edit* it. The Health Bar tells her what's missing; the Narrative View tells her what it means. Both are needed in the first session.

*Revised priority order:*
1. Health Bar + Narrative View (shipped together)
2. Inline Parameter Popovers
3. Proximity Snap Connections
4. Recipe Cards (stretch goal for v1)
5. Traffic Light Live Preview (v2)
6. Embedded Conditions in Signal Blocks (v2)
7. Type-Encoded Port Visuals (v2)
8. Candle-by-Candle Debugger (v3)

**2.2 — Narrative View enhancements: clause-click-to-popover and numeric shortcuts**

*Debate:* Maya proposed that clicking a clause in Narrative View should open the inline popover for the corresponding block, not just highlight it. Carson pushed further: numeric values in the narrative text should be directly editable inline — tap "30" in "drops below 30" to change it without ever switching to canvas view. The PM initially hesitated, citing scope creep.

*Resolution:* Both enhancements are included in the Narrative View scope. The clause-click-to-popover is approximately 20 lines of code — the Strategy Explanation Generator already maps clauses to blocks. Numeric parameter shortcuts are slightly more work but stay within the deterministic template engine's capabilities — each number maps to exactly one parameter on exactly one block. These are narrow, bounded features with outsized impact on Léa's first experience.

**2.3 — Narrative View as default for wizard-generated strategies**

*Debate:* Maya proposed that wizard-generated strategies should open in Narrative View by default, not Canvas View. The PM questioned whether this would confuse users who expect a canvas.

*Resolution:* Accepted. Wizard-generated strategies open in Narrative View on first load. A clear "Switch to Canvas View" button is visible. This flips the information hierarchy for beginners: meaning first, plumbing second. Returning users who prefer canvas view will have their preference persisted (same localStorage mechanism as Health Bar state). Users who create a strategy from scratch (not from the wizard) still land on the canvas.

**2.4 — Embedded Conditions timing: MVP or v2?**

*Debate:* Yuki advocated strongly for embedded conditions in MVP — it's her primary workflow improvement. The PM and Architect both recommended deferring to v2 due to the interpreter change risk.

*Resolution:* Embedded Conditions ship in v2, not MVP. The interpreter change is the only backend modification in the entire redesign and represents isolated risk that should not be coupled with the v1 frontend rollout. Yuki's workflow still improves in v1 via proximity snapping (faster connections) and inline popovers (faster parameter editing). The full condition-list editing in signal blocks is the v2 centerpiece.

**2.5 — Mobile Narrative View as primary mobile experience**

*Debate:* Dr. Quinn and Maya debated whether mobile users need a full canvas or primarily a monitoring/light-editing experience. Léa confirmed she would use mobile for checking and showing, not building.

*Resolution:* Narrative View becomes the default mobile landing for strategies (not just wizard-generated ones). The full canvas remains accessible via a "Show Canvas" toggle. This isn't a separate mobile projection — it's prioritizing the right view for the medium. If mobile usage data later shows significant building activity, a dedicated mobile projection moves to the roadmap.

---

## 3. Unresolved Tensions

These are genuine tradeoffs that require user testing or data to resolve.

**3.1 — Free-form vs. Structured canvas for beginners**

The Health Bar adds advisory structure, and proximity snapping nudges toward valid topologies, but the fundamental canvas remains free-form. A beginner can still place blocks in random positions and create visual chaos. Dr. Quinn noted that the free-form vs. structured contradiction is mitigated but not dissolved. Prototype A's swim lanes would provide structure by default — but at the cost of flexibility that power users demand.

*Needs testing:* After v1 ships, observe beginner canvas layouts. If significant numbers of beginners create spatially disorganized canvases despite the Health Bar, consider an optional "guided layout" mode that applies soft zone constraints. This is a future experiment, not a v1 decision.

**3.2 — Traffic Light evaluation path (OQ-01)**

The architecture review recommends client-side TypeScript indicator library. The PM and Architect agree on the recommendation. But the decision hasn't been formally validated by engineering. Client-side requires maintaining parity between 11 TypeScript indicator implementations and their Python counterparts — a persistent maintenance burden. Server-side is simpler but introduces network latency and doesn't serve the debugger.

*Needs resolution:* Technical spike in the first week of Phase 3 (Traffic Lights). Build proof-of-concept for both paths. Measure: (a) client-side computation latency for 20 blocks, (b) server-side round-trip latency on mobile network, (c) parity test results for all 11 indicators. Make the call based on data, not opinion.

**3.3 — Recipe Card catalog breadth**

Yuki noted that three initial recipe cards (RSI Oversold Bounce, EMA Crossover, Bollinger Breakout) leave many common patterns uncovered — MACD Crossover being the immediate gap. The PM scoped only three for v1.

*Needs data:* After Recipe Cards ship, track which patterns users build manually most frequently. Use that data to prioritize the next batch of recipe cards. Consider a "request a recipe" feedback mechanism in the Patterns tab.

**3.4 — Numeric parameter shortcuts in Narrative View: scope boundary**

Carson proposed inline-editable numbers in the narrative text. The implementation is bounded (each number maps to one parameter), but the interaction design has edge cases: what about parameters that are dropdowns (operator: <, >, ≤, ≥)? What about parameters with constrained ranges? How does the inline input handle validation?

*Needs design iteration:* Ship the initial version with numeric-only inline editing (period values, threshold values). Defer dropdown/enum parameters to a future iteration. If numeric shortcuts prove popular, extend the pattern.

---

## 4. Revised MVP Scope

The MVP scope has been sharpened based on all six rounds of debate.

### Must Ship (v1 Core)

| Priority | Feature | User Stories | Key Enhancement |
|----------|---------|--------------|-----------------|
| 1 | Health Bar + Narrative View | US-01, US-02, US-07 | Shipped as a unit. Narrative View opens by default for wizard-generated strategies. Clause-click opens inline popover. Numeric parameter shortcuts in narrative text. |
| 2 | Inline Parameter Popovers | US-03, US-04 | Primary editing surface. Mobile bottom sheet. Inspector Panel demoted to "Details" view. |
| 3 | Proximity Snap Connections | US-05, US-06 (partial — shapes deferred) | 60px desktop / 80px mobile snap threshold. Persistent 2-second connection confirmation indicator. Type-compatible port glow. Haptic feedback on mobile. |

### Stretch Goal (v1 if schedule allows)

| Feature | User Stories | Rationale |
|---------|--------------|-----------|
| Recipe Cards in Block Library | US-08, US-09 | Reduces block count for common patterns. Templates infrastructure exists. Three initial cards: RSI Oversold Bounce, EMA Crossover, Bollinger Breakout. |

### v2 (After v1 validation)

| Feature | Rationale |
|---------|-----------|
| Traffic Light Live Preview (FR-35–36) | Closes the preview desert. Depends on OQ-01 resolution. |
| Embedded Conditions in Signal Blocks (FR-37–41) | Requires interpreter change. Ship after v1 to isolate risk. |
| Type-Encoded Port Visuals (FR-12–13) | Largely redundant with proximity snapping; lower urgency. |

### v3 (After v2)

| Feature | Rationale |
|---------|-----------|
| Candle-by-Candle Debugger (FR-42–46) | Highest complexity, highest differentiation. Requires client-side indicator library from v2. Yuki's "tell other traders" feature. |

---

## 5. Implementation Sequence

### Sprint 1 — Foundation + Comprehension (Weeks 1–2)

**Build:** SmartCanvas wrapper, Health Bar (FR-26–31), Narrative View (FR-32–34) with clause-click-to-popover and numeric parameter shortcuts. Default Narrative View for wizard-generated strategies. Default Narrative View on mobile for all strategies.

**Validate:** Put in front of 5 beginner users (Léa profile). Test: Can they read and describe their wizard-generated strategy? Can they change a parameter through the narrative? Do they understand the Health Bar's coaching? Measure time-to-first-edit and self-reported confidence.

**Ship decision:** If beginners can describe their strategy with >80% semantic accuracy after using Narrative View, proceed to Sprint 2.

### Sprint 2 — Inline Editing (Weeks 3–4)

**Build:** Inline Parameter Popovers (FR-16–22) with Floating UI positioning. Mobile bottom sheet adaptation. Inspector Panel "Details" button integration.

**Validate:** Measure Inspector Panel open rate vs. popover usage. Target: <30% of edits through Inspector. Test with all three user profiles.

**Ship decision:** If popover adoption exceeds 60% of parameter edits, proceed to Sprint 3.

### Sprint 3 — Connection Model (Weeks 5–6)

**Build:** Proximity Snap Connections (FR-08–11, FR-14–15). Type-compatible snap detection. requestAnimationFrame throttling. Persistent 2-second connection confirmation indicator. Mobile haptic feedback. Disambiguation popup for equidistant ports.

**Validate:** Measure manual connections per strategy (baseline vs. redesign). Measure connection error rate. Test phantom-connection detection — do users notice unintended snap connections?

**Ship decision:** If manual connections drop by >40% and error rate drops below 8%, v1 core is validated. Consider shipping Recipe Cards if schedule allows.

### Sprint 4 (Stretch) — Recipe Cards (Week 7)

**Build:** Patterns tab in Block Library (FR-01–07). Three initial recipe cards. Recipe expansion with proximity deduplication of Input blocks.

**Validate:** Track recipe card usage rate. Which cards are most popular? Which patterns do users still build manually?

### Phase 3 — Live Feedback (Weeks 8–10)

**Build:** Resolve OQ-01 (technical spike week 8). Build Traffic Light Live Preview (FR-35–36).

### Phase 4 — Schema Extension (Weeks 11–13)

**Build:** Deploy interpreter extension backend (week 11). Enable Embedded Conditions UI (weeks 12–13).

### Phase 5 — Capstone (Weeks 14–18)

**Build:** Candle-by-Candle Debugger (FR-42–46). Uses client-side indicator library from Phase 3.

**Earliest real-user exposure:** End of Sprint 1 (Week 2). Health Bar + Narrative View can be tested with real users before any other feature ships.

---

## 6. Kill List

Ideas explicitly parked or dropped, with reasoning.

| Idea | Source | Decision | Reason |
|------|--------|----------|--------|
| Guided Zones / swim lanes | Design Thinking Prototype A | **Parked** | Too constraining for current user base. Revisit only if a dedicated "beginner mode" product is launched. |
| Full bidirectional Narrative View editing | Design Thinking Prototype B | **Parked** | High complexity. Seeded with the read-only Narrative View + numeric shortcuts in v1. Full sentence-to-canvas bidirectional editing is a future phase, not a current commitment. |
| Pipeline Railroad layout | Brainstorming S2 | **Dropped** | Incompatible with free-form canvas preservation. Guided Zones is the less extreme version of this idea, and even that is parked. |
| Voice-driven block creation | Brainstorming S6 | **Parked** | Cool differentiator but niche. Revisit when voice UX matures and if accessibility demand warrants it. |
| Multiplayer canvas / collaboration | Brainstorming P4 | **Parked** | Requires real-time sync infrastructure. Not aligned with current solo-builder model. |
| Formula Bar paradigm | Brainstorming A2 | **Dropped** | Requires users to learn a formula syntax. Adds complexity without clear advantage over Narrative View + inline editing. |
| Slot-Based Strategy Board | Brainstorming A5 | **Parked** | Strong beginner concept, but too constrained for the current user mix. Could work as a future "guided creation" mode. |
| "Replace pattern" single-action swap | Party Mode Round 3 (Yuki) | **Parked for v2+** | Requires either explicit grouping metadata or runtime pattern detection. Architecturally non-trivial. The simpler "change source in condition list" variant may ship in v2 alongside embedded conditions. |
| Separate mobile card-stack editor | Problem-Solving Principle 3 | **Parked** | 4–6 weeks of dedicated work. Evaluate after v1 mobile usage data. If mobile building sessions exceed 30%, invest. |
| Risk-first build flow | Brainstorming R1 | **Parked** | Valuable pedagogical concept. Consider as a wizard variant or onboarding experiment, not a canvas change. |
| Parameter sweep / batch backtest | Brainstorming (Yuki) | **Dropped from canvas scope** | Backend-intensive. Belongs in a backtesting PRD, not a canvas redesign. |
| Strategy diff view | Brainstorming P3 | **Parked** | Useful for power users. Low urgency. Consider after debugger ships. |
| Type-Encoded Port Visuals in v1 | PRD FR-12, FR-13 | **Deferred to v2** | Proximity snapping largely eliminates the "wrong port" problem. Port visuals become redundant for most users. Still valuable for error prevention; ship when design iteration is complete. |

---

## 7. Watch List

Risks and assumptions requiring active monitoring during implementation.

| # | Item | Trigger | Action |
|---|------|---------|--------|
| W-01 | **Client-side validation logic drift** | Health Bar shows "complete" but backend validation rejects, or vice versa. | Monitor validation discrepancy rate in production. If >2% discrepancy, prioritize shared validation spec (R-01 from architecture review). |
| W-02 | **Proximity snap phantom connections** | Users report unexpected connections they didn't intend. | Monitor support tickets and snap-connection-then-undo rate. If undo-within-5-seconds exceeds 15% of snap connections, increase snap threshold confirmation time or add explicit confirmation step. |
| W-03 | **Narrative View accuracy** | Users report narrative text that doesn't match actual strategy logic. | The Strategy Explanation Generator is deterministic and template-based, so errors should be systematic, not random. If reported, fix the template. Track Narrative View usage and abandonment rate. |
| W-04 | **Mobile usage patterns** | Need data on whether mobile users build or just monitor. | Instrument: (a) % of strategy edits on mobile, (b) session duration on mobile vs. desktop, (c) which features are used on mobile. Review at 30 days post-launch. |
| W-05 | **Popover keyboard conflicts on mobile** | Mobile keyboard covers bottom sheet, or scroll conflicts make editing painful. | Test on iOS Safari and Android Chrome specifically during Sprint 2. Implement `visualViewport` API scroll adjustment (R-05 from architecture review). |
| W-06 | **Returning user disorientation** | Existing users confused by inline popovers replacing Inspector Panel behavior. | Monitor Inspector Panel "Details" button usage. If >50% of returning users immediately open Inspector Panel, consider a one-time "what's new" tooltip on first canvas load post-upgrade. |
| W-07 | **Recipe Card deduplication edge cases** | Recipe dropped near multiple Input blocks connects to the wrong one. | Monitor recipe-card-then-undo rate. If elevated, tighten deduplication to nearest-compatible-port-only with a clearer disambiguation prompt. |
| W-08 | **Feature flag interaction complexity** | Embedded Conditions enabled without Inline Popovers creates a feature with no UI surface. | Enforce flag dependency graph: Embedded Conditions requires Inline Popovers. Document required flag combinations (R-07 from architecture review). |
| W-09 | **OQ-01 decision delay** | Traffic Lights (v2) blocked if evaluation path not decided. | Begin technical spike no later than Week 8. If spike reveals neither path meets the 500ms latency target for 20 blocks, descope to a "latest candle summary" badge on the Entry Signal block only (not per-block evaluation). |
| W-10 | **Performance budget creep** | Cumulative overhead from all v1 overlays (Health Bar, popovers, port glow, narrative generation) pushes canvas render time above 500ms on mobile. | Profile on target devices (iPhone 13, Pixel 6) after each sprint. CI performance budget: fail if 20-block render exceeds 450ms (R-08 from architecture review). |

---

*This synthesis represents the convergence of six analysis sessions and seven expert perspectives. The canvas redesign is ready for implementation. The MVP is tight: Health Bar, Narrative View, Inline Popovers, and Proximity Snapping — comprehension and construction, in that order. The North Star is the debugger. The principle on the wall is Continuous Partial Feedback. The canvas stops being silent.*

*"The best meeting is the one that ends with everyone knowing exactly what to build next." — Nobody famous, but it should be.*
