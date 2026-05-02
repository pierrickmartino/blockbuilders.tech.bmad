# PRD: Favorite Metrics (Backtest Summary)

## Summary
Let users pin their most important backtest metrics so they appear first in the backtest summary cards. Each user can reorder their pinned metrics and the preference is stored on their profile. The goal is a lightweight personalization layer with minimal UI and no new data sources.

## Goals
- Allow users to pin the metrics they care about most.
- Respect a user-defined ordering for pinned metrics.
- Keep the implementation small by reusing existing backtest metrics and profile endpoints.

## Non-Goals
- Per-strategy or per-backtest custom layouts.
- New metrics or computed analytics.
- Team/shared preferences or public sharing.
- Complex dashboards or widget systems.

## User Stories
- As a user, I can pin key metrics (e.g., max drawdown, Sharpe) so they show first.
- As a user, I can reorder my pinned metrics to match my priorities.
- As a user, I see my preferences applied across all backtest summaries.

## Scope
### Core Behaviors
- Backtest summary cards render in this order:
  1. Pinned metrics (in the user-defined order).
  2. Remaining default metrics (in a fixed order).
- Users can pin/unpin a metric directly from the summary cards.
- Users can reorder pinned metrics via simple “Move left/right” controls.
- If a pinned metric is unavailable for a given backtest, it is skipped.
- If the user has no pinned metrics, use the default summary order.

### Default Metrics
Reuse the existing summary metrics already displayed:
- Total return
- CAGR
- Max drawdown
- Number of trades
- Win rate

(If more metrics already exist in the summary list, they can be included as eligible pin targets, but no new metrics are introduced.)

## UX/UI
- Add a small “pin” icon on each summary card.
  - Filled state = pinned.
  - Unfilled state = not pinned.
- When a metric is pinned, show compact “Move left/right” controls on that card.
- Keep the layout identical to today’s summary cards; only add icons/controls.
- No separate settings page is required.

## Data & API
- Store preferences on the user record as a JSON array of metric keys:
  - `favorite_metrics: ["max_drawdown", "sharpe", ...]`
- Use `GET /users/me` to load `favorite_metrics`.
- Use `PUT /users/me` to update `favorite_metrics`.
- No new endpoints.

## Acceptance Criteria
- Users can pin/unpin metrics from the backtest summary cards.
- Pinned metrics appear first, in the user-defined order.
- Reordering pinned metrics updates their order immediately and persists.
- Preferences persist across sessions and apply to all strategies/backtests.
- If a pinned metric is missing for a backtest, it is ignored without errors.

## Implementation Notes (Minimal)
- Keep a simple array of metric keys in user profile state.
- Reuse existing summary metrics data; do not add new API fields.
- Use small inline buttons for reordering instead of drag-and-drop.
- Default order remains unchanged when no favorites are set.
