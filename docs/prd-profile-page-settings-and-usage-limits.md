# PRD — Profile Page (Settings + Usage Limits Consolidation)

**File:** `prd-profile-page-settings-and-usage-limits.md`  
**Product:** Blockbuilders  
**Status:** Draft (implementation-ready)  
**Owner:** Product / Engineering  
**Last updated:** 2025-12-23

---

## 1) Why we’re doing this

### Current situation
- The app has a **Settings** page that includes:
  - Account email (read-only)
  - Backtest defaults (fee %, slippage %)
  - Display preference (timezone: Local/UTC)
- **Usage limits** (e.g., “Strategies: 1/10”, “Backtests: 1/50”) are shown in the **top nav bar**, which feels inconsistent and “tacked on”.

This hurts clarity and polish, especially for an MVP that prioritizes simplicity and a clean user experience. fileciteturn0file0

### Problem statement
Users don’t have a single, obvious place for “my account stuff”:
- settings are on a Settings page
- usage/quotas are in the nav bar
- account identity/logout are separate

We need a single, coherent “Profile” surface.

---

## 2) Goals and non-goals

### Goals
1. **One place** to view/edit user settings and understand usage limits.
2. A **cleaner nav bar** (remove usage counters from the header).
3. Keep the solution **simple** (no over-designed account center).

### Non-goals (for this PRD)
- Billing, upgrades, payments, multiple plans.
- Advanced account management (team accounts, SSO, 2FA).
- Full “user preferences” system beyond what exists today (fee/slippage/timezone).

---

## 3) Target users & key use cases

### Target user
The MVP retail trader/tinkerer who wants a simple product experience. fileciteturn0file0

### Primary use cases
1. “I want my default fee/slippage to be prefilled in new backtests.” fileciteturn0file1
2. “I want to switch displayed times to UTC.”
3. “I want to understand how many strategies/backtests I have left today.” fileciteturn0file1

---

## 4) Proposed information architecture

### Global navigation changes
**Replace** the existing `Settings` nav item with `Profile`.

**Nav (left to right):**
- Dashboard
- Strategies
- How It Works
- Profile  ✅ (new consolidated destination)

**Nav (right side):**
- User menu (email / avatar)
  - Logout (same action as today)

**Remove from nav bar:**
- `Strategies: x/y`
- `Backtests: x/y`

> Rationale: the top nav is for primary product navigation, not “account metadata”.

### URL routes
- New: `/profile`
- Old: `/settings` → **301/redirect** to `/profile` (to avoid breaking links/bookmarks)

---

## 5) Profile page UX

Single page, stacked sections (simple and scannable). No complicated tabs required.

### Page header
- Title: **Profile**
- Subtitle: “Manage your preferences and see your current usage.”

### Section A — Account
- Email (read-only)
- Optional: “Logout” button (secondary; primary logout remains in user menu)

### Section B — Backtest Defaults
- **Default Trading Fee (%)** (number input)
- **Default Slippage (%)** (number input)
- **Save** button
- Small helper text: “These values are pre-filled when creating new backtests.”

Validation (frontend + backend):
- Fee: `0.0` to `5.0` (percent)
- Slippage: `0.0` to `5.0` (percent)
- Step: `0.01` (or `0.001` if you prefer finer control)

### Section C — Display Preferences
- Timezone toggle:
  - `Local` (default)
  - `UTC`
- Helper text: “All timestamps will be displayed in your selected timezone.”

### Section D — Usage
Two simple cards with a progress bar (or “x/y” + subtle bar):
1. **Strategies**
   - `used / limit`
   - Helper: “Maximum saved strategies.”
2. **Backtests (today)**
   - `used_today / limit`
   - Helper: “Resets daily.”
   - Show reset time in the user’s selected display mode:
     - “Resets at 00:00 UTC” (always true)
     - Also show local equivalent if user uses Local display.

States:
- Normal: 0–79%
- Near limit: 80–99% (yellow/orange badge)
- Reached: 100% (red badge + clear message)

Copy example when reached:
> “You’ve reached today’s backtest limit. Try again after the daily reset.”

---

## 6) Functional requirements

### FR1 — Consolidated Profile page exists
- A `/profile` page renders all sections A–D.

### FR2 — Settings read/update
- Profile loads current user settings.
- User can update:
  - `default_trading_fee_pct`
  - `default_slippage_pct`
  - `timezone_preference` (`local` | `utc`)

These settings match the existing MVP scope and user stories. fileciteturn0file1

### FR3 — Usage limits visibility
- Profile page displays:
  - Current usage counts
  - Limits
  - Reset time for daily quotas

### FR4 — Usage limits enforcement (unchanged, but made consistent)
- When user hits a limit:
  - API returns a clear, structured error (see API section)
  - UI shows a friendly message and points them to Profile → Usage

This aligns with the “soft usage limits per user” MVP story. fileciteturn0file1

### FR5 — Navigation consistency
- Remove usage counters from nav bar.
- Replace Settings with Profile.
- `/settings` redirects to `/profile`.

---

## 7) Backend requirements (minimal)

> Keep this simple: reuse existing user/settings mechanisms; add one small usage endpoint (or extend the existing one).

### Data model (conceptual)
**User settings fields (existing/expected):**
- `default_trading_fee_pct` (float)
- `default_slippage_pct` (float)
- `timezone_preference` (enum: `local`, `utc`)

**Usage limits fields (configurable per env or per user):**
- `max_strategies` (int)
- `max_backtests_per_day` (int)

**Usage counters (computed):**
- `strategies_count`
- `backtests_today_count` (UTC day)
- `backtests_reset_at_utc` (timestamp, next midnight UTC)

### API endpoints

#### Option A (simplest): extend `/users/me`
- `GET /users/me`
  - returns settings + usage bundle
- `PUT /users/me`
  - updates settings only

**Response shape (example):**
```json
{
  "email": "user@example.com",
  "settings": {
    "default_trading_fee_pct": 0.1,
    "default_slippage_pct": 0.05,
    "timezone_preference": "local"
  },
  "usage": {
    "strategies": { "used": 1, "limit": 10 },
    "backtests_today": { "used": 1, "limit": 50, "resets_at_utc": "2025-12-24T00:00:00Z" }
  }
}
```

#### Option B: separate usage endpoint (also fine)
- `GET /users/me/usage`
- Keep `/users/me` focused on account/settings

Either option is acceptable; **Option A reduces endpoint surface**.

### Limit exceeded error format
When creating a strategy or backtest:
- HTTP `429` (or `403` — choose one and standardize)
- Body:
```json
{
  "error": "limit_exceeded",
  "limit_type": "backtests_today",
  "message": "Daily backtest limit reached. Try again after reset.",
  "usage": { "used": 50, "limit": 50, "resets_at_utc": "..." }
}
```

---

## 8) Frontend requirements (Next.js)

### New page
- Route: `/profile`
- Uses the same layout container width as other pages.
- Reuses existing form components/styles from Settings (to keep effort low).

### Data fetching
- On load: fetch `GET /users/me` (or `/users/me/usage` + `/users/me`)
- Mutations:
  - Save backtest defaults: `PUT /users/me`
  - Save timezone preference: `PUT /users/me`

### UI behaviors
- Save button:
  - Disabled unless values changed
  - Shows success toast “Saved”
  - Shows inline errors if validation fails
- Usage section:
  - Uses returned data; no client-side counting heuristics.

### Redirect
- `/settings` client route redirects to `/profile`.

---

## 9) Edge cases & error handling

- **Not logged in:** `/profile` redirects to login (existing auth guard).
- **Network error:** show a simple “Couldn’t load profile. Retry” state.
- **Stale usage counts:** usage is computed server-side; page refresh fixes.
- **User at limit:** strategy/backtest creation surfaces the friendly error and links to Profile → Usage.

---

## 10) Analytics (very light)

Track only what helps validate the change:
- `profile_viewed`
- `profile_settings_saved` (include which section: backtest_defaults / display)
- `limit_exceeded_shown` (include limit_type)

---

## 11) Rollout plan

1. Ship `/profile` page (read-only usage, editable settings).
2. Redirect `/settings` → `/profile`.
3. Remove usage counters from nav bar.
4. If needed later: add subtle “near limit” badge on Profile nav item (optional; not required).

---

## 12) Acceptance criteria checklist

- [ ] Nav bar shows `Profile` instead of `Settings`.
- [ ] Nav bar no longer displays `Strategies x/y` and `Backtests x/y`.
- [ ] `/settings` redirects to `/profile`.
- [ ] Profile page displays:
  - [ ] Account email
  - [ ] Editable default fee and slippage, persisted and reloaded correctly
  - [ ] Timezone toggle, persisted and applied across the app
  - [ ] Usage cards with used/limit for strategies + daily backtests and reset time
- [ ] When a limit is hit, user sees a friendly, consistent error message and can find details in Profile → Usage.

---

## 13) Notes on “keeping it simple”
This PRD intentionally:
- consolidates without introducing new account concepts
- avoids complex settings categories/tabs
- keeps backend change to one endpoint addition/extension

This matches Blockbuilders MVP simplicity principles. fileciteturn0file0
