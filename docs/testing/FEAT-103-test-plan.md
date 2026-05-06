# FEAT-103 Test Plan: Dashboard Strategy Lab Instrument

## Scope
Validate that `/dashboard` addresses the P1/P2 dashboard audit findings by clarifying the page's primary strategy-lab job, replacing generic KPI cards with decision-grade signals, correcting visible navigation chrome violations, and aligning Storybook dashboard documentation with the rendered route.

## Test cases

### TC-01 First viewport has a clear strategy-lab job
**Acceptance criterion:** AC-001

**Input:** Authenticated onboarded user opens `/dashboard`.

**Expected output:** The first viewport clearly orients the user toward resuming or validating strategy work, with a prominent next action such as continuing the last edited strategy, reviewing the last backtest result, or running the next backtest.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=DashboardPage`

### TC-02 Top signals are decision-grade
**Acceptance criterion:** AC-002

**Input:** Authenticated user has dashboard strategy and backtest data available, including enough data to surface strategy status or result signals.

**Expected output:** The top signal area does not rely on generic count-only KPI cards; it shows strategy-lab signals useful for deciding what needs attention, such as draft strategies, last run return or drawdown, unvalidated strategies, triggered alerts, or data freshness.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=DashboardPage`

### TC-03 Sidebar chrome avoids visual-system violations
**Acceptance criterion:** AC-003

**Input:** Authenticated onboarded user opens `/dashboard` with the sidebar visible.

**Expected output:** The sidebar logo appears as a flat mark, and the active Dashboard navigation item uses background/text treatment without a decorative gradient logo or active left-side border stripe.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=DashboardPage`

### TC-04 Storybook dashboard documentation matches route
**Acceptance criterion:** AC-004

**Input:** Reviewer compares `/dashboard` with the dashboard Storybook documentation.

**Expected output:** The Storybook dashboard documentation matches the rendered route sections, including whether recently viewed strategies are present or intentionally absent.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=DashboardPage`

## Known test runner gap
The frontend package has previously lacked a working `npm test` script in this repository. The commands above document the intended focused component/page test entrypoint; if the test runner is still unavailable, validate these cases manually with the local app plus the standard frontend gates.
