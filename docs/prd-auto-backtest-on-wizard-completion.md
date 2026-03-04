# PRD: Auto-Backtest on Wizard Completion

## 1. Summary
Enable new users to run their first backtest directly from the final wizard step. When the user clicks “See how it would have performed,” the app should automatically save the generated strategy, enqueue a backtest, show an engaging loading state, and navigate directly to results without requiring a separate backtest page flow.

## 2. Problem Statement
Today, new users can finish the wizard but still need to understand additional steps to run a backtest. This adds friction at the most important activation moment (first value) and increases drop-off before users see results.

## 3. Goals
- Reduce time-to-first-result for wizard users to a single final CTA click.
- Remove the need for users to manually save and configure an initial backtest after wizard completion.
- Keep first-run flow simple, reassuring, and resilient when jobs run slower than expected.

## 4. Non-Goals
- Reworking the backtest engine, execution model, or metrics calculations.
- Adding advanced backtest configuration UI to the wizard flow.

## 5. Target Users & User Stories
### 5.1 Target Users
- New users in first-run onboarding who complete the strategy wizard.
- Beginner users who do not yet understand the editor/backtest workflow.

### 5.2 User Stories
- As a new user who just finished the wizard, I want one click to run a backtest so that I can quickly see if my strategy idea works.
- As a beginner, I want clear progress messaging while the system is running so that I feel confident the app is working.
- As a first-run user, I want to land directly on results so that I do not need to navigate to another page.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Final wizard CTA triggers save + enqueue backtest automatically.
- In-place loading/progress messaging during save/enqueue/run.
- Direct navigation to results when run completes.
- Set `users.has_completed_onboarding=true` when wizard-generated backtest completes and results are available.

### 6.2 Out of Scope
- New onboarding steps after results.
- New backtest tuning controls in wizard.
- Any “hard timeout failure” UX for slow-but-progressing runs.

### 6.3 Functional Requirements
- On final wizard CTA click (“See how it would have performed”), if generated strategy JSON is valid:
  - Save strategy automatically (create strategy/version as currently required).
  - Enqueue backtest automatically using default settings (minimal config path).
  - Start loading state immediately.
- Loading state must cycle or progress through engaging messages, including:
  - “Building your strategy...”
  - “Running against 365 days of data...”
  - “Calculating results...”
- System should display results within 30 seconds in normal conditions (NFR-01 target).
- If 30 seconds is approached/exceeded, show “Almost there...” (non-error messaging).
- On completion:
  - Navigate directly to results page.
  - Mark onboarding complete (`has_completed_onboarding=true`) for that user.
- User should not be required to visit a separate backtest page to complete this first-run experience.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User finishes wizard questions.
2. User clicks “See how it would have performed”.
3. App saves strategy + enqueues backtest automatically.
4. App shows full loading/progress state in wizard completion context.
5. When run is ready, app routes straight to results page.

### 7.2 States
- Loading:
  - Show staged messages listed above.
  - After long wait threshold, switch/add “Almost there...” reassurance.
- Empty:
  - N/A for this flow (wizard always has generated strategy payload).
- Error:
  - Plain-language error if save/enqueue fails, with retry CTA.
- Success:
  - Direct results view.

### 7.3 Design Notes
- Keep the screen minimal: one progress area, one optional cancel/back affordance.
- No technical job jargon (queue IDs, worker states) in user-facing text.
- Do not show timeout errors for slow runs that are still processing.

## 8. Data Requirements
### 8.1 Data Model
- `users.has_completed_onboarding` — boolean — set to true after wizard-generated backtest completes and results are shown.
- Existing strategy/version entities — unchanged schema, used for auto-save.
- Existing backtest run entity — unchanged schema, used for queued run lifecycle.

### 8.2 Calculations / Definitions (if applicable)
- NFR-01 result target: first results should appear within 30 seconds under expected load.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- Reuse existing strategy save endpoints (create/update/version flow).
- Reuse `POST /backtests` to enqueue run.
- Reuse existing backtest status/results endpoints for polling and navigation trigger.
- Reuse existing user update path to set onboarding completion flag (or existing server-side hook if already present).

### 9.2 Validation & Error Handling
- Validate generated strategy JSON before attempting auto-save/enqueue.
- If strategy validation fails, show plain-language error and keep user in wizard context.
- If save succeeds but enqueue fails, show plain-language retry path without losing saved strategy.
- Slow runs should show reassurance (“Almost there...”), not a hard error solely due to latency.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a single orchestrated handler for final wizard CTA:
  - validate -> save strategy -> enqueue backtest -> poll status -> navigate to results.
- Add deterministic loading copy phases (timer-based copy progression is acceptable).
- Add long-wait copy threshold at ~25–30 seconds: show “Almost there...”.

### 10.2 Backend
- Keep backend changes minimal; prefer reusing existing endpoints and job pipeline.
- Ensure onboarding completion update occurs only after completed results are available from wizard-triggered flow.

## 11. Rollout Plan
- Phase 1: Implement final CTA orchestration + loading/progress copy + direct results routing.
- Phase 2: Add onboarding completion update hook and validate analytics/event continuity.

## 12. Acceptance Criteria
- [ ] Given wizard completion with valid strategy JSON, when user clicks “See how it would have performed,” then strategy is saved automatically and a backtest is enqueued.
- [ ] Given the auto-backtest starts, then loading UI shows engaging progress messages (“Building your strategy...”, “Running against 365 days of data...”, “Calculating results...”).
- [ ] Given normal operating conditions, results are displayed within 30 seconds (NFR-01).
- [ ] Given wizard-generated backtest completes, then user is navigated directly to results and `has_completed_onboarding` is set to true.
- [ ] Given run duration approaches/exceeds 30 seconds, then loading UI shows “Almost there...” and does not show a timeout error solely due to slowness.
- [ ] User does not need to navigate to a separate backtest page to complete this flow.

## 13. Tracking Metrics (Optional)
- Wizard completion → first backtest start conversion rate — target upward trend.
- Wizard completion → results viewed conversion rate — target upward trend.
- Median time from final CTA click to results visible — target ≤30s.
- Share of first-run users with `has_completed_onboarding=true` after wizard flow — target upward trend.

## 14. Dependencies (Optional)
- Existing strategy save/version API behavior.
- Existing backtest queue + worker throughput.
- Existing backtest status polling/results routing behavior.

## 15. Risks & Mitigations (Optional)
- Risk: Worker latency causes user anxiety.  
  Mitigation: Progressive reassuring messages including “Almost there...” instead of timeout errors.
- Risk: Partial failure (save succeeded, enqueue failed) creates confusion.  
  Mitigation: Plain-language retry with preserved saved strategy.

## 16. Open Questions
- Should onboarding flag update be server-driven only (recommended) or also reflected optimistically in frontend state?
- Should this auto-backtest use fixed default lookback/settings for all users or inherit per-user default backtest preferences where available?
