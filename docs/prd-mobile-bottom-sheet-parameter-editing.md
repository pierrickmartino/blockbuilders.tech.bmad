# PRD: Mobile Bottom Sheet Parameter Editing

## 1. Summary
Adapt mobile block parameter editing so that tapping a block on viewports below 768px opens a half-screen bottom sheet instead of a popover. Reuse the existing shadcn/ui `Sheet` and current Inspector parameter controls, keep the selected block label visible above the sheet, and commit changes on close so mobile editing stays simple and reliable around the software keyboard.

## 2. Problem Statement
The current inline parameter popover can be covered by the mobile software keyboard, which makes inputs hard to see and edit. Mobile users need a keyboard-safe editing surface that preserves canvas context and still uses the existing parameter editing flow.

## 3. Goals
- Make mobile parameter editing usable when the software keyboard opens.
- Keep the selected block label visible and updating in real time while editing.
- Reuse existing Sheet and parameter form logic with the fewest possible changes.

## 4. Non-Goals
- Redesigning desktop or tablet parameter editing behavior.
- Creating new parameter field types, backend APIs, or persistence models.

## 5. Target Users & User Stories
### 5.1 Target Users
- Strategy canvas users editing blocks on phones or narrow mobile browsers.
- Users who rely on the block label to confirm parameter changes while typing.

### 5.2 User Stories
- As a mobile user, I want parameter editing to open in a bottom sheet, so that the keyboard does not cover the editor.
- As a mobile user, I want the selected block label to stay visible and update in real time, so that I can confirm my change without losing canvas context.
- As a mobile user, I want swipe-down close to commit my edits cleanly, so that undo/redo and autosave keep working the same way.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- On viewports below 768px, open parameter editing in a half-screen bottom sheet using the existing shadcn/ui `Sheet` component.
- Reuse the same parameter controls already used by the Inspector/inline editor.
- Keep the selected block label visible above the sheet and update it in real time while the user edits.
- Use the `visualViewport` API to scroll the active field into view when the software keyboard opens.
- Commit edits when the sheet closes, including swipe-down close, and trigger existing undo/redo history and autosave behavior.

### 6.2 Out of Scope
- New gestures beyond the Sheet's existing close behavior.
- Persisting partially edited values across reloads or route changes.
- Any desktop-specific redesign beyond preserving current behavior.

### 6.3 Functional Requirements
- FR-1: When the viewport width is below 768px and the inline parameter editor feature is enabled, tapping a block opens a bottom sheet instead of a block-anchored popover.
- FR-2: The sheet must use the existing shadcn/ui `Sheet` component and render the same parameter controls already available for that block.
- FR-3: The sheet opens at roughly half-screen height by default and remains scrollable for longer forms.
- FR-4: While the sheet is open, the selected block's label remains visible above the sheet and updates in real time from the same draft values driving the form.
- FR-5: When an input inside the sheet receives focus and the mobile software keyboard changes the visual viewport, the editor scrolls enough to keep the active field visible using `visualViewport`.
- FR-6: Swiping down, tapping the close affordance, or otherwise closing the sheet commits the latest valid values as one change, then triggers existing undo/redo history handling and autosave debounce.
- FR-7: On viewports 768px and wider, existing desktop/tablet behavior remains unchanged.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. Mobile user taps a block on the strategy canvas.
2. A half-screen bottom sheet slides up with the block's parameter controls.
3. The selected block label stays visible above the sheet and updates as values change.
4. If the keyboard opens, the sheet scrolls so the active input remains visible.
5. The user swipes down or closes the sheet.
6. The latest values commit, then undo/redo history and autosave run through the existing path.

### 7.2 States
- Loading: Not applicable for the local editing interaction.
- Empty: If a block has no editable parameters, show a simple “No parameters” message in the sheet body.
- Error: Keep existing inline validation messages and prevent invalid persisted values exactly as today.
- Success: The edited control value and the visible block label stay in sync while editing, and the final value persists after close.

### 7.3 Design Notes
- Keep this mobile-only and breakpoint-driven to avoid extra settings.
- Prefer a simple half-screen layout over dynamic multi-snap behavior.
- Reuse the shared parameter form renderer so the Inspector, popover, and mobile sheet stay aligned.
- Do not hide the selected block label behind the sheet; leave visible canvas context above it.

## 8. Data Requirements
### 8.1 Data Model
- No schema changes.
- Existing client-side selected-block and draft-parameter state continue to drive the editor.
- Existing strategy definition JSON remains the persisted source of truth after commit.

### 8.2 Calculations / Definitions (if applicable)
- Mobile mode breakpoint: viewport width `< 768px`.
- Active input visibility: the focused field's bounding box remains within the visible portion of the sheet after `visualViewport` resize/scroll handling.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Existing strategy save/version/autosave endpoints remain unchanged.

### 9.2 Validation & Error Handling
- Keep the same frontend validation rules and plain-language error copy already used by existing parameter controls.
- If `visualViewport` is unavailable, keep the sheet usable with normal scrolling and no custom fallback complexity beyond the browser default.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a mobile-only branch in the inline parameter editor wrapper: popover for `>= 768px`, Sheet for `< 768px`.
- Reuse the shared parameter form renderer and existing draft/live label update path.
- Render the selected block label in the visible canvas area above the sheet rather than duplicating the full node.
- Listen to `visualViewport` resize/scroll changes while the sheet is open and scroll the active field into view with minimal logic.
- Hook every close path, including swipe-down close, into the same existing commit/history/autosave function.

### 10.2 Backend
- No backend changes required.

## 11. Rollout Plan
- Phase 1: Implement in the existing inline parameter editor flow for mobile viewports only.
- Phase 2: QA on iOS Safari and Android Chrome with keyboard-open editing.
- Phase 3: Enable with existing feature-flag rollout; keep desktop/tablet behavior unchanged.

## 12. Acceptance Criteria
- [ ] Given I am on a mobile device (viewport < 768px), when I tap a block, then parameter controls render as a half-screen bottom sheet using the existing shadcn/ui `Sheet`, and the block's label on the canvas remains visible above the sheet and updates in real time.
- [ ] Given the bottom sheet is open and I adjust a parameter, when the software keyboard opens, then the sheet scrolls to keep the active input visible using the `visualViewport` API.
- [ ] Given I swipe down on the sheet, when it closes, then changes are committed and existing undo/redo plus autosave are triggered.
- [ ] Given I am on a viewport 768px or wider, when I tap a block, then current non-mobile editing behavior remains unchanged.

## 13. Tracking Metrics (Optional)
- Mobile parameter edit completion rate — expected to improve versus occluded popover editing.
- Mobile parameter edit abandon rate during keyboard-open sessions — expected to decrease.

## 14. Dependencies (Optional)
- Existing inline parameter editor feature-flag path.
- Existing shared parameter form renderer / Inspector controls.
- Existing shadcn/ui `Sheet` component.
- Browser `visualViewport` support where available.

## 15. Risks & Mitigations (Optional)
- Risk: The active field still gets hidden on some mobile browsers.  
  Mitigation: Keep the logic simple and bind it directly to `visualViewport` resize/scroll while the sheet is open, with manual QA on iOS Safari and Android Chrome.
- Risk: Mobile and desktop editing paths drift apart.  
  Mitigation: Share the same form renderer and commit function; only swap the container component at the breakpoint.
- Risk: Close gestures create duplicate commits.  
  Mitigation: Route all close events through one commit-on-close handler.

## 16. Open Questions
- Should the sheet include a small sticky title row with the block name, or is the visible canvas label enough?
- Do we want a tiny bottom safe-area spacer for devices with large home-indicator insets, or can existing Sheet padding handle it?
