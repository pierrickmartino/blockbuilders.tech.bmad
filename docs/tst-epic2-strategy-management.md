# Test Checklist – Strategy Management (Epic 2)

> Source PRD: `prd-epic2-strategy-management.md`

---

## 1. Create Strategy (S2.1)

### 1.1 API Tests – `POST /strategies/`

- [ ] Successful creation with valid name, asset, and timeframe returns the strategy object (`id`, `name`, `asset`, `timeframe`, `is_archived`, `created_at`, `updated_at`)
- [ ] Created strategy has `is_archived = false` by default
- [ ] Created strategy is linked to the authenticated user (`user_id` matches current user)
- [ ] Missing `name` returns a validation error
- [ ] Empty `name` returns a validation error
- [ ] Missing `asset` returns a validation error
- [ ] Asset not in the allowed set (e.g., `DOGE/USDT` if not supported) returns a validation error
- [ ] Missing `timeframe` returns a validation error
- [ ] Timeframe not in the allowed set (e.g., `5m` if not supported) returns a validation error
- [ ] Unauthenticated request returns 401

### 1.2 UI Tests – Create Strategy Form

- [x] "New strategy" button is visible on the strategies list page
- [x] Clicking "New strategy" opens a modal or page with a form
- [x] Form has fields: Name (text), Asset (select), Timeframe (select)
- [x] Asset dropdown only shows supported assets (e.g., BTC/USDT, ETH/USDT)
- [x] Timeframe dropdown only shows supported timeframes (e.g., 1h, 4h)
- [x] On successful creation, user is redirected to the Strategy Editor page (`/strategies/{id}`)
- [x] On validation error, inline error messages are shown (e.g., "Name is required")
- [x] Form is responsive and usable on mobile viewports

---

## 2. List Strategies (S2.2)

### 2.1 API Tests – `GET /strategies/`

- [ ] Returns only the authenticated user's strategies
- [ ] By default, excludes archived strategies (`is_archived = true`)
- [ ] With `include_archived=true`, includes archived strategies in the response
- [ ] With `search=<term>`, filters results by case-insensitive name substring match
- [ ] Returns an empty list when the user has no strategies
- [ ] Unauthenticated request returns 401
- [ ] Response time is under 300ms under typical conditions

### 2.2 UI Tests – Strategy List Page

- [x] Page at `/strategies` displays a table of strategies
- [x] Table shows columns: Name, Asset, Timeframe, Last modified, Auto-update flag
- [x] Clicking a row or "Open" button navigates to the Strategy Editor
- [x] Secondary actions (Duplicate, Archive) are available per row via dropdown or icon menu
- [x] Search box filters strategies by name
- [x] Sorting by "Last modified" works (default descending)
- [x] Sorting by "Name" works
- [x] When there are no strategies, an appropriate empty state is shown
- [x] Page is responsive and usable on mobile viewports

---

## 3. Edit Strategy Metadata (S2.3)

### 3.1 API Tests – `PATCH /strategies/{id}`

- [ ] Successfully updates `name` when provided
- [ ] Successfully updates `asset` when provided and asset is in the allowed set
- [ ] Successfully updates `timeframe` when provided and timeframe is in the allowed set
- [ ] Invalid asset value returns a validation error
- [ ] Invalid timeframe value returns a validation error
- [ ] Attempting to update a strategy owned by another user returns 404
- [ ] Unauthenticated request returns 401
- [ ] Updated strategy reflects new `updated_at` timestamp

### 3.2 UI Tests – Edit Strategy

- [x] Strategy name is editable inline in the Strategy Editor page
- [x] Asset and timeframe are displayed (as labels or editable dropdowns)
- [x] Changes to the name are saved and reflected in the strategy list

---

## 4. Archive / Unarchive (S2.3)

### 4.1 API Tests

- [x] `PATCH /strategies/{id}` with `{ "is_archived": true }` archives the strategy
- [x] `PATCH /strategies/{id}` with `{ "is_archived": false }` unarchives the strategy
- [x] Archived strategy no longer appears in default `GET /strategies/` response
- [x] Archived strategy appears when `GET /strategies/?include_archived=true` is called
- [ ] Archiving a strategy owned by another user returns 404

### 4.2 UI Tests

- [ ] "Archive" action is available in the strategies list per row
- [ ] Clicking "Archive" removes the strategy from the default list view
- [ ] A "Show archived" toggle or filter is available
- [ ] Archived strategies can be seen when the filter is enabled
- [ ] "Unarchive" action is available on archived strategies
- [ ] Unarchiving a strategy makes it reappear in the default list view

---

## 5. Duplicate Strategy (S2.3)

### 5.1 API Tests – `POST /strategies/{id}/duplicate`

- [ ] Duplicating a strategy creates a new strategy with name `"{original_name} (copy)"` or similar
- [ ] New strategy has the same `asset` and `timeframe` as the original
- [ ] New strategy has `is_archived = false`
- [ ] New strategy is owned by the current user
- [ ] If the original strategy has versions, the latest version's JSON definition is copied as version 1 of the new strategy
- [ ] If the original strategy has no versions, the new strategy is created without versions
- [ ] Duplicating a strategy owned by another user returns 404
- [ ] Unauthenticated request returns 401
- [ ] Response returns the new strategy object

### 5.2 UI Tests

- [ ] "Duplicate" action is available in the strategies list per row
- [ ] After duplication, user is redirected to the new strategy's editor page
- [ ] The new strategy appears in the strategies list with the expected name suffix

---

## 6. Strategy Versioning (S2.4)

### 6.1 API Tests – `POST /strategies/{id}/versions`

- [ ] Creating a version with a valid `definition` JSON returns the new version (`id`, `version_number`, `created_at`)
- [ ] First version for a strategy gets `version_number = 1`
- [ ] Subsequent versions increment `version_number` correctly (2, 3, 4...)
- [ ] Creating a version updates `strategies.updated_at` to the current time
- [ ] Auth and ownership are enforced: cannot create a version for another user's strategy (returns 404)
- [ ] Unauthenticated request returns 401
- [ ] Empty or missing `definition` returns a validation error

### 6.2 API Tests – `GET /strategies/{id}/versions`

- [ ] Returns a list of versions sorted by `created_at` descending
- [ ] Each version includes `id`, `version_number`, `created_at`
- [ ] Auth and ownership are enforced: cannot list versions for another user's strategy (returns 404)
- [ ] Returns an empty list if the strategy has no versions

### 6.3 API Tests – `GET /strategies/{id}/versions/{version_number}`

- [ ] Returns the single version including the full `definition` JSON
- [ ] Returns 404 for a non-existent version number
- [ ] Auth and ownership are enforced

### 6.4 UI Tests – Version Selection

- [ ] Strategy Editor page shows a version selector (dropdown or side panel)
- [ ] Version list displays entries like "v3 - 2025-01-10 14:22"
- [ ] Selecting a version loads its `definition` JSON into the editor
- [ ] Current version is clearly indicated in the selector

---

## 7. Permissions & Security

- [ ] All strategy endpoints require authentication
- [ ] Accessing another user's strategy by any endpoint returns 404 (not 403)
- [ ] Strategy operations are scoped to the authenticated user
- [ ] No cross-user data leakage in list or detail responses

---

## 8. Data Model Validation

- [ ] `strategies` table has unique constraint behavior as expected (no duplicate IDs)
- [ ] `strategy_versions` table has unique constraint on `(strategy_id, version_number)`
- [ ] Foreign key from `strategy_versions.strategy_id` to `strategies.id` is enforced
- [ ] Foreign key from `strategies.user_id` to `users.id` is enforced

---

## 9. Edge Cases

- [ ] Creating a strategy with a very long name is handled (truncation or validation error)
- [ ] Duplicating a strategy named "My Strategy (copy)" produces "My Strategy (copy) (copy)" or similar
- [ ] Rapidly clicking "Save" does not produce corrupted version numbers (concurrency safety)
- [ ] Archiving a strategy with auto-update enabled does not cause scheduler errors
- [ ] Listing strategies with both `search` and `include_archived` params works correctly together
- [ ] Version numbers are monotonically increasing even after concurrent save attempts
