# PRD: Strategy Performance by Period Grid

## 1. Summary
Extend the strategy list view to show each strategy’s return across multiple periods in one compact row-level grid. Users can compare 30d, 60d, 90d, and 1y performance side by side without opening individual backtests. Premium users also see 2y and 3y columns. The expected outcome is faster strategy triage and better horizon-aware decision-making.

## 2. Problem Statement
Today users must open strategy/backtest details to evaluate performance over different horizons. This creates friction and makes cross-strategy comparison slow. Users cannot quickly spot strategies that are strong short-term but weak long-term (or the opposite).

## 3. Goals
- Provide at-a-glance multi-period performance visibility directly in strategy list rows.
- Enable quick sorting by any period column to find top performers for a chosen horizon.
- Keep implementation simple by reusing cached batch backtests or the most recent runs per period.

## 4. Non-Goals
- Building a new analytics engine or new complex factor metrics.
- Adding custom user-defined periods in v1.
- Replacing strategy detail or backtest result pages.

## 5. Target Users & User Stories
### 5.1 Target Users
- Active strategy creators comparing many saved strategies.
- Premium users managing larger portfolios and longer holding horizons.

### 5.2 User Stories
- As a trader, I want to compare 30d/60d/90d/1y returns for all strategies in one table so that I can shortlist candidates quickly.
- As a premium user, I want 2y and 3y columns so that I can evaluate long-horizon robustness.
- As a trader, I want to sort by one period column so that I can find best/worst strategies for that timeframe.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Add period-performance columns to strategy list rows.
- Show return percentages with positive/negative color cues.
- Allow sorting by any visible period column.
- Use cached batch backtests or latest available run per period as data source.
- Gate 2y and 3y columns to Premium plan users.

### 6.2 Out of Scope
- New paid tiers or billing model changes.
- Intraday periods (e.g., 7d, 14d) in v1.
- New chart visualizations in the list view.

### 6.3 Functional Requirements
- Strategy list shows these default period columns for all users: `30d`, `60d`, `90d`, `1y`.
- Premium users additionally see: `2y`, `3y`.
- Each period cell shows:
  - Return percent formatted with sign and `%` (e.g., `+12.4%`, `-3.8%`).
  - Green text for positive values, red text for negative values, neutral style for `0.0%`.
- If period data is unavailable, display `—` and exclude it from sort value calculations.
- User can sort ascending/descending by any visible period column.
- Sorting is stable and deterministic (tie-breaker: strategy name ascending).
- Data priority per period:
  1. Cached batch-backtest result for that exact period.
  2. Most recent completed run matching that period.
  3. Unavailable (`—`).
- The endpoint powering strategy list returns period-performance fields needed by UI in one response (no per-row follow-up calls).

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens `/strategies`.
2. Table loads with base columns and period-performance columns.
3. User scans green/red values across rows to compare horizons.
4. User clicks a period header (e.g., `90d`) to sort and identify top performers.

### 7.2 States
- Loading: show table skeleton for period cells.
- Empty: no strategies state remains unchanged.
- Error: show existing list-level error with plain-language retry message.
- Success: period cells render values or `—`.

### 7.3 Design Notes
- Keep grid compact and readable; do not introduce nested cards.
- Use existing table typography, spacing, and color tokens.
- Column headers must clearly label timeframe (`30d`, `60d`, `90d`, `1y`, `2y`, `3y`).
- Premium-only columns are fully hidden for non-premium users (no disabled placeholders).

## 8. Data Requirements
### 8.1 Data Model
- `strategy_id` — UUID — strategy identifier.
- `period_returns` — object/map — keyed by period label (`30d`, `60d`, `90d`, `1y`, `2y`, `3y`) with numeric percentage values when available.
- `period_source` — object/map — optional metadata per period (`batch_cache` or `latest_run`) for troubleshooting.
- `plan_tier` — enum (`free`, `pro`, `premium`) — controls premium columns visibility.

### 8.2 Calculations / Definitions (if applicable)
- `period_return_pct`: `((ending_equity - starting_equity) / starting_equity) * 100` from the selected period run.
- Positive if `> 0`, negative if `< 0`, neutral if `== 0`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /strategies` — include period-performance fields in each strategy row payload.

### 9.2 Validation & Error Handling
- Only completed runs are eligible for period-return extraction.
- If cached data is stale or missing, fallback to latest matching completed run.
- If no valid run exists for a period, return null for that period (UI renders `—`).
- Endpoint must remain backward compatible for existing consumers.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing strategy table component and sorting behavior.
- Add lightweight cell renderer for signed `%` with semantic color classes.
- Reuse existing premium-plan context/gating to control `2y/3y` columns.

### 10.2 Backend
- Extend existing strategy list serializer/query to append period-return map.
- Prefer single query path or existing batch fetch to avoid N+1 lookups.
- Reuse existing cache/result models; avoid introducing new tables for v1.

## 11. Rollout Plan
- Phase 1: Ship 30d/60d/90d/1y columns and sorting for all users.
- Phase 2: Enable premium-only 2y/3y columns behind existing plan-tier checks.

## 12. Acceptance Criteria
- [ ] `/strategies` rows display `30d`, `60d`, `90d`, `1y` return columns for all users.
- [ ] Premium users also see `2y` and `3y`; non-premium users do not.
- [ ] Each period cell shows signed `%` with green/red/neutral styling.
- [ ] Clicking any visible period header sorts rows by that period value.
- [ ] Missing data displays `—` without UI errors.
- [ ] Data is sourced from cached batch results first, then latest matching completed run.

## 13. Tracking Metrics (Optional)
- Strategy-list period-column sort usage rate — increasing trend after launch.
- Time-to-open-first-strategy-from-list — expected decrease.
- Premium conversion influence (viewing locked long-horizon value proposition) — monitor trend.

## 14. Dependencies (Optional)
- Existing strategy list backend response and serializer.
- Existing backtest result cache and run history data.
- Existing plan-tier checks for Premium gating.

## 15. Risks & Mitigations (Optional)
- Risk: Sparse data for newer strategies creates many `—` cells.  
  Mitigation: Keep fallback logic simple and show neutral placeholder clearly.
- Risk: Slow list query if period joins are expensive.  
  Mitigation: Reuse cached aggregates and avoid per-row queries.
- Risk: Users misread timeframe coverage.  
  Mitigation: Keep clear column labels and stable `%` formatting.

## 16. Open Questions
- Should Pro users get either `2y` or `3y`, or remain Premium-only for both in v1?
- Do we need a small tooltip clarifying that values come from cached/latest completed runs?
