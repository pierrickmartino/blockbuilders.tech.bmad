# PRD: Recently Viewed Dashboard Shortcuts

## Summary
Add two small shortcut sections on the dashboard: **Recently Viewed Strategies** and **Recent Backtests**. These lists provide one-click access to active work without searching, using lightweight session history tracking.

## Goals
- Reduce navigation friction by surfacing what the user opened most recently.
- Keep the implementation minimal and front-end only.
- Follow standard UX patterns for “recently viewed” lists.

## Non-Goals
- No backend schema changes or new endpoints.
- No cross-device sync or long-term persistence.
- No analytics or recommendations based on history.

## User Stories
- As a user, I can quickly reopen a strategy I viewed recently from the dashboard.
- As a user, I can jump back to a recent backtest result without searching.
- As a user, I only see a short, relevant list (no clutter).

## Scope
### Core Behavior
- Dashboard shows two small sections above or beside the main strategy list:
  - **Recently Viewed Strategies**
  - **Recent Backtests**
- Each section shows up to **5** items.
- Items are listed in **most-recent-first** order.
- Each item is a simple text link with optional metadata (asset/timeframe for strategies, run date/status for backtests).

### Session History Tracking (Minimal)
- Store recent IDs in **sessionStorage** (preferred) or **localStorage** if sessionStorage is unavailable.
- Update lists when a user:
  - Opens a strategy editor (`/strategies/[id]`).
  - Views a backtest results page (`/strategies/[id]/backtest`).
- De-duplicate items (move existing item to the top when revisited).
- If storage is unavailable or empty, hide the sections entirely.

## UX/UI Notes
- Keep the sections compact (small header + list of links).
- No new cards or heavy components; reuse existing typography and link styles.
- Empty state: do not render the section at all.
- The lists should never push the main dashboard content below the fold on typical desktop screens.

## Data & API
- **No API changes.**
- Data source is stored client-side only:
  - `recentStrategies: string[]`
  - `recentBacktests: { strategyId: string; runId?: string }[]` (if runId isn’t available, store strategyId only)

## Acceptance Criteria
- Dashboard displays recently viewed strategies and backtests when available.
- Lists are capped at 5 items and ordered by most recent view.
- Items link directly to the strategy editor or backtest results page.
- No backend changes are required.

## Implementation Notes (Minimal)
- Add a tiny helper in the dashboard page to read/write session history.
- Update on navigation only; no polling or extra fetches.
- Prefer existing list row data to render labels (fallback to “Strategy” if name not available).
