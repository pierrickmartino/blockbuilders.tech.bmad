# PRD: Onboarding Funnel Dashboard (PostHog)

## 1. Summary
Create a dedicated PostHog funnel dashboard for the onboarding journey so product owners can see conversion rates between key steps and quickly identify where users drop off.

## 2. Problem Statement
We track onboarding and backtest lifecycle events, but we do not yet have one shared funnel view that shows step-to-step conversion in a single place. Without it, prioritization is slower and more subjective.

## 3. Goals
- Provide a single funnel in PostHog for the onboarding journey.
- Show conversion rate between every required step.
- Support date range and cohort filtering for focused analysis.

## 4. Non-Goals
- No new product UI in the app for this feature.
- No new tracking events beyond the existing required events.
- No custom analytics pipeline or warehouse modeling.

## 5. Target Users & User Stories
### 5.1 Target Users
- Product owner
- Growth/product analyst

### 5.2 User Stories
- As a product owner, I want a dedicated funnel view showing conversion rates at each step of the user journey, so that I can identify exactly where users drop off and prioritize improvements.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- PostHog funnel configuration using existing tracked events.
- Saved funnel view with defined step order.
- Funnel filters for date range and user cohort.
- Basic naming/description conventions for team discoverability.

### 6.2 Out of Scope
- Additional event instrumentation.
- In-app dashboard embedding.
- Automated alerts based on funnel conversion thresholds.

### 6.3 Functional Requirements
- Configure one PostHog funnel named `Onboarding Funnel Dashboard`.
- Funnel step order must be exactly:
  1. `signup_completed`
  2. `wizard_started`
  3. `strategy_saved`
  4. `backtest_started`
  5. `backtest_completed`
  6. `results_viewed`
  7. `second_session`
- Funnel must display conversion rates between each adjacent step.
- Funnel must allow filtering by date range.
- Funnel must allow filtering by cohort (e.g., by signup period, acquisition source, or saved PostHog cohort).
- Funnel must be saved/shared in the PostHog project so product owners can open it directly.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. Product owner opens PostHog.
2. Product owner opens the saved funnel `Onboarding Funnel Dashboard`.
3. Product owner reviews overall and per-step conversion.
4. Product owner adjusts date range and/or cohort filters.
5. Product owner identifies highest drop-off step and prioritizes follow-up work.

### 7.2 States
- Loading: PostHog loads funnel data.
- Empty: No users/events for selected filter window.
- Error: PostHog query/config issue prevents rendering.
- Success: Funnel and step conversion rates are visible.

### 7.3 Design Notes
- Keep this fully within native PostHog funnel UI (no custom app UI).
- Use clear step labels matching event names for low ambiguity.
- Keep filter set minimal (date range + cohort) to reduce complexity.

## 8. Data Requirements
### 8.1 Data Model
- `event` — string — PostHog event name.
- `distinct_id` — string — user/session identity used by PostHog funnel logic.
- `timestamp` — datetime — event occurrence time.
- `cohort` — PostHog cohort reference — optional grouping filter.

### 8.2 Calculations / Definitions (if applicable)
- Step conversion rate: users reaching step N+1 / users reaching step N.
- End-to-end conversion rate: users reaching `second_session` / users reaching `signup_completed`.
- Drop-off at step N: 1 - step conversion rate from N to N+1.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new backend endpoints required.
- Existing event producers remain source of truth.

### 9.2 Validation & Error Handling
- Validate each required event exists in PostHog before finalizing funnel.
- If an event is missing or misnamed, fix instrumentation/config before release sign-off.
- Analytics reporting must not block core product flows.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- No frontend code changes required if all required events are already tracked.
- Confirm `second_session` is emitted per current analytics plan; if missing, add minimal tracking at next eligible return-session point.

### 10.2 Backend
- No backend code changes required for dashboard configuration.
- Keep backend event naming stable to avoid breaking funnel continuity.

## 11. Rollout Plan
- Phase 1: Verify required events are present in PostHog (`signup_completed` through `second_session`).
- Phase 2: Create and save `Onboarding Funnel Dashboard` in PostHog with exact step order.
- Phase 3: Validate conversion output and filters (date range + cohort) using TST checklist.
- Phase 4: Share dashboard link with product owners and add it to team docs.

## 12. Acceptance Criteria
- [ ] Given analytics events are being tracked (Story 1.2, 1.3), when I open the PostHog funnel dashboard, then I can see a configured funnel with steps: `signup_completed -> wizard_started -> strategy_saved -> backtest_started -> backtest_completed -> results_viewed -> second_session`.
- [ ] Conversion rates between each funnel step are displayed.
- [ ] I can filter the funnel by date range.
- [ ] I can filter the funnel by user cohort.

## 13. Tracking Metrics (Optional)
- Signup → wizard conversion.
- Wizard → strategy saved conversion.
- Backtest started → backtest completed conversion.
- Results viewed → second session conversion.
- End-to-end onboarding conversion (`signup_completed` → `second_session`).

## 14. Dependencies (Optional)
- Existing PostHog event tracking from Story 1.2 and 1.3.
- PostHog project access with permission to create/save funnels.
- Defined `second_session` event semantics and instrumentation.

## 15. Risks & Mitigations (Optional)
- Risk: `second_session` event is not consistently emitted.
  Mitigation: Validate instrumentation first; keep definition simple and documented.
- Risk: Event naming drift breaks funnel continuity.
  Mitigation: Lock event names and treat changes as explicit migration work.
- Risk: Over-filtering yields misleading low-volume results.
  Mitigation: Start with broad date range; use cohorts deliberately.

## 16. Open Questions
- What is the canonical definition of `second_session` (time threshold and trigger condition)?
- Should we create one default cohort (e.g., new users in last 30 days) and pin it for product review cadence?
