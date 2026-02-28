# TST: Essentials-First Block Palette Toggle

## 1. Objective
Validate that the indicator palette defaults to a minimal essentials set for new users, supports explicit expansion to all indicators, persists preference locally, preserves existing advanced-user workflows, and emits analytics without backend/API impact.

## 2. Scope
- Strategy editor block palette indicator section
- Mode toggle UI and behavior
- localStorage persistence
- Legacy-user default behavior
- Frontend analytics event emission
- API/network behavior during mode switches

## 3. Preconditions / Test Data
- App running locally with strategy editor accessible.
- Test account A (new user): no prior palette mode key and no strategies using non-essential indicators.
- Test account B (existing user): at least one saved strategy containing non-essential indicator (e.g., Ichimoku or Fibonacci).
- Browser devtools available to inspect localStorage, network requests, and PostHog events.

## 4. Test Cases

### TC-01 New user default is essentials mode
1. Login as account A.
2. Ensure localStorage key `palette_indicator_mode` is absent.
3. Open strategy editor and open block palette.
4. Navigate to indicator section.

**Expected:**
- Exactly 5 indicators are visible: SMA, EMA, RSI, Bollinger Bands, MACD.
- Non-essential indicators are not visible.
- Bottom toggle shows `Show all indicators`.

### TC-02 Essentials mode hides non-essential indicators
1. From essentials mode, inspect indicator list.

**Expected:**
- Stochastic, ADX, Ichimoku, OBV, Fibonacci, ATR (and any other non-essential indicators) are hidden.

### TC-03 Toggle reveals full indicator list
1. Click `Show all indicators`.

**Expected:**
- Full indicator set becomes visible.
- Toggle label changes to `Show essentials only`.
- No page reload.

### TC-04 Toggle back to essentials
1. From all mode, click `Show essentials only`.

**Expected:**
- List returns to exactly the 5 essentials.
- Toggle label returns to `Show all indicators`.

### TC-05 localStorage persistence
1. Switch to `all` mode.
2. Confirm localStorage key `palette_indicator_mode=all`.
3. Refresh page and reopen palette.
4. Switch to `essentials` mode.
5. Confirm localStorage key `palette_indicator_mode=essentials`.
6. Refresh page and reopen palette.

**Expected:**
- Mode persists accurately across refresh/session restart.

### TC-06 Existing advanced user defaults to all mode on first load after release
1. Login as account B.
2. Clear localStorage key `palette_indicator_mode`.
3. Open strategy editor and palette.

**Expected:**
- Initial mode is `all`.
- Non-essential indicators are visible immediately.
- Toggle offers `Show essentials only`.

### TC-07 Invalid localStorage value fallback
1. Manually set `palette_indicator_mode=invalid_value`.
2. Login as account A and open palette.

**Expected:**
- App falls back to valid default logic (`essentials` for new user).
- No crash or console error that breaks interaction.

### TC-08 localStorage unavailable fallback (graceful degradation)
1. Simulate localStorage write failure (browser privacy mode or stub failure in test harness).
2. Toggle mode.

**Expected:**
- UI still switches mode for the current session.
- No blocking error shown to user.

### TC-09 No additional API calls on mode switch (NFR-05)
1. Open devtools Network tab.
2. Capture baseline requests.
3. Toggle between `essentials` and `all` multiple times.

**Expected:**
- No new backend API requests are triggered by toggle changes.
- Palette updates are frontend-only.

### TC-10 PostHog event emitted on mode change
1. Open devtools/event debugger with PostHog inspection.
2. Toggle to `all`, then to `essentials`.

**Expected:**
- Event `palette_mode_changed` emitted on each toggle action.
- Event includes property `mode=all` when switched to all.
- Event includes property `mode=essentials` when switched to essentials.

### TC-11 Accessibility and UX sanity check
1. Verify toggle is visible at bottom of indicator section in both modes.
2. Verify toggle is keyboard reachable and clickable on mobile width.

**Expected:**
- Toggle placement and copy are clear.
- Interaction works on desktop and mobile viewport.

## 5. Regression Checklist
- Indicator block insertion still works in both modes.
- Existing palette search/category behavior unchanged.
- No changes to backend responses or schema.

## 6. Exit Criteria
- All test cases TC-01 through TC-11 pass.
- No critical UI regressions in strategy editor.
- No additional API traffic introduced by mode switching.
- Analytics event validated with correct schema.
