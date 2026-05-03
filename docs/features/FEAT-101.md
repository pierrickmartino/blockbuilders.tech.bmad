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
_Produced by Opus. Approved: [reviewed]_

- **Add Sonner dependency** — `frontend/package.json` (+ `package-lock.json`): add `sonner` (latest stable). Frontend. No migration. Must complete before bullet 2.
- **Mount global `<Toaster />`** — `frontend/src/app/layout.tsx`: import `Toaster` from `sonner` and render it once inside `<body>` (after `ConsentBanner`), with `position="top-right"` and `richColors`/theme matching design tokens (uses CSS variables from `globals.css`, no new tokens). Frontend. No migration. Must complete before bullets 3–5.
- **Replace single-backtest success banner with toast** — `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` (~line 885): swap `setStatusMessage("Backtest started…")` for `toast.success("Backtest started", { description: "It will update automatically when finished." })`. Frontend. No migration. Satisfies TC-01.
- **Replace batch-backtest success banner with toast** — same file (~line 935): swap `setStatusMessage(\`Batch started: …\`)` for `toast.success(\`Batch started: ${queuedCount} backtest${queuedCount !== 1 ? "s" : ""} queued\`, { description: "Results will appear below as runs complete." })`. Frontend. No migration. Satisfies TC-02.
- **Replace shortcut guidance banner with informational toast** — same file (~line 967, inside the Cmd/Ctrl+Enter handler): swap `setStatusMessage("Open custom dates…")` for `toast.info("Open custom dates to run a single backtest, or use Run All.")`. Frontend. No migration. Satisfies TC-03.
- **Remove inline status banner JSX and dead state** — same file: delete the `{statusMessage && (…)}` block (lines 1122–1131) and the `const [statusMessage, setStatusMessage] = useState…` declaration (line 490); leave the red `error` banner block (lines ~1115–1121) untouched. Frontend. No migration. Satisfies AC4/AC5/AC6 and TC-04/TC-05/TC-06. Must complete after bullets 3–5.
- **Lint + type-check + manual smoke** — run `npm run lint` and `npx tsc --noEmit` in `frontend/`; manually verify in dev that single-run, batch-run, shortcut-without-custom-dates, and a forced failure each behave per acceptance criteria; document the manual verification in tasks/lessons.md given the noted `npm test` gap.
