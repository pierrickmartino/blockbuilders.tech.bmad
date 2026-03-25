# Test Checklist – Bulk Strategy Actions (Archive, Tag, Delete)

> Source PRD: `prd-bulk-strategy-actions.md`

## 1. Selection UI

- [x] Each strategy row in the strategy list has a checkbox
- [x] A "select all" checkbox is present in the list header
- [x] Clicking a row checkbox selects/deselects that single strategy
- [x] Clicking "select all" selects all visible strategies on the current page
- [x] Clicking "select all" again deselects all strategies
- [x] Selection state persists while the user stays on the list page
- [x] Navigating away from the list page and returning clears the selection
- [x] Checkbox column layout is compact and consistent with existing list styling

## 2. Bulk Action Dropdown – Visibility & State

- [x] Bulk action dropdown is hidden or disabled when no strategies are selected
- [x] Bulk action dropdown appears and is enabled when at least one strategy is selected
- [ ] Dropdown is labeled "Bulk actions"
- [x] Dropdown includes "Archive" option
- [ ] Dropdown includes "Add tags" option
- [x] Dropdown includes "Delete" option
- [ ] If filtering causes the selection to become empty, the dropdown is disabled

## 3. Bulk Archive

- [x] Selecting strategies and choosing "Archive" calls `POST /strategies/bulk/archive`
- [x] Request body contains `{ "strategy_ids": [...] }` with the selected IDs
- [x] On success, all selected strategies are archived
- [x] On success, the selection is cleared
- [x] On success, the list refreshes to reflect the archived state
- [x] A success message/toast is shown after completion
- [x] Archiving zero strategies is not possible (dropdown disabled)

## 4. Bulk Tag

- [x] Selecting strategies and choosing "Add tags" opens the existing tag selector UI
- [x] User can select one or more tags to apply
- [x] Confirming the tag selection calls `POST /strategies/bulk/tag`
- [x] Request body contains `{ "strategy_ids": [...], "tag_ids": [...] }`
- [x] On success, the selected tags are applied to all selected strategies
- [x] On success, the selection is cleared
- [x] On success, the list refreshes to reflect the new tags
- [x] A success message/toast is shown after completion

## 5. Bulk Delete

- [x] Selecting strategies and choosing "Delete" shows a confirmation dialog before proceeding
- [x] The confirmation dialog clearly states how many strategies will be deleted
- [x] Canceling the confirmation dialog does not delete anything and preserves the selection
- [x] Confirming the delete calls `POST /strategies/bulk/delete`
- [x] Request body contains `{ "strategy_ids": [...] }` with the selected IDs
- [x] On success, all selected strategies are deleted
- [x] On success, the selection is cleared
- [x] On success, the list refreshes to reflect the deletions
- [x] A success message/toast is shown after completion

## 6. Loading State

- [x] While a bulk action request is in flight, the dropdown is disabled
- [ ] A small loading indicator is shown during the request
- [x] User cannot trigger another bulk action while one is in progress
- [x] Checkboxes remain in their current state during loading

## 7. Error & Partial Failure Handling

- [x] If the bulk action completely fails, an error toast is shown
- [x] If the bulk action partially fails, a toast shows success/failure counts
- [x] On partial failure, failed strategy IDs remain selected
- [x] On partial failure, successfully processed strategies are reflected in the refreshed list
- [ ] API response format `{ "updated_ids": [...], "failed_ids": [...], "error": "..." }` is handled correctly

## 8. API Endpoints

- [x] `POST /strategies/bulk/archive` accepts a list of strategy IDs and returns updated/failed IDs
- [x] `POST /strategies/bulk/tag` accepts strategy IDs and tag IDs, returns updated/failed IDs
- [x] `POST /strategies/bulk/delete` accepts a list of strategy IDs and returns updated/failed IDs
- [x] Endpoints reject requests with empty `strategy_ids` arrays
- [x] Endpoints reject requests with invalid/non-existent strategy IDs gracefully
- [x] Endpoints only operate on strategies owned by the authenticated user

## 9. Security & Authorization

- [x] Bulk actions require authentication
- [x] User cannot archive/tag/delete strategies belonging to another user
- [x] Invalid or missing auth token returns 401
- [x] Attempting to act on another user's strategy IDs returns appropriate error (403 or filtered out)

## 10. Edge Cases

- [x] Selecting a single strategy and performing a bulk action works correctly
- [x] Selecting all strategies and deleting them results in an empty list
- [x] Performing a bulk action on already-archived strategies handles gracefully
- [x] Very large selections (e.g., 50+ strategies) complete without timeout or UI freeze
- [x] Concurrent bulk actions from the same user are handled safely (or prevented)

## 11. Responsiveness & Layout

- [x] Checkbox column and bulk action dropdown render correctly on desktop
- [ ] Checkbox column and bulk action dropdown render correctly on tablet
- [x] Checkbox column and bulk action dropdown render correctly on mobile
- [x] Layout follows existing list styling and spacing conventions
