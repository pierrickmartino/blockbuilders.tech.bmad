# PRD — Annual Subscription Discounts

**File:** `prd-annual-subscription-discounts.md`  
**Product:** Blockbuilders  
**Status:** Proposed  
**Owner:** Product  
**Last updated:** 2026-01-01

---

## 1) Why we’re doing this

Annual billing improves cash flow, reduces churn, and increases customer lifetime value. This is a standard SaaS pricing pattern and can be implemented with simple Stripe SKUs and a small UI update.

---

## 2) Goals and non-goals

### Goals
1. Offer an annual plan option for paid tiers with a **15–20% discount** versus monthly.
2. Keep pricing **simple and consistent** across tiers (no new add-ons or usage-based pricing).
3. Display the annual savings clearly in the billing UI.
4. Use **separate Stripe price IDs** for annual plans.

### Non-goals
- New billing infrastructure or complex pricing logic.
- New plan tiers, add-ons, or credits beyond what already exists.
- Multi-seat or team billing.
- Promotional coupon systems or limited-time discounts.

---

## 3) Target users & use cases

### Target users
- Existing Pro/Premium subscribers who want a lower effective monthly price.
- New users who are willing to commit annually for a discount.

### Primary use cases
1. “I want to pay once and save compared to monthly.”
2. “I prefer a single annual payment for budgeting.”

---

## 4) Pricing policy (simple)

**Discount policy:** Offer **2 months free** for annual billing (~16.7% off monthly), which stays within the 15–20% target and keeps pricing easy to explain.

| Tier | Monthly | Annual (2 months free) | Effective Discount |
|---|---|---|---|
| **Pro** | $19 | $190 | ~16.7% |
| **Premium** | $49 | $490 | ~16.7% |

**Notes:**
- Free tier remains monthly-only (no annual plan).
- Grandfathered beta discounts still apply on top of the base annual price.

---

## 5) UX & user flows (minimal)

### Billing UI updates
- Show monthly vs annual toggle or side-by-side pricing (keep existing layout).
- Display the savings next to annual pricing (e.g., “Save ~17% with annual”).
- Ensure the annual price and billing period are explicit (e.g., “$190 billed annually”).

### Upgrade flow
1. User selects annual plan in the billing UI.
2. Frontend requests a Stripe Checkout session for the annual price ID.
3. Stripe Checkout completes; user returns with annual subscription active.

---

## 6) Backend requirements (minimal)

- No new data fields required beyond the existing `plan_interval` (monthly/annual).
- Ensure `plan_interval` is set to `annual` when annual SKU is used.
- Keep plan enforcement the same (limits already tied to plan tier).

---

## 7) Stripe integration (simple)

**Price IDs (env vars):**
- `STRIPE_PRICE_PRO_ANNUAL`
- `STRIPE_PRICE_PREMIUM_ANNUAL`

**Implementation notes:**
- Annual price IDs are separate from monthly price IDs.
- No coupon logic or dynamic discounting needed.

---

## 8) Analytics (very light)

- `billing_interval_selected` (monthly/annual)
- `billing_checkout_started` (tier, interval)
- `billing_checkout_completed` (tier, interval)

---

## 9) Rollout plan

1. Add annual SKU IDs in Stripe + environment variables.
2. Update billing UI to show annual pricing and savings.
3. Verify `plan_interval` updates via webhook handling.

---

## 10) Acceptance criteria checklist

- [ ] Annual pricing is available for Pro and Premium tiers.
- [ ] Annual pricing reflects a 15–20% discount vs monthly (2 months free).
- [ ] Billing UI clearly shows savings and annual billing text.
- [ ] Stripe Checkout uses annual price IDs when annual is selected.
- [ ] `plan_interval` is set to `annual` for annual subscriptions.

---

## 11) Simplicity guardrails

- No new pricing tiers, credits, or usage-based billing.
- No coupons or promo systems.
- No new infrastructure; just Stripe SKUs + UI copy updates.
