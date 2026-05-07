# FEAT-103 Test Plan: Dashboard Toast Notifications

## Scope
Validate that transient dashboard action feedback appears as toast notifications, does not shift dashboard layout, and preserves visible inline treatment for blocking dashboard load errors.

## Coverage note
The frontend has no Jest/RTL test runner. All TCs are manual-only, verified against `npm run dev` at `/dashboard`. No automated test command exists for this feature.

## Test cases

### TC-001 Duplicate success shows success toast
**Acceptance criterion:** AC-001

**Input:** Authenticated user opens `/dashboard`, clicks duplicate for a strategy, the duplicate request succeeds, and the strategy list refresh succeeds.

**Expected output:** A success toast appears confirming the new strategy was created and can be opened from the strategy list.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-002 Duplicate success with refresh failure explains partial refresh
**Acceptance criterion:** AC-002

**Input:** Authenticated user opens `/dashboard`, clicks duplicate for a strategy, the duplicate request succeeds, and the follow-up strategy list refresh fails.

**Expected output:** The duplicate appears in the visible dashboard list, and a success toast explains that the strategy is shown now but the full list could not refresh.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-003 Duplicate failure shows error toast only
**Acceptance criterion:** AC-003

**Input:** Authenticated user opens `/dashboard`, clicks duplicate for a strategy, and the duplicate request fails with a backend or network error.

**Expected output:** An error toast appears with a clear retry-oriented message, and no success toast appears.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-004 Toasts do not push dashboard layout
**Acceptance criterion:** AC-004

**Input:** Authenticated user triggers any FEAT-103 toast from the dashboard.

**Expected output:** The dashboard header, next-action panel, status tiles, alerts, and strategy list keep their existing positions; no inline success or action-error banner is inserted into the dashboard content.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-005 Toast dismissal preserves dashboard state
**Acceptance criterion:** AC-005

**Input:** Authenticated user triggers any FEAT-103 toast, scrolls or interacts with the dashboard, then dismisses the toast or waits for it to expire.

**Expected output:** The toast disappears and the current strategy list, loading state, selected action state, scroll position, and dashboard links remain unchanged.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-006 Blocking load error remains inline
**Acceptance criterion:** AC-006

**Input:** Authenticated user opens `/dashboard` and the initial strategy list request fails.

**Expected output:** The dashboard shows the existing visible retry alert in the page content, including the retry control, and does not rely only on a transient toast for the blocking load failure.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).

### TC-007 Mobile toast remains usable
**Acceptance criterion:** AC-007

**Input:** Authenticated user opens `/dashboard` on a narrow mobile viewport and triggers any FEAT-103 toast.

**Expected output:** The toast text is readable and dismissible, and the primary dashboard action remains navigable without being permanently covered.

**Verification method:** Manual — run `npm run dev` and test at `/dashboard` (no automated test runner available).
