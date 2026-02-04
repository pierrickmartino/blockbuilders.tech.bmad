# Test Checklist -- Simple Tiered Subscription Plans

> Source PRD: `prd-simple-tiered-subscription-plans.md`

## 1. Data Model

- [ ] `plan_tier` field exists on users table with enum values: free, pro, premium
- [ ] `plan_tier` defaults to `free` for new users
- [ ] `plan_interval` field exists with enum values: monthly, annual (nullable for free)
- [ ] `stripe_customer_id` field exists and is nullable
- [ ] `stripe_subscription_id` field exists and is nullable
- [ ] `subscription_status` field exists with enum values: active, past_due, canceled, trialing (nullable)
- [ ] Database migration runs cleanly on a fresh database
- [ ] Database migration runs cleanly on an existing database with user data

## 2. Plan Limits Map

- [ ] `PLAN_LIMITS` constant defines free tier: max_strategies=10, max_backtests_per_day=50, max_history_days=365
- [ ] `PLAN_LIMITS` constant defines pro tier: max_strategies=50, max_backtests_per_day=200, max_history_days=1095
- [ ] `PLAN_LIMITS` constant defines premium tier: max_strategies=200, max_backtests_per_day=500, max_history_days=3650

## 3. Strategy Creation Enforcement

- [ ] Free user can create up to 10 strategies
- [ ] Free user is blocked from creating an 11th strategy with a clear error message
- [ ] Pro user can create up to 50 strategies
- [ ] Pro user is blocked from creating a 51st strategy
- [ ] Premium user can create up to 200 strategies
- [ ] Premium user is blocked from creating a 201st strategy
- [ ] Error response includes the current usage and limit values

## 4. Backtest Creation Enforcement -- Daily Cap

- [ ] Free user can run up to 50 backtests per day
- [ ] Free user is blocked after 50 backtests with a clear error message
- [ ] Pro user can run up to 200 backtests per day
- [ ] Premium user can run up to 500 backtests per day
- [ ] Daily count resets at midnight UTC
- [ ] Error response includes used/limit counts and reset time

## 5. Backtest Creation Enforcement -- Historical Data Depth

- [ ] Free user backtest date range is limited to 1 year (365 days)
- [ ] Pro user backtest date range is limited to 3 years (1095 days)
- [ ] Premium user backtest date range is limited to 10 years (3650 days)
- [ ] Requesting a date range exceeding the plan limit returns HTTP 400
- [ ] Error message clearly states the max history depth for the user's plan
- [ ] A date range exactly at the limit is accepted

## 6. API -- POST /billing/checkout-session

- [ ] Returns a valid Stripe Checkout URL for plan_tier=pro, interval=monthly
- [ ] Returns a valid Stripe Checkout URL for plan_tier=pro, interval=annual
- [ ] Returns a valid Stripe Checkout URL for plan_tier=premium, interval=monthly
- [ ] Returns a valid Stripe Checkout URL for plan_tier=premium, interval=annual
- [ ] Returns 400 for plan_tier=free (cannot checkout free tier)
- [ ] Returns 400 for missing or invalid plan_tier
- [ ] Returns 400 for missing or invalid interval
- [ ] Returns 401 for unauthenticated requests
- [ ] Creates a Stripe customer if `stripe_customer_id` is null
- [ ] Reuses existing Stripe customer if `stripe_customer_id` is set

## 7. API -- POST /billing/portal-session

- [ ] Returns a valid Stripe Billing Portal URL for a paid user
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns an appropriate error for a user without a Stripe customer ID

## 8. API -- POST /billing/webhook

- [ ] Handles `customer.subscription.created` event and updates user plan_tier, plan_interval, subscription_status
- [ ] Handles `customer.subscription.updated` event and updates user fields accordingly
- [ ] Handles `customer.subscription.deleted` event and downgrades user to free tier
- [ ] Webhook validates Stripe signature and rejects invalid signatures
- [ ] Webhook is idempotent (processing the same event twice does not corrupt data)
- [ ] Unknown event types are ignored gracefully (no error)

## 9. API -- GET /users/me (Extended Payload)

- [ ] Response includes `plan.tier` field with current plan tier value
- [ ] Response includes `plan.interval` field (null for free)
- [ ] Response includes `plan.status` field
- [ ] Free user returns tier=free, interval=null, status=active

## 10. Edge Cases -- Subscription Lifecycle

- [ ] Past due subscription retains paid plan limits until subscription is canceled
- [ ] Canceled subscription retains access until current period end
- [ ] After period end on canceled subscription, user is downgraded to free
- [ ] Webhook delay: user sees old plan until page refresh; no errors occur
- [ ] User who upgrades from pro to premium has limits updated immediately after webhook

## 11. Frontend -- Billing Section on Profile Page

- [ ] Billing section is visible on `/profile` page
- [ ] Current plan name is displayed correctly (Free, Pro, Premium)
- [ ] Current billing interval is displayed for paid plans (Monthly, Annual)
- [ ] Current subscription status is displayed
- [ ] Three tier comparison cards are shown with pricing
- [ ] "Upgrade" button is visible on paid tier cards for free users
- [ ] "Upgrade" button is visible on higher tier card for pro users
- [ ] "Manage billing" button is visible for paid users with active subscriptions
- [ ] Clicking "Upgrade" redirects to Stripe Checkout
- [ ] Clicking "Manage billing" opens Stripe Billing Portal
- [ ] Copy is plain and short (no marketing fluff)

## 12. Frontend -- Upgrade Flow

- [ ] Clicking upgrade creates a checkout session and redirects to Stripe
- [ ] After successful Stripe Checkout, user returns to app
- [ ] After successful checkout, refreshing the page shows the new plan
- [ ] Stripe Checkout failure or cancellation returns user to app without changes

## 13. Stripe Configuration

- [ ] Environment variables are defined: STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL, STRIPE_PRICE_PREMIUM_MONTHLY, STRIPE_PRICE_PREMIUM_ANNUAL
- [ ] Stripe webhook endpoint is configured with the correct signing secret
- [ ] Only the required webhook events are subscribed to

## 14. Analytics Events

- [ ] `billing_upgrade_clicked` event fires with tier and interval
- [ ] `billing_checkout_started` event fires with tier and interval
- [ ] `billing_checkout_completed` event fires with tier and interval
- [ ] `billing_portal_opened` event fires when portal is opened

## 15. Security and Auth

- [ ] All billing endpoints require authentication
- [ ] Users cannot modify another user's plan via API
- [ ] Stripe webhook endpoint validates request signature
- [ ] Stripe customer/subscription IDs are not exposed in public API responses
