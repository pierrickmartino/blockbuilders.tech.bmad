# Test Checklist -- Onboarding Funnel Dashboard

> Source PRD: `prd-onboarding-funnel-dashboard.md`

## 1. Preconditions

- [ ] PostHog project is accessible with funnel creation permissions.
- [ ] Required onboarding/backtest events are already tracked (Story 1.2, 1.3).
- [ ] Event names in PostHog exactly match PRD step names.

## 2. Event Availability Validation

- [ ] `signup_completed` is visible in PostHog events.
- [ ] `wizard_started` is visible in PostHog events.
- [ ] `strategy_saved` is visible in PostHog events.
- [ ] `backtest_started` is visible in PostHog events.
- [ ] `backtest_completed` is visible in PostHog events.
- [ ] `results_viewed` is visible in PostHog events.
- [ ] `second_session` is visible in PostHog events.

## 3. Funnel Configuration

- [ ] A PostHog funnel named `Onboarding Funnel Dashboard` exists.
- [ ] Funnel step order is exactly:
  1. `signup_completed`
  2. `wizard_started`
  3. `strategy_saved`
  4. `backtest_started`
  5. `backtest_completed`
  6. `results_viewed`
  7. `second_session`
- [ ] Funnel is saved and shared for product owner access.

## 4. Funnel Output Validation

- [ ] Funnel renders overall conversion.
- [ ] Conversion rate is displayed between each adjacent step.
- [ ] Drop-off points are visible per step in funnel output.

## 5. Filters

- [ ] Date range filter is available in the funnel view.
- [ ] Changing date range updates conversion output.
- [ ] Cohort filter is available in the funnel view.
- [ ] Applying a cohort updates conversion output.

## 6. Acceptance Criteria Validation

- [ ] Given analytics events are being tracked, opening the PostHog funnel shows the configured 7-step funnel.
- [ ] Conversion rates between each step are displayed.
- [ ] Funnel can be filtered by date range.
- [ ] Funnel can be filtered by user cohort.

## 7. Regression / Simplicity

- [ ] No new app UI was introduced for this feature.
- [ ] No additional non-required events were added only for this dashboard.
- [ ] Dashboard remains implemented with native PostHog funnel capabilities.
