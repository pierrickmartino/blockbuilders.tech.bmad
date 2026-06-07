# PostHog Analytics Setup

This guide covers PostHog analytics integration setup for Blockbuilders in both local development and production environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [PostHog Project Setup](#posthog-project-setup)
4. [Environment Variables](#environment-variables)
5. [Local Development](#local-development)
6. [Docker / Production](#docker--production)
7. [How It Works](#how-it-works)
8. [Testing the Integration](#testing-the-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Blockbuilders uses [PostHog](https://posthog.com) for privacy-respecting product analytics:

- **GDPR-compliant**: No tracking until the user explicitly accepts the consent banner
- **Manual event capture only**: `autocapture` and automatic `pageview` are disabled
- **Consent revocable**: Users can change their preference at any time from Profile > Settings

Tracked events include: `page_view`, `login_completed`, `signup_completed`, `strategy_created`, `strategy_saved`, `backtest_started`, `backtest_completed`, `results_viewed`.

---

## Prerequisites

1. A PostHog account (create one at [posthog.com](https://posthog.com))
2. A PostHog project (one per environment recommended)

---

## PostHog Project Setup

### Step 1: Create a Project

1. Log in to [PostHog](https://app.posthog.com) (US) or [PostHog EU](https://eu.posthog.com)
2. Create a new project (e.g., `Blockbuilders Dev` / `Blockbuilders Prod`)

### Step 2: Get Your Project API Key

1. Go to **Settings** > **Project** > **Project API Key**
2. Copy the key (format: `phc_xxxxxxxxxxxxxxxxxxxx`)

### Step 3: Note Your Instance Host

| PostHog Region | Ingestion Host |
|----------------|----------------|
| US (default) | `https://us.i.posthog.com` |
| EU | `https://eu.i.posthog.com` |

---

## Environment Variables

Add these to the **root** `.env` file:

```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> **Important**: These are `NEXT_PUBLIC_*` variables, which means they are embedded into the frontend JavaScript bundle at build time. They are safe to expose (the PostHog project API key is a write-only ingest key, not a secret).

### Test Mode vs Production

| Environment | Recommendation |
|-------------|----------------|
| Local dev | Use a separate PostHog project or the same with a `dev` flag |
| Production | Use your production PostHog project key |

---

## Local Development

### How Next.js Loads Environment Variables

Next.js loads `.env` files **from the frontend project directory** (`frontend/`), not from the repository root. Since Blockbuilders stores all environment variables in the root `.env` file, the `next.config.ts` is configured to load the root `.env` automatically.

### Steps

1. **Set the PostHog variables** in the root `.env` file (see above)

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Verify the variables are loaded**: Open the browser console and check:
   ```js
   // Should NOT be undefined
   console.log(process.env.NEXT_PUBLIC_POSTHOG_KEY)
   ```

4. **Accept the consent banner** that appears at the bottom of the page

5. **Verify PostHog is active**: In the browser console:
   ```js
   // After accepting consent, PostHog should be initialized
   // Check for ph_* keys in localStorage
   Object.keys(localStorage).filter(k => k.startsWith('ph_'))
   ```

---

## Docker / Production

### Docker Compose (Development)

The `docker-compose.yml` passes the root `.env` via `env_file`, but `NEXT_PUBLIC_*` variables must be available at **build time** (they are inlined during `next build`). The `docker-compose.yml` passes them as build args automatically.

```bash
docker compose up -d --build
```

### Docker Compose (Production)

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Verify the frontend was built with PostHog:

```bash
# Check if the PostHog key is embedded in the built JS
docker compose exec frontend sh -c "grep -r 'phc_' .next/static/ | head -1"
```

---

## How It Works

### Consent Flow

```
User visits site
  → ConsentBanner checks localStorage("bb.analytics.consent")
  → If null: banner is shown
    → Accept: setConsent(true) → initPostHog() → tracking starts
    → Decline: setConsent(false) → no tracking
  → If "accepted": PostHogBootstrap calls initPostHog() on mount
  → If "declined": nothing happens
```

### PostHog Configuration

PostHog is initialized with these settings:

| Option | Value | Reason |
|--------|-------|--------|
| `autocapture` | `false` | Privacy: only explicit events |
| `capture_pageview` | `false` | Manual page_view events instead |
| `persistence` | `"localStorage+cookie"` | Cross-tab identity persistence |

### Consent Management

- **Initial choice**: Consent banner at bottom of page (first visit)
- **Change later**: Profile > Settings > Analytics Privacy card
- **Storage**: `localStorage` key `bb.analytics.consent` (`"accepted"` or `"declined"`)

---

## Testing the Integration

### 1. Verify Consent Banner

1. Clear localStorage (`localStorage.removeItem("bb.analytics.consent")`)
2. Reload the page
3. The consent banner should appear at the bottom
4. Click **Accept** → banner disappears, PostHog initializes

### 2. Verify Events in PostHog

1. Open your PostHog project dashboard
2. Go to **Activity** or **Events**
3. Navigate the app (log in, create a strategy, run a backtest)
4. Events should appear in PostHog within seconds

### 3. Verify Consent Revocation

1. Go to **Profile** > **Settings**
2. In the "Analytics Privacy" card, click **Disable**
3. PostHog should stop capturing events
4. Reload and verify no new events appear

### 4. Verify Decline Flow

1. Clear localStorage and reload
2. Click **Decline** on the consent banner
3. Navigate the app — no events should appear in PostHog
4. Verify no `ph_*` keys in localStorage

---

## Troubleshooting

### No events appearing in PostHog

**Check 1: Environment variable loaded?**
```js
// Browser console
console.log(process.env.NEXT_PUBLIC_POSTHOG_KEY)
// If undefined → env var not loaded at build time (see below)
```

**Check 2: Consent accepted?**
```js
localStorage.getItem("bb.analytics.consent")
// Should be "accepted"
```

**Check 3: PostHog initialized?**
- Look for `ph_*` keys in localStorage
- Check the Network tab for requests to `us.i.posthog.com` or `eu.i.posthog.com`

### `NEXT_PUBLIC_POSTHOG_KEY` is undefined

**Cause**: The variable was not available when `next build` or `next dev` started.

**For local dev**:
- Ensure the root `.env` has `NEXT_PUBLIC_POSTHOG_KEY` set
- Restart the dev server after changing `.env`

**For Docker**:
- Ensure `.env` has the key set before building
- Rebuild: `docker compose up -d --build`

### Consent banner not showing

**Cause**: Consent was already set in localStorage.

**Fix**: Clear it and reload:
```js
localStorage.removeItem("bb.analytics.consent")
location.reload()
```

### Events firing but not in PostHog dashboard

**Causes**:
- Wrong PostHog host (US vs EU mismatch)
- PostHog project API key from a different project
- Network/ad-blocker blocking requests to `posthog.com`

**Fix**:
- Verify `NEXT_PUBLIC_POSTHOG_HOST` matches your PostHog region
- Check browser Network tab for blocked requests
- Try disabling ad blockers temporarily

### PostHog cookies set before consent

This should not happen — PostHog is only initialized after the user clicks Accept. If you see `ph_*` cookies before consent, check that `PostHogBootstrap` correctly gates on `getConsent() === "accepted"` (it does via `initPostHog()`).

---

## References

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [PostHog Privacy & GDPR](https://posthog.com/docs/privacy)
- Internal PRD: `docs/prd-posthog-analytics-privacy-consent.md`
- Internal Test Checklist: `docs/tst-posthog-analytics-privacy-consent.md`
