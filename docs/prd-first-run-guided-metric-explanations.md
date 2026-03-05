# PRD: First-Run Guided Metric Explanations

## 1. Summary
Add a lightweight first-run education layer to the backtest results page so new users understand key metrics immediately. On the first-ever results view after onboarding completion, show plain-language inline explanations beneath five default metrics. After that first exposure, collapse the same explanations behind small `?` helpers next to each metric label.

## 2. Problem Statement
New users land on backtest results with little context and may not understand whether results are good or bad. This causes confusion, low trust, and weaker activation after onboarding.

## 3. Goals
- Improve first-run comprehension of the five default backtest metrics.
- Keep the first-run guidance visible but minimal (1-2 sentences each).
- Preserve a clean UI for returning users by collapsing explanations.

## 4. Non-Goals
- No redesign of the full metrics layout or card system.
- No full educational overlay/modal tour.

## 5. Target Users & User Stories
### 5.1 Target Users
- Newly onboarded users viewing their first completed backtest results.
- Returning users who already saw first-run guidance.

### 5.2 User Stories
- As a new user, I want plain-language metric explanations on my first results view, so that I understand what the results mean.
- As a returning user, I want explanations to stay available but unobtrusive, so that results remain quick to scan.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- First-run inline explanations for exactly 5 default metrics.
- Collapsed helper behavior (`?` hover/click) for subsequent visits.
- One-time state tracking and PostHog completion event.

### 6.2 Out of Scope
- Additional metric explanations beyond the required five.
- Localization/i18n work.

### 6.3 Functional Requirements
- Detect first-run results session when `users.has_completed_onboarding` has just transitioned to `true` and user opens results.
- On first-run session, render inline muted helper text beneath each of:
  - Total Return %
  - Max Drawdown %
  - Win Rate
  - Number of Trades
  - vs. Buy-and-Hold %
- Each explanation must be plain-language and 1-2 sentences.
- Example copy baseline:
  - Total Return %: "This is how much your strategy would have made or lost overall. Green means profit, red means loss."
- On subsequent views, hide inline text and show a `?` helper icon next to each corresponding metric label.
- `?` helper supports hover (desktop) and click/tap (mobile) to reveal the same explanation text.
- Persist first-run display state once shown, using localStorage or user record flag (keep implementation minimal and reliable).
- Fire PostHog event `first_run_overlay_completed` once when user scrolls past results content or interacts with results area during first-run view.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User completes onboarding and lands on first backtest results.
2. Five default metric cards display inline muted explanations.
3. User scrolls or interacts with results; completion event is tracked.
4. On future results visits, explanations appear only via `?` helpers.

### 7.2 States
- Loading: metric values and explanation placeholders follow existing loading behavior.
- Empty: if no completed run, no explainer UI renders.
- Error: if metrics fail to load, keep current error UI; do not show stale explanation content.
- Success: first-run inline mode or returning-user collapsed-helper mode.

### 7.3 Design Notes
- Keep typography subtle: helper copy appears in smaller muted text under metric value.
- Reuse existing text color/tokens and tooltip/popover components when available.
- Keep spacing tight to avoid expanding card heights more than necessary.
- Do not add new modals.

## 8. Data Requirements
### 8.1 Data Model
- `users.has_completed_onboarding` — boolean — onboarding completion state (already exists).
- `localStorage.first_run_metric_explanations_seen` — string/boolean — client-side seen marker (if localStorage approach is chosen).
- Optional: `users.first_run_metric_explanations_seen_at` — timestamp — server-side persisted seen marker (only if needed).

### 8.2 Calculations / Definitions (if applicable)
- First-run eligibility: user has just completed onboarding and has not yet seen first-run metric explanations.
- Completion trigger: first scroll past metric section OR first interaction inside results section.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /strategies/{id}/backtest` (existing page data load path) — determines whether first-run mode should render.
- Optional `PATCH /users/me` (existing profile update path) — persist explanation-seen state if using user-record storage.

### 9.2 Validation & Error Handling
- If seen-state persistence fails, default to showing collapsed helpers on next load only if local indicator confirms first-run has already been shown.
- Never block results rendering on analytics dispatch failure.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a tiny metric explanation map for the five required metrics.
- Add a simple boolean mode (`showInlineExplanations`) derived from first-run eligibility + seen state.
- Reuse existing tooltip/popover primitives for `?` behavior.
- Track completion with a one-time guarded handler on scroll/interaction.

### 10.2 Backend
- Prefer no backend changes if localStorage-only approach is sufficient.
- If cross-device consistency is required later, add one nullable user field and write-once update.

## 11. Rollout Plan
- Phase 1: Ship localStorage-based one-time behavior + analytics event.
- Phase 2 (optional): Add server-side seen marker only if product needs cross-device persistence.

## 12. Acceptance Criteria
- [ ] For first-ever results view after onboarding completion, each of the 5 default metrics shows an inline muted explanation beneath it.
- [ ] Each explanation is plain-language and 1-2 sentences.
- [ ] On subsequent results visits, inline explanations are replaced by `?` hover/click helpers next to each metric.
- [ ] `first_run_overlay_completed` fires once when the user scrolls past or interacts with results during the first-run view.
- [ ] One-time display state is persisted via localStorage or user record.

## 13. Tracking Metrics (Optional)
- `first_run_overlay_completed` event count — should track first-run result engagement.
- First-to-second-session conversion for users exposed to first-run explanations — expected positive trend.

## 14. Dependencies (Optional)
- Existing backtest results metric card components.
- Existing PostHog `trackEvent` utility and consent gating.

## 15. Risks & Mitigations (Optional)
- Risk: Explanations create visual clutter on small screens.  
  Mitigation: Keep copy concise, muted, and scoped to 5 metrics only.
- Risk: Event double-fires from multiple interactions.  
  Mitigation: Add one-time client guard and idempotent tracking call.

## 16. Open Questions
- Should first-run eligibility be strictly tied to "just set onboarding true" in backend state, or inferred from first completed run after onboarding?
- Do we require cross-device persistence now, or can we defer to localStorage-only for v1?
