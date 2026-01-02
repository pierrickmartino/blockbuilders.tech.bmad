# PRD: Multi-Strategy Dashboard

## Summary
Create a dashboard view that shows all of a user’s strategies with the latest performance metrics in a compact table/grid. It provides a quick portfolio-level overview and allows sorting and filtering by performance, last run date, and asset. This is an enhanced version of the current strategy list with metric previews.

## Goals
- Give users a fast, at-a-glance overview of all strategies.
- Make it easy to find top/bottom performers, stale strategies, and asset-specific strategies.
- Keep the implementation simple and reuse existing strategy list data and UI patterns.

## Non-Goals
- Portfolio-level aggregation or allocation analysis.
- New metrics beyond what the latest backtest already stores.
- Real-time updates or streaming.
- Advanced filtering builder or saved views.

## User Stories
- As a user, I can see the latest performance of all my strategies in one place.
- As a user, I can sort by performance or last run to prioritize actions.
- As a user, I can filter by asset to focus on specific markets.
- As a user, I can quickly open, duplicate, or archive a strategy from the list.

## Scope
### Core Behaviors
- Display all strategies in a table (desktop) or compact card grid (mobile).
- Each row/card shows:
  - Strategy name
  - Asset + timeframe
  - Latest backtest metrics preview (see below)
  - Last run date/time (or “Never”)
  - Quick actions: Open, Duplicate, Archive
- Sorting options:
  - Performance (default: total return, desc)
  - Last run date (desc)
  - Asset (A→Z)
- Filters:
  - Asset (dropdown)
  - Performance bucket (All, Positive, Negative)
  - Last run (All, Last 7 days, Last 30 days, Never)
- Search by name (existing behavior).

### Metrics Preview (minimal)
Use existing latest-run fields from the strategy list endpoint. Show only what’s already available:
- Total Return %
- Max Drawdown %
- Win Rate %
- Trades count

If no runs exist, display “—” for metrics and “Never” for last run.

## UX/UI
- Reuse the current strategy list layout and styling.
- Desktop: table with sticky header (if easy), otherwise simple table.
- Mobile: stacked cards with the same fields in a compact layout.
- Sorting and filters appear as simple select inputs above the list.
- Keep columns minimal; no charts or sparklines in v1.

## Data & API
- Reuse `GET /strategies` as the sole data source.
- Apply sorting and filtering client-side for v1 to avoid backend changes.
- Use existing query params (`search`, `include_archived`) as-is.

## Acceptance Criteria
- Dashboard shows all strategies with latest metric previews.
- User can sort by performance, last run date, and asset.
- User can filter by asset, performance bucket, and last run bucket.
- Empty state remains with quick create + wizard entry.
- No new backend endpoints are required for v1.

## Implementation Notes (Minimal)
- Update the dashboard and strategy list views to share a single list component if already present.
- Prefer client-side sort/filter on the list data.
- Keep the list fast by avoiding extra API calls.
