# PRD — Grandfathered Beta User Benefits

**File:** `prd-grandfathered-beta-user-benefits.md`  
**Product:** Blockbuilders  
**Status:** Proposed  
**Owner:** Product  
**Last updated:** 2026-01-01

---

## 1) Why we’re doing this

Early beta users helped validate the product. We want to reward them with permanent perks that improve retention and encourage word-of-mouth, without adding complex billing logic.

---

## 2) Goals and non-goals

### Goals
1. Mark beta participants with a simple `user_tier` field.
2. Provide permanent perks for beta users (higher limits + discounted pricing).
3. Keep implementation minimal: conditional logic based on `user_tier` and account creation date.

### Non-goals
- Complex usage-based billing or add-on bundles beyond existing credit packs.
- New tables or multi-entity entitlement systems.
- Time-limited perks or expiring benefits.

---

## 3) Eligibility (simple rules)

- **Auto-eligible:** Accounts created before `BETA_CUTOFF_DATE`.
- **Manual override:** Admin can set `user_tier=beta` for exceptions.

**Note:** No extra flags are required; `user_tier` is the sole marker.

---

## 4) Perks (minimal, permanent)

### 4.1 Higher limits
Add the following on top of plan caps:
- **+10 strategies**
- **+50 backtests/day**

### 4.2 Discounted pricing
- **20% off** paid plan prices for users with `user_tier=beta`.

---

## 5) Data model (minimal)

**Users table**
- `user_tier` (enum: `standard`, `beta`) — default `standard`

---

## 6) Enforcement logic (simple)

- **Effective strategy cap:**
  - `effective_max_strategies = plan_max_strategies + (user_tier == beta ? 10 : 0) + extra_strategy_slots`

- **Effective daily backtest cap:**
  - `effective_max_backtests = plan_max_backtests + (user_tier == beta ? 50 : 0)`

- **Pricing:**
  - Apply a 20% discount to paid plan prices when `user_tier == beta`.

---

## 7) API payloads (minimal)

Extend user payloads (no new endpoints):
- `GET /users/me`
- `GET /usage/me`

Include:
```json
{
  "user_tier": "standard"
}
```

---

## 8) UX notes (keep simple)

- Profile page should show `User tier: Beta` when applicable.
- Pricing UI should reflect discounted prices for beta users.
- Keep copy short: “Beta perks applied.”

---

## 9) Edge cases

- **Existing paid users who are beta:** discount applies on renewal price.
- **Manual overrides:** admin update of `user_tier` triggers new limits on next request.
- **Cutoff adjustments:** changing `BETA_CUTOFF_DATE` only affects future auto-tagging, not existing `user_tier` values.

---

## 10) Rollout plan

1. Add `user_tier` to user model + migration.
2. Backfill `user_tier=beta` for users created before cutoff.
3. Apply limit + pricing conditionals in billing logic.
4. Expose `user_tier` in user/usage payloads.
5. Update profile + pricing UI with a minimal indicator.

---

## 11) Acceptance criteria checklist

- [ ] Users created before `BETA_CUTOFF_DATE` are marked `user_tier=beta`.
- [ ] `user_tier` is stored on the user record and returned in `/users/me` and `/usage/me`.
- [ ] Beta users receive +10 strategies and +50 backtests/day on top of plan caps.
- [ ] Beta users receive a 20% discount on paid plan prices.
- [ ] UI shows a simple “Beta perks applied” indicator where limits/pricing are shown.

---
