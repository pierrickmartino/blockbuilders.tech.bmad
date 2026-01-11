# PRD — One-Time Credit Packs

**File:** `prd-one-time-credit-packs.md`  
**Product:** Blockbuilders  
**Status:** Proposed  
**Owner:** Product  
**Last updated:** 2026-01-01

---

## 1) Why we’re doing this

Some users only need occasional extra capacity and don’t want a monthly subscription. One-time credit packs provide a simple, low-commitment way to purchase extra backtests or strategy slots while keeping limits and enforcement straightforward.

---

## 2) Goals and non-goals

### Goals
1. Allow users to buy **50 backtest credits** as a one-time pack.
2. Allow users to buy **+5 strategy slots** as a one-time pack.
3. Credits **never expire** and are tracked as simple integer balances.
4. Keep enforcement changes minimal (reusing existing limit checks).

### Non-goals
- Usage-based pricing or per-backtest billing.
- Time-limited credits or expiring packs.
- Complex add-on bundles or tiered metering.
- Team or seat-based capacity.

---

## 3) Target users & use cases

### Target users
- Casual users who hit limits occasionally but don’t want a subscription.

### Primary use cases
1. “I need a few more backtests this month without upgrading.”
2. “I want to store a few extra strategies permanently.”

---

## 4) Credit packs (fixed and simple)

| Pack | Amount | Behavior |
|---|---|---|
| **Backtest Credits** | 50 credits | Consumable; 1 credit per backtest **after** daily cap is reached |
| **Strategy Slots** | +5 slots | Permanent increase to allowed active strategies |

**Notes:**
- Credits never expire.
- Strategy slots are additive capacity, not consumable.

---

## 5) UX & user flows (minimal)

### Profile → Usage & Credits
- Show current usage limits.
- Show **Backtest Credits** balance and **Extra Strategy Slots** count.
- Add two buttons: “Buy 50 Backtest Credits” and “Buy +5 Strategy Slots”.

### Purchase flow (one-time)
1. User clicks a buy button.
2. Frontend requests a Stripe Checkout session for a one-time payment.
3. User completes payment.
4. Stripe webhook credits the user balance.
5. Frontend reflects updated balances on next load.

---

## 6) Backend requirements (minimal)

### Data model additions (users table)
- `backtest_credit_balance` (int, default 0)
- `extra_strategy_slots` (int, default 0)

### Enforcement (reuse existing checks)
- **Strategy creation:** allow if `strategies_used < max_strategies + extra_strategy_slots`.
- **Backtest creation:**
  - If `backtests_today < max_backtests_per_day`, allow (no credit used).
  - Else, allow only if `backtest_credit_balance > 0`, then decrement by 1.

---

## 7) API endpoints (keep surface small)

### Billing
- `POST /billing/credit-pack/checkout-session`
  - Body: `{ pack: "backtest_credits" | "strategy_slots" }`
  - Returns: `{ url: "https://checkout.stripe.com/..." }`

- `POST /billing/credit-pack/webhook`
  - Stripe webhook handler for one-time purchases.

### User payload extension
- Extend `GET /users/me` and `GET /usage/me` with:
  ```json
  {
    "backtest_credit_balance": 0,
    "extra_strategy_slots": 0
  }
  ```

---

## 8) Stripe integration (simple)

- Use **Stripe Checkout** for one-time payments.
- Handle only these webhook events:
  - `checkout.session.completed`

**Price IDs (env vars):**
- `STRIPE_PRICE_BACKTEST_CREDITS_50`
- `STRIPE_PRICE_STRATEGY_SLOTS_5`

---

## 9) Frontend requirements (minimal)

- Add a “Credits” section in `/profile`.
- Show remaining balances and two purchase buttons.
- Keep copy short and factual.

---

## 10) Edge cases & error handling

- **Webhook delay:** balances update on next refresh; no real-time updates required.
- **Webhook retries:** idempotent crediting based on Stripe session ID.
- **Refunds:** manual admin adjustment (no automated rollback).

---

## 11) Analytics (very light)

- `credit_pack_purchase_clicked` (pack)
- `credit_pack_checkout_started` (pack)
- `credit_pack_checkout_completed` (pack)

---

## 12) Rollout plan

1. Add user fields + migration.
2. Add checkout session + webhook handler.
3. Update limit enforcement.
4. Add Credits section on Profile.

---

## 13) Acceptance criteria checklist

- [ ] Users can purchase 50 backtest credits via Stripe Checkout.
- [ ] Users can purchase +5 strategy slots via Stripe Checkout.
- [ ] Credit balances are stored on the user record and never expire.
- [ ] Backtests consume credits only after daily cap is reached.
- [ ] Strategy creation respects extra strategy slots.
- [ ] `GET /users/me` and `GET /usage/me` return credit balances.
- [ ] Profile page shows balances and purchase actions.

---
