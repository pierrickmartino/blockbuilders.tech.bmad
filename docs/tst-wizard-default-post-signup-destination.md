# Test Checklist -- Wizard as Default Post-Signup Destination

> Source PRD: `prd-wizard-default-post-signup-destination.md`

## 1. Preconditions

- [ ] Migration adding `users.has_completed_onboarding` has been applied.
- [ ] Auth flows are operational for email/password and OAuth.
- [ ] PostHog tracking is enabled in test/staging environment.

## 2. Database Migration & Backfill

- [ ] Confirm `users.has_completed_onboarding` exists as `BOOLEAN NOT NULL DEFAULT false`.
- [ ] Confirm existing user with >=1 `backtest_runs` row is backfilled to `has_completed_onboarding=true`.
- [ ] Confirm existing user with 0 `backtest_runs` rows remains `has_completed_onboarding=false`.
- [ ] Confirm migration can be re-run safely in deployment workflow (idempotent behavior).

## 3. Signup Routing (Email/Password)

- [ ] Create a brand-new email/password account.
- [ ] Verify post-signup destination is wizard first-run entry (not dashboard).
- [ ] Verify subtle “Skip to dashboard” link is visible as secondary text.
- [ ] Verify clicking “Skip to dashboard” routes to `/dashboard`.
- [ ] Verify PostHog event `wizard_first_run_started` is emitted on first-run wizard load.

## 4. Signup Routing (OAuth)

- [ ] Create a brand-new OAuth account (Google or GitHub).
- [ ] Verify post-signup destination is wizard first-run entry (not dashboard).
- [ ] Verify subtle “Skip to dashboard” link is visible as secondary text.
- [ ] Verify PostHog event `wizard_first_run_started` is emitted on first-run wizard load.

## 5. Returning User Routing

- [ ] Seed or update a user with `has_completed_onboarding=true`.
- [ ] Log in with that account.
- [ ] Verify destination is `/dashboard` (not wizard).
- [ ] Seed or update a user with `has_completed_onboarding=false`.
- [ ] Log in with that account.
- [ ] Verify destination is wizard first-run entry.

## 6. Onboarding Completion Flag Behavior

- [ ] For a user starting with `has_completed_onboarding=false`, complete first backtest end-to-end.
- [ ] Verify backend updates `has_completed_onboarding=true`.
- [ ] Log out and log back in.
- [ ] Verify user now lands on `/dashboard`.

## 7. Analytics Validation

- [ ] `wizard_first_run_started` appears in PostHog live events for new signup flows.
- [ ] Event properties (if any are defined) are consistent across email/password and OAuth signup paths.
- [ ] No duplicate `wizard_first_run_started` events from a single intended first-run entry render.

## 8. Regression & Simplicity Checks

- [ ] Existing login flow still succeeds for all account types.
- [ ] Dashboard remains unchanged for onboarded users.
- [ ] No additional onboarding modal/step was introduced beyond routing + secondary skip link.
- [ ] Error copy in auth/wizard routing remains plain-language.
