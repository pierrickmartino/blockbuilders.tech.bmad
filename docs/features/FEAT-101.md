# FEAT-101: Backtest Toast Notifications

## Goal
Backtest users receive brief, non-blocking Sonner notifications for backtest start and batch-run guidance messages instead of seeing a persistent inline status message above the strategy tabs. The page remains focused on configuring and reviewing runs while still confirming user actions clearly.

## Non-goals
- This feature does not change how backtests or batch backtests are created, queued, polled, or completed.
- This feature does not change failed-run messaging shown in the run details area.
- This feature does not replace validation errors, authentication errors, or data availability warnings elsewhere on the page.
- This feature does not add new analytics events or change existing event payloads.
- This feature does not redesign global app notifications outside the strategy backtest page.
- This feature does not add new backend behavior, storage, or notification delivery channels.

## Acceptance criteria
1. Given an authenticated user starts a single backtest successfully, when the request is accepted, then a success notification appears confirming that the backtest started and results will update automatically.
2. Given an authenticated user starts a batch backtest successfully, when at least one run is queued, then a success notification appears with the queued run count and tells the user that results will appear as runs complete.
3. Given the user presses the run shortcut while custom dates are not available for a single run, when the page cannot submit a single backtest from the current context, then an informational notification tells the user to open custom dates or use Run All.
4. Given any FEAT-101 notification is visible, when the user continues using the backtest page, then the notification does not push the strategy tabs, header, run configuration, or results content down the page.
5. Given any FEAT-101 notification is visible, when the user dismisses it or it expires, then the notification disappears without changing selected run, selected periods, scroll position, or loaded results.
6. Given a single or batch backtest request fails, when the page shows the failure, then the existing visible error behavior remains available and no success notification is shown for the failed request.

## API contract
No new or changed FastAPI endpoints are required. Existing backtest endpoints continue to return the same request and response bodies:

- `POST /backtests/` creates a single backtest run.
- `POST /backtests/batch` creates a batch backtest run.

Both endpoints keep their existing authentication requirements, validation behavior, and error responses.

## Data model changes
No SQLModel fields, tables, or persisted values are added or changed.

## UI behaviour
- The strategy backtest page uses Sonner-style toast notifications for transient success and guidance messages related to starting backtests.
- Single-run success copy confirms that the backtest started and that the page will update automatically when results are ready.
- Batch-run success copy includes the number of queued runs and explains that results appear as runs complete.
- Shortcut guidance appears as an informational notification rather than an inline page banner.
- Notifications are visually separate from the main page layout and do not reserve vertical space in the page content.
- Notifications are dismissible and may also disappear automatically after a short delay.
- Existing error alerts and failed-run messages remain visible where users already expect them.

## Implementation Plan
_Produced by Opus. Approved: [reviewed]. Implemented: 2026-05-03._

- [x] **Add Sonner dependency** — `frontend/package.json` + `package-lock.json`: `sonner ^2.0.7` added.
- [x] **Mount global `<Toaster />`** — `frontend/src/app/layout.tsx`: `<Toaster position="top-right" richColors />` mounted after `<ConsentBanner />` inside `<body>`.
- [x] **Replace single-backtest success banner with toast** — `toast.success("Backtest started", { description: "It will update automatically when finished." })`. Satisfies TC-01.
- [x] **Replace batch-backtest success banner with toast** — `toast.success(\`Batch started: ${queuedCount} backtest${…} queued\`, { description: "Results will appear below as runs complete." })`. Satisfies TC-02.
- [x] **Replace shortcut guidance banner with informational toast** — `toast.info("Open custom dates to run a single backtest, or use Run All.")`. Satisfies TC-03.
- [x] **Remove inline status banner JSX and dead state** — `statusMessage` state and `{statusMessage && (…)}` JSX block deleted; red `error` banner left intact. Satisfies AC4/AC5/AC6 and TC-04/TC-05/TC-06.
- [x] **Lint + type-check** — `npm run lint` (0 errors) and `npx tsc --noEmit` (clean) and `npm run build` (passes). Manual smoke verification required; see tasks/lessons.md for the noted `npm test` gap.
