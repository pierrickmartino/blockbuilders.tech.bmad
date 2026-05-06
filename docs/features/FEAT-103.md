# FEAT-103: Dashboard Strategy Lab Instrument

## Goal
The dashboard page helps returning traders assess their strategy workspace with the feel of a precise strategy lab instrument rather than a generic application dashboard. It should make strategy inventory, recent backtest activity, readiness signals, and next actions immediately scannable while preserving the current dashboard role as the protected landing page after onboarding.

## Non-goals
- This feature does not add, remove, or change backend endpoints.
- This feature does not change strategy creation, cloning, archiving, tagging, filtering, or backtest execution behavior.
- This feature does not add new persisted user preferences, dashboard configuration, or database fields.
- This feature does not change onboarding routing, authentication routing, plan limits, or billing behavior.
- This feature does not replace the full strategy management page at `/strategies`.
- This feature does not add live market data, live trading, automated recommendations, or AI-generated advice.
- This feature does not redesign app shell layout or pages outside the dashboard route and its directly visible navigation chrome.
- This feature does not introduce new frontend dependencies.

## Acceptance criteria
1. **AC-001** Given an authenticated onboarded user opens `/dashboard`, when the first viewport loads, then the primary dashboard job is clearly about resuming or validating strategy work, with a prominent next action such as continuing the last edited strategy, reviewing the last backtest result, or running the next backtest.
2. **AC-002** Given dashboard strategy and backtest data is available, when the top signal area renders, then generic count-only KPI cards are replaced by decision-grade strategy lab signals such as draft strategies, last run return or drawdown, unvalidated strategies, triggered alerts, or data freshness.
3. **AC-003** Given the dashboard is shown with the app navigation chrome, when the sidebar logo and active dashboard navigation item render, then the logo uses a flat mark and the active state uses background/text treatment without a decorative gradient logo or active left-side border stripe.
4. **AC-004** Given the dashboard route and its Storybook dashboard documentation are both available, when a reviewer compares them, then the documented dashboard sections match the rendered route, including whether recently viewed strategies are present or intentionally absent.

## UI behaviour
- `/dashboard` remains the protected post-onboarding landing page.
- The page uses focused lab language such as strategy workspace, backtest activity, readiness, and recent runs rather than broad greeting-led dashboard copy.
- The top of the page prioritizes a clear work-resume or validation action over greeting-led copy.
- The top signal area favors trading-specific decision signals over generic inventory counts.
- Dashboard navigation chrome avoids decorative gradient branding and active side-stripe treatment.
- Dashboard Storybook documentation stays aligned with the route's rendered sections.
- The dashboard keeps navigation paths to existing strategy creation, strategy details, strategy management, and backtest views.
- The visual direction should feel precise, dense, and analytical rather than decorative, oversized, or generic.
