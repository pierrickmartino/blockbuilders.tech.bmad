# Test Checklist -- Annual Subscription Discounts

> Source PRD: `prd-annual-subscription-discounts.md`

## 1. Pricing Policy

- [ ] Pro annual price is $190 (equivalent to 10x monthly, 2 months free)
- [ ] Premium annual price is $490 (equivalent to 10x monthly, 2 months free)
- [ ] Effective discount is approximately 16.7% for both tiers
- [ ] Free tier has no annual plan option

## 2. Stripe Configuration

- [ ] `STRIPE_PRICE_PRO_ANNUAL` environment variable is defined and maps to the correct Stripe price
- [ ] `STRIPE_PRICE_PREMIUM_ANNUAL` environment variable is defined and maps to the correct Stripe price
- [ ] Annual price IDs are distinct from monthly price IDs
- [ ] No coupon or dynamic discount logic is used; prices are fixed Stripe SKUs

## 3. Backend -- Plan Interval Handling

- [ ] `plan_interval` is set to `annual` when an annual subscription is created via webhook
- [ ] `plan_interval` is set to `monthly` when a monthly subscription is created via webhook
- [ ] Plan limits (strategies, backtests/day, history depth) are identical for monthly and annual of the same tier
- [ ] No new data model fields are required beyond existing `plan_interval`

## 4. API -- Checkout Session for Annual Plans

- [x] `POST /billing/checkout-session` with interval=annual and plan_tier=pro uses the annual price ID
- [x] `POST /billing/checkout-session` with interval=annual and plan_tier=premium uses the annual price ID
- [x] `POST /billing/checkout-session` with interval=monthly continues to use monthly price IDs
- [ ] Checkout session correctly passes the annual billing period to Stripe

## 5. Frontend -- Billing UI

- [ ] Billing UI shows both monthly and annual pricing options (toggle or side-by-side)
- [ ] Annual pricing displays the total annual cost (e.g., "$190 billed annually")
- [ ] Savings text is displayed next to annual option (e.g., "Save ~17% with annual")
- [ ] Monthly pricing is clearly labeled (e.g., "$19/month")
- [ ] Selecting annual plan creates a checkout session with interval=annual
- [ ] Selecting monthly plan creates a checkout session with interval=monthly
- [ ] Free tier card does not show an annual option

## 6. Upgrade Flow -- Annual

- [ ] User selects annual Pro plan and is redirected to Stripe Checkout with annual price
- [ ] User selects annual Premium plan and is redirected to Stripe Checkout with annual price
- [ ] After successful annual checkout, user returns to app with annual subscription active
- [ ] `plan_interval` in `/users/me` response shows "annual" after annual subscription

## 7. Grandfathered Beta Discount Compatibility

- [ ] Beta users see the 20% discount applied on top of the base annual price
- [ ] Discounted annual price is displayed correctly in the billing UI for beta users

## 8. Edge Cases

- [ ] User switching from monthly to annual is handled correctly via Stripe portal
- [ ] User switching from annual to monthly is handled correctly via Stripe portal
- [ ] Canceling an annual subscription retains access until the annual period end
- [ ] Annual subscription renewal processes correctly after one year

## 9. Analytics Events

- [ ] `billing_interval_selected` event fires with value "annual" when annual is chosen
- [ ] `billing_interval_selected` event fires with value "monthly" when monthly is chosen
- [ ] `billing_checkout_started` event includes correct interval value
- [ ] `billing_checkout_completed` event includes correct interval value
