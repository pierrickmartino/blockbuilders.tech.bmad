# PRD: Health Bar - Strategy Completeness Display

## 1. Summary
Add a persistent Health Bar above the strategy canvas that shows whether a strategy has complete Entry, Exit, and Risk components. The bar updates in near real time from canvas changes, can collapse to icon-only mode, and is controlled by a feature flag.

## 2. Problem Statement
Beginner users cannot quickly tell what parts of their strategy are missing until they manually run validation. This slows iteration and creates avoidable confusion.

## 3. Goals
- Provide always-visible completeness feedback for Entry, Exit, and Risk.
- Re-evaluate Health Bar state client-side within 200ms after canvas edits.
- Keep implementation simple and safe with feature-flag gating and local persistence for collapsed mode.

## 4. Non-Goals
- Guided one-tap block placement from Health Bar segments.
- Any backend validation rule redesign.
- Any changes to strategy JSON schema.

## 5. Target Users & User Stories
### 5.1 Target Users
- Beginner strategy builders using the canvas editor.
- Existing users who want faster feedback while iterating.

### 5.2 User Stories
- As a beginner, I want a persistent bar showing whether my strategy has Entry, Exit, and Risk components, so that I can see at a glance what my strategy is missing without running validation.
- As a user, I want the bar to update quickly while I edit blocks/connections, so that I can trust the feedback is current.
- As a user, I want to collapse the bar to icons only, so that I can reduce visual noise while keeping status visible.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Health Bar rendered above React Flow canvas when feature flag is enabled.
- Three fixed segments: Entry, Exit, Risk.
- Segment states: complete, incomplete, warning (with icon + text in expanded mode).
- Client-side re-evaluation on canvas state changes with <=200ms target.
- 200ms ease state transition animation.
- Minimize/collapse control with localStorage persistence.

### 6.2 Out of Scope
- Health Bar click-to-scroll or auto-placement helpers.
- New API endpoints.
- Any backend migration or schema updates.

### 6.3 Functional Requirements
- Feature flag:
  - If `canvas_flag_health_bar` is disabled, Health Bar is not rendered.
  - If enabled, Health Bar renders persistently above the canvas.
- Segments:
  - Exactly 3 segments are displayed: Entry, Exit, Risk.
  - Expanded mode: each segment shows icon + short coaching/advisory text.
  - Collapsed mode: each segment shows icon only.
- State model:
  - `complete`: required rules for that segment pass.
  - `incomplete`: required rules for that segment fail.
  - `warning`: required rules pass but advisory guidance indicates weakness.
- Rule parity requirement:
  - Segment evaluation must reuse the same rule definitions as the validation endpoint for required completeness checks.
  - For v1, advisory warning is allowed for Risk when no risk-management block is present, while Entry and Exit remain validation-driven.
- Re-evaluation behavior:
  - Recompute segment states after add/remove/update of blocks or connections.
  - Recompute completes within 200ms of state change.
- Animation behavior:
  - Segment state visual transition uses 200ms ease.
- Persistence:
  - Collapsed/expanded mode persists in localStorage and restores on next canvas load for that browser.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens strategy editor.
2. If feature flag is on, Health Bar appears above canvas.
3. User edits blocks/connections.
4. Health Bar updates Entry/Exit/Risk states within 200ms.
5. User toggles minimize control; bar collapses/expands and preference persists.

### 7.2 States
- Loading: Render a neutral skeleton/placeholder segment style until initial canvas graph is ready.
- Empty: For empty strategy, Entry and Exit show incomplete; Risk shows warning with advisory text.
- Error: If local evaluation fails unexpectedly, show safe fallback warning state and do not block canvas editing.
- Success: Segment states reflect current strategy completeness with animated transitions.

### 7.3 Design Notes
- Position bar directly above React Flow viewport and below existing top controls.
- Keep copy short, plain language, and consistent with current validation tone.
- Use icon + text so status is never color-only.
- Keep minimize control always visible in both expanded and collapsed states.

## 8. Data Requirements
### 8.1 Data Model
- `healthBarCollapsed` — boolean — UI preference persisted in localStorage.
- `entryStatus` — enum (`complete|incomplete|warning`) — derived from current canvas definition.
- `exitStatus` — enum (`complete|incomplete|warning`) — derived from current canvas definition.
- `riskStatus` — enum (`complete|incomplete|warning`) — derived from current canvas definition.

### 8.2 Calculations / Definitions (if applicable)
- Entry complete: strategy satisfies validation-required entry conditions.
- Exit complete: strategy satisfies validation-required exit conditions.
- Risk warning (v1 advisory): strategy has no risk-management block (`position_size`, `stop_loss`, `take_profit`, `trailing_stop`, `max_drawdown`).
- Re-evaluation trigger set: block add/remove/update and connection add/remove/update.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Existing `POST /strategies/{id}/validate` remains the source of rule truth; frontend mirrors required checks client-side using shared rule definitions.

### 9.2 Validation & Error Handling
- If rule-evaluation logic fails in the client, fail open (keep canvas usable) and show non-blocking fallback segment warnings.
- Do not trigger backend validation calls on every canvas edit for this feature.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Implement as a small `HealthBar` component rendered by `SmartCanvas`/canvas container when flag is enabled.
- Reuse existing validation helper logic (or shared constants) to avoid rule drift.
- Store collapsed state in localStorage with a single key and simple boolean.
- Use lightweight CSS/Tailwind transition classes (`duration-200 ease-in-out`).

### 10.2 Backend
- No backend implementation required.

## 11. Rollout Plan
- Phase 1: Ship behind `canvas_flag_health_bar` with default off.
- Phase 2: Enable for internal testing and verify rule parity/performance.
- Phase 3: Gradual rollout to users.

## 12. Acceptance Criteria
- [ ] Given the canvas is loaded with a strategy, when the Health Bar renders above the React Flow canvas, then it displays three segments: Entry, Exit, Risk.
- [ ] Given the Health Bar renders, each segment shows one of: complete (green checkmark), incomplete (red X with coaching text), or warning (amber exclamation with advisory text).
- [ ] Given the user adds or removes a block or connection, when canvas state changes, then the Health Bar re-evaluates client-side within 200ms using the same rules as the validation endpoint.
- [ ] Given a segment state changes, then the state transition animates with 200ms ease.
- [ ] Given the user clicks the minimize control on the Health Bar, when the bar collapses, then it shows only icons without coaching text.
- [ ] Given collapsed/expanded state is changed, then the state persists in localStorage and is restored on reload.
- [ ] Given the Health Bar feature flag is disabled, when the canvas loads, then no Health Bar is rendered.

## 13. Tracking Metrics (Optional)
- `health_bar_rendered` — count of editor sessions where bar is shown.
- `health_bar_collapsed_toggled` — track collapsed/expanded usage.
- `health_bar_eval_duration_ms` — p95 <= 200ms.

## 14. Dependencies (Optional)
- Existing SmartCanvas feature-flag infrastructure.
- Existing validation-rule helpers for entry/exit completeness checks.
- Existing canvas state selectors/hooks for blocks and connections.

## 15. Risks & Mitigations (Optional)
- Risk: Rule drift between client Health Bar and backend validation endpoint.  
  Mitigation: Reuse shared rule definitions and add parity tests with fixture strategies.
- Risk: Frequent canvas edits cause unnecessary re-computation.  
  Mitigation: Keep evaluation pure and small; debounce or memoize minimally if needed.
- Risk: Accessibility regression due to color-only status interpretation.  
  Mitigation: Require icon + text labels in expanded mode and maintain contrast compliance.

## 16. Open Questions
- Should the localStorage collapse key be global (`healthBarCollapsed`) or strategy-specific?
- Should warning-state copy be standardized globally with existing validation messaging text?
