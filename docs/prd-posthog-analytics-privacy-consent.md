# PRD: Integrate PostHog Analytics with Privacy Consent

## 1. Summary
Add minimal, event-level product analytics using PostHog Cloud (free tier), gated by a simple GDPR consent banner. Track key lifecycle and product actions so product owners can measure engagement and identify drop-off points.

## 2. Problem Statement
We currently lack reliable event analytics for key user actions, making it hard to measure onboarding success, feature adoption, and funnel drop-off. We also need a consent-first approach to stay GDPR-compliant.

## 3. Goals
- Capture a minimal, high-signal event set in PostHog Cloud.
- Enforce privacy consent before analytics collection.
- Include user-level context (`user_id`) and event timing (`timestamp`) for all required events.

## 4. Non-Goals
- No complex analytics taxonomy beyond listed events.
- No custom data warehouse, ETL pipeline, or BI dashboards.
- No advanced consent manager platform; use a lightweight in-app banner.
- No full session replay/heatmap rollout in v1.

## 5. Target Users & User Stories
### 5.1 Target Users
- Product owner monitoring adoption and funnel completion.
- End users interacting with auth, wizard, strategy creation, and backtesting flows.

### 5.2 User Stories
- As a product owner, I want event analytics for key actions, so that I can identify where users drop off.
- As a user, I want a clear cookie/consent choice, so that my privacy preferences are respected.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- PostHog Cloud project configuration and frontend SDK integration.
- Minimal consent banner shown on first app visit.
- Event tracking for required events only.
- Event payload includes `user_id` and `timestamp`.
- Validation that events are visible in PostHog dashboard.

### 6.2 Out of Scope
- Detailed event schema for every UI interaction.
- A/B testing setup.
- Cross-product analytics federation.
- Server-side event relay.

### 6.3 Functional Requirements
- On first application visit, show a minimal consent banner with Accept and Decline choices.
- If consent is declined, analytics must remain disabled.
- If consent is accepted, initialize PostHog and enable tracking.
- Fire lifecycle events: `page_view`, `signup_completed`, `login_completed`.
- Fire feature events: `wizard_started`, `strategy_created`, `strategy_saved`, `backtest_started`, `backtest_completed`, `results_viewed`.
- Include `user_id` and `timestamp` in each required event payload.
- Use one small tracking helper to avoid duplicated instrumentation logic.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User lands on app.
2. Consent banner appears if no prior consent decision exists.
3. User accepts or declines analytics.
4. If accepted, events are tracked during auth and key product flows.
5. Product owner verifies events in PostHog dashboard.

### 7.2 States
- Loading: App loads before consent value is read.
- Empty: No prior consent decision exists (banner visible).
- Error: PostHog init fails (app continues, analytics disabled, no user disruption).
- Success: Consent stored and required events are tracked.

### 7.3 Design Notes
- Keep banner compact, non-blocking, and plain-language.
- Copy must clearly state analytics purpose and user choice.
- Provide a simple settings entry point to review/revoke consent later.

## 8. Data Requirements
### 8.1 Data Model
- `analytics_consent` — enum/string (`accepted` | `declined`) — stored client-side.
- `event_name` — string — PostHog event key.
- `user_id` — string/UUID — authenticated user identifier when available.
- `timestamp` — ISO8601 string — client event timestamp.

### 8.2 Calculations / Definitions (if applicable)
- Funnel start: users with `page_view`.
- Signup completion: users with `signup_completed`.
- Login completion: users with `login_completed`.
- Wizard engagement: users with `wizard_started`.
- Backtest completion rate: `backtest_completed / backtest_started`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new backend endpoint required for v1.
- Existing auth and feature endpoints remain unchanged; tracking occurs in frontend action handlers.

### 9.2 Validation & Error Handling
- Validate PostHog config variables at startup; if missing, skip analytics initialization safely.
- Tracking failures must never block user flows.
- If consent is not accepted, helper must no-op and not emit events.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add PostHog JS SDK with simple initialization wrapper.
- Add `ConsentBanner` component shown when consent is undecided.
- Add `trackEvent(name, props)` helper that:
  - checks consent,
  - appends `user_id` and `timestamp`,
  - sends event to PostHog.
- Wire tracking into existing flows only where required by acceptance criteria.

### 10.2 Backend
- No backend code changes required for v1.
- Ensure user identity is already available in frontend auth context for event properties.

## 11. Rollout Plan
- Phase 1: Configure PostHog Cloud project + environment keys.
- Phase 2: Add consent banner + consent storage.
- Phase 3: Instrument required events in auth and product flows.
- Phase 4: Verify event delivery in PostHog dashboard and run TST checklist.

## 12. Acceptance Criteria
- [ ] Given PostHog Cloud is configured, when a user visits the app, then a minimal GDPR cookie/consent banner is displayed.
- [ ] Given consent is accepted, lifecycle events `page_view`, `signup_completed`, and `login_completed` are sent and visible in PostHog dashboard.
- [ ] Given user interacts with key features, events `wizard_started`, `strategy_created`, `strategy_saved`, `backtest_started`, `backtest_completed`, and `results_viewed` are sent.
- [ ] Each required event includes `user_id` and `timestamp`.
- [ ] Given consent is declined, analytics events are not sent.

## 13. Tracking Metrics (Optional)
- Consent opt-in rate — target: establish baseline and improve clarity if low.
- Signup conversion (`signup_completed / page_view`) — expected increasing trend.
- Login completion (`login_completed / page_view`) — expected stable/increasing trend.
- Backtest completion (`backtest_completed / backtest_started`) — expected increasing trend.

## 14. Dependencies (Optional)
- PostHog Cloud project (free tier).
- Frontend environment variables for PostHog key and host.
- Existing auth context/user identity in frontend.

## 15. Risks & Mitigations (Optional)
- Risk: Over-instrumentation adds noise.
  Mitigation: Restrict to required events only in v1.
- Risk: Consent flow breaks analytics unexpectedly.
  Mitigation: Add explicit TST cases for accept/decline paths and persisted preferences.
- Risk: Missing `user_id` on some flows.
  Mitigation: Use auth context snapshot at track call time and verify in testing.

## 16. Open Questions
- Should `page_view` be tracked only after consent, or should a strictly anonymized pre-consent page counter be allowed? (Default in this PRD: after consent only.)
- Should consent management live only in local storage or be synced to user profile for cross-device consistency in a future iteration?
