# PRD: Inspector Panel as Secondary View

## 1. Summary
Add a simple `Details` action to the inline parameter editor so users can open the full Inspector Panel without losing the current block selection. The switch should close the popover, open the Inspector in its existing location, and keep parameter edits synchronized across the Inspector, the canvas label, and any inline editor that is still open for that block.

## 2. Problem Statement
The inline popover is faster for quick edits, but power users sometimes need the full Inspector Panel to see every parameter at once. Today there is no direct handoff from the popover to the Inspector, which forces users to close one editing surface and manually re-open another.

## 3. Goals
- Let users move from the inline popover to the full Inspector Panel in one click.
- Preserve the same selected block and live parameter feedback during the handoff.
- Keep existing Inspector keyboard shortcut and menu behavior unchanged when no popover is open.

## 4. Non-Goals
- Redesigning the Inspector Panel layout or adding new parameter controls.
- Changing backend APIs, strategy JSON, or validation rules.

## 5. Target Users & User Stories
### 5.1 Target Users
- Power users who want the full parameter set visible at once while editing on the canvas.
- Existing canvas users who already rely on the Inspector shortcut or menu action.

### 5.2 User Stories
- As a power user, I want a `Details` button in the inline editor, so that I can open the full Inspector Panel without reselecting the block.
- As a canvas user, I want Inspector edits to update the block label and any open inline editor immediately, so that every editing surface stays in sync.
- As an existing user, I want the Inspector shortcut and menu action to keep working exactly as they do today when no popover is open, so that this feature does not change established workflows.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Add a `Details` button to the inline parameter popover and mobile parameter sheet.
- Open the existing Inspector Panel with the same block selected, then close the inline editor.
- Keep live parameter updates synchronized between Inspector, canvas label, and any still-open inline editing surface.

### 6.2 Out of Scope
- New feature flags or rollout controls beyond the existing inline editor setup.
- Multi-block editing, multi-panel layouts, or duplicate Inspector instances.

### 6.3 Functional Requirements
- FR-1: The inline parameter editor must include a visible `Details` button for blocks that currently support Inspector editing.
- FR-2: When the user clicks/taps `Details`, the current inline editor closes and the existing Inspector Panel opens in its current location with the same block still selected.
- FR-3: The `Details` handoff must not reset draft parameter values that are already reflected in the editor state.
- FR-4: When a user edits a parameter in the Inspector Panel, the selected block's canvas label updates in real time.
- FR-5: If an inline editor is open for the same selected block, Inspector edits must update that inline editor's displayed values in real time.
- FR-6: When no inline editor is open, the existing Inspector keyboard shortcut and menu action must open the Inspector exactly as they do today.
- FR-7: Validation messages and parameter constraints must remain identical to current Inspector behavior.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens the inline parameter editor for a block.
2. User clicks/taps `Details`.
3. The inline editor closes.
4. The existing Inspector Panel opens in its current location with the same block selected.
5. User edits parameters in the Inspector and sees the block label update immediately.
6. If an inline editor is reopened for the same block, it reflects the latest Inspector values.
7. If no inline editor is open, the Inspector shortcut/menu continues to behave as it does today.

### 7.2 States
- Loading: Not applicable for the handoff itself; reuse current local editor state.
- Empty: Blocks with no editable parameters continue to show the existing “No parameters” message.
- Error: Existing validation messages remain in the Inspector and shared parameter controls.
- Success: The Inspector opens on the same block and edits stay synchronized across surfaces.

### 7.3 Design Notes
- Reuse the same shared parameter form renderer already planned for popover and Inspector parity.
- Keep the `Details` affordance simple: one secondary button, no extra modal or confirmation step.
- Do not move the Inspector Panel; it should open where it already lives on desktop/mobile.

## 8. Data Requirements
### 8.1 Data Model
- No schema changes.
- Existing selected-block editor state continues to act as the single source of truth for parameter values.
- Existing strategy definition JSON remains unchanged.

### 8.2 Calculations / Definitions (if applicable)
- Selection continuity: the same block ID stays selected before and after the `Details` handoff.
- Live sync: parameter changes made in one editor surface are reflected by the shared editor state in the canvas label and any other open surface without requiring a manual refresh.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Existing strategy save/version endpoints remain unchanged.

### 9.2 Validation & Error Handling
- Preserve existing frontend validation rules and plain-language error messages.
- If the selected block becomes unavailable during the handoff, close the inline editor and keep the Inspector closed rather than showing stale data.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a `Details` button to the shared inline editor chrome.
- Route the button to the existing Inspector-open action instead of creating a second Inspector implementation.
- Keep the selected block ID and editable parameter state in one shared source so Inspector and inline editor stay synchronized.
- Reuse the current shortcut/menu handler unchanged when no inline editor is active.

### 10.2 Backend
- No backend changes required.

## 11. Rollout Plan
- Phase 1: Update product/docs to define the `Details` handoff behavior.
- Phase 2: Implement the shared-state handoff using the existing Inspector open path.
- Phase 3: QA popover-to-Inspector handoff, live sync, and regression coverage for current Inspector shortcuts.

## 12. Acceptance Criteria
- [ ] Given the inline popover is open, when I click the `Details` button, then the Inspector Panel opens in its current location with the same block selected and the popover closes.
- [ ] Given the Inspector Panel is open, when I edit a parameter there, then the block's canvas label and any open inline editor update in real time.
- [ ] Given no popover is open, when I use the existing keyboard shortcut or menu action for the Inspector, then it opens exactly as it does today.

## 13. Tracking Metrics (Optional)
- `details_button_used` — count of popover-to-Inspector handoffs; expected to identify power-user demand.
- Inspector edit completion rate after `Details` handoff — expected neutral-to-positive vs current multi-step path.

## 14. Dependencies (Optional)
- Existing Inspector Panel open/close behavior.
- Existing selected-block state in the strategy editor.
- Shared parameter form controls used by Inspector and inline editor.

## 15. Risks & Mitigations (Optional)
- Risk: Inspector and inline editor drift to different values if they use separate local state.  
  Mitigation: Keep one shared selected-block parameter state and reuse it in both surfaces.
- Risk: The `Details` button adds visual clutter to the inline editor.  
  Mitigation: Use a single secondary action and avoid any extra explanatory copy.

## 16. Open Questions
- Should the mobile bottom sheet use the same `Details` label or a more explicit `Open Inspector` label?
- If the user triggers the Inspector shortcut while an inline editor is open, should it behave exactly like the `Details` handoff or remain a separate action?
