# FEAT-101 Test Plan: Backtest Toast Notifications

## Scope
Validate that transient backtest start and guidance messages on the strategy backtest page appear as Sonner notifications, do not alter page layout, and do not change existing error behavior.

## Test cases

### TC-01 Single backtest start shows success notification
**Acceptance criterion:** 1

**Input:** Authenticated user opens `/strategies/{id}/backtest`, enters valid custom date settings, and starts a single backtest. The `POST /backtests/` request succeeds.

**Expected output:** A success notification appears with copy confirming that the backtest started and will update automatically when finished.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

### TC-02 Batch backtest start shows queued count notification
**Acceptance criterion:** 2

**Input:** Authenticated user selects multiple period presets and starts a batch backtest. The `POST /backtests/batch` response includes at least one queued run.

**Expected output:** A success notification appears with the queued run count and tells the user that results will appear below as runs complete.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

### TC-03 Run shortcut guidance appears as informational notification
**Acceptance criterion:** 3

**Input:** Authenticated user presses Cmd+Enter or Ctrl+Enter while the page cannot submit a single custom-date backtest from the current context.

**Expected output:** An informational notification tells the user to open custom dates to run a single backtest or use Run All.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

### TC-04 Notifications do not push page layout
**Acceptance criterion:** 4

**Input:** Authenticated user triggers any FEAT-101 notification from the strategy backtest page.

**Expected output:** The strategy tabs, page header, run configuration controls, and results content keep their existing vertical positions; no inline status banner is inserted above the tabs.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

### TC-05 Dismissing notification preserves page state
**Acceptance criterion:** 5

**Input:** Authenticated user triggers a FEAT-101 notification, selects a run or period preset, then dismisses the notification or waits for it to expire.

**Expected output:** The notification disappears and the selected run, selected periods, scroll position, and loaded results remain unchanged.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

### TC-06 Failed requests keep existing error behavior
**Acceptance criterion:** 6

**Input:** Authenticated user attempts a single or batch backtest and the request fails with a backend or network error.

**Expected output:** The existing visible error behavior remains available, and no success notification appears for the failed request.

**Exact test command:** `cd frontend && npm test -- --testPathPattern=StrategyBacktestPage`

## Known test runner gap
The frontend package currently does not define an `npm test` script. The commands above document the intended focused test entrypoint once the frontend test runner is available; until then, these cases require manual verification or a future frontend test harness.
