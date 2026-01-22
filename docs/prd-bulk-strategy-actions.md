# PRD: Bulk Strategy Actions (Archive, Tag, Delete)

## Summary
Enable power users to select multiple strategies from the strategy list and apply bulk operations (archive, tag, delete) via checkbox selection and a simple action dropdown. The frontend submits batch API calls to keep interaction fast and minimal.

## Goals
- Speed up cleanup and organization of large strategy lists.
- Keep the UI simple: checkboxes + single action dropdown.
- Use batch API calls to reduce request overhead.

## Non-Goals
- No new modal-heavy flows or multi-step wizards.
- No complex permissions or cross-user bulk actions.
- No bulk cloning, bulk edit of non-listed fields, or scheduling changes.

## User Stories
- As a power user, I can select multiple strategies and archive them in one action.
- As a power user, I can apply one or more tags to many strategies at once.
- As a power user, I can delete multiple strategies without repeating the same action.

## Scope
### Core Behavior
- Add a checkbox to each strategy row and a “select all” checkbox in the header.
- When at least one strategy is selected:
  - Show an action dropdown labeled **Bulk actions** with:
    - Archive
    - Add tags
    - Remove tags (optional if already supported in tag management)
    - Delete
- Actions apply to the selected strategy IDs only.

### Interaction Details
- Selection persists while the user stays on the list page.
- After action success:
  - Clear the selection.
  - Refresh the list to reflect changes.
- If the selection becomes empty (e.g., after filtering), disable the dropdown.

### Loading & Error States
- Disable the dropdown and show a small loading indicator while the request runs.
- If the bulk action partially fails, surface a toast with the counts (success/failure) and keep the failed IDs selected.

## UX/UI Notes
- Keep layout compact: a checkbox column + a top-right bulk action dropdown.
- Avoid extra confirmation flows except for **Delete** (single confirm dialog is acceptable).
- Follow existing list styling and spacing.

## Data & API
### Proposed Endpoints (Minimal)
- `POST /strategies/bulk/archive`
  - Body: `{ "strategy_ids": ["..."] }`
- `POST /strategies/bulk/tag`
  - Body: `{ "strategy_ids": ["..."], "tag_ids": ["..."] }`
- `POST /strategies/bulk/delete`
  - Body: `{ "strategy_ids": ["..."] }`

**Response:**
- `{ "updated_ids": ["..."], "failed_ids": ["..."], "error": "optional" }`

## Acceptance Criteria
- Strategy list supports multi-select via checkboxes.
- Bulk action dropdown appears and is enabled only when selections exist.
- Archive, tag, and delete actions operate on all selected items.
- The list updates after completion, with a simple success/error message.
- UI remains minimal and consistent with existing list actions.

## Implementation Notes (Minimal)
- Keep selection state local to the strategy list page.
- Reuse existing tag selector UI for the “Add tags” action.
- Prefer a single backend handler per action with simple ID lists.
