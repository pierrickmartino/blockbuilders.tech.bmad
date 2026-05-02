# PRD: Quick Strategy Clone (List Action)

## Summary
Add a **Clone** button directly in the strategy list rows (and dashboard list) to instantly duplicate a strategy without opening it. The action calls the existing duplicate endpoint and keeps users on the list, enabling fast creation of variations.

## Goals
- Reduce friction for creating strategy variations.
- Keep the workflow one-click from the list view.
- Reuse the existing duplicate endpoint and list UI patterns.

## Non-Goals
- No new backend endpoints or database fields.
- No changes to strategy versioning logic.
- No modal-based flows or multi-step duplication UI.
- No bulk cloning.

## User Stories
- As a user, I can clone a strategy directly from the list without opening it.
- As a user, I see the cloned strategy appear in the list right away.
- As a user, I can quickly make multiple variations via repeated clones.

## Scope
### Core Behavior
- Add a **Clone** action to each strategy row/card in:
  - `/dashboard`
  - `/strategies`
- Clicking **Clone** calls `POST /strategies/{id}/duplicate`.
- On success:
  - Refresh the list (or optimistically insert the new strategy) so the clone appears.
  - Stay on the current list page (do not open the strategy editor).
- The duplicated strategy name follows the existing server behavior (appends `" (Copy)"`).

### Loading & Error States
- While the request is in flight:
  - Disable the Clone button for that row and show a minimal loading indicator (spinner or text change).
- On error:
  - Show a lightweight inline or toast error message (reuse existing notification/toast pattern).

## UX/UI Notes
- Use the existing quick action area for list rows/cards.
- The label is **Clone** (not “Duplicate”) to emphasize one-click action.
- Keep the button small and consistent with other list actions.

## Data & API
- Endpoint: `POST /strategies/{id}/duplicate`
- Response: existing duplicate response (new strategy object).
- No new query params or payload changes.

## Acceptance Criteria
- Each strategy row in dashboard and strategy list shows a **Clone** action.
- Clicking Clone duplicates the strategy via the existing endpoint.
- The user remains on the list view, and the cloned strategy is visible after the action.
- No new backend endpoints are introduced.

## Implementation Notes (Minimal)
- Reuse existing list component action slots.
- Prefer a tiny client-side state update or a refetch of `GET /strategies` after duplication.
- Keep code changes localized to the list UI components.
