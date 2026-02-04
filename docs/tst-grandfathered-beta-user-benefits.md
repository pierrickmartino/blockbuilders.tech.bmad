# Test Checklist -- Grandfathered Beta User Benefits

> Source PRD: `prd-grandfathered-beta-user-benefits.md`

## 1. Data Model

- [ ] `user_tier` field exists on users table with enum values: standard, beta
- [ ] `user_tier` defaults to `standard` for new users
- [ ] Database migration runs cleanly on fresh and existing databases
- [ ] No additional flags or tables are required beyond `user_tier`

## 2. Auto-Eligibility -- Beta Cutoff

- [ ] Users created before `BETA_CUTOFF_DATE` are automatically set to `user_tier=beta`
- [ ] Users created on or after `BETA_CUTOFF_DATE` remain `user_tier=standard`
- [ ] Backfill script correctly marks all pre-cutoff users as beta
- [ ] Backfill script does not modify users created after the cutoff
- [ ] `BETA_CUTOFF_DATE` is configurable via environment variable or constant

## 3. Manual Override

- [ ] Admin can manually set `user_tier=beta` for any user
- [ ] Admin can manually set `user_tier=standard` for any user (revoke beta)
- [ ] Manual override takes effect on the user's next API request
- [ ] Changing `BETA_CUTOFF_DATE` does not retroactively change existing `user_tier` values

## 4. Higher Limits -- Strategy Cap

- [ ] Beta free user has effective max_strategies = 10 + 10 = 20
- [ ] Beta pro user has effective max_strategies = 50 + 10 = 60
- [ ] Beta premium user has effective max_strategies = 200 + 10 = 210
- [ ] Standard free user has effective max_strategies = 10 (no bonus)
- [ ] Beta user with extra_strategy_slots stacks correctly (e.g., beta free + 5 slots = 25)
- [ ] Strategy creation is blocked at the correct effective limit for beta users

## 5. Higher Limits -- Daily Backtest Cap

- [ ] Beta free user has effective max_backtests/day = 50 + 50 = 100
- [ ] Beta pro user has effective max_backtests/day = 200 + 50 = 250
- [ ] Beta premium user has effective max_backtests/day = 500 + 50 = 550
- [ ] Standard free user has effective max_backtests/day = 50 (no bonus)
- [ ] Backtest creation is blocked at the correct effective limit for beta users
- [ ] Beta bonus backtests are consumed before credit pack credits

## 6. Discounted Pricing

- [ ] Beta user sees 20% discount on Pro monthly ($19 -> $15.20)
- [ ] Beta user sees 20% discount on Pro annual ($190 -> $152)
- [ ] Beta user sees 20% discount on Premium monthly ($49 -> $39.20)
- [ ] Beta user sees 20% discount on Premium annual ($490 -> $392)
- [ ] Standard user sees full prices without discount
- [ ] Stripe Checkout session uses discounted price for beta users
- [ ] Existing paid beta users receive discount on renewal price

## 7. API -- GET /users/me

- [ ] Response includes `user_tier` field with value "standard" or "beta"
- [ ] Beta user response shows `user_tier: "beta"`
- [ ] Standard user response shows `user_tier: "standard"`

## 8. API -- GET /usage/me

- [ ] Response includes `user_tier` field
- [ ] Effective limits shown in usage response reflect beta bonuses when applicable
- [ ] Standard user limits are unaffected

## 9. Frontend -- Profile Page

- [ ] Profile page shows "User tier: Beta" label when user_tier=beta
- [ ] Profile page shows no special tier label for standard users
- [ ] "Beta perks applied" indicator is visible where limits and pricing are shown
- [ ] Usage cards reflect the effective (beta-boosted) limits
- [ ] Pricing UI shows discounted prices for beta users

## 10. Edge Cases

- [ ] Beta user who downgrades from paid to free retains beta perks (+10 strategies, +50 backtests)
- [ ] Beta user who upgrades plan retains beta perks on top of new plan limits
- [ ] New user created just before cutoff date is correctly auto-tagged as beta
- [ ] New user created just after cutoff date is correctly tagged as standard
- [ ] Admin revoking beta from a user who exceeds standard limits does not delete existing strategies (soft enforcement)
