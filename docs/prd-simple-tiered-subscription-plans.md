# PRD — Simple Tiered Subscription Plans

**File:** `prd-simple-tiered-subscription-plans.md`  
**Product:** Blockbuilders  
**Status:** Proposed  
**Owner:** Product  
**Last updated:** 2026-01-01

---

## 1) Why we’re doing this

Blockbuilders currently runs as a free beta with soft usage limits. We need a simple revenue model that stays aligned with the product’s simplicity-first philosophy: no metered pricing, no complex add-ons, just clear flat-rate tiers with straightforward caps.

---

## 2) Goals and non-goals

### Goals
1. Introduce 2–3 subscription tiers with **flat monthly/annual pricing**.
2. Keep the **Free tier identical to current beta limits**.
3. Gate usage by a few **simple caps**: strategies, backtests/day, and historical data depth.
4. Use Stripe for billing with **minimal integration**.

### Non-goals
- Usage-based pricing or per-backtest charges.
- Complex quota tracking, metering, or credits.
- Team accounts, seats, or enterprise contracts.
- Add-on feature bundles or per-feature pricing.

---

## 3) Target users & use cases

### Target users
- Individual retail traders who want higher limits without complexity.

### Primary use cases
1. “I hit free limits and want to upgrade quickly.”
2. “I want a predictable monthly/annual price.”
3. “I need longer backtest history and more daily runs.”

---

## 4) Plan tiers & pricing (simple + fixed)

| Tier | Monthly | Annual | Max Strategies | Backtests/Day | Historical Data Depth |
|---|---|---|---|---|---|
| **Free** | $0 | N/A | 10 | 50 | 1 year |
| **Pro** | $19 | $190 | 50 | 200 | 3 years |
| **Premium** | $49 | $490 | 200 | 500 | 10 years |

**Notes:**
- Free tier mirrors current beta limits (10 strategies, 50 backtests/day).
- Annual price is a simple 10× monthly (2 months free).
- Historical depth is enforced by the allowed backtest date range.

---

## 5) UX & user flows (minimal)

### Profile → Billing section (simple)
- Add a **Billing** section to the Profile page.
- Show current plan, renewal interval, and status.
- Show plan comparison cards with “Upgrade” buttons for paid tiers.
- For paid users, show “Manage billing” (Stripe portal).

### Upgrade flow
1. User clicks “Upgrade to Pro/Premium”.
2. Frontend calls backend to create Stripe Checkout session.
3. User completes Stripe Checkout.
4. Stripe webhook updates user’s plan + status.
5. Frontend reflects new plan on next load.

### Cancel flow
1. User clicks “Manage billing”.
2. Stripe Billing Portal opens.
3. Cancellation occurs in Stripe; webhook updates status.

---

## 6) Backend requirements (minimal)

### Data model additions (users table)
- `plan_tier` (enum: free/pro/premium, default free)
- `plan_interval` (enum: monthly/annual, nullable for free)
- `stripe_customer_id` (nullable)
- `stripe_subscription_id` (nullable)
- `subscription_status` (enum: active/past_due/canceled/trialing, nullable)

### Plan limits map (code constant)
Keep a single, static mapping:
```python
PLAN_LIMITS = {
  "free": {"max_strategies": 10, "max_backtests_per_day": 50, "max_history_days": 365},
  "pro": {"max_strategies": 50, "max_backtests_per_day": 200, "max_history_days": 365 * 3},
  "premium": {"max_strategies": 200, "max_backtests_per_day": 500, "max_history_days": 365 * 10},
}
```

### Enforcement points
- **Create Strategy**: block if `strategies_count >= max_strategies`.
- **Create Backtest**:
  - block if daily count >= max_backtests_per_day.
  - block if requested date range exceeds `max_history_days`.

---

## 7) API endpoints (keep surface small)

### Billing
- `POST /billing/checkout-session`
  - Body: `{ plan_tier: "pro" | "premium", interval: "monthly" | "annual" }`
  - Returns: `{ url: "https://checkout.stripe.com/..." }`

- `POST /billing/portal-session`
  - Returns: `{ url: "https://billing.stripe.com/..." }`

- `POST /billing/webhook`
  - Stripe webhook handler (subscription created/updated/canceled).

### User payload extension
- Extend `GET /users/me` response to include:
  ```json
  {
    "plan": {
      "tier": "free",
      "interval": null,
      "status": "active"
    }
  }
  ```

---

## 8) Stripe integration (simple)

- Use **Stripe Checkout** for upgrades.
- Use **Stripe Billing Portal** for cancellation and payment updates.
- Handle only these webhook events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

**Price IDs (env vars):**
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ANNUAL`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PREMIUM_ANNUAL`

---

## 9) Frontend requirements (minimal)

- Add a Billing section to `/profile`.
- Display current plan, interval, and status.
- Show three tier cards with a single “Upgrade” CTA on paid tiers.
- For active paid plans, show “Manage billing”.
- Copy should be plain and short, no marketing fluff.

---

## 10) Edge cases & error handling

- **Past due**: treat as paid plan limits **until** subscription cancels.
- **Canceled**: keep access until current period end; then downgrade to Free.
- **Webhook delay**: user sees updated plan on next refresh; no real-time UI required.
- **Invalid date range**: return 400 with clear message about max history depth.

---

## 11) Analytics (very light)

- `billing_upgrade_clicked` (tier, interval)
- `billing_checkout_started` (tier, interval)
- `billing_checkout_completed` (tier, interval)
- `billing_portal_opened`

---

## 12) Rollout plan

1. Add backend fields + migration.
2. Implement Stripe Checkout + webhook.
3. Add Billing section in Profile.
4. Update plan enforcement in strategy/backtest creation.

---

## 13) Acceptance criteria checklist

- [ ] Free plan retains current beta caps (10 strategies, 50 backtests/day).
- [ ] Pro and Premium plans are available with monthly/annual pricing.
- [ ] Stripe Checkout flow creates subscriptions for paid tiers.
- [ ] Stripe webhook updates user plan and status reliably.
- [ ] Strategy creation and backtest creation enforce plan caps.
- [ ] Backtest date range is capped by plan historical depth.
- [ ] Billing section shows current plan and provides upgrade/manage actions.

---

## 14) Simplicity guardrails

- No usage-based pricing.
- No credits, tokens, or metered add-ons.
- No complex quota dashboards or admin tooling beyond basic fields.
- Keep the implementation to the smallest number of models, endpoints, and UI changes.
