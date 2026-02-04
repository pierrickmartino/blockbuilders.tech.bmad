# Test Checklist -- Profile Page (Settings + Usage Limits)

> Source PRD: `prd-profile-page-settings-and-usage-limits.md`

## 1. Navigation Changes

- [ ] Nav bar shows "Profile" instead of "Settings"
- [ ] Nav bar no longer displays "Strategies: x/y" usage counter
- [ ] Nav bar no longer displays "Backtests: x/y" usage counter
- [ ] Nav items in order: Dashboard, Strategies, How It Works, Profile
- [ ] User menu (right side) still shows email/avatar and Logout action

## 2. Routing

- [ ] `/profile` page renders correctly for authenticated users
- [ ] `/settings` redirects (301) to `/profile`
- [ ] `/profile` redirects to login page when user is not authenticated
- [ ] Bookmarks to `/settings` still work via redirect

## 3. Section A -- Account

- [ ] Email is displayed as read-only text
- [ ] Email matches the logged-in user's account email
- [ ] Optional logout button is present (secondary style)

## 4. Section B -- Backtest Defaults

- [ ] Default Trading Fee (%) input is displayed with current value
- [ ] Default Slippage (%) input is displayed with current value
- [ ] Helper text "These values are pre-filled when creating new backtests" is shown
- [ ] Save button is present

### Validation -- Fee

- [ ] Fee accepts values from 0.0 to 5.0
- [ ] Fee rejects values below 0.0 with a validation error
- [ ] Fee rejects values above 5.0 with a validation error
- [ ] Fee accepts decimal precision of 0.01 (or 0.001)
- [ ] Fee field rejects non-numeric input

### Validation -- Slippage

- [ ] Slippage accepts values from 0.0 to 5.0
- [ ] Slippage rejects values below 0.0 with a validation error
- [ ] Slippage rejects values above 5.0 with a validation error
- [ ] Slippage accepts decimal precision of 0.01 (or 0.001)
- [ ] Slippage field rejects non-numeric input

### Save Behavior

- [ ] Save button is disabled when no values have changed
- [ ] Save button is enabled when a value is modified
- [ ] Saving valid values shows a success toast "Saved"
- [ ] Saving invalid values shows inline validation errors
- [ ] Saved values are persisted and reload correctly after page refresh
- [ ] Backend validates fee and slippage ranges independently of frontend

## 5. Section C -- Display Preferences

- [ ] Timezone toggle is displayed with options: Local, UTC
- [ ] Default selection is Local
- [ ] Helper text "All timestamps will be displayed in your selected timezone" is shown
- [ ] Changing timezone preference is persisted via PUT /users/me
- [ ] Timezone preference is applied across the app after saving
- [ ] Page refresh retains the saved timezone preference

## 6. Section D -- Usage

### Strategy Usage Card

- [ ] Shows "used / limit" count for strategies (e.g., "3 / 10")
- [ ] Helper text "Maximum saved strategies" is displayed
- [ ] Progress bar or visual indicator reflects usage percentage

### Backtest Usage Card

- [ ] Shows "used_today / limit" count for daily backtests
- [ ] Helper text "Resets daily" is displayed
- [ ] Shows reset time in UTC (e.g., "Resets at 00:00 UTC")
- [ ] Shows local equivalent of reset time when user uses Local display mode

### Usage States

- [ ] Normal state (0-79%): default styling, no special badge
- [ ] Near limit state (80-99%): yellow/orange badge is shown
- [ ] Reached state (100%): red badge and clear message are shown
- [ ] At-limit copy reads: "You've reached today's backtest limit. Try again after the daily reset." (or similar)

## 7. API -- GET /users/me

- [ ] Returns email, settings, and usage in a single response
- [ ] Settings include default_trading_fee_pct, default_slippage_pct, timezone_preference
- [ ] Usage includes strategies.used, strategies.limit
- [ ] Usage includes backtests_today.used, backtests_today.limit, backtests_today.resets_at_utc
- [ ] Usage counts are computed server-side (not cached stale values)

## 8. API -- PUT /users/me

- [ ] Updates default_trading_fee_pct successfully
- [ ] Updates default_slippage_pct successfully
- [ ] Updates timezone_preference successfully
- [ ] Returns 400 for fee values outside 0.0-5.0 range
- [ ] Returns 400 for slippage values outside 0.0-5.0 range
- [ ] Returns 400 for invalid timezone_preference values
- [ ] Returns 401 for unauthenticated requests
- [ ] Does not allow updating email or other read-only fields

## 9. Limit Exceeded Error Format

- [ ] Strategy creation at limit returns HTTP 429 (or 403) with structured error
- [ ] Backtest creation at limit returns HTTP 429 (or 403) with structured error
- [ ] Error body includes: error type, limit_type, user-friendly message, usage details
- [ ] Error response includes `resets_at_utc` for daily limits
- [ ] Frontend shows the friendly error message and points user to Profile -> Usage

## 10. Edge Cases

- [ ] Network error on profile load shows "Couldn't load profile. Retry" state
- [ ] Stale usage counts are corrected by page refresh
- [ ] Profile page is responsive on mobile (single column layout)
- [ ] Profile page is usable on tablet and desktop
- [ ] Concurrent settings updates from multiple tabs do not corrupt data
- [ ] Very long email addresses are displayed without breaking layout

## 11. Analytics Events

- [ ] `profile_viewed` event fires when profile page is loaded
- [ ] `profile_settings_saved` event fires with section "backtest_defaults" when defaults are saved
- [ ] `profile_settings_saved` event fires with section "display" when timezone is changed
- [ ] `limit_exceeded_shown` event fires with limit_type when a limit error is displayed
