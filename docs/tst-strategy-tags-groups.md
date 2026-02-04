# Test Checklist -- Strategy Groups & Tags

> Source PRD: `prd-strategy-tags-groups.md`

## 1. Data Model

- [ ] `strategy_tags` table exists with columns: id (UUID PK), user_id (FK), name (VARCHAR), created_at, updated_at
- [ ] `strategy_tag_links` table exists with columns: strategy_id (FK), tag_id (FK), created_at
- [ ] `strategy_tag_links` has a unique constraint on (strategy_id, tag_id)
- [ ] Tag name uniqueness is enforced per user (case-insensitive)
- [ ] Database migration runs cleanly on a fresh database
- [ ] Database migration runs cleanly on an existing database with user data

## 2. Tag Validation Rules

- [ ] Tag name is required (empty string rejected)
- [ ] Tag name is trimmed of leading/trailing whitespace
- [ ] Tag name with 1 character is accepted
- [ ] Tag name with 24 characters is accepted
- [ ] Tag name with 25+ characters is rejected
- [ ] Tag name allows letters, numbers, spaces, dashes, and underscores
- [ ] Tag name rejects special characters (e.g., @, #, !, %, &)
- [ ] Tag name uniqueness is case-insensitive ("Scalping" and "scalping" are the same tag)
- [ ] Tag name preserves original casing for display (e.g., "Scalping" displays as entered)
- [ ] Maximum of 20 tags per strategy is enforced
- [ ] Assigning a 21st tag to a strategy is rejected with a clear error

## 3. API -- GET /strategy-tags

- [ ] Returns all tags for the authenticated user
- [ ] Returns an empty list for a user with no tags
- [ ] Does not return tags belonging to other users
- [ ] Returns 401 for unauthenticated requests

## 4. API -- POST /strategy-tags

- [ ] Creates a new tag with a valid name
- [ ] Returns the created tag with its ID
- [ ] Is idempotent by name (creating an existing tag name returns the existing tag)
- [ ] Case-insensitive idempotency ("Scalping" matches existing "scalping")
- [ ] Returns 400 for empty tag name
- [ ] Returns 400 for tag name exceeding 24 characters
- [ ] Returns 400 for tag name with invalid characters
- [ ] Returns 401 for unauthenticated requests

## 5. API -- DELETE /strategy-tags/{id}

- [ ] Deletes the specified tag
- [ ] Removes all tag links associated with the deleted tag
- [ ] Returns 404 for a non-existent tag ID
- [ ] Returns 403/404 when attempting to delete another user's tag
- [ ] Returns 401 for unauthenticated requests

## 6. API -- PATCH /strategies/{id} (Tag Assignment)

- [ ] Accepts `tag_ids` array to set tags for a strategy
- [ ] Setting `tag_ids: []` removes all tags from the strategy
- [ ] Setting valid tag IDs assigns those tags to the strategy
- [ ] Replaces existing tag assignments (not additive)
- [ ] Rejects tag IDs that do not belong to the authenticated user
- [ ] Rejects tag IDs that do not exist
- [ ] Rejects more than 20 tag IDs
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403/404 when patching another user's strategy

## 7. API -- GET /strategies (Tag Filtering)

- [ ] Supports `tag_ids` query parameter (comma-separated UUIDs)
- [ ] Returns strategies matching ANY selected tag (OR logic)
- [ ] Returns all strategies when no `tag_ids` filter is applied
- [ ] Returns empty list when filtering by a tag with no assigned strategies
- [ ] Returns correct results when filtering by a single tag
- [ ] Returns correct results when filtering by multiple tags
- [ ] Invalid tag IDs in the filter are handled gracefully (ignored or return 400)
- [ ] Returns 401 for unauthenticated requests

## 8. Frontend -- Strategy List Display

- [ ] Tags appear as small chips next to each strategy name in the list
- [ ] Strategies with no tags display normally (no empty chip area)
- [ ] Multiple tags on a strategy are all visible (or truncated with count indicator)

## 9. Frontend -- Tag Filter

- [ ] Multi-select tag filter is available in the strategy list header
- [ ] Filter shows all of the user's tags as options
- [ ] Selecting one or more tags filters the strategy list
- [ ] Filter uses OR logic (strategies matching any selected tag are shown)
- [ ] "Clear filters" control is available and resets the filter
- [ ] Clearing the filter shows all strategies again
- [ ] Filter state updates the displayed list immediately

## 10. Frontend -- Tag Management on Strategy

- [ ] Tag input area is available in the strategy metadata/editor section
- [ ] User can type a tag name and press Enter to add it
- [ ] Existing tags appear as removable chips
- [ ] Clicking the remove action on a chip removes the tag from the strategy
- [ ] Autocomplete suggests existing tags while typing (if available)
- [ ] Adding a new tag name creates the tag and assigns it to the strategy

## 11. Edge Cases

- [ ] Deleting a tag that is assigned to multiple strategies removes it from all
- [ ] Strategy with maximum tags (20) displays all tags correctly
- [ ] User with many tags (e.g., 50+) can still manage and filter efficiently
- [ ] Tags with spaces in the name display correctly as chips
- [ ] Tags with dashes and underscores display correctly
- [ ] Filtering by tags while also searching by strategy name works correctly (if search exists)
- [ ] Loading the strategy list with tag filter pre-applied from URL works (if supported)

## 12. Security and Auth

- [ ] All tag endpoints require authentication
- [ ] Users cannot see, create, or delete tags belonging to other users
- [ ] Users cannot assign another user's tags to their strategies
- [ ] Users cannot filter strategies using another user's tag IDs
- [ ] Tag operations on another user's strategy return 403 or 404

## 13. Execution Isolation

- [ ] Tags do not affect strategy validation
- [ ] Tags do not affect backtest execution
- [ ] Tags do not appear in backtest results or outputs
- [ ] Tags are stored in relational tables (not inside strategy version JSON)
- [ ] Adding or removing tags does not create a new strategy version

## 14. Non-Goals Verification

- [ ] No automatic tag suggestions or AI-based labeling
- [ ] No tag-based permissions or sharing
- [ ] No folder hierarchy or nesting (flat tags only)
- [ ] No changes to strategy execution or backtesting logic
