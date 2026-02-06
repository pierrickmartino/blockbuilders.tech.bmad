# Test Checklist – Simplified Top Bar with Autosave (Mobile Strategy Editor)

> Source PRD: `prd-simplified-top-bar-autosave.md`

## 1. Top Bar Simplification (Mobile)

- [ ] On mobile breakpoint, explicit **Save** button is not visible in the top bar
- [ ] On mobile breakpoint, only one primary CTA is visible (`Backtest` or `Run`)
- [ ] Top bar title truncates/compacts correctly on narrow screens (no wrapping overlap)
- [ ] Header remains one row (or intended compact layout) on common mobile widths

## 2. Autosave Trigger & Timing

- [ ] Editing any strategy field starts/refreshes autosave timer
- [ ] Autosave fires only after 10 seconds of inactivity
- [ ] Continuous edits postpone autosave until user stops for 10 seconds
- [ ] No autosave call is made when there are no changes since last successful save

## 3. Autosave Status Indicator

- [ ] During save request, status displays `Saving...`
- [ ] On successful save, status updates to `Saved • just now` (or equivalent)
- [ ] Relative label updates over time (e.g., `Saved • 2s ago`, then `Saved • 1m ago`)
- [ ] On save failure, status displays `Save failed`
- [ ] Status text remains readable on mobile and does not overlap CTA/icon controls

## 4. History Panel Access

- [ ] History icon is visible in mobile top bar
- [ ] Tapping History icon opens dedicated History panel/drawer
- [ ] Panel shows version list using existing history data
- [ ] Closing/reopening panel works without losing editor state

## 5. Overflow Menu for Secondary Actions

- [ ] Settings action is present in overflow menu
- [ ] Other secondary actions are present in overflow menu (as defined by current editor)
- [ ] Secondary actions are no longer displayed as separate top-bar buttons on mobile
- [ ] Overflow menu opens/closes reliably and is keyboard/touch accessible

## 6. Error Handling & Recovery

- [ ] If save endpoint returns error, unsaved changes remain in editor
- [ ] After failure, next edit triggers another autosave attempt after 10 seconds
- [ ] If retry succeeds, status returns to `Saved • <time>`
- [ ] Error feedback is plain language and understandable

## 7. Desktop Regression Checks

- [ ] Desktop header layout is unchanged
- [ ] Desktop save/history/secondary actions behave as before
- [ ] No desktop visual regressions introduced by mobile-specific logic

## 8. API/Network Behavior

- [ ] Autosave uses existing strategy save endpoint only
- [ ] History panel uses existing versions/history endpoint only
- [ ] No new API endpoints are required to support the feature
- [ ] Autosave request payload matches current save contract

## 9. Responsive & Device Checks

- [ ] Works on iPhone SE width without control overlap
- [ ] Works on modern iPhone/Android portrait widths
- [ ] Works when rotating device (portrait ↔ landscape)
- [ ] Top bar controls remain tappable with minimum touch-friendly target sizes

## 10. Performance & Stability

- [ ] Autosave debounce does not cause visible typing lag
- [ ] No rapid save-loop occurs when user is idle
- [ ] No memory leak from autosave timer setup/cleanup on navigation
- [ ] Header does not flicker during frequent edit/save cycles
