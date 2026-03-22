# Test Checklist – Quick Strategy Clone (List Action)

> Source PRD: `prd-quick-strategy-clone.md`

## 1. Clone Button Presence

- [x] Clone action/button is visible on each strategy row in `/strategies` list
- [x] Clone action/button is visible on each strategy row/card in `/dashboard`
- [x] Clone button uses the existing quick action area for list rows/cards
- [x] Clone button label reads "Clone" (not "Duplicate" or other wording)
- [x] Clone button is small and consistent with other list action buttons

## 2. Clone Action – Happy Path

- [x] Clicking Clone calls `POST /strategies/{id}/duplicate` with the correct strategy ID
- [x] On success, the cloned strategy appears in the list without a full page reload
- [x] The user remains on the current list page (not redirected to the strategy editor)
- [ ] The cloned strategy name follows existing server behavior (appends " (Copy)")
- [x] The cloned strategy contains the same definition/version data as the original
- [ ] Cloning the same strategy multiple times produces distinct copies (e.g., " (Copy)", " (Copy) (Copy)" or server-determined naming)

## 3. Loading State

- [x] While the clone request is in flight, the Clone button for that row is disabled
- [ ] A minimal loading indicator (spinner or text change) is shown on the clicked button
- [x] Other rows' Clone buttons remain functional during another row's clone request
- [x] Multiple concurrent clone requests on different strategies are handled correctly

## 4. Error Handling

- [x] On clone failure, a lightweight toast or inline error message is shown
- [x] Error message uses the existing notification/toast pattern
- [x] On failure, the Clone button re-enables so the user can retry
- [x] Network timeout or disconnection shows an appropriate error message
- [x] Cloning a strategy that was just deleted by another tab/session shows an error

## 5. API & Backend

- [x] Uses the existing `POST /strategies/{id}/duplicate` endpoint
- [x] No new backend endpoints are introduced
- [x] No new query params or payload changes to the duplicate endpoint
- [x] Response returns the new strategy object with a valid ID and name
- [x] Duplicate endpoint requires authentication

## 6. Data Integrity

- [x] Cloned strategy has a new unique ID (different from the original)
- [x] Cloned strategy preserves the original's definition JSON
- [x] Cloned strategy preserves the original's configuration (asset, timeframe, parameters)
- [x] Cloned strategy is owned by the current authenticated user
- [x] Original strategy is unchanged after cloning

## 7. List Refresh Behavior

- [x] After successful clone, the strategy list is refreshed (refetch or optimistic insert)
- [ ] If using optimistic insert, the inserted item matches what the server returns
- [x] List sort order is maintained after refresh (cloned item appears in correct position)
- [x] Pagination state is handled correctly (clone does not jump to a different page)

## 8. Edge Cases

- [x] Cloning a strategy that is at the user's max strategy limit returns an appropriate error
- [x] Cloning from the dashboard list works identically to cloning from the strategies list
- [x] Clone button works correctly after the list has been filtered or searched
- [x] Rapidly clicking Clone multiple times does not create multiple duplicates (debounce/disable)

## 9. Responsiveness & Layout

- [x] Clone button renders correctly on desktop
- [x] Clone button renders correctly on tablet
- [x] Clone button renders correctly on mobile
- [ ] Clone button is touch-friendly on mobile devices
- [ ] Clone button does not break row/card layout on narrow viewports
