# PRD: Wizard as Default Post-Signup Destination

## 1. Summary
Route new users directly into the strategy wizard immediately after signup so they can start building quickly, while still allowing a subtle secondary path to skip to the dashboard.

## 2. Problem Statement
New users currently land on the dashboard after signup and must decide what to do next. This creates avoidable friction at the most important activation moment.

## 3. Goals
- Make the strategy wizard the default first destination after signup (email/password and OAuth).
- Preserve a low-friction escape hatch with a subtle “Skip to dashboard” link.
- Keep returning onboarded users on the dashboard using a simple persisted onboarding flag.

## 4. Non-Goals
- No redesign of the full onboarding flow beyond routing and one secondary link.
- No additional wizard steps or changes to wizard generation logic.
- No complex onboarding state machine.

## 5. Target Users & User Stories
### 5.1 Target Users
- New users who just created an account.
- Returning users who already completed onboarding.

### 5.2 User Stories
- As a new user who just signed up, I want to be guided directly into the strategy wizard, so that I don’t have to figure out what to do first.
- As a returning onboarded user, I want login to take me straight to my dashboard, so that I can continue my normal workflow.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Post-signup routing rules for email/password and OAuth signups.
- Post-login routing split based on `users.has_completed_onboarding`.
- Wizard first-run screen treatment with a subtle “Skip to dashboard” link.
- PostHog event emission when wizard first-run starts.
- Database migration adding/backfilling `users.has_completed_onboarding`.

### 6.2 Out of Scope
- Any change to dashboard layout/content.
- Any change to strategy wizard question set or output.
- Multi-step onboarding orchestration beyond this routing flag.

### 6.3 Functional Requirements
- Add `users.has_completed_onboarding` as boolean with `DEFAULT false` and `NOT NULL`.
- Backfill rule during migration:
  - Set `has_completed_onboarding=true` for existing users with at least one `backtest_runs` record.
  - Keep `has_completed_onboarding=false` for existing users without backtests.
- After successful signup completion:
  - If user is new, route to wizard first-run entry (not dashboard).
  - Show a subtle secondary-text link: “Skip to dashboard”.
  - Fire PostHog event `wizard_first_run_started` when first-run wizard loads.
- After login for existing users:
  - If `has_completed_onboarding=true`, route to dashboard.
  - If `has_completed_onboarding=false`, route to wizard first-run entry.
- When user meaningfully completes onboarding (minimum: first completed backtest), set `has_completed_onboarding=true`.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User signs up (email/password or OAuth).
2. Auth completes and app evaluates onboarding flag.
3. New user lands in wizard first-run entry.
4. User can proceed with wizard or click subtle “Skip to dashboard”.
5. After user reaches onboarding completion milestone (first completed backtest), user is considered onboarded for future logins.

### 7.2 States
- Loading: Auth/session resolving before route decision.
- Empty: N/A.
- Error: Auth callback/session load failure shows plain-language error and retry path.
- Success: Correct route selected and rendered (wizard first-run or dashboard).

### 7.3 Design Notes
- Keep “Skip to dashboard” visually secondary (small text/link style, low emphasis).
- Do not add modal confirmation for skipping.
- Keep copy simple and explicit.

## 8. Data Requirements
### 8.1 Data Model
- `users.has_completed_onboarding` — boolean — onboarding completion flag for post-auth routing.
- `backtest_runs.user_id` — UUID FK — source used for backfill and completion milestone checks.

### 8.2 Calculations / Definitions (if applicable)
- Onboarded user (for routing): `users.has_completed_onboarding = true`.
- Backfill condition: user has `COUNT(backtest_runs.id) >= 1`.
- New user default: `has_completed_onboarding = false`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `POST /auth/signup` — include onboarding flag in response/session payload if needed for immediate route decision.
- `POST /auth/login` — include onboarding flag in response/session payload.
- `GET /users/me` (if used by frontend auth bootstrap) — expose `has_completed_onboarding`.

### 9.2 Validation & Error Handling
- Migration must be idempotent and safe for re-run in deployment tooling.
- If onboarding flag is unavailable during auth bootstrap, fallback safely to existing behavior and log warning.
- Errors must remain plain-language and not block account creation/login success.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Centralize post-auth route decision in one existing auth success handler.
- Reuse existing wizard entry UI; add only one subtle secondary “Skip to dashboard” link.
- Fire `wizard_first_run_started` once per first-run entry load.

### 10.2 Backend
- Add one migration for `users.has_completed_onboarding` with default false + backfill from `backtest_runs`.
- Ensure auth payload (or bootstrap user payload) includes `has_completed_onboarding`.
- Set flag true when first completed backtest is persisted (simple update guard where false -> true).

## 11. Rollout Plan
- Phase 1: Ship DB migration (`has_completed_onboarding` + backfill).
- Phase 2: Expose onboarding flag in auth/bootstrap payloads.
- Phase 3: Update frontend post-auth routing and wizard first-run skip link.
- Phase 4: Verify analytics event `wizard_first_run_started` and regression-check returning-user routing.

## 12. Acceptance Criteria
- [ ] Given a user has just completed signup (email/password or OAuth), when signup flow completes and app loads, then the user is routed to the strategy wizard (not the dashboard), a subtle “Skip to dashboard” link is visible as secondary text, and PostHog event `wizard_first_run_started` fires.
- [ ] Given a returning user with `has_completed_onboarding = true`, when they log in, then they are routed to the dashboard (not the wizard).
- [ ] Given the database migration runs, when `has_completed_onboarding` is added to `users` with default false, then existing users with at least one backtest are backfilled to true and users without backtests remain false and see wizard on next login.

## 13. Tracking Metrics (Optional)
- Signup-to-wizard-first-run rate (`signup_completed` -> `wizard_first_run_started`).
- Skip-to-dashboard click rate from wizard first-run entry.
- Day-1 activation trend (share of new signups reaching first completed backtest).

## 14. Dependencies (Optional)
- Existing strategy wizard entrypoint.
- Existing PostHog client tracking setup.
- Existing auth/bootstrap flow that determines post-login route.

## 15. Risks & Mitigations (Optional)
- Risk: Existing users without backtests may be surprised by wizard-first routing.
  Mitigation: Keep “Skip to dashboard” clearly available and low friction.
- Risk: Duplicate analytics emission on refresh/re-render.
  Mitigation: Trigger `wizard_first_run_started` from a single guarded mount path.
- Risk: Backfill query cost on large datasets.
  Mitigation: Use indexed `backtest_runs.user_id` and one simple set-based update.

## 16. Open Questions
- Should clicking “Skip to dashboard” immediately set `has_completed_onboarding=true`, or should only first completed backtest do so?
- Should wizard-first routing apply only immediately post-signup, or to all users with `has_completed_onboarding=false` on every login (current proposal: every login until completion)?
