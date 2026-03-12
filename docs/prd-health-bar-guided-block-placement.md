# PRD: Health Bar - Guided Block Placement

## 1. Summary
Add guided one-tap block placement from incomplete Health Bar segments so beginners can complete missing strategy parts without searching the Block Library.

## 2. Problem Statement
Beginners can see that a Health Bar segment is incomplete, but they still need to manually find the right block and place/connect it. This creates friction and slows first-time strategy completion.

## 3. Goals
- Let users click an incomplete Health Bar segment and get contextual placement suggestions.
- Auto-place selected blocks in logical canvas positions with sensible auto-connections.
- Keep placement atomic (single undo step) and trigger autosave after placement.

## 4. Non-Goals
- Redesigning Health Bar segment state rules.
- Replacing manual block placement flows in the Block Library.
- Adding backend endpoints or schema changes.

## 5. Target Users & User Stories
### 5.1 Target Users
- Beginner strategy builders using the visual canvas.
- Users who want faster completion of missing Exit components.

### 5.2 User Stories
- As a beginner, I want to click an incomplete Health Bar Exit segment and get one-tap suggestions, so that I can add missing blocks quickly.
- As a user, I want suggested blocks to auto-place and auto-connect logically, so that I do not need to wire everything manually.
- As a user, I want suggested placement to be a single undo step, so that I can safely revert in one action.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Segment click interaction for incomplete Health Bar Exit state.
- Canvas focus/scroll to logical Exit area on segment click.
- Contextual suggestion menu with: Add Stop Loss, Add Exit Signal, Add Trailing Stop.
- One-tap placement flow that auto-creates block and logical connections.
- Undo transaction wrapping (`beginUndoTransaction` / `commitUndoTransaction`).
- Autosave trigger after successful placement transaction.

### 6.2 Out of Scope
- Suggestions for Entry and Risk segments (future iteration).
- Complex AI-driven placement ranking.
- Any backend persistence changes beyond existing autosave behavior.

### 6.3 Functional Requirements
- Segment click behavior:
  - Only active when Health Bar is visible and Exit segment is `incomplete`.
  - Clicking Exit segment scrolls/focuses canvas to the Exit zone.
  - A contextual suggestion menu opens anchored near the segment (desktop) or as a compact sheet/menu on mobile.
- Suggestion options:
  - Menu shows exactly: `Add Stop Loss`, `Add Exit Signal`, `Add Trailing Stop`.
  - Option labels are plain-language and keyboard/touch accessible.
- Placement behavior (example: Add Stop Loss):
  - Start undo transaction before modifications.
  - Insert block in a deterministic, valid Exit-area position.
  - Auto-connect to the most logical upstream/downstream nodes using existing connection rules.
  - Commit undo transaction once all mutations succeed.
  - Trigger a single autosave call after commit.
  - Recompute Health Bar state so Exit can move to `complete` if now valid.
- Failure handling:
  - If placement fails, rollback/cancel transaction and show plain-language non-blocking error.
  - Do not partially place block + connections.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User sees Exit segment marked incomplete in Health Bar.
2. User clicks Exit segment.
3. Canvas scrolls/focuses to Exit area and suggestion menu appears.
4. User clicks `Add Stop Loss`.
5. Block is auto-placed, connected, Health Bar updates, autosave runs.
6. User can undo once to revert whole placement.

### 7.2 States
- Loading: Suggestion click target disabled until canvas graph + Health Bar state are ready.
- Empty: Exit suggestions still available; placement targets default Exit zone anchor.
- Error: Placement/connection failure shows inline toast/banner with recovery hint.
- Success: Suggestion closes, canvas updates, Health Bar reflects latest state.

### 7.3 Design Notes
- Keep suggestion menu compact and fast; no multi-step modal.
- Preserve existing Health Bar visuals and only add subtle “click to fix” affordance on incomplete Exit.
- Maintain touch-friendly hit targets (minimum 44px) for menu options on mobile.

## 8. Data Requirements
### 8.1 Data Model
- `healthBarExitStatus` — enum (`complete|incomplete|warning`) — existing derived status gate for guided suggestions.
- `guidedPlacementSuggestion` — enum (`stop_loss|exit_signal|trailing_stop`) — transient UI selection.
- `exitAnchorPosition` — object (`x`, `y`) — derived canvas coordinate for deterministic insertion.

### 8.2 Calculations / Definitions (if applicable)
- Logical Exit area anchor: existing Exit section coordinates from canvas section helper, with fixed offsets for inserted block types.
- Logical connection selection: nearest valid upstream signal/condition block and downstream exit/risk chain endpoint, based on existing connection constraints.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Reuse existing autosave/update strategy endpoint invoked by current canvas save pipeline.

### 9.2 Validation & Error Handling
- Placement must respect existing block/edge validation constraints before commit.
- On invalid placement plan, show plain-language guidance: “Couldn’t place this block automatically. Try placing it manually from the Block Library.”

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Extend existing Health Bar component with optional segment click handler for incomplete Exit.
- Reuse existing canvas scroll/focus helper to move viewport to Exit area.
- Implement a minimal suggestion menu component near Health Bar (desktop popover, mobile bottom sheet/menu variant if already available).
- Reuse existing block insertion + connection helpers and wrap all graph mutations in undo transaction boundaries.
- Trigger autosave through existing post-mutation hook once transaction commits.

### 10.2 Backend
- No backend changes required.

## 11. Rollout Plan
- Phase 1: Ship behind Health Bar flag in internal environments.
- Phase 2: Validate placement success rate and undo/autosave behavior with QA fixtures.
- Phase 3: Gradual rollout to broader users.

## 12. Acceptance Criteria
- [ ] Given the Health Bar Exit segment is incomplete, when I click the Exit segment, then the canvas scrolls to the area where an exit block would logically be placed.
- [ ] Given I click the incomplete Exit segment, when the suggestion UI appears, then it includes options: Add Stop Loss, Add Exit Signal, Add Trailing Stop.
- [ ] Given I click Add Stop Loss, when placement runs, then a Stop Loss block auto-places in an appropriate Exit area position.
- [ ] Given Add Stop Loss is selected, when placement completes, then logical upstream/downstream connections are auto-created.
- [ ] Given Add Stop Loss placement succeeds, when Health Bar re-evaluates, then Exit segment updates to complete (if requirements are satisfied).
- [ ] Given a suggestion-based placement operation, then all graph changes are a single undo step via `beginUndoTransaction` and `commitUndoTransaction`.
- [ ] Given a suggestion-based placement operation commits successfully, then autosave is triggered once.

## 13. Tracking Metrics (Optional)
- `health_bar_exit_segment_clicked` — count of incomplete Exit segment clicks.
- `health_bar_guided_suggestion_selected` — selected option distribution.
- `health_bar_guided_placement_success_rate` — % successful auto-placements.
- `health_bar_guided_placement_undo_used` — % of guided placements undone within session.

## 14. Dependencies (Optional)
- Existing Health Bar feature-flag and segment state logic.
- Existing canvas viewport/section navigation helper.
- Existing block insertion, connection validation, undo transaction, and autosave utilities.

## 15. Risks & Mitigations (Optional)
- Risk: Auto-connections pick surprising nodes in dense graphs.  
  Mitigation: Use deterministic nearest-valid heuristics and keep one-click undo.
- Risk: Placement transaction can partially mutate graph on exception.  
  Mitigation: Require transaction boundaries and fail-safe rollback before commit.
- Risk: Mobile suggestion UI may occlude important canvas context.  
  Mitigation: Use compact anchored menu or existing bottom-sheet pattern with minimal height.

## 16. Open Questions
- Should suggestion ordering be static (Stop Loss first) or context-based by missing type priority?
- Should successful guided placement emit an educational tooltip (“You can undo in one tap”) on first use?
