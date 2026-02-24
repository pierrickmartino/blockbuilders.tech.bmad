# Test Checklist -- PostHog Analytics with Privacy Consent

> Source PRD: `prd-posthog-analytics-privacy-consent.md`

## 1. Configuration & Startup

- [x] PostHog Cloud project key and host are configured in frontend environment variables.
- [x] App starts successfully when PostHog config is present.
- [ ] App starts successfully when PostHog config is missing (analytics safely disabled).

## 2. Consent Banner (GDPR)

- [x] On first visit (no prior consent), minimal consent banner is displayed.
- [ ] Banner includes clear Accept and Decline actions.
- [ ] Banner copy is plain-language and explains analytics purpose.
- [ ] Consent decision is persisted client-side.
- [ ] Banner does not reappear after decision on reload.

## 3. Consent Behavior -- Accept Path

- [ ] When user accepts consent, analytics initializes.
- [ ] `page_view` is sent after consent is accepted.
- [ ] `page_view` appears in PostHog dashboard/live events.

## 4. Consent Behavior -- Decline Path

- [ ] When user declines consent, analytics remains disabled.
- [ ] No required events are sent while consent is declined.
- [ ] Declined preference persists across reloads.

## 5. Authentication Events

- [ ] Successful signup sends `signup_completed`.
- [ ] Successful login sends `login_completed`.
- [ ] Auth events appear in PostHog dashboard.

## 6. Product Feature Events

- [ ] Opening strategy wizard sends `wizard_started`.
- [ ] Creating a strategy sends `strategy_created`.
- [ ] Saving a strategy sends `strategy_saved`.
- [ ] Starting a backtest sends `backtest_started`.
- [ ] Completing a backtest sends `backtest_completed`.
- [ ] Viewing results sends `results_viewed`.
- [ ] All feature events appear in PostHog dashboard.

## 7. Event Payload Validation

- [ ] Every required event includes `user_id`.
- [ ] Every required event includes `timestamp` (valid ISO8601).
- [ ] `user_id` matches the authenticated user performing the action.
- [ ] Timestamp reflects event creation time (reasonable clock alignment).

## 8. Reliability & Error Handling

- [ ] Analytics failures do not block signup, login, strategy creation, save, or backtest flows.
- [ ] If PostHog request fails, app continues without crash.
- [ ] Tracking helper safely no-ops when consent not accepted.

## 9. Regression & UX Simplicity

- [ ] Consent banner is visually minimal and does not obstruct core navigation.
- [ ] No additional complex consent flows/modals are introduced.
- [ ] No extra analytics events beyond PRD-required list are emitted in v1.

## 10. End-to-End Acceptance Criteria Validation

- [ ] Given PostHog is configured and user visits app, consent banner is shown.
- [ ] Given consent accepted, `page_view`, `signup_completed`, `login_completed` are visible in PostHog.
- [ ] Given key feature interactions, all required strategy/backtest events are visible in PostHog.
- [ ] All required events include `user_id` and `timestamp`.
- [ ] Given consent declined, no analytics events are emitted.
