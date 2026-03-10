# Architecture Review: Visual Strategy Canvas Editor Redesign

**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Author:** Architect Agent (BMad Method)
**Date:** 2026-03-09
**Status:** Complete — Ready for Story Breakdown
**Reviewed PRD:** `PRD-canvas-editor-redesign.md` v1.0

---

## 1. Feasibility Assessment

| Change | Feasible within React Flow? | Requires schema change to `definition_json`? | Impacts backtest interpreter? | Risk level |
|--------|---------------------------|---------------------------------------------|------------------------------|------------|
| **Strategy Health Bar (FR-26–31)** | Yes. Rendered outside the React Flow canvas as an absolutely-positioned DOM element. Uses existing validation rules client-side. No custom nodes needed. | No. Reads `{blocks, connections}` without modification. | No. | **Low** |
| **Inline Parameter Popovers (FR-16–22)** | Yes. Custom node components already render block content; adding a popover on click/tap is standard React. Auto-positioning requires measuring viewport bounds — libraries like Floating UI handle this. Mobile bottom sheet uses existing shadcn/ui Sheet. | No. Same parameter schema drives both the popover and the current Inspector Panel. | No. | **Low** |
| **Proximity Snap Connections (FR-08–15)** | Yes. React Flow's `onNodeDrag` / `onNodeDragStop` events provide real-time node positions. Distance calculations between ports are straightforward geometry. `isValidConnection` already exists for type-checking. The snap preview (dashed wire + port glow) requires a temporary edge rendered via `setEdges` or a custom overlay. | No. Created connections are identical to manual connections — same `connections` array entries. | No. | **Medium** — complexity is in the real-time distance calculation performance during drag, especially with many nodes. Needs throttling (requestAnimationFrame). |
| **Type-Encoded Port Visuals (FR-12–13)** | Yes. Custom handle components in React Flow support arbitrary SVG shapes and colors. The `isValidConnection` prop already blocks invalid connections; dimming incompatible ports during drag requires tracking the active drag source type via `onConnectStart`. | No. Port data types are already implicit in block type definitions. Visual encoding is purely presentational. | No. | **Low** |
| **Narrative View Toggle (FR-32–34)** | Yes. An overlay div on top of (or replacing) the React Flow viewport. Clause-click navigation uses `setCenter` / `fitView` with node coordinate lookups. Uses the existing Strategy Explanation Generator engine. | No. Reads blocks and connections; generates text deterministically. | No. | **Low** |
| **Recipe Cards / Patterns (FR-01–07)** | Yes. Recipe card expansion is a batch `setNodes` + `setEdges` call. Snap-to-existing-input deduplication requires a proximity check on drop (same geometry as proximity snapping). The Block Library already uses a bottom sheet; adding a "Patterns" tab is a UI addition. | **Additive only.** Optional `metadata.recipe_source` on blocks — ignored by interpreter. No structural change to `blocks` or `connections` arrays. | No. Interpreter ignores unknown fields in `params` and top-level block properties. | **Low** |
| **Traffic Light Live Preview (FR-35–36)** | Yes, from the React Flow side — custom node overlays for glow effects and value badges. The challenge is **not** React Flow but the **evaluation engine** (see OQ-01). Either a new backend endpoint or a client-side JS indicator library is required. | No. Evaluation is read-only against the current definition + latest candle data. | No — but requires either a new backend endpoint or a client-side indicator library that mirrors the Python backend's computations. | **Medium–High** — the indicator parity risk is the primary concern. A client-side JS library must produce identical outputs to the Python `backend/app/backtest/indicators.py` for all 11 indicator types. |
| **Embedded Conditions on Signal Blocks (FR-37–41)** | Yes. The signal block's custom node component gains a condition list UI in its popover. Auto-wiring from condition additions uses `setEdges`. | **Yes — additive schema extension.** `params.conditions` array and `params.logic` field on `entry_signal` and `exit_signal` blocks. Existing strategies without these fields are unchanged. | **Yes.** The Python interpreter must check for `params.conditions` on signal blocks and evaluate them. This is the only interpreter change in the entire PRD. | **Medium** — the interpreter change is targeted and backward-compatible, but it introduces a second evaluation path (embedded conditions vs. external wiring) that must produce identical semantics. Regression testing is critical. |
| **Candle-by-Candle Debugger (FR-42–46)** | Yes for the UI — a timeline scrubber + per-node value badges are custom React components overlaid on React Flow nodes. The challenge is the **data source**: either stored per-block values (S3 storage cost) or client-side recomputation (requires the same JS indicator library from Traffic Lights). | No. Reads existing backtest results + candle data. No changes to `definition_json`. | No — but depends on the same OQ-01/OQ-02 resolution as Traffic Lights. | **High** — highest complexity feature. Scrubbing performance for 1095 candles × 20 blocks requires pre-computation or memoized computation. Real-time scrub at 100ms per step is aggressive. |
| **Mobile Enhancements (FR-47–50)** | Yes. Increased snap threshold is a config value. Vibration API is a one-line call. Bottom sheet rendering is already implemented (shadcn/ui Sheet). Full-screen Narrative View overlay is standard. | No. | No. | **Low** |

### Summary

Of the 10 major feature areas, only **Embedded Conditions** requires a `definition_json` schema change and interpreter modification. Everything else is either purely presentational or additive metadata that the interpreter ignores. This is an excellent architectural profile — the redesign is overwhelmingly a frontend evolution with one controlled backend extension.

---

## 2. Backend Contract Analysis

### Current Schema

The current `definition_json` stored in `strategy_versions.definition_json` (PostgreSQL JSON column) follows this structure:

```json
{
  "blocks": [
    {
      "id": "uuid-string",
      "type": "sma",
      "params": { "period": 20 },
      "position": { "x": 100, "y": 200 }
    }
  ],
  "connections": [
    {
      "from": { "block_id": "uuid-1", "port": "output" },
      "to": { "block_id": "uuid-2", "port": "input" }
    }
  ]
}
```

Notes and annotations are stored as React Flow nodes with `type: "note"` (per Section 4.7 of product docs). The interpreter ignores them.

### Change Classification Per Feature

| Feature | Schema Impact | Classification | Details |
|---------|--------------|----------------|---------|
| Health Bar | None | **No change** | Reads definition, computes completeness client-side. |
| Inline Popovers | None | **No change** | Same parameter schema, different UI surface. |
| Proximity Snap | None | **No change** | Created connections are identical to manual connections. |
| Type-Encoded Ports | None | **No change** | Port types derived from block type definitions, not stored. |
| Narrative View | None | **No change** | Read-only text generation from existing definition. |
| Recipe Cards | Optional `metadata.recipe_source` on blocks | **Additive — ignored** | `"metadata": {"recipe_source": "rsi_oversold_bounce"}` on block objects. Interpreter skips unknown top-level properties on blocks. |
| Traffic Lights | None | **No change** | Evaluation is ephemeral; results not stored in definition. |
| Embedded Conditions | `params.conditions` + `params.logic` on signal blocks | **Additive — interpreter must recognize** | New optional fields. Absence means "use inbound wires as today." |
| Debugger | None | **No change** | Reads existing backtest results and candle data. |
| Mobile Enhancements | None | **No change** | Interaction-layer only. |

### Embedded Conditions Schema Detail

The proposed schema extension (FR-37):

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
      }
    ],
    "logic": "and"
  }
}
```

**Compatibility rules:**

1. **Existing strategies** (no `conditions` field): Interpreter follows inbound `connections` exactly as today. Zero behavior change.
2. **New strategies with `conditions`**: Interpreter evaluates the conditions array with the specified logic. Connections are also auto-created on the canvas when conditions are added (FR-40), so the visual representation stays consistent.
3. **Mixed mode** (both `conditions` and external wires): Defined in OQ-03 — proposed resolution is external wire treated as additional AND. A warning banner is displayed.

**Critical validation requirement:** The interpreter must produce identical outputs whether a condition is expressed as an embedded condition or as explicit Compare → AND → Entry Signal wiring. This is the single most important regression test for the entire redesign.

### Versioning Recommendation

**No `definition_json` versioning needed.** The schema change is purely additive. The PostgreSQL JSON column accepts any valid JSON without schema modification (confirmed in FR-54 — no Alembic migration needed for the column itself). The interpreter change is backward-compatible by design: the absence of `conditions` means "use legacy evaluation."

If future phases introduce more structural changes, I recommend adding an optional top-level `"schema_version": 2` field. But for this PRD, it's unnecessary overhead.

---

## 3. Component Architecture

### 3.1 Main Canvas Container

**Component:** `SmartCanvas` (wraps existing `StrategyCanvas`)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Orchestrates all canvas sub-systems: React Flow instance, Health Bar, Narrative View overlay, Live Preview state, Debugger timeline. Manages feature flag checks. |
| **Inputs** | Strategy definition (blocks + connections), strategy metadata (asset, timeframe), backtest results (for debugger), feature flags |
| **Outputs** | Serialized `definition_json` on save, validation state, user interaction events |
| **Replaces/Wraps** | Wraps existing `StrategyCanvas.tsx`. The existing component becomes the inner React Flow host; `SmartCanvas` adds the new overlay layers. |
| **New Dependencies** | None beyond existing React Flow. Feature flag reads from PostHog client SDK (already integrated). |

**Rationale:** Wrapping rather than rewriting `StrategyCanvas` preserves all existing behavior (undo/redo, autosave, copy/paste, minimap, auto-layout) and lets new features be toggled independently.

### 3.2 Block/Node Renderer

**Component:** `SmartBlockNode` (extends existing custom node components)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Renders a single block on the canvas. Adds: type-encoded port handles (shape + color), traffic light glow overlay, debugger value badge, popover trigger zone, recipe card group outline (temporary). |
| **Inputs** | Block data (type, params, id), port type definitions, live preview state (optional), debugger candle values (optional), compact/expanded mode |
| **Outputs** | Click/tap events (for popover), drag events (for proximity snap) |
| **Replaces/Wraps** | Extends the current custom node renderer. Existing compact/expanded mode logic is preserved. |
| **New Dependencies** | None. Port type definitions are derived from a static mapping (block type → port types). |

**Port type mapping** (static, not stored in definition):

| Block Type | Output Port Type | Input Port Types |
|------------|-----------------|------------------|
| `price`, `volume`, `yesterday_close`, `price_variation_pct` | `numeric_array` | — |
| `constant` | `numeric_array` | — |
| `sma`, `ema`, `rsi`, `atr`, `obv` | `numeric_array` | `numeric_array` |
| `macd`, `bbands`, `stochastic`, `adx`, `ichimoku`, `fibonacci` | `numeric_array` (multiple outputs) | `numeric_array` |
| `compare`, `crossover` | `boolean` | `numeric_array` × 2 |
| `and`, `or` | `boolean` | `boolean` × 2 |
| `not` | `boolean` | `boolean` |
| `entry_signal`, `exit_signal` | — | `boolean` |
| Risk/exit blocks | — | — (standalone config) |

This mapping is defined once in a shared constants file and consumed by both the port renderer and the `isValidConnection` handler.

### 3.3 Connection/Edge Renderer

**Component:** `SmartEdge` (extends React Flow default edge)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Renders connection wires with type-appropriate colors. Adds: animated pulse for debugger "active signal" highlighting, snap preview (dashed) mode. |
| **Inputs** | Connection data (from/to), edge type (solid/dashed/animated), source port type (for color) |
| **Outputs** | — (purely visual) |
| **Replaces/Wraps** | Replaces default React Flow edge with a custom edge component. |
| **New Dependencies** | None. Custom edges are a standard React Flow extension point. |

### 3.4 Block Library / Discovery

**Component:** `PatternAwareBlockLibrary` (extends existing `BlockLibrarySheet`)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Adds a "Patterns" tab to the existing Block Library Bottom Sheet. Displays recipe cards with mini-diagrams, descriptions, and difficulty indicators. Handles drag-out of recipe cards. |
| **Inputs** | Recipe card catalog (static data), existing block definitions |
| **Outputs** | Drop events with recipe card ID and canvas position |
| **Replaces/Wraps** | Extends `BlockLibrarySheet` by adding one tab. Existing tabs (Indicators, Logic, Risk, Signals, Data) and search/favorites/recents are unchanged. |
| **New Dependencies** | Recipe card catalog data (JSON, bundled in frontend). Mini-diagram rendering uses simple SVG (no new library). |

### 3.5 Parameter Editing

**Component:** `InlineParameterPopover`

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Renders parameter controls (sliders, dropdowns, number inputs, presets) anchored to a block's canvas position. On mobile, renders as a bottom sheet. Includes "Details" button to open full Inspector Panel. For signal blocks, includes the condition list UI. |
| **Inputs** | Block data, parameter schema (same schema as Inspector Panel), signal block condition state |
| **Outputs** | Parameter change events, condition add/remove events |
| **Replaces/Wraps** | Does not replace the Inspector Panel — coexists as primary editing surface. Inspector Panel becomes secondary ("Details" view). |
| **New Dependencies** | Floating UI (for smart positioning) — lightweight, no-dependency library. Already a transitive dependency of many UI libraries. If shadcn/ui's Popover uses Radix, that may suffice without adding Floating UI directly. |

**Signal block condition list sub-component:**

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Renders the ALL/ANY toggle, condition list, and "+ Add condition" picker inside the signal block's popover. |
| **Inputs** | Current `params.conditions` array, `params.logic` value, list of available upstream block outputs |
| **Outputs** | Condition add/remove/toggle events → updates `params.conditions` and `params.logic`, triggers auto-wire creation |

### 3.6 Validation Feedback Layer

**Component:** `HealthBar`

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Persistent bar above the canvas showing Entry/Exit/Risk segment completeness. Evaluates client-side from current definition using the same rules as `POST /strategies/{id}/validate`. Provides one-tap block placement from incomplete segments. |
| **Inputs** | Current canvas definition (blocks + connections), validation rules |
| **Outputs** | Navigation events (scroll to area), block placement events (auto-place + auto-connect) |
| **Replaces/Wraps** | New component. Complements (does not replace) existing validation error highlighting on the canvas. |
| **New Dependencies** | None. Validation rules are reimplemented client-side from the same logic in `backend/app/backtest/interpreter.py` validation section. This creates a duplication concern — see Risk Register. |

### 3.7 Layout Engine / Arrangement Logic

**Component:** `RecipeCardExpander` (utility, not a visual component)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Expands a recipe card into constituent blocks + connections. Handles proximity deduplication of Input blocks. Calculates placement positions that avoid overlapping existing blocks. |
| **Inputs** | Recipe card definition, drop position, current canvas nodes, auto-layout direction preference |
| **Outputs** | Array of new nodes + edges to batch-add via `setNodes` / `setEdges` |
| **Replaces/Wraps** | New utility. Uses existing auto-layout heuristics for position calculation. |
| **New Dependencies** | None. |

### 3.8 Mobile Adaptation Layer

**Component:** No new component needed.

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Mobile adaptations are config-driven, not component-driven. Snap threshold (60px → 80px) is a responsive value. Popover → bottom sheet switch is handled by `InlineParameterPopover` internally based on viewport width. Haptic feedback is a one-line call in the snap confirmation handler. |
| **Inputs** | Viewport width (from `DisplayContext`'s `isMobileMode`) |
| **Outputs** | — |
| **Replaces/Wraps** | Extends existing mobile behavior. The `DisplayContext` already provides `isMobileMode`. |
| **New Dependencies** | None. Vibration API is a browser standard. |

### 3.9 Live Preview Engine

**Component:** `LivePreviewEngine` (service / hook, not a visual component)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | When Live Preview is toggled on, fetches the latest candle data for the strategy's asset/timeframe, evaluates each block's output, and provides per-block evaluation results to `SmartBlockNode` for rendering. |
| **Inputs** | Current canvas definition, strategy asset/timeframe, toggle state |
| **Outputs** | Map of block ID → evaluation result (boolean or numeric value) |
| **Replaces/Wraps** | New. |
| **New Dependencies** | **This is the major dependency decision (OQ-01).** Either: (a) a new backend endpoint `POST /strategies/{id}/preview` that accepts the definition + latest candle and returns per-block values, or (b) a client-side JavaScript indicator library. See ADR-05. |

### 3.10 Debugger

**Component:** `CandleDebugger`

| Aspect | Detail |
|--------|--------|
| **Responsibility** | After backtest completion, provides a timeline scrubber and per-block value display for each candle in the backtest range. |
| **Inputs** | Backtest results (trades, equity curve), candle data, strategy definition |
| **Outputs** | Per-block values at current scrubber position → consumed by `SmartBlockNode` for badge rendering |
| **Replaces/Wraps** | New. |
| **New Dependencies** | Same as Live Preview — requires either stored per-block values or client-side recomputation. |

---

## 4. State Management

### 4.1 State Flow

```
User Interaction
     │
     ▼
React Flow Internal State (nodes[], edges[], viewport)
     │
     ├──► SmartCanvas Local State
     │      ├── healthBarState (computed from nodes/edges)
     │      ├── livePreviewResults (Map<blockId, value>)
     │      ├── debuggerState (currentCandle, perBlockValues)
     │      ├── activePopover (blockId | null)
     │      └── narrativeViewActive (boolean)
     │
     ├──► Undo/Redo Stack (existing)
     │      └── Captures nodes + edges snapshots
     │
     ▼
Serialization (canvas-utils.ts)
     │
     ▼
definition_json  ──►  API  ──►  PostgreSQL
                               (strategy_versions.definition_json)
```

### 4.2 Undo/Redo Integration

The existing undo/redo system (Section 4.13 of product docs) captures canvas state snapshots in an in-memory stack (50 states). All new interactions must produce undoable state changes:

| Interaction | Undo Behavior | Implementation |
|-------------|--------------|----------------|
| Proximity snap connection | Remove connection, restore block to pre-drop position | Single snapshot before drop, restore on undo |
| Inline popover parameter edit | Revert parameter to previous value | Snapshot before popover opens; commit on close |
| Recipe card placement | Remove all constituent blocks + connections | Single snapshot before expansion |
| Health Bar one-tap placement | Remove auto-placed block + auto-created connection | Single snapshot before placement |
| Embedded condition add/remove | Revert conditions array + remove/restore auto-wire | Snapshot before condition change |

**Key principle:** Each user-perceived action is one undo step. Recipe card expansion (which creates 4 blocks + 3 connections) is a single undo step, not 7.

### 4.3 Autosave Integration

The existing autosave mechanism (10-second debounce after last change, per Section 4.11.3) triggers on any structural or parameter change. All new edit paths must fire the same change event:

- Proximity snap connection → fires same event as manual connection
- Inline popover parameter change → fires same event as Inspector Panel change
- Recipe card placement → fires change event after expansion
- Embedded condition change → fires change event after conditions array update
- Health Bar one-tap placement → fires change event after block + connection creation

No new autosave logic is needed. The existing debounce mechanism handles all cases.

### 4.4 New State Concerns

| State | Scope | Persistence | Notes |
|-------|-------|-------------|-------|
| Health Bar collapsed/expanded | Per-user | localStorage | FR-31. Key: `healthbar_state`. |
| Active popover block ID | Session | React state | Cleared on canvas interaction outside popover. |
| Narrative View toggle | Session | React state | Not persisted across page loads. |
| Live Preview toggle | Session | React state | Not persisted. Expensive to compute — should not auto-activate. |
| Debugger scrubber position | Session | React state | Tied to specific backtest run. |
| Recipe card group outline timer | Session | React state (setTimeout) | 3-second fade, purely visual. |
| Live Preview evaluation results | Session | React state (Map) | Recomputed on toggle-on and debounced on changes (2s per OQ-06). |

None of these require backend storage or `definition_json` changes.

---

## 5. Migration Strategy

### 5.1 Existing `definition_json` Compatibility

**Can existing strategies render in the new canvas without transformation?** Yes.

Every existing feature of the current canvas is preserved in the redesign. The new canvas wraps the existing `StrategyCanvas` and adds layers on top. Specifically:

- Blocks render identically (same custom node components, extended with optional overlays).
- Connections render identically (same edge data structure, custom edge adds optional visual enhancements).
- Parameters are unchanged (same schema drives both popover and Inspector Panel).
- Notes/annotations are unchanged (still React Flow nodes of type "note").
- Layout positions are unchanged (stored in block `position` field).

**No transformation is needed on load. No migration is needed.**

### 5.2 Round-Trip Fidelity

**Can a strategy go: new canvas → save → load in new canvas → save, and produce identical `definition_json`?** Yes, with one caveat.

- For strategies that do NOT use embedded conditions or recipe card metadata: the `definition_json` is byte-equivalent before and after (FR-51). No phantom fields are added.
- For strategies that DO use embedded conditions: the `conditions` and `logic` fields are added to the signal block's `params`. If the user later removes all embedded conditions, these fields are removed entirely (FR-52) — not left as empty arrays.
- For strategies with recipe card metadata: the optional `metadata.recipe_source` field is preserved on save and ignored by the interpreter (FR-53).

### 5.3 Migration Approach

**No migration needed.** This is lazy-compatible by design:

- Old strategies load on the new canvas without modification.
- New features activate only when the user explicitly uses them.
- The interpreter extension for `conditions` is backward-compatible: absence of the field means "use legacy evaluation."

### 5.4 Rollback Plan

Feature flags (NFR-10) provide the rollback mechanism. Each major feature is independently toggleable:

| Feature | Rollback Scope | Rollback Impact |
|---------|---------------|-----------------|
| Health Bar | Hide the bar | Zero data impact |
| Inline Popovers | Revert to Inspector-only editing | Zero data impact |
| Proximity Snap | Disable snap detection; manual wiring still works | Zero data impact |
| Narrative View | Hide the toggle | Zero data impact |
| Recipe Cards | Hide the Patterns tab | Blocks already expanded are standard blocks — no impact |
| Traffic Lights | Hide the toggle | Zero data impact |
| Embedded Conditions | Disable the condition list UI | Strategies already using conditions still have `conditions` in JSON. Interpreter still evaluates them. The rollback here is UI-only — the backend capability persists. |
| Debugger | Hide the Replay button | Zero data impact |

**Worst-case rollback:** Disable all feature flags simultaneously. The canvas reverts to current behavior. No data loss, no interpreter changes needed (the `conditions` interpreter extension is always backward-compatible).

For a full code rollback (reverting the deployment), the only concern is strategies saved with `conditions` during the rollout window. These strategies would need either: (a) the `conditions` interpreter extension to remain deployed even after UI rollback, or (b) a data fix to convert embedded conditions back to explicit wiring. Option (a) is strongly preferred — the interpreter extension is small, well-tested, and has no side effects on strategies without conditions.

---

## 6. Performance Considerations

### 6.1 Canvas Render Time

**Baseline:** A 20-block strategy with the current canvas renders in ~200-300ms on a mid-range device (estimated from React Flow benchmarks and existing implementation).

**New overhead per feature:**

| Feature | Additional Render Cost | Justification |
|---------|----------------------|---------------|
| Health Bar | ~5ms | Simple DOM element outside React Flow. Computed from a single pass over blocks/connections. |
| Type-encoded ports | ~10ms total | Custom SVG handles instead of default circles. Marginal per-node cost. |
| Inline popovers | 0ms (on initial render) | Popover only mounts when a block is clicked. |
| Traffic light glows | ~15ms (when active) | CSS glow effect (box-shadow or filter) on each node. GPU-accelerated. |
| Debugger badges | ~20ms (when active) | Per-node text badge overlay. Similar cost to compact labels. |
| Narrative View | 0ms (on initial render) | Overlay only mounts when toggled on. |

**Estimated total render time with all overlays:** 300-350ms for a 20-block strategy. Well within the 500ms NFR-01 target.

### 6.2 React Flow Re-Render Concerns

**Proximity snap during drag:** The `onNodeDrag` event fires on every mouse/touch move. Computing distances between the dragged node's ports and all other nodes' ports is O(N × P) where N = node count and P = average ports per node. For 20 nodes × ~3 ports = 60 distance calculations per frame. This is trivial — well under 1ms per frame.

**Critical optimization:** Throttle the snap detection to requestAnimationFrame (16ms intervals). Do NOT compute on every pixel of mouse movement.

**Live Preview re-evaluation:** When editing with Live Preview active, re-evaluation must be debounced (recommended: 2 seconds per OQ-06). Without debouncing, every slider adjustment would trigger a full evaluation cycle (up to 500ms). This would cause visible jank.

### 6.3 Debugger Scrub Performance

The 100ms-per-step target (NFR-04) for scrubbing 20 blocks across 1095 daily candles is achievable if per-block values are **pre-computed** (either stored from the backtest run or computed once on debugger activation and held in memory).

**Memory budget:** 20 blocks × 1095 candles × ~8 bytes per value = ~175 KB. Trivial.

**Pre-computation time:** If using client-side JS indicators, computing all 11 indicator types across 1095 candles takes ~50-200ms (depending on indicator complexity). This happens once when the debugger activates, not on every scrub step.

**Scrub rendering:** With pre-computed values, each scrub step is a lookup into a pre-built array + React state update for 20 badge values. This is comfortably under 100ms.

### 6.4 Mobile Performance

**Primary concern:** Proximity snap distance calculations during drag on low-end mobile devices. The same O(N × P) calculation applies, but touch events may fire more frequently than mouse events on some devices.

**Mitigation:** requestAnimationFrame throttling (same as desktop). Additionally, the increased snap threshold (80px vs 60px) on mobile means snap detection triggers earlier, reducing the window of continuous calculation.

**Secondary concern:** Bottom sheet rendering for popovers with many parameters. The existing shadcn/ui Sheet handles this well — no new concern.

---

## 7. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-01 | **Client-side validation logic diverges from backend validation** — The Health Bar reimplements validation rules client-side. If these drift from `POST /strategies/{id}/validate`, the Health Bar may show "complete" when the backend rejects, or vice versa. | Medium | Medium | Extract validation rules into a shared specification (JSON schema or rule DSL). Generate both Python and TypeScript validators from the same spec. Short-term: write integration tests that run identical scenarios against both validators and assert matching results. |
| R-02 | **Embedded conditions produce different results than explicit wiring** — The interpreter's `conditions` evaluation path must be semantically identical to the equivalent explicit block graph. Subtle differences (evaluation order, floating-point edge cases) could produce different backtest results. | Medium | High | Dedicated regression test suite: for each initial recipe card pattern, create two versions — one with embedded conditions, one with explicit wiring — and assert byte-identical backtest outputs. Run this suite in CI. |
| R-03 | **Client-side JS indicator library produces different results than Python library** — If OQ-01 is resolved as client-side, maintaining parity between JS and Python indicator implementations across 11 indicator types is a persistent maintenance burden. | Medium (if client-side chosen) | High | Use the same test vectors. Generate expected outputs from the Python library for a set of canonical inputs; assert JS library produces identical outputs (within floating-point tolerance, e.g., 1e-10). Automate this as a cross-language test. |
| R-04 | **Proximity snap UX confusion with multiple nearby ports** — The disambiguation popup (FR-11) for equidistant ports may fire too frequently in dense strategies, disrupting flow. | Low | Medium | Set the "equidistant" threshold tightly (5px as specified). In practice, blocks are rarely placed precisely equidistant from two compatible ports. Monitor usage analytics after launch; adjust threshold if popup frequency exceeds 5% of snap events. |
| R-05 | **Mobile popover / bottom sheet conflicts with keyboard** — On mobile, editing numeric parameters opens the software keyboard, which may push the bottom sheet out of view or create scroll conflicts. | Medium | Medium | Implement `visualViewport` API-based scroll adjustment. When the keyboard opens, scroll the bottom sheet to keep the active input visible. Test on iOS Safari and Android Chrome specifically — their keyboard behaviors differ significantly. |
| R-06 | **Recipe card proximity deduplication removes the wrong Input block** — When a recipe card is dropped near multiple Input blocks, the deduplication logic might connect to an unintended Price/Volume block. | Low | Low | Only deduplicate Input blocks (Price, Volume) as specified. Use nearest-compatible-port logic (same as proximity snap). The group outline (3-second fade) gives the user visual confirmation; undo is available as escape hatch. |
| R-07 | **Feature flag interaction complexity** — With 8 independent feature flags, there are 256 possible combinations. Some combinations may produce unexpected UX (e.g., Embedded Conditions enabled but Inline Popovers disabled — the condition list UI has no surface). | Medium | Low | Define a dependency graph for feature flags: Embedded Conditions requires Inline Popovers. Enforce this in the flag configuration (PostHog supports flag dependencies). Document required flag combinations. |
| R-08 | **Performance regression on canvas load** — Cumulative overhead from all new overlays (Health Bar computation, port type rendering, potential Live Preview auto-activation) could push render time above 500ms on lower-end mobile devices. | Low | Medium | Profile render time on target devices (iPhone 13, Pixel 6) after each feature ships. Set a CI performance budget: fail the build if canvas render time exceeds 450ms in the benchmark scenario (20 blocks, all overlays except Live Preview). |
| R-09 | **Undo/redo stack corruption from recipe card expansion** — Recipe card expansion creates multiple nodes and edges in a single operation. If the undo snapshot is taken incorrectly (e.g., between node additions), undo could leave the canvas in an inconsistent state. | Low | High | Wrap recipe card expansion in a single atomic operation: snapshot before, batch `setNodes` + `setEdges`, snapshot after. The undo system should treat the entire expansion as one step. Test with undo immediately after recipe card drop. |
| R-10 | **Interpreter deployment coupling** — The embedded conditions interpreter change (FR-38) must be deployed alongside or before the frontend UI that creates conditions. If the frontend ships first, users could create strategies with `conditions` that the backend can't evaluate. | Medium | High | Deploy the interpreter extension (backend) first. It's backward-compatible and has no effect until strategies with `conditions` exist. Then enable the frontend feature flag. This is a strict deployment ordering requirement. |

---

## 8. Recommended Implementation Sequence

### Phase 1: Foundation (Weeks 1–3)

**Goal:** Ship the lowest-risk, highest-impact features. Validate the wrapping architecture.

| Order | Feature | Rationale |
|-------|---------|-----------|
| 1.1 | **SmartCanvas wrapper + Health Bar** | Proves the wrapping pattern works without modifying any existing canvas behavior. Health Bar is the highest impact-to-effort feature. Ships value immediately. |
| 1.2 | **Inline Parameter Popovers** | Second-highest daily impact. Validates the popover positioning system (Floating UI / Radix) and the mobile bottom sheet adaptation. |
| 1.3 | **Proximity Snap Connections** | Core interaction model change. Builds on the SmartCanvas wrapper. Validates the real-time distance calculation performance. |

**Checkpoint 1:** After Phase 1, run a cohort test comparing redesign users vs. control on: (a) time to first valid strategy (G-01), (b) connection error rate (G-03), (c) Inspector Panel usage vs. popover usage (G-04). If metrics are neutral or positive, proceed.

### Phase 2: Comprehension (Weeks 4–5)

**Goal:** Add comprehension and discovery features. No schema changes yet.

| Order | Feature | Rationale |
|-------|---------|-----------|
| 2.1 | **Narrative View Toggle** | Small build, uses existing Strategy Explanation Generator. High comprehension value. |
| 2.2 | **Recipe Cards in Block Library** | Builds on proximity snap (recipe blocks snap to existing Input blocks). Validates the recipe expansion + deduplication logic. |
| 2.3 | **Type-Encoded Port Visuals** | Pure visual enhancement. Can ship incrementally — start with color only, add shapes later. |

**Checkpoint 2:** Measure strategy comprehension accuracy (G-05) via user interviews or in-app survey for Narrative View users.

### Phase 3: Live Feedback (Weeks 6–8)

**Goal:** Close the "preview desert." Resolve OQ-01 (server-side vs. client-side evaluation).

| Order | Feature | Rationale |
|-------|---------|-----------|
| 3.1 | **Resolve OQ-01** | Technical spike: build a proof-of-concept for both server-side endpoint and client-side JS indicator library. Compare: latency, accuracy vs. Python library, maintenance burden. Make the decision. |
| 3.2 | **Traffic Light Live Preview** | Depends on OQ-01 resolution. Medium-large build. Highest feedback value. |

**Checkpoint 3:** Measure Live Preview usage rate and time-to-backtest. If users toggle Live Preview frequently, the evaluation path is validated.

### Phase 4: Schema Extension (Weeks 9–11)

**Goal:** Ship the one breaking change — embedded conditions. Isolated from earlier phases to contain risk.

| Order | Feature | Rationale |
|-------|---------|-----------|
| 4.1 | **Deploy interpreter extension (backend)** | Backend-first deployment. No user-facing change. Run full regression suite. |
| 4.2 | **Embedded Conditions UI (frontend)** | Enable feature flag after backend is validated. Builds on inline popovers (condition list lives in the signal block's popover). |

**Checkpoint 4:** Compare strategies using embedded conditions vs. explicit wiring. Verify identical backtest results across a test matrix of condition patterns.

### Phase 5: Capstone (Weeks 12–16)

**Goal:** Ship the debugger — highest complexity, highest differentiation.

| Order | Feature | Rationale |
|-------|---------|-----------|
| 5.1 | **Candle-by-Candle Debugger** | Requires the evaluation infrastructure from Phase 3 (Live Preview). If OQ-01 was resolved as client-side, the debugger reuses the same JS indicator library. If server-side, OQ-02 must be resolved (stored vs. recomputed). |

**Checkpoint 5:** Measure debugger adoption and qualitative feedback from power users.

---

## 9. Architecture Decision Records (ADRs)

### ADR-01: Connection Model — Proximity Snap as Enhancement, Not Replacement

**Status:** Proposed

**Context:** The current canvas uses two connection methods: (1) drag a wire from output port to input port (desktop), and (2) tap source port, then tap target port (mobile). The PRD proposes proximity snap as a third method to reduce connection friction. The question is whether proximity snap replaces or supplements existing methods.

**Decision:** Proximity snap is an additive interaction method. Existing manual drag-to-connect and tap-tap modes remain fully functional as fallbacks (FR-14). Created connections are stored identically regardless of creation method — the `connections` array entry is the same.

**Alternatives considered:**
1. *Replace all connection methods with proximity snap.* Rejected: power users may prefer precise manual wiring for complex strategies. Removing existing methods creates unnecessary risk.
2. *Implicit connections based on block type and position (no ports at all).* Rejected: too aggressive a change. Ambiguous when multiple compatible blocks exist. The PRD explicitly preserves port-based connections.

**Consequences:** Three connection methods increases interaction surface area and test matrix. Connection creation code must be connection-method-agnostic — the resulting data structure is identical regardless of creation method. Undo behavior must be consistent across all three methods.

---

### ADR-02: `definition_json` Compatibility — Additive Extension, No Versioning

**Status:** Proposed

**Context:** The redesign introduces two optional fields to `definition_json`: (1) `params.conditions` + `params.logic` on signal blocks, and (2) `metadata.recipe_source` on any block. The question is whether to version the schema.

**Decision:** No schema versioning. Both changes are purely additive. The interpreter is updated to recognize `conditions` when present and ignore it when absent. The `metadata.recipe_source` field is ignored by the interpreter entirely. The PostgreSQL JSON column requires no Alembic migration. Existing strategies serialize identically — no phantom fields are added unless the user explicitly uses the new features (FR-51, FR-52).

**Alternatives considered:**
1. *Add a `"schema_version": 2` top-level field.* Rejected for this phase: adds complexity without solving a real problem. All changes are backward-compatible. If future phases introduce breaking changes, versioning can be added then.
2. *Store embedded conditions as separate `conditions` JSON alongside `definition_json`.* Rejected: breaks the single-source-of-truth model. The canvas would need to reconcile two data sources. Embedded conditions belong inside the signal block's `params` because they are semantically part of the block's configuration.

**Consequences:** The interpreter must be carefully coded to handle the absence of `conditions` gracefully (defaulting to legacy behavior). Regression tests must cover both paths (with and without conditions) for every signal block evaluation scenario. The deployment ordering constraint (backend before frontend) is a direct consequence of this decision — see R-10.

---

### ADR-03: Mobile Canvas — Adapted Desktop with Responsive Thresholds

**Status:** Proposed

**Context:** The PRD mentions an alternative mobile projection (card stack, sentence builder) as a "future parked" idea. For this redesign, the question is how to handle mobile: adapt the existing desktop canvas with responsive tweaks, or build a separate mobile interaction model.

**Decision:** Adapt the desktop canvas with responsive thresholds and component swaps. Specifically: increased snap threshold (80px), popover → bottom sheet swap, haptic feedback, full-screen Narrative View overlay, and the existing mobile bottom action bar / minimap. No separate mobile interaction model.

**Alternatives considered:**
1. *Build a separate card-stack or sentence-builder mobile UI.* Rejected: significant engineering effort (PRD Non-Goals, Section 2). The product docs confirm the mobile-optimized canvas is already implemented (Section 4.11) and functional. The redesign enhances it incrementally.
2. *Disable new features on mobile entirely.* Rejected: mobile users would get a degraded experience. All new features (Health Bar, popovers, proximity snap, Narrative View) are designed to work on mobile with responsive adaptations.

**Consequences:** The canvas remains a single codebase with responsive breakpoints. Mobile testing is essential — every new feature must be verified at the `< 768px` breakpoint. The `DisplayContext`'s `isMobileMode` flag drives all responsive behavior, keeping the logic centralized.

---

### ADR-04: Layout Approach — Free-Form with Guided Hints

**Status:** Proposed

**Context:** The PRD explicitly rejects swim lanes / guided zones ("Too constraining for current user base" — Section 8, Future Parked). The question is whether the redesign imposes any layout constraints beyond what exists today.

**Decision:** Maintain free-form layout. Users place blocks anywhere on the canvas. The redesign adds two layout hints: (1) recipe card expansion follows the user's auto-layout direction preference (left → right or top → bottom), and (2) Health Bar one-tap placement positions blocks at contextually appropriate locations. Neither constrains the user — blocks can be moved after auto-placement.

**Alternatives considered:**
1. *Enforce directional flow (inputs left, outputs right).* Rejected: too constraining. Some users build top-to-bottom. The existing auto-layout feature already handles both directions without enforcement.
2. *Add swim lanes for input/indicator/logic/signal/risk zones.* Rejected by PRD. The minimap with section shortcuts (already implemented) provides navigation without layout constraints.

**Consequences:** The canvas remains flexible. Recipe card expansion must be smart about placement — it should not overlap existing blocks (FR-24 specifies a 20px offset if auto-layout is disabled and overlap would occur). The Health Bar's auto-placement logic must choose contextually sensible positions (e.g., stop loss block placed near the exit signal area).

---

### ADR-05: Traffic Light Evaluation — Recommended Client-Side with Server-Side Fallback

**Status:** Proposed (Pending OQ-01 Resolution)

**Context:** Traffic Light Live Preview (FR-35–36) and the Candle-by-Candle Debugger (FR-42–46) both require evaluating indicator block outputs. The current architecture has no client-side indicator computation — all computation happens in Python (`backend/app/backtest/indicators.py`). Two paths exist: (a) new server-side endpoint, (b) client-side JavaScript indicator library.

**Decision (Recommendation):** Build a client-side TypeScript indicator library that mirrors the Python backend's implementations. Use server-side as a fallback for complex indicators if parity is difficult to achieve.

**Rationale:**
- **Latency:** Client-side evaluation eliminates network round-trips. The 500ms latency target (NFR-03) is easier to meet without HTTP overhead (especially on mobile networks).
- **Debugger requirement:** The Candle-by-Candle Debugger needs per-block values for every candle in the backtest range. Server-side would require either storing all intermediate values (increased S3 cost) or making a very large API response. Client-side computes locally from candle data already fetched for the chart.
- **Offline-capable:** Client-side evaluation works without network connectivity after initial candle data fetch.
- **Shared investment:** The same library serves both Traffic Lights (Phase 3) and the Debugger (Phase 5).

**Alternatives considered:**
1. *Server-side endpoint only.* Simpler to build initially, guaranteed parity with Python. But: network latency, no debugger reuse, increased backend load. Rejected as primary path, but acceptable as interim solution for Phase 3 if the client-side library takes longer to build.
2. *WASM compilation of Python indicators.* Theoretically guarantees parity. Practically: complex build pipeline, limited browser debugging support, and the Python indicator implementations use NumPy which doesn't compile to WASM trivially. Rejected.

**Consequences:**
- A new `@blockbuilders/indicators` TypeScript package must be created and maintained alongside `backend/app/backtest/indicators.py`.
- Cross-language parity tests (Python outputs vs. TypeScript outputs for canonical inputs) must be automated in CI.
- The 11 indicator types (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, ADX, Ichimoku, OBV, Fibonacci) plus 5 logic block types (Compare, Crossover, AND, OR, NOT) must be implemented.
- Indicator implementations are mathematical — no external dependencies needed. This is a bounded, well-defined scope.

---

### ADR-06: Undo/Redo — Atomic Operations for Composite Actions

**Status:** Proposed

**Context:** Several new features produce composite canvas changes: recipe card expansion (multiple nodes + edges), Health Bar one-tap placement (node + edge), embedded condition addition (params update + edge). The existing undo/redo system captures snapshots of nodes + edges arrays. The question is how to ensure composite actions are single undo steps.

**Decision:** Wrap all composite actions in explicit undo transaction boundaries. Before a composite action begins, capture a pre-action snapshot. After all mutations complete, capture a post-action snapshot. The undo system treats the entire composite as one step.

**Implementation:** Add a `beginUndoTransaction()` / `commitUndoTransaction()` API to the existing undo hook. Between these calls, intermediate state changes are not captured individually. On undo, the entire transaction is reverted atomically.

**Alternatives considered:**
1. *Let each individual mutation be a separate undo step.* Rejected: recipe card expansion would require 7+ undos to fully revert, which is hostile UX.
2. *Use React Flow's built-in undo support.* React Flow does not have built-in undo. The existing custom implementation is appropriate.

**Consequences:** The undo transaction API must be used correctly by all composite actions. Missing a `commitUndoTransaction()` call could leave the undo system in an inconsistent state. Integration tests should verify that every composite action is a single undo step.

---

*This architecture review confirms the canvas editor redesign is technically feasible within the existing technology stack. The single controlled schema extension (embedded conditions) is the primary risk, mitigated by isolated deployment and comprehensive regression testing. The recommended implementation sequence prioritizes low-risk, high-impact features first, with natural checkpoints for validation before proceeding to higher-risk phases.*

*"Architecture is the art of how to waste space." — Philip Johnson. In our case: the art of how to not waste the user's space between their trading intent and their canvas.*
