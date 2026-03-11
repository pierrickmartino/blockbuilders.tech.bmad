# PRD: Health Bar - Strategy Completeness Display

## 1. Summary
Add a persistent Health Bar above the strategy canvas that shows, at a glance, whether a strategy has Entry, Exit, and Risk coverage. The bar updates automatically on canvas edits and mirrors validation endpoint logic so beginners can see what is missing before running full validation/backtests.

## 2. Problem Statement
Beginners often build strategies incrementally and only discover missing core components after triggering validation. This creates avoidable confusion and slows iteration.

## 3. Goals
- Show Entry, Exit, and Risk completeness continuously while editing.
- Reuse existing validation logic semantics to keep UX feedback consistent.
- Keep interaction lightweight, fast, and simple (client-side updates within 200ms).

## 4. Non-Goals
- Creating new backend validation rules.
- Replacing existing validation endpoint messages.
- Adding advanced scoring, percentages, or historical health trends.

## 5. Target Users & User Stories
### 5.1 Target Users
- Beginner strategy builders using the visual canvas.
- Intermediate users who want quick structural checks while editing.

### 5.2 User Stories
- As a beginner, I want a persistent health bar showing Entry/Exit/Risk completeness so that I can quickly see what my strategy is missing.
- As a canvas user, I want the health bar to update immediately after edits so that I can iterate without repeatedly running validation.
- As a user, I want to minimize the bar and keep that preference so that I can reduce visual noise.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- New canvas-top Health Bar UI component (feature-flag gated).
- Three segments: Entry, Exit, Risk.
- Segment states: complete, incomplete, warning.
- Client-side re-evaluation on canvas changes.
- Minimize/expand control with localStorage persistence.

### 6.2 Out of Scope
- New backend APIs.
- New database fields.
- Server-side persistence of collapsed state.

### 6.3 Functional Requirements
- Render Health Bar above React Flow canvas when health-bar feature flag is enabled.
- Render no Health Bar when feature flag is disabled.
- Display exactly three segments labeled Entry, Exit, Risk.
- Segment state rendering:
  - complete = green check icon
  - incomplete = red X icon + coaching text
  - warning = amber exclamation icon + advisory text
- Recompute segment states on block add/remove and connection changes.
- Recompute uses same rule behavior as validation endpoint (shared utility or mirrored deterministic logic).
- Recompute completes within 200ms from canvas state change.
- Segment state transitions animate with 200ms ease timing.
- Minimize toggle collapses text while keeping icons visible.
- Collapsed state persists in localStorage and restores on reload.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens strategy canvas.
2. If feature flag enabled, Health Bar appears above canvas.
3. User edits nodes/edges.
4. Within 200ms, Entry/Exit/Risk segments refresh state.
5. User optionally minimizes bar; preference persists across reloads.

### 7.2 States
- Loading: Render lightweight skeleton or default neutral state until first evaluation completes.
- Empty: Empty canvas shows incomplete states with coaching text.
- Error: If local evaluation fails, show safe fallback warning text and keep canvas usable.
- Success: Segments display accurate complete/incomplete/warning states.

### 7.3 Design Notes
- Place above React Flow canvas, below any existing top editor controls.
- Keep copy concise and plain language.
- Preserve WCAG-compliant contrast for green/red/amber indicators.
- Animation standard: 200ms `ease` for state transitions.

## 8. Data Requirements
### 8.1 Data Model
- `healthBarCollapsed` — boolean — stored in localStorage (frontend-only UI preference).
- `healthSegments.entry` — enum(`complete|incomplete|warning`) — derived from current canvas graph.
- `healthSegments.exit` — enum(`complete|incomplete|warning`) — derived from current canvas graph.
- `healthSegments.risk` — enum(`complete|incomplete|warning`) — derived from current canvas graph.

### 8.2 Calculations / Definitions (if applicable)
- Segment evaluation rule set must match validation endpoint semantics for Entry/Exit/Risk completeness checks.
- Minimal state mapping for implementation (must remain aligned with backend validation semantics):
  - Entry:
    - complete: at least one valid `entry_signal` path exists
    - incomplete: no `entry_signal` block exists
    - warning: `entry_signal` exists but has missing/disconnected input path
  - Exit:
    - complete: at least one valid exit path exists (`exit_signal`, `time_exit`, `trailing_stop`, `stop_loss`, `take_profit`, or `max_drawdown`)
    - incomplete: no exit block/path exists
    - warning: exit block exists but is misconfigured or disconnected
  - Risk:
    - complete: at least one valid risk control exists (`position_size`, `stop_loss`, `take_profit`, or `max_drawdown`)
    - incomplete: no risk control exists
    - warning: risk block exists but is misconfigured (e.g., invalid params) or disconnected
- Re-evaluation trigger sources: node mutations + edge mutations.
- Re-evaluation timing budget: <= 200ms from state mutation to UI update.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Existing validation endpoint remains source of rule truth.

### 9.2 Validation & Error Handling
- If shared evaluator is unavailable, fail safely by showing warning state and non-blocking advisory text.
- Never block editing due to Health Bar evaluation errors.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Implement `HealthBar` as a small presentational component + minimal evaluation hook.
- Keep computation pure and deterministic.
- Use debounce/throttle only if needed to consistently meet the 200ms target.
- Store collapsed preference in localStorage key scoped to canvas health bar.
- Guard render with feature flag check (`canvas_flag_health_bar`).
- No new UI libraries or dependencies.

### 10.2 Backend
- No backend code changes expected.
- Optional: expose shared validation-rule utility if one already exists and can be reused without adding complexity.

## 11. Rollout Plan
- Phase 1: Behind feature flag, internal enablement only.
- Phase 2: Enable for a small user cohort; confirm update latency + correctness.
- Phase 3: Enable by default when stability is confirmed.

## 12. Acceptance Criteria
- [ ] Given canvas loads and feature flag is enabled, Health Bar renders above React Flow with Entry/Exit/Risk segments.
- [ ] Given each segment state, complete/incomplete/warning visuals and text match spec (icon, color, copy behavior).
- [ ] Given node/edge add/remove changes, Health Bar re-evaluates client-side within 200ms using validation-equivalent rules.
- [ ] Given segment state changes, transitions animate with 200ms ease.
- [ ] Given minimize toggle is used, collapsed mode shows icons only and persists after reload via localStorage.
- [ ] Given feature flag is disabled, no Health Bar is rendered.

## 13. Tracking Metrics (Optional)
- Health Bar render rate when flag enabled.
- Median re-evaluation latency (target: <=200ms).
- Minimize toggle usage rate.

## 14. Dependencies (Optional)
- Existing canvas state source (nodes/edges from React Flow integration).
- Existing validation rule definitions/utility logic.
- Existing feature flag infrastructure (SmartCanvas wrapper/PostHog flags).

## 15. Risks & Mitigations (Optional)
- Risk: Rule drift between Health Bar and validation endpoint.
  Mitigation: Reuse shared rule utility or lock evaluator behavior to endpoint rule set with regression tests.
- Risk: Frequent recomputation degrades canvas performance.
  Mitigation: Keep evaluator O(n) over nodes/edges and apply light debouncing if profiling requires.
- Risk: Confusing copy for beginners.
  Mitigation: Keep coaching text short, specific, and action-oriented.

## 16. Open Questions
- Should warning text vary based on the specific missing risk/exit condition type, or remain generic for MVP simplicity?
- Should collapsed/expanded preference be global across strategies or per-browser only (default: per-browser localStorage)?
