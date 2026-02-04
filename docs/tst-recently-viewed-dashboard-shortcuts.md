# Test Checklist – Recently Viewed Dashboard Shortcuts

> Source PRD: `prd-recently-viewed-dashboard-shortcuts.md`

## 1. Recently Viewed Strategies Section

- [ ] Dashboard displays a "Recently Viewed Strategies" section when recent strategies exist
- [ ] Section shows up to 5 strategy items
- [ ] Items are listed in most-recent-first order
- [ ] Each item is a clickable text link navigating to the strategy editor (`/strategies/[id]`)
- [ ] Each item shows optional metadata (asset, timeframe) if available
- [ ] If strategy name is not available, a fallback label (e.g., "Strategy") is displayed
- [ ] Clicking an item navigates to the correct strategy page

## 2. Recent Backtests Section

- [ ] Dashboard displays a "Recent Backtests" section when recent backtests exist
- [ ] Section shows up to 5 backtest items
- [ ] Items are listed in most-recent-first order
- [ ] Each item is a clickable text link navigating to the backtest results page (`/strategies/[id]/backtest`)
- [ ] Each item shows optional metadata (run date, status) if available
- [ ] Clicking an item navigates to the correct backtest results page

## 3. Session History Tracking

- [ ] Viewing a strategy editor page (`/strategies/[id]`) adds the strategy to the recent list
- [ ] Viewing a backtest results page (`/strategies/[id]/backtest`) adds the backtest to the recent list
- [ ] Revisiting an already-listed item moves it to the top (deduplication)
- [ ] Recent IDs are stored in sessionStorage by default
- [ ] Falls back to localStorage if sessionStorage is unavailable
- [ ] History is updated on navigation only (no polling or extra fetches)

## 4. List Limits & Ordering

- [ ] Each list is capped at 5 items maximum
- [ ] When a 6th item is added, the oldest item is removed
- [ ] Order is always most-recent-first
- [ ] Revisiting an existing item reorders it to the top without creating a duplicate

## 5. Empty States

- [ ] If no strategies have been viewed, the "Recently Viewed Strategies" section is not rendered at all
- [ ] If no backtests have been viewed, the "Recent Backtests" section is not rendered at all
- [ ] If storage is unavailable (disabled/full), both sections are hidden entirely without errors
- [ ] A brand new session with no history shows no shortcut sections

## 6. UI & Layout

- [ ] Sections are compact (small header + list of links)
- [ ] Sections are positioned above or beside the main strategy list on the dashboard
- [ ] Sections use existing typography and link styles (no new card components)
- [ ] Sections do not push the main dashboard content below the fold on typical desktop screens
- [ ] Sections render correctly on desktop viewport
- [ ] Sections render correctly on tablet viewport
- [ ] Sections render correctly on mobile viewport

## 7. Data Storage Format

- [ ] Recent strategies are stored as a string array of strategy IDs: `recentStrategies: string[]`
- [ ] Recent backtests are stored with at least strategyId: `recentBacktests: { strategyId: string; runId?: string }[]`
- [ ] Storage keys do not conflict with other application storage

## 8. No Backend Changes

- [ ] No new API endpoints are added
- [ ] No backend schema changes are introduced
- [ ] No new backend dependencies are added
- [ ] All data is sourced and stored client-side only

## 9. Edge Cases & Negative Tests

- [ ] Viewing a strategy that was subsequently deleted: link renders but navigation shows appropriate error (no crash)
- [ ] Viewing a backtest whose run was deleted: link renders but navigation shows appropriate error (no crash)
- [ ] Corrupted or malformed data in sessionStorage/localStorage is handled gracefully (section hidden or storage reset)
- [ ] Clearing browser storage removes the shortcut sections without errors
- [ ] Opening multiple tabs updates each tab's history independently (sessionStorage behavior)
- [ ] Cross-device sync is not expected (sessionStorage is per-session)
- [ ] No analytics, recommendations, or tracking beyond simple ID storage
