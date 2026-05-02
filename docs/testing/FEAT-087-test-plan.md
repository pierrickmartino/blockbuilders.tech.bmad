# Test Checklist -- Strategy Groups & Tags

> Source PRD: `prd-strategy-tags-groups.md`

## 1. Data Model

- [x] `strategy_tags` table exists with columns: id (UUID PK), user_id (FK), name (VARCHAR), created_at, updated_at
- [x] `strategy_tag_links` table exists with columns: strategy_id (FK), tag_id (FK), created_at
- [x] `strategy_tag_links` has a unique constraint on (strategy_id, tag_id)
- [x] Tag name uniqueness is enforced per user (case-insensitive)
- [ ] Database migration runs cleanly on a fresh database
- [ ] Database migration runs cleanly on an existing database with user data

## 2. Tag Validation Rules

- [x] Tag name is required (empty string rejected)
- [x] Tag name is trimmed of leading/trailing whitespace
- [x] Tag name with 1 character is accepted
- [x] Tag name with 24 characters is accepted
- [x] Tag name with 25+ characters is rejected
- [x] Tag name allows letters, numbers, spaces, dashes, and underscores
- [x] Tag name rejects special characters (e.g., @, #, !, %, &)
- [x] Tag name uniqueness is case-insensitive ("Scalping" and "scalping" are the same tag)
- [x] Tag name preserves original casing for display (e.g., "Scalping" displays as entered)
- [x] Maximum of 20 tags per strategy is enforced
- [x] Assigning a 21st tag to a strategy is rejected with a clear error

## 3. API -- GET /strategy-tags

- [x] Returns all tags for the authenticated user
- [x] Returns an empty list for a user with no tags
- [x] Does not return tags belonging to other users
- [x] Returns 401 for unauthenticated requests

## 4. API -- POST /strategy-tags

- [x] Creates a new tag with a valid name
- [x] Returns the created tag with its ID
- [x] Is idempotent by name (creating an existing tag name returns the existing tag)
- [x] Case-insensitive idempotency ("Scalping" matches existing "scalping")
- [ ] Returns 400 for empty tag name
- [ ] Returns 400 for tag name exceeding 24 characters
- [ ] Returns 400 for tag name with invalid characters
- [x] Returns 401 for unauthenticated requests

## 5. API -- DELETE /strategy-tags/{id}

- [x] Deletes the specified tag
- [x] Removes all tag links associated with the deleted tag
- [x] Returns 404 for a non-existent tag ID
- [x] Returns 403/404 when attempting to delete another user's tag
- [x] Returns 401 for unauthenticated requests

## 6. API -- PATCH /strategies/{id} (Tag Assignment)

- [x] Accepts `tag_ids` array to set tags for a strategy
- [x] Setting `tag_ids: []` removes all tags from the strategy
- [x] Setting valid tag IDs assigns those tags to the strategy
- [x] Replaces existing tag assignments (not additive)
- [x] Rejects tag IDs that do not belong to the authenticated user
- [x] Rejects tag IDs that do not exist
- [x] Rejects more than 20 tag IDs
- [x] Returns 401 for unauthenticated requests
- [x] Returns 403/404 when patching another user's strategy

## 7. API -- GET /strategies (Tag Filtering)

- [ ] Supports `tag_ids` query parameter (comma-separated UUIDs)
- [x] Returns strategies matching ANY selected tag (OR logic)
- [x] Returns all strategies when no `tag_ids` filter is applied
- [x] Returns empty list when filtering by a tag with no assigned strategies
- [x] Returns correct results when filtering by a single tag
- [x] Returns correct results when filtering by multiple tags
- [ ] Invalid tag IDs in the filter are handled gracefully (ignored or return 400)
- [x] Returns 401 for unauthenticated requests

## 8. Frontend -- Strategy List Display

- [x] Tags appear as small chips next to each strategy name in the list
- [x] Strategies with no tags display normally (no empty chip area)
- [x] Multiple tags on a strategy are all visible (or truncated with count indicator)

## 9. Frontend -- Tag Filter

- [x] Multi-select tag filter is available in the strategy list header
- [x] Filter shows all of the user's tags as options
- [x] Selecting one or more tags filters the strategy list
- [x] Filter uses OR logic (strategies matching any selected tag are shown)
- [x] "Clear filters" control is available and resets the filter
- [x] Clearing the filter shows all strategies again
- [x] Filter state updates the displayed list immediately

## 10. Frontend -- Tag Management on Strategy

- [x] Tag input area is available in the strategy metadata/editor section
- [x] User can type a tag name and press Enter to add it
- [x] Existing tags appear as removable chips
- [x] Clicking the remove action on a chip removes the tag from the strategy
- [x] Autocomplete suggests existing tags while typing (if available)
- [x] Adding a new tag name creates the tag and assigns it to the strategy

## 11. Edge Cases

- [x] Deleting a tag that is assigned to multiple strategies removes it from all
- [x] Strategy with maximum tags (20) displays all tags correctly
- [x] User with many tags (e.g., 50+) can still manage and filter efficiently
- [x] Tags with spaces in the name display correctly as chips
- [x] Tags with dashes and underscores display correctly
- [x] Filtering by tags while also searching by strategy name works correctly (if search exists)
- [ ] Loading the strategy list with tag filter pre-applied from URL works (if supported)

## 12. Security and Auth

- [x] All tag endpoints require authentication
- [x] Users cannot see, create, or delete tags belonging to other users
- [x] Users cannot assign another user's tags to their strategies
- [x] Users cannot filter strategies using another user's tag IDs
- [x] Tag operations on another user's strategy return 403 or 404

## 13. Execution Isolation

- [x] Tags do not affect strategy validation
- [x] Tags do not affect backtest execution
- [x] Tags do not appear in backtest results or outputs
- [x] Tags are stored in relational tables (not inside strategy version JSON)
- [x] Adding or removing tags does not create a new strategy version

## 14. Non-Goals Verification

- [x] No automatic tag suggestions or AI-based labeling
- [x] No tag-based permissions or sharing
- [x] No folder hierarchy or nesting (flat tags only)
- [x] No changes to strategy execution or backtesting logic
