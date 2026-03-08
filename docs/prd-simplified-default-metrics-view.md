# PRD: Simplified Default Metrics View

## 1. Summary
Reduce cognitive load on backtest results by showing only the most important metrics by default. Users who have not customized favorites see exactly five key metrics, while advanced metrics remain available behind a collapsed “Show detailed analysis” section.

## 2. Problem Statement
Current backtest results can feel overwhelming because too many metrics appear at once. New and intermediate users need a cleaner default view that highlights core outcomes first.

## 3. Goals
- Show a focused, default 5-metric summary for users without pinned favorites.
- Preserve access to the full advanced metric set via a simple expandable section.
- Respect existing favorite/pinned metrics behavior (FR-12) without introducing new customization flows.

## 4. Non-Goals
- Defining new metrics or changing existing metric formulas.
- Reworking metric pinning UX or storage model.
- Persisting expand/collapse state across page loads.

## 5. Target Users & User Stories
### 5.1 Target Users
- Users reviewing backtest results who have not set favorite metrics.
- Users reviewing backtest results who already use pinned/favorite metrics.

### 5.2 User Stories
- As a user viewing backtest results, I want only key metrics by default so that I can quickly understand performance.
- As a user, I want a “Show detailed analysis” option so that I can inspect advanced metrics only when needed.
- As a user with pinned favorites, I want my chosen metrics to remain primary so that my existing preferences are respected.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Default metric set when no favorites exist.
- Expandable advanced-metrics section on results pages.
- Integration with existing favorite metrics behavior (FR-12).

### 6.2 Out of Scope
- Backend schema changes for metrics.
- New personalization settings beyond existing pinning.

### 6.3 Functional Requirements
- If the user has no pinned/favorite metrics, show exactly 5 metrics by default:
  1. Total Return %
  2. Max Drawdown %
  3. Win Rate
  4. Number of Trades
  5. vs. Buy-and-Hold %
- Hide all other metrics by default (including Sharpe, Sortino, Calmar, alpha, beta, CAGR, and cost metrics).
- Provide a “Show detailed analysis” control that expands a section below the default metrics and reveals all remaining metrics.
- The detailed analysis section must be collapsed by default on every page load.
- If pinned/favorite metrics exist, render pinned/favorite metrics as the primary visible set instead of the default 5.
- “Show detailed analysis” must still reveal the full metric set even when pinned/favorite metrics are active.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens any backtest result. They first see either the default 5 metrics (no favorites) or their pinned favorites (favorites set). They can optionally click “Show detailed analysis” to reveal advanced metrics below.

### 7.2 States
- Loading
  - Show existing metrics loading skeletons/placeholders.
- Empty
  - If metrics payload is missing, show existing empty-state fallback copy.
- Error
  - Show existing plain-language metric load error state.
- Success
  - Primary metrics visible immediately; advanced metrics hidden until expanded.

### 7.3 Design Notes
- Keep current metric card styling and layout; change visibility/toggling only.
- “Show detailed analysis” should be explicit and placed directly under primary metrics.
- Toggle label changes to “Hide detailed analysis” when expanded.
- No modal, no new page, no additional settings.

## 8. Data Requirements
### 8.1 Data Model
- `metric_key` — string — canonical key for each metric card.
- `favorite_metrics` — string[] — existing ordered user preference list from FR-12.
- `all_metrics` — object/map — existing backtest metric payload.

### 8.2 Calculations / Definitions (if applicable)
- No new calculations. Reuse existing metric computations and formatting.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{id}` — fetch existing metric payload for results rendering.
- `GET /users/me` — fetch existing `favorite_metrics` preference.

### 9.2 Validation & Error Handling
- If `favorite_metrics` is empty or missing, use the default 5-metric set.
- If a favorite metric key is not available in a run, skip it without blocking render.
- If advanced metric values are unavailable, hide only unavailable cards and keep the rest visible.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add one local UI state flag for expanded/collapsed detailed analysis per page render.
- Build primary metric list from:
  1) favorites (if present), else 2) fixed default 5 keys.
- Build detailed list from remaining metrics not shown in primary list.
- Keep default collapsed state by initializing expanded flag to `false` on mount/load.

### 10.2 Backend
- No backend code changes required if current metric payload already includes full metric set.

## 11. Rollout Plan
- Phase 1: Implement UI behavior behind existing results metrics component logic.
- Phase 2: Validate behavior across desktop/mobile and favorite-metrics combinations.

## 12. Acceptance Criteria
- [ ] Given no favorite metrics are set, any backtest result shows exactly 5 default metrics: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %.
- [ ] Given the default view, clicking “Show detailed analysis” reveals all advanced metrics in an expandable section below.
- [ ] Given any page load, detailed analysis is collapsed by default.
- [ ] Given favorite metrics are set via existing pinning (FR-12), those pinned metrics replace the default 5 as the primary visible metrics.
- [ ] Given favorite metrics are set, “Show detailed analysis” still reveals the full metric set.

## 13. Tracking Metrics (Optional)
- Backtest results engagement — expect improved scanability (more users reach charts/trades after opening results).
- Detailed analysis toggle usage rate — monitor how often advanced metrics are expanded.

## 14. Dependencies (Optional)
- Existing favorite metrics feature (FR-12).
- Existing backtest metrics payload and rendering components.

## 15. Risks & Mitigations (Optional)
- Risk: Users may think advanced metrics were removed.
  Mitigation: Clear “Show detailed analysis” label and consistent placement under primary metrics.
- Risk: Inconsistent metric ordering between primary/detailed sections.
  Mitigation: Use deterministic key order with simple fixed arrays.

## 16. Open Questions
- Should there be a subtle helper text under the toggle (e.g., “Includes Sharpe, Sortino, alpha, beta, CAGR, and costs”)?
- Should expansion interactions be tracked with analytics in this phase, or deferred?
