# FEAT-103: Dashboard Toast Notifications

## Goal
Dashboard users receive brief, non-blocking toast notifications for transient action feedback so the dashboard does not shift when a strategy action succeeds or fails. Persistent dashboard problems, such as the initial strategy list failing to load, remain visible in the page because they block the user's next step.

## Non-goals
- This feature does not change how strategies are loaded, duplicated, sorted, filtered, or refreshed.
- This feature does not change dashboard cards, metrics, empty states, or primary-action routing.
- This feature does not replace page-level load errors that prevent the dashboard from showing useful strategy data.
- This feature does not add new backend endpoints, request bodies, response bodies, or persistence.
- This feature does not create notification history, unread counts, email, push, webhook, or bell-notification entries.
- This feature does not introduce a new toast library or redesign the global toast placement established by FEAT-101.
- This feature does not add analytics events or change existing analytics payloads.

## Acceptance criteria
1. AC-001 Given an authenticated user duplicates a strategy from the dashboard and the strategy list refresh succeeds, when the duplicate request completes, then a success toast appears confirming the new strategy was created and can be opened from the strategy list.
2. AC-002 Given an authenticated user duplicates a strategy from the dashboard and the duplicate is created but the strategy list refresh fails, when the dashboard adds the duplicate to the visible list, then a success toast appears explaining that the strategy is shown now but the full list could not refresh.
3. AC-003 Given an authenticated user duplicates a strategy from the dashboard and the duplicate request fails, when the failure is shown, then an error toast appears with a clear retry-oriented message and no success toast appears.
4. AC-004 Given any FEAT-103 toast is visible, when the user continues using the dashboard, then the dashboard header, next-action panel, status tiles, alerts, and strategy list keep their existing positions without being pushed down by an inline success or action-error banner.
5. AC-005 Given any FEAT-103 toast is visible, when the user dismisses it or it expires, then the current strategy list, loading state, selected action state, scroll position, and dashboard links remain unchanged.
6. AC-006 Given the dashboard cannot load strategy data, when the page shows the blocking load error, then the existing visible retry alert remains in the dashboard content and is not replaced by a transient-only toast.
7. AC-007 Given a dashboard toast appears on a narrow mobile viewport, when the user views the dashboard, then the toast remains readable, dismissible, and does not cover the primary dashboard action in a way that prevents navigation.

## UI behaviour
- The dashboard uses the existing global toast pattern for transient feedback related to dashboard actions.
- Successful strategy duplication shows a success toast instead of an inline success banner inside the dashboard content.
- Partial refresh after duplication still confirms the created strategy and tells the user that the full list could not refresh.
- Duplicate failures show an error toast with plain-language recovery copy.
- Blocking load errors remain as visible inline dashboard alerts with retry controls.
- Toasts are dismissible and may also disappear automatically after a short delay.
- Toasts do not reserve space in the dashboard layout and do not alter dashboard card, tile, or list positioning.
- Toast text stays short enough to scan while preserving the strategy name when a duplicate is created.

## Implementation Plan
_Produced by Opus. Approved: [reviewed]_

- **(1) frontend/src/app/(app)/dashboard/page.tsx — imports.** Frontend, no migration. Add `import { toast } from "sonner";` and remove the now-unused `CheckCircle2` import (kept only by the success banner). Must complete before bullet 2.
- **(2) frontend/src/app/(app)/dashboard/page.tsx — state cleanup.** Frontend, no migration. Delete the `successMessage` state, its `useEffect` auto-dismiss timer, and the `setSuccessMessage(null)` calls inside `handleClone`. Keep the `error` state but it will from now on hold ONLY blocking strategies-load failures. Depends on bullet 1; must complete before bullets 3 and 5.
- **(3) frontend/src/app/(app)/dashboard/page.tsx — handleClone success paths.** Frontend, no migration. Replace both `setSuccessMessage(...)` calls in `handleClone` with `toast.success(...)`: the full-refresh path uses the existing `Created "${cloned.name}". Open it from your strategy list when you are ready to edit.` copy; the partial-refresh path uses the existing `Created "${cloned.name}". It is shown here now, but the full list could not refresh.` copy (passed as `description` so the strategy name stays scannable per AC-001/AC-002). Depends on bullet 2.
- **(4) frontend/src/app/(app)/dashboard/page.tsx — handleClone failure path.** Frontend, no migration. Replace the `setError(getDashboardErrorMessage(err, ...))` call inside `handleClone`'s `catch` with `toast.error(getDashboardErrorMessage(err, "We could not duplicate this strategy. Try again from the strategy row."))` so duplicate failures never touch the inline `error` state (AC-003, AC-006). Depends on bullet 2.
- **(5) frontend/src/app/(app)/dashboard/page.tsx — render cleanup.** Frontend, no migration. Delete the entire `{successMessage && (...)}` JSX block and simplify the `{error && (...)}` block: remove the `flex-col`/sm:flex-row layout that existed only because of the duplicate-error-with-no-retry case — every remaining inline error is `strategiesLoadFailed=true`, so render the alert content + the "Retry" button unconditionally. This preserves AC-004 (no layout shift) and AC-006 (blocking load error stays inline). Depends on bullets 2–4.
- **(6) frontend/src/app/(app)/dashboard/page.tsx — loadStrategies guard.** Frontend, no migration. Confirm `loadStrategies` still calls `setError(null)` on retry start (it does); no further change needed since duplicate errors no longer write to `error`. Verification step, no code edit unless bullet 5 introduced a regression.
- **(7) Manual verification (no test files).** Per Q1.d: no Jest/RTL scaffolding will be added in this feature. Verify each AC by hand against `npm run dev` on `/dashboard`: trigger duplicate success (AC-001), force the second `/strategies/` GET to fail to validate partial-refresh toast (AC-002), force the duplicate POST to fail (AC-003), confirm header/next-action/tiles/list positions are unchanged across all three (AC-004), dismiss + scroll check (AC-005), force initial load to fail (AC-006), and re-test on a 360px-wide viewport (AC-007). Final step.
