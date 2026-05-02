# Test Checklist -- One-Time Credit Packs

> Source PRD: `prd-one-time-credit-packs.md`

## 1. Data Model

- [ ] `backtest_credit_balance` field exists on users table (int, default 0)
- [ ] `extra_strategy_slots` field exists on users table (int, default 0)
- [ ] Database migration runs cleanly on fresh and existing databases
- [ ] Existing users have default values of 0 for both fields after migration

## 2. Strategy Creation Enforcement with Extra Slots

- [ ] Strategy creation allowed when `strategies_used < max_strategies + extra_strategy_slots`
- [ ] Free user with 0 extra slots is blocked at 10 strategies
- [ ] Free user with 5 extra slots can create up to 15 strategies
- [ ] Free user with 5 extra slots is blocked at 16 strategies
- [ ] Pro user with 5 extra slots can create up to 55 strategies
- [ ] Premium user with 5 extra slots can create up to 205 strategies
- [ ] Multiple credit pack purchases stack (e.g., 2 packs = +10 slots)

## 3. Backtest Creation Enforcement with Credits

- [ ] Backtests within daily cap do not consume credits
- [ ] Free user at 50/50 daily backtests with credits > 0 can run a backtest using 1 credit
- [ ] Credit balance decrements by 1 when a credit-based backtest runs
- [ ] User at daily cap with 0 credits is blocked with a clear error message
- [ ] Pro user at 200/200 daily backtests with credits can use credits
- [ ] Premium user at 500/500 daily backtests with credits can use credits
- [ ] Credits are consumed one at a time (not in bulk)
- [ ] Credit balance reaches 0 and further backtests beyond daily cap are blocked

## 4. Credit Persistence

- [ ] Credits never expire (no TTL or expiration date)
- [ ] Strategy slots are permanent and do not decrease over time
- [ ] Backtest credits persist across daily resets
- [ ] Credits persist when user changes subscription tier
- [ ] Credits persist when user cancels subscription

## 5. API -- POST /billing/credit-pack/checkout-session

- [ ] Returns a valid Stripe Checkout URL for pack=backtest_credits
- [ ] Returns a valid Stripe Checkout URL for pack=strategy_slots
- [ ] Returns 400 for invalid or missing pack value
- [ ] Returns 401 for unauthenticated requests
- [ ] Checkout session is a one-time payment (not a subscription)

## 6. API -- POST /billing/credit-pack/webhook

- [ ] Handles `checkout.session.completed` event for backtest credits and adds 50 to balance
- [ ] Handles `checkout.session.completed` event for strategy slots and adds 5 to extra_strategy_slots
- [ ] Webhook validates Stripe signature
- [ ] Webhook is idempotent: processing the same session ID twice does not double-credit
- [ ] Unknown event types are ignored gracefully

## 7. API -- GET /users/me and GET /usage/me

- [ ] Response includes `backtest_credit_balance` field with current balance
- [ ] Response includes `extra_strategy_slots` field with current count
- [ ] Values update correctly after a credit pack purchase

## 8. Stripe Configuration

- [ ] `STRIPE_PRICE_BACKTEST_CREDITS_50` environment variable is defined
- [ ] `STRIPE_PRICE_STRATEGY_SLOTS_5` environment variable is defined
- [ ] Stripe products are configured as one-time payments (not recurring)

## 9. Frontend -- Credits Section on Profile

- [ ] Credits section is visible on `/profile` page
- [ ] Current backtest credit balance is displayed
- [ ] Current extra strategy slots count is displayed
- [ ] "Buy 50 Backtest Credits" button is visible and functional
- [ ] "Buy +5 Strategy Slots" button is visible and functional
- [ ] Clicking a buy button redirects to Stripe Checkout
- [ ] After successful purchase, refreshing the page shows updated balances
- [ ] Copy is short and factual

## 10. Edge Cases

- [ ] Webhook delay: balances update on next page refresh without errors
- [ ] Refunds require manual admin adjustment (no automated rollback logic)
- [ ] Concurrent purchases of the same pack type are handled correctly
- [ ] User with no Stripe customer ID can still purchase credit packs (customer created on first purchase)
- [ ] Free user can purchase credit packs without upgrading plan

## 11. Analytics Events

- [ ] `credit_pack_purchase_clicked` event fires with pack type
- [ ] `credit_pack_checkout_started` event fires with pack type
- [ ] `credit_pack_checkout_completed` event fires with pack type
