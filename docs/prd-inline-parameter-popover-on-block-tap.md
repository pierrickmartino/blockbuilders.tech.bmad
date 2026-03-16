# PRD: Inline Parameter Popover on Block Tap

## 1. Summary
Add a feature-flagged inline parameter popover that opens when a user taps/clicks a block on the strategy canvas. The popover is anchored to the selected block, reuses the same parameter controls as today’s Inspector Panel, and keeps users in canvas context while editing. When disabled, behavior stays exactly as-is with the existing Inspector Panel.

## 2. Problem Statement
Parameter editing currently depends on a side Inspector Panel, which can break spatial context while users tune connected blocks. Users need fast, in-place edits near the block they are working on without losing orientation on the canvas.

## 3. Goals
- Keep parameter editing in canvas context with a block-anchored popover.
- Preserve editing parity by reusing the same controls as the current Inspector Panel.
- Ensure safe rollout with a feature-flag fallback to current Inspector behavior.

## 4. Non-Goals
- Redesigning block parameter schemas or adding new parameter types.
- Changing backend APIs, strategy JSON format, or validation rules.

## 5. Target Users & User Stories
### 5.1 Target Users
- Strategy canvas users on desktop and tablet/mobile who edit block parameters frequently.
- Users who rely on compact node labels to confirm parameter changes quickly.

### 5.2 User Stories
- As any user, I want to edit block parameters in a popover anchored to the block itself, so that I can adjust parameters without losing spatial context on the canvas.
- As any user, I want parameter edits in the popover to update the block label instantly, so that I can see the effect before closing the editor.
- As a product team member, I want this behind a feature flag, so that we can roll out safely and keep current Inspector behavior as fallback.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Open a block-anchored popover on block tap/click when `Inline Popovers` feature flag is enabled.
- Reuse existing Inspector Panel controls in the popover (sliders, dropdowns/selects, number inputs, presets).
- Use Floating UI or Radix positioning primitives so the popover stays fully visible at canvas edges.
- On outside click/tap close, commit the parameter change and trigger undo/redo history entry + autosave debounce.
- Real-time compact label updates while editing with a target of <=100ms from input change to visible label update.
- Feature-flag-off fallback to current Inspector Panel behavior with no UX regression.

### 6.2 Out of Scope
- Creating a second set of parameter components with different logic.
- Persisting partial drafts when popover is open across page reloads.
- New analytics events beyond existing editor analytics (optional follow-up).

### 6.3 Functional Requirements
- FR-1: When a user taps/clicks a canvas block and `Inline Popovers` is enabled, open a popover anchored to that block’s canvas position (not a side panel).
- FR-2: Popover content must include the same editable control types as Inspector Panel for the selected block.
- FR-3: Popover must auto-position/reposition to avoid clipping and remain fully visible within viewport.
- FR-4: As a user adjusts any popover control, the selected block’s compact label updates in real time with <=100ms target latency.
- FR-5: Clicking/tapping outside closes the popover and commits the final changes as a single history step compatible with existing undo/redo.
- FR-6: Popover close commit must trigger existing autosave debounce behavior.
- FR-7: When the feature flag is disabled, block tap must open the existing Inspector Panel exactly as today.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User taps/clicks a block on the canvas.
2. If feature flag is ON, inline popover opens next to the block with parameter controls.
3. User changes parameters via slider/input/dropdown/preset and sees compact label update immediately.
4. User taps/clicks outside the popover.
5. Popover closes, changes commit, undo/redo step is recorded, autosave debounce starts.
6. If feature flag is OFF, current Inspector Panel opens instead.

### 7.2 States
- Loading: Not applicable (local interaction).
- Empty: For blocks with no parameters, show a simple “No parameters” message in popover.
- Error: Inline validation messages stay the same as existing Inspector validation behavior.
- Success: Parameter value updates reflected in control value and compact node label.

### 7.3 Design Notes
- Reuse existing Inspector field components to minimize code and avoid behavior drift.
- Popover should use the same visual language as shadcn/Radix components already in use.
- Keep interaction simple: single active popover at a time.
- Maintain touch-friendly spacing and target sizes on mobile/tablet.

## 8. Data Requirements
### 8.1 Data Model
- No schema changes.
- Existing block parameter values in strategy definition JSON remain unchanged.
- Existing local editor state fields continue to hold draft/live values during edit.

### 8.2 Calculations / Definitions (if applicable)
- Label update latency: elapsed time between control `onChange` and rendered compact node label text update (target <=100ms on typical local edit path).

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Existing strategy save/version endpoints remain unchanged.

### 9.2 Validation & Error Handling
- Keep existing frontend validation ranges/messages from Inspector logic.
- If a value is invalid, show inline message and prevent invalid persisted state exactly as current behavior.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a feature-flag branch in canvas block-selection flow:
  - ON: render inline popover anchored to selected block.
  - OFF: keep Inspector Panel open path.
- Extract/reuse shared parameter form renderer used by Inspector Panel and popover.
- Use Floating UI or Radix collision-aware positioning (flip/shift/offset) for edge-safe placement.
- Keep one open popover instance and close it on outside interaction.
- Hook commit on close to existing history manager + autosave debounce path.
- Ensure label text derives from same source of truth updated by control changes.

### 10.2 Backend
- No backend changes required.

## 11. Rollout Plan
- Phase 1: Implement behind `Inline Popovers` feature flag with default OFF.
- Phase 2: Internal QA for desktop + mobile/touch edge placements and history/autosave behavior.
- Phase 3: Gradual enablement; monitor issues; keep fast rollback by disabling flag.

## 12. Acceptance Criteria
- [ ] Given I tap/click a block on the canvas when the popover opens, then it is anchored to the block position (not side panel), includes the same control types as Inspector Panel, and auto-positions to remain fully visible.
- [ ] Given I adjust a slider/input in the popover, when the value changes, then the block compact label updates in real time within 100ms target.
- [ ] Given I tap/click outside the popover, when it closes, then the parameter change is committed, included in undo/redo history, and autosave debounce is triggered.
- [ ] Given the Inline Popovers feature flag is disabled, when I tap a block, then the existing Inspector Panel opens as it does today.

## 13. Tracking Metrics (Optional)
- Popover edit completion rate — expected neutral-to-positive vs Inspector flow.
- Popover close-to-save success rate — expected >= current Inspector flow.
- Undo/redo reliability on parameter edits — expected parity with existing behavior.

## 14. Dependencies (Optional)
- Existing canvas selection/edit state management.
- Existing Inspector parameter form components.
- Floating UI or Radix positioning utilities already available in frontend stack.
- Existing autosave debounce and history manager wiring.

## 15. Risks & Mitigations (Optional)
- Risk: Popover clipping/overlap in dense graphs or near viewport edges.  
  Mitigation: Use collision-aware positioning with flip + shift and viewport boundary padding.
- Risk: Divergence between Inspector and popover controls over time.  
  Mitigation: Share one parameter form renderer between both surfaces.
- Risk: Too many history entries from live slider changes.  
  Mitigation: Keep draft/live updates real-time but commit a single history checkpoint on popover close.

## 16. Open Questions
- Should pressing `Esc` close the popover and commit, or close and discard uncommitted draft changes?
- Should opening a second block popover auto-commit and close the first one, or switch focus without commit?
