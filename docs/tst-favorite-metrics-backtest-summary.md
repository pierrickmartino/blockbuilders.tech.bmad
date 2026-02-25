# Test Checklist – Favorite Metrics (Backtest Summary)

> Source PRD: `prd-favorite-metrics-backtest-summary.md`

## 1. Pinning & Unpinning Metrics

- [ ] Each backtest summary metric card displays a pin icon
- [ ] Clicking the pin icon on an unpinned metric pins it (icon changes to filled state)
- [ ] Clicking the pin icon on a pinned metric unpins it (icon changes to unfilled state)
- [ ] Pinning a metric moves it to the pinned group at the front of the summary cards
- [ ] Unpinning a metric moves it back to the default metrics group
- [ ] All default metrics can be pinned: Total Return, CAGR, Max Drawdown, Number of Trades, Win Rate
- [ ] If additional metrics exist in the summary, they are also eligible for pinning

## 2. Ordering of Pinned Metrics

- [ ] Pinned metrics appear first in the backtest summary cards
- [ ] Pinned metrics are displayed in the user-defined order
- [ ] Remaining (unpinned) metrics appear after pinned metrics in a fixed default order
- [ ] When a metric is newly pinned, it is appended to the end of the pinned list
- [ ] "Move left" control moves a pinned metric one position earlier
- [ ] "Move right" control moves a pinned metric one position later
- [ ] "Move left" is disabled or hidden for the first pinned metric
- [ ] "Move right" is disabled or hidden for the last pinned metric
- [ ] Reordering updates the display immediately without a page reload

## 3. Persistence & Cross-Session Behavior

- [ ] Pinned metrics preference is stored on the user record as a JSON array of metric keys
- [x] `GET /users/me` response includes `favorite_metrics` field
- [x] `PUT /users/me` with updated `favorite_metrics` persists the new order
- [ ] Preferences persist across browser sessions (logout/login)
- [ ] Preferences apply to all backtest summaries regardless of which strategy is viewed
- [x] Reordering pinned metrics triggers a `PUT /users/me` call to persist the change

## 4. Default Behavior (No Favorites Set)

- [ ] When `favorite_metrics` is empty or not set, summary cards display in the default order
- [ ] Default order matches the existing summary layout before this feature
- [ ] No pin icons are in filled state when no favorites are set
- [ ] No "Move left/right" controls are shown when no metrics are pinned

## 5. Missing/Unavailable Metrics

- [ ] If a pinned metric key is not available for a given backtest, it is silently skipped
- [ ] Skipping a missing metric does not cause errors or blank cards
- [ ] The remaining pinned and default metrics still render correctly
- [ ] If all pinned metrics are unavailable, the display falls back to default order

## 6. UI & Interaction

- [ ] Pin icon is small and unobtrusive on each summary card
- [ ] Pin icon has a clear filled vs unfilled visual distinction
- [ ] "Move left/right" controls are compact inline buttons (not drag-and-drop)
- [ ] "Move left/right" controls are only visible on pinned metric cards
- [ ] Layout of summary cards remains identical to the existing design (only icons/controls added)
- [ ] No separate settings page is needed; all interactions happen on the backtest summary
- [ ] Cards render correctly on desktop viewport
- [ ] Cards render correctly on mobile viewport

## 7. API & Data Validation

- [ ] `favorite_metrics` is stored as a simple JSON array of string metric keys
- [x] No new API endpoints are introduced (uses existing `GET/PUT /users/me`)
- [ ] Sending an empty array `[]` for `favorite_metrics` resets to default behavior
- [ ] Sending duplicate metric keys in the array is handled gracefully (deduplicated or rejected)
- [ ] Sending invalid/unknown metric keys does not break the summary display
- [ ] No new backend data sources or computed analytics are introduced

## 8. Edge Cases & Negative Tests

- [ ] Pinning all available metrics results in all cards being in the pinned group (no default group)
- [ ] Rapidly toggling pin/unpin does not cause UI glitches or stale state
- [ ] Rapidly reordering metrics does not cause race conditions with persistence calls
- [ ] A new user with no `favorite_metrics` field sees the default summary layout without errors
- [ ] Metric keys remain stable across backtest runs (no key mismatch between runs)
