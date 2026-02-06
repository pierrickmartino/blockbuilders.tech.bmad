# PRD: Simplified Top Bar with Autosave (Mobile Strategy Editor)

## 1. Summary
Simplify the mobile strategy editor header by removing the explicit Save button and replacing it with an autosave status indicator (for example: `Saved • 2s ago`). Keep only one primary action (`Backtest` or `Run`) in the top bar. Move version history into a dedicated `History` panel opened via icon, and move settings/secondary actions into an overflow menu. The expected outcome is less visual noise and faster focus on strategy building.

## 2. Problem Statement
The current mobile top bar has too many competing controls (save, history, title, menu/actions), which steals attention from the canvas and increases cognitive load on small screens.

## 3. Goals
- Reduce header clutter on small screens.
- Give users confidence that edits are saved automatically.
- Preserve quick access to version history and secondary actions without crowding the top bar.

## 4. Non-Goals
- Redesign desktop header behavior.
- Introduce a new backend persistence model.

## 5. Target Users & User Stories
### 5.1 Target Users
- Mobile users building strategies on phones.
- Tablet users in narrow portrait layouts.

### 5.2 User Stories
- As a mobile user, I want my changes to save automatically, so that I do not need to tap Save repeatedly.
- As a mobile user, I want a clean top bar with one main action, so that I can focus on building and running strategies.
- As a mobile user, I want to open strategy history from one icon, so that version browsing stays available without clutter.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Mobile top bar layout simplification.
- Autosave status indicator with relative timestamp.
- History panel access via dedicated icon.
- Overflow menu for settings and secondary actions.

### 6.2 Out of Scope
- Changes to strategy version data model.
- Multi-user collaboration/presence indicators.
- New autosave backend endpoints.

### 6.3 Functional Requirements
- Remove explicit Save button from mobile top bar.
- Show autosave status text in top bar: `Saving...`, `Saved • <relative time>`, `Save failed`.
- Trigger autosave 10 seconds after the last user change in the editor.
- Reset autosave timer on each new change.
- Keep exactly one primary CTA visible in the top bar (`Backtest` or `Run`, based on existing mode).
- Add a History icon button that opens a dedicated history panel/drawer.
- Move settings and secondary actions to an overflow menu.
- Keep title compact (truncate if needed) to avoid top-bar wrapping.
- Desktop layout remains unchanged.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User edits strategy.
2. After 10 seconds of inactivity, autosave starts.
3. Status changes to `Saving...` then `Saved • just now` on success.
4. User can tap History icon to open history panel.
5. User taps `Backtest`/`Run` when ready.
6. User opens overflow for settings/secondary actions if needed.

### 7.2 States
- Loading: editor and header skeleton/loading state.
- Empty: no pending changes; status shows last successful save.
- Error: save failure shown as `Save failed` with retry hint in overflow/history area.
- Success: `Saved • <relative time>` is visible after autosave succeeds.

### 7.3 Design Notes
- Mobile-first: prioritize one-line top bar controls.
- Keep status copy plain and short.
- Use existing icon set and menu components.
- No extra badges/chips beyond autosave text.

## 8. Data Requirements
### 8.1 Data Model
- `lastEditedAt` — `datetime` — latest local change timestamp (existing frontend state).
- `lastSavedAt` — `datetime` — latest successful save timestamp (existing or derived state).
- `saveState` — `enum(idle|saving|saved|error)` — UI status for autosave indicator.

### 8.2 Calculations / Definitions (if applicable)
- `relativeSavedLabel`: human-readable elapsed time since `lastSavedAt` (e.g., `2s ago`, `1m ago`).
- `autosaveDelayMs = 10000` (10 seconds after last change).

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `PUT /strategies/{id}` (or existing save endpoint) — persist latest strategy draft.
- `GET /strategies/{id}/versions` (or existing history endpoint) — populate History panel.

### 9.2 Validation & Error Handling
- Do not send autosave request if no changes since last successful save.
- If autosave fails, keep unsaved changes in local editor state and show `Save failed`.
- Next edit or explicit retry re-attempts save with existing endpoint.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing debounced save logic if available; set delay to 10 seconds.
- Replace Save button component with autosave status text on mobile header.
- Keep existing Backtest/Run button as only primary CTA.
- Move settings/secondary actions into existing dropdown/overflow component.
- Reuse existing drawer/panel component for History.

### 10.2 Backend
- No backend code changes required if current save and versions endpoints already exist.
- If needed, only minor response mapping for consistent `updated_at` usage.

## 11. Rollout Plan
- Phase 1: Implement mobile top bar layout + autosave status text.
- Phase 2: Wire History icon to dedicated panel.
- Phase 3: Move secondary actions to overflow and QA on phone breakpoints.

## 12. Acceptance Criteria
- [ ] On mobile, Save button is removed from top bar.
- [ ] On mobile, autosave runs 10 seconds after last edit and shows status (`Saving...` then `Saved • <time>`).
- [ ] On mobile, exactly one primary CTA (`Backtest` or `Run`) is visible in the top bar.
- [ ] On mobile, History is opened from a dedicated icon and shown in a panel/drawer.
- [ ] On mobile, settings and secondary actions are available via overflow menu.
- [ ] Desktop top bar behavior remains unchanged.

## 13. Tracking Metrics (Optional)
- Autosave success rate — target: >99% successful autosave requests.
- Time-to-run after last edit — expected trend: decreases.
- Mobile header interaction errors (mis-taps/backtracking) — expected trend: decreases.

## 14. Dependencies (Optional)
- Existing strategy save API.
- Existing strategy versions/history API.
- Existing mobile header, drawer, and dropdown components.

## 15. Risks & Mitigations (Optional)
- Risk: Users miss manual save affordance.
  Mitigation: Keep autosave status visible and explicit (`Saved • ...` / `Save failed`).
- Risk: Frequent edits can cause many saves.
  Mitigation: Debounce by 10 seconds after last change and skip if no diff.
- Risk: Header still feels crowded on very narrow devices.
  Mitigation: Truncate title and hide non-primary controls in overflow.

## 16. Open Questions
- Should autosave status include a subtle spinner during `Saving...`?
- Should manual retry be available directly in header on `Save failed`, or only in overflow/history panel?
