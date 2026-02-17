# Stripe Payment Integration Setup

This document covers the setup process for Stripe integration in both sandbox (test) and production environments for the Blockbuilders application.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Stripe Dashboard Setup](#stripe-dashboard-setup)
4. [Environment Variables](#environment-variables)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing the Integration](#testing-the-integration)
7. [Going to Production](#going-to-production)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Blockbuilders uses Stripe for:

- **Subscription billing**: Pro ($19/month or $190/year) and Premium ($49/month or $490/year) tiers
- **One-time purchases**: Backtest credit packs (50 credits) and strategy slot packs (+5 slots)

The integration uses:
- **Stripe Checkout** for payment collection
- **Stripe Billing Portal** for subscription management
- **Stripe Webhooks** for real-time updates

---

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Access to the Stripe Dashboard
3. The backend application running with database access

---

## Stripe Dashboard Setup

### Step 1: Create Products and Prices

Log in to your Stripe Dashboard and navigate to **Products** (or use the API).

#### Subscription Products

Create the following products and prices:

| Product Name | Price Name | Amount | Billing | Type |
|--------------|------------|--------|---------|------|
| Blockbuilders Pro | Pro Monthly | $19.00 | Monthly | Recurring |
| Blockbuilders Pro | Pro Annual | $190.00 | Yearly | Recurring |
| Blockbuilders Premium | Premium Monthly | $49.00 | Monthly | Recurring |
| Blockbuilders Premium | Premium Annual | $490.00 | Yearly | Recurring |

#### One-Time Products

| Product Name | Price Name | Amount | Type |
|--------------|------------|--------|------|
| Backtest Credits Pack | 50 Backtest Credits | (set your price) | One-time |
| Strategy Slots Pack | +5 Strategy Slots | (set your price) | One-time |

### Step 2: Note Your Price IDs

After creating products, note the Price IDs (format: `price_xxxxxxxxxxxxx`). You'll need these for environment variables.

To find Price IDs:
1. Go to **Products** in the Dashboard
2. Click on a product
3. Find the price and copy its ID (starts with `price_`)

### Step 3: Get API Keys

1. Go to **Developers** > **API keys**
2. Note your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

> **Important**: Never expose your secret key in client-side code or version control.

---

## Environment Variables

Add the following to your `.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=<your-test-secret-key>

# Stripe Webhook Secret (see Webhook Configuration section)
STRIPE_WEBHOOK_SECRET=<your-test-webhook-secret>

# Subscription Price IDs
STRIPE_PRICE_PRO_MONTHLY=<your-pro-monthly-price-id>
STRIPE_PRICE_PRO_ANNUAL=<your-pro-annual-price-id>
STRIPE_PRICE_PREMIUM_MONTHLY=<your-premium-monthly-price-id>
STRIPE_PRICE_PREMIUM_ANNUAL=<your-premium-annual-price-id>

# One-Time Purchase Price IDs
STRIPE_PRICE_BACKTEST_CREDITS_50=<your-backtest-credits-price-id>
STRIPE_PRICE_STRATEGY_SLOTS_5=<your-strategy-slots-price-id>
```

### Test Mode vs Live Mode

| Environment | Secret Key Prefix | Use Case |
|-------------|-------------------|----------|
| Sandbox/Dev | `sk_test_` | Development and testing |
| Production | `sk_live_` | Real payments |

---

## Webhook Configuration

Webhooks notify your application of payment events in real-time.

### Step 1: Create Webhook Endpoint

1. Go to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - **Sandbox**: `https://your-dev-domain.com/api/billing/webhook`
   - **Production**: `https://your-prod-domain.com/api/billing/webhook`

### Step 2: Select Events

Subscribe to these events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`

### Step 3: Get Webhook Secret

After creating the endpoint:
1. Click on the endpoint
2. Reveal the **Signing secret** (starts with `whsec_`)
3. Add it to your environment as `STRIPE_WEBHOOK_SECRET`

### Local Development with Stripe CLI

For local testing, use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:8000/api/billing/webhook
```

The CLI will display a webhook signing secret to use locally.

---

## Testing the Integration

### Test Mode Cards

Use these test card numbers in sandbox mode:

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Successful payment | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| Declined card | 4000 0000 0000 0002 | Any future date | Any 3 digits |
| Requires authentication | 4000 0025 0000 3155 | Any future date | Any 3 digits |
| Insufficient funds | 4000 0000 0000 9995 | Any future date | Any 3 digits |

### Test Subscription Flow

1. Create a user account in your application
2. Navigate to the Profile/Billing section
3. Click "Upgrade to Pro" or "Upgrade to Premium"
4. Complete checkout with test card `4242 4242 4242 4242`
5. Verify the webhook updates the user's `plan_tier` and `subscription_status`

### Test One-Time Purchase Flow

1. Navigate to the Profile/Credits section
2. Click "Buy 50 Backtest Credits" or "Buy +5 Strategy Slots"
3. Complete checkout with a test card
4. Verify the webhook credits the user's balance

### Verify Webhook Delivery

1. Go to **Developers** > **Webhooks** in the Dashboard
2. Click your endpoint
3. Check the **Webhook attempts** section for delivery status

---

## Going to Production

### Pre-Launch Checklist

- [ ] Create products and prices in **Live mode** (not Test mode)
- [ ] Update environment variables with live keys (`sk_live_`, `price_` from live mode)
- [ ] Create a new webhook endpoint pointing to your production URL
- [ ] Update `STRIPE_WEBHOOK_SECRET` with the production webhook secret
- [ ] Verify `FRONTEND_URL` points to your production domain (for redirect URLs)
- [ ] Test the full flow with a real card (you can refund immediately)

### Environment Variable Changes for Production

```bash
# Production Stripe Keys
STRIPE_SECRET_KEY=<your-live-secret-key>
STRIPE_WEBHOOK_SECRET=<your-live-webhook-secret>

# Production Price IDs (from Live mode products)
STRIPE_PRICE_PRO_MONTHLY=<your-pro-monthly-price-id>
STRIPE_PRICE_PRO_ANNUAL=<your-pro-annual-price-id>
STRIPE_PRICE_PREMIUM_MONTHLY=<your-premium-monthly-price-id>
STRIPE_PRICE_PREMIUM_ANNUAL=<your-premium-annual-price-id>
STRIPE_PRICE_BACKTEST_CREDITS_50=<your-backtest-credits-price-id>
STRIPE_PRICE_STRATEGY_SLOTS_5=<your-strategy-slots-price-id>

# Production URLs
FRONTEND_URL=https://your-production-domain.com
```

### If Deploying with Docker Compose

Use the production compose file with an explicit env file:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Verify the API container receives Stripe settings:

```bash
docker compose -f docker-compose.prod.yml exec api env | grep -E "STRIPE_SECRET_KEY|STRIPE_PRICE_PRO_MONTHLY|FRONTEND_URL"
```

### Billing Portal Configuration

Configure the Stripe Billing Portal for customer self-service:

1. Go to **Settings** > **Billing** > **Customer portal**
2. Enable the features you want:
   - Update payment methods
   - View billing history
   - Cancel subscriptions
3. Customize branding to match your application

---

## Troubleshooting

### Common Issues

#### Webhook Signature Verification Failed

**Error**: `Invalid signature` or `Signature verification error`

**Causes**:
- Wrong `STRIPE_WEBHOOK_SECRET` value
- Webhook secret from Test mode used in Live mode (or vice versa)
- Request body modified before verification

**Solution**:
1. Verify you're using the correct webhook secret for the environment
2. Ensure the raw request body is passed to signature verification

#### "Invalid plan or interval" Error

**Cause**: Price ID not configured or doesn't match any known plan

**Solution**:
1. Verify all `STRIPE_PRICE_*` environment variables are set
2. Ensure price IDs match the mode (test vs live)

#### User Plan Not Updating After Payment

**Causes**:
- Webhook not reaching your server
- Webhook signature verification failing
- User not found by Stripe customer ID

**Debugging**:
1. Check Stripe Dashboard > Webhooks for delivery status
2. Check application logs for webhook processing errors
3. Verify `stripe_customer_id` is set on the user record

#### Checkout Session Creation Fails

**Causes**:
- Invalid or missing `STRIPE_SECRET_KEY`
- Invalid price ID
- Network connectivity issues

**Solution**:
1. Verify API key is correct and has necessary permissions
2. Test API key with: `stripe balance retrieve` (via CLI)

#### "Stripe not configured" or Stripe setup errors in production API

**Cause**: Stripe environment variables are not available inside the API container runtime

**Solution**:
1. Ensure `docker-compose.prod.yml` passes all required `STRIPE_*` variables to the `api` service
2. Redeploy using the production compose file and env file
3. Confirm env visibility with `docker compose -f docker-compose.prod.yml exec api env`

### Useful Stripe CLI Commands

```bash
# Check your Stripe configuration
stripe config

# List recent events
stripe events list --limit 10

# Retrieve a specific event
stripe events retrieve evt_xxxxx

# Trigger a test webhook event
stripe trigger checkout.session.completed

# Listen to webhooks locally
stripe listen --forward-to localhost:8000/api/billing/webhook
```

### Logs and Monitoring

Monitor these for issues:

1. **Stripe Dashboard** > **Developers** > **Logs** - API request logs
2. **Stripe Dashboard** > **Developers** > **Webhooks** - Webhook delivery status
3. **Application logs** - Backend processing errors

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Restrict API key permissions** - Create restricted keys for specific use cases
3. **Verify webhook signatures** - Always validate the `stripe-signature` header
4. **Use HTTPS** - Required for production webhooks
5. **Handle idempotency** - Stripe may retry webhooks; handle duplicate events gracefully
6. **Keep Stripe SDK updated** - Security patches and new features

---

## References

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Billing Portal Documentation](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
