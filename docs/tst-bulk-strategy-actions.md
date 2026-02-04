# Test Checklist – Bulk Strategy Actions (Archive, Tag, Delete)

> Source PRD: `prd-bulk-strategy-actions.md`

## 1. Selection UI

- [ ] Each strategy row in the strategy list has a checkbox
- [ ] A "select all" checkbox is present in the list header
- [ ] Clicking a row checkbox selects/deselects that single strategy
- [ ] Clicking "select all" selects all visible strategies on the current page
- [ ] Clicking "select all" again deselects all strategies
- [ ] Selection state persists while the user stays on the list page
- [ ] Navigating away from the list page and returning clears the selection
- [ ] Checkbox column layout is compact and consistent with existing list styling

## 2. Bulk Action Dropdown – Visibility & State

- [ ] Bulk action dropdown is hidden or disabled when no strategies are selected
- [ ] Bulk action dropdown appears and is enabled when at least one strategy is selected
- [ ] Dropdown is labeled "Bulk actions"
- [ ] Dropdown includes "Archive" option
- [ ] Dropdown includes "Add tags" option
- [ ] Dropdown includes "Delete" option
- [ ] If filtering causes the selection to become empty, the dropdown is disabled

## 3. Bulk Archive

- [ ] Selecting strategies and choosing "Archive" calls `POST /strategies/bulk/archive`
- [ ] Request body contains `{ "strategy_ids": [...] }` with the selected IDs
- [ ] On success, all selected strategies are archived
- [ ] On success, the selection is cleared
- [ ] On success, the list refreshes to reflect the archived state
- [ ] A success message/toast is shown after completion
- [ ] Archiving zero strategies is not possible (dropdown disabled)

## 4. Bulk Tag

- [ ] Selecting strategies and choosing "Add tags" opens the existing tag selector UI
- [ ] User can select one or more tags to apply
- [ ] Confirming the tag selection calls `POST /strategies/bulk/tag`
- [ ] Request body contains `{ "strategy_ids": [...], "tag_ids": [...] }`
- [ ] On success, the selected tags are applied to all selected strategies
- [ ] On success, the selection is cleared
- [ ] On success, the list refreshes to reflect the new tags
- [ ] A success message/toast is shown after completion

## 5. Bulk Delete

- [ ] Selecting strategies and choosing "Delete" shows a confirmation dialog before proceeding
- [ ] The confirmation dialog clearly states how many strategies will be deleted
- [ ] Canceling the confirmation dialog does not delete anything and preserves the selection
- [ ] Confirming the delete calls `POST /strategies/bulk/delete`
- [ ] Request body contains `{ "strategy_ids": [...] }` with the selected IDs
- [ ] On success, all selected strategies are deleted
- [ ] On success, the selection is cleared
- [ ] On success, the list refreshes to reflect the deletions
- [ ] A success message/toast is shown after completion

## 6. Loading State

- [ ] While a bulk action request is in flight, the dropdown is disabled
- [ ] A small loading indicator is shown during the request
- [ ] User cannot trigger another bulk action while one is in progress
- [ ] Checkboxes remain in their current state during loading

## 7. Error & Partial Failure Handling

- [ ] If the bulk action completely fails, an error toast is shown
- [ ] If the bulk action partially fails, a toast shows success/failure counts
- [ ] On partial failure, failed strategy IDs remain selected
- [ ] On partial failure, successfully processed strategies are reflected in the refreshed list
- [ ] API response format `{ "updated_ids": [...], "failed_ids": [...], "error": "..." }` is handled correctly

## 8. API Endpoints

- [ ] `POST /strategies/bulk/archive` accepts a list of strategy IDs and returns updated/failed IDs
- [ ] `POST /strategies/bulk/tag` accepts strategy IDs and tag IDs, returns updated/failed IDs
- [ ] `POST /strategies/bulk/delete` accepts a list of strategy IDs and returns updated/failed IDs
- [ ] Endpoints reject requests with empty `strategy_ids` arrays
- [ ] Endpoints reject requests with invalid/non-existent strategy IDs gracefully
- [ ] Endpoints only operate on strategies owned by the authenticated user

## 9. Security & Authorization

- [ ] Bulk actions require authentication
- [ ] User cannot archive/tag/delete strategies belonging to another user
- [ ] Invalid or missing auth token returns 401
- [ ] Attempting to act on another user's strategy IDs returns appropriate error (403 or filtered out)

## 10. Edge Cases

- [ ] Selecting a single strategy and performing a bulk action works correctly
- [ ] Selecting all strategies and deleting them results in an empty list
- [ ] Performing a bulk action on already-archived strategies handles gracefully
- [ ] Very large selections (e.g., 50+ strategies) complete without timeout or UI freeze
- [ ] Concurrent bulk actions from the same user are handled safely (or prevented)

## 11. Responsiveness & Layout

- [ ] Checkbox column and bulk action dropdown render correctly on desktop
- [ ] Checkbox column and bulk action dropdown render correctly on tablet
- [ ] Checkbox column and bulk action dropdown render correctly on mobile
- [ ] Layout follows existing list styling and spacing conventions
