# PostHog Analytics Setup

This guide covers PostHog analytics integration setup for Blockbuilders in both local development and production environments. It spans **both** the frontend (browser SDK, consent-gated) and the **backend/worker** (server-side, consent-gated), which now share a single PostHog person via identity stitching.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [PostHog Project Setup](#posthog-project-setup)
4. [Environment Variables](#environment-variables)
5. [Local Development](#local-development)
6. [Docker / Production](#docker--production)
7. [How It Works](#how-it-works)
8. [Manual PostHog Actions](#manual-posthog-actions)
9. [Testing the Integration](#testing-the-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Blockbuilders uses [PostHog](https://posthog.com) for privacy-respecting product analytics:

- **GDPR-compliant**: No tracking until the user explicitly accepts the consent banner
- **Consent persisted server-side**: Once an authenticated user makes a choice, it is stored on `User.analytics_consent` so the backend/worker can honor it without a browser
- **Manual event capture only**: `autocapture` and automatic `pageview` are disabled
- **Consent revocable**: Users can change their preference at any time from Profile > Settings
- **Stitched identity**: Frontend and backend events resolve to the **same** PostHog person via `posthog.identify(String(user.id))`

### Tracked events

| Source | Events |
|--------|--------|
| **Frontend** (browser SDK) | `page_view`, `login_completed`, `signup_completed`, `strategy_created`, `backtest_started`, `auto_backtest_started`, `batch_backtest_started`, `results_viewed`, `wizard_started`, `wizard_first_run_started`, `wizard_skipped`, plus canvas/palette diagnostics |
| **Backend / worker** (server SDK) | `backtest_completed` — the canonical activation signal, emitted exactly once per completed `BacktestRun` |

> **Important change (cutover 2026-06-07):** `backtest_completed` is now emitted **only** by the worker, not the browser. The old client-side `backtest_completed` (results page) and `auto_backtest_completed` (wizard) events were retired to stop double-counting. See [`docs/analytics/backtest_completed.md`](docs/analytics/backtest_completed.md) and [ADR-0007](docs/adr/0007-activation-event-server-side-consent-gated.md).

---

## Prerequisites

1. A PostHog account (create one at [posthog.com](https://posthog.com))
2. A PostHog project (one per environment recommended)
3. The `posthog` Python package on the backend (already pinned in `backend/requirements.txt`)

---

## PostHog Project Setup

### Step 1: Create a Project

1. Log in to [PostHog](https://app.posthog.com) (US) or [PostHog EU](https://eu.posthog.com)
2. Create a new project (e.g., `Blockbuilders Dev` / `Blockbuilders Prod`)

### Step 2: Get Your Project API Key

1. Go to **Settings** > **Project** > **Project API Key**
2. Copy the key (format: `phc_xxxxxxxxxxxxxxxxxxxx`)

> **Frontend and backend use the same Project API Key.** The `phc_` key is a write-only ingest key. The browser embeds it in `NEXT_PUBLIC_POSTHOG_KEY`; the backend/worker uses the identical value in `POSTHOG_API_KEY`. Because both write under the same project, identity stitching merges their events into one person. You do **not** need a Personal API Key for event capture — that is only required for the read-only API.

### Step 3: Note Your Instance Host

| PostHog Region | Ingestion Host |
|----------------|----------------|
| US (default) | `https://us.i.posthog.com` |
| EU | `https://eu.i.posthog.com` |

Use the **same host** for frontend (`NEXT_PUBLIC_POSTHOG_HOST`) and backend (`POSTHOG_HOST`).

---

## Environment Variables

Add these to the **root** `.env` file (see `.env.example`):

```bash
# PostHog Analytics (frontend — embedded in the JS bundle at build time)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# PostHog Analytics (backend / worker — server-side capture)
POSTHOG_API_KEY=phc_your_project_api_key
POSTHOG_HOST=https://us.i.posthog.com
```

> **`NEXT_PUBLIC_*`** variables are inlined into the frontend bundle at build time. They are safe to expose (the `phc_` key is a write-only ingest key, not a secret).

> **`POSTHOG_API_KEY` / `POSTHOG_HOST`** are read at runtime by the backend (`backend/app/core/config.py`). When `POSTHOG_API_KEY` is empty, the backend analytics client is a **safe no-op** — the worker still records `User.activated_at` in the database, it just doesn't dispatch the `backtest_completed` event. This means activation is reconstructable from the DB even if PostHog is unconfigured.

### Test Mode vs Production

| Environment | Recommendation |
|-------------|----------------|
| Local dev | Use a separate PostHog project (or the same with a `dev` flag) for both frontend and backend keys |
| Production | Use your production PostHog project key for both `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_API_KEY` |

---

## Local Development

### How Next.js Loads Environment Variables

Next.js loads `.env` files **from the frontend project directory** (`frontend/`), not from the repository root. Since Blockbuilders stores all environment variables in the root `.env` file, the `next.config.ts` is configured to load the root `.env` automatically.

### Steps

1. **Set the PostHog variables** in the root `.env` file (frontend **and** backend keys — see above)

2. **Apply database migrations** (the activation funnel adds two columns — see below):
   ```bash
   cd backend
   alembic upgrade head
   ```
   - Migration `038_add_analytics_consent` adds `User.analytics_consent`
   - Migration `039_add_activated_at` adds `User.activated_at` and backfills it from each user's earliest completed run

3. **Start the backend + worker** so server-side `backtest_completed` can fire:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   # plus the worker process that drains the backtest queue
   ```

4. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

5. **Verify the variables are loaded** (browser console):
   ```js
   // Should NOT be undefined
   console.log(process.env.NEXT_PUBLIC_POSTHOG_KEY)
   ```

6. **Accept the consent banner** that appears at the bottom of the page

7. **Verify PostHog is active** (browser console):
   ```js
   // After accepting consent, PostHog should be initialized
   Object.keys(localStorage).filter(k => k.startsWith('ph_'))
   ```

---

## Docker / Production

### Docker Compose (Development)

The `docker-compose.yml` passes the root `.env` via `env_file`, but `NEXT_PUBLIC_*` variables must be available at **build time** (they are inlined during `next build`). The `docker-compose.yml` passes them as build args automatically. The backend `POSTHOG_API_KEY` / `POSTHOG_HOST` are runtime env vars and are passed through `env_file`.

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

Verify the backend can see its key (should print the host, non-empty):

```bash
docker compose exec backend sh -c 'python -c "from app.core.config import settings; print(bool(settings.posthog_api_key), settings.posthog_host)"'
```

---

## How It Works

### Consent Flow

```
User visits site
  → ConsentBanner checks localStorage("bb.analytics.consent")
  → If null: banner is shown
    → Accept: setConsent(true) → initPostHog() → tracking starts
              → if authenticated: PATCH /users/me/analytics-consent {"consent":"accepted"}
    → Decline: setConsent(false) → no tracking
              → if authenticated: PATCH /users/me/analytics-consent {"consent":"declined"}
  → If "accepted": PostHogBootstrap calls initPostHog() on mount
  → If "declined": nothing happens
```

The browser is the source of truth for the *current session*; the server copy (`User.analytics_consent`) is **last-writer-wins** and exists so the **worker** can gate server-side events without a browser present.

### Identity Stitching

| Lifecycle event | Frontend call | Effect |
|-----------------|---------------|--------|
| login / signup / OAuth complete | `identifyUser(String(user.id))` → `posthog.identify(...)` | Pins the browser's anonymous device id to the canonical person `str(user.id)` |
| logout | `resetIdentity()` → `posthog.reset()` | Detaches the session so the next user starts clean |

The worker emits `backtest_completed` with `distinct_id = str(user_id)` — the **same** id the frontend pins — so the funnel `signup_completed → backtest_completed` connects across the client/server boundary. Without `identify`, the two would be different persons and activation would never join up.

### Server-Side Activation Event

When a backtest run reaches `completed`, the worker delegates to the activation service (`backend/app/services/activation.py`), which:

1. Decides `is_first` (true exactly once per user — when `User.activated_at` is still `NULL`)
2. Stamps `User.activated_at` and **commits it before dispatch** (a crash can only under-count `is_first`, never double-count)
3. Gates on `User.analytics_consent == "accepted"` — `null`/`declined` ⇒ no event
4. Emits `backtest_completed` with properties: `is_first`, `triggered_by` (`"auto"`/`"manual"`), `strategy_id`, `run_id`, `duration_ms`, `source: "server"`

### PostHog Configuration (frontend)

| Option | Value | Reason |
|--------|-------|--------|
| `autocapture` | `false` | Privacy: only explicit events |
| `capture_pageview` | `false` | Manual `page_view` events instead |
| `persistence` | `"localStorage+cookie"` | Cross-tab identity persistence |

### Consent Management

- **Initial choice**: Consent banner at bottom of page (first visit)
- **Change later**: Profile > Settings > Analytics Privacy card
- **Browser storage**: `localStorage` key `bb.analytics.consent` (`"accepted"` or `"declined"`)
- **Server storage**: `User.analytics_consent` (`"accepted"`, `"declined"`, or `NULL`), set via `PATCH /users/me/analytics-consent`

---

## Manual PostHog Actions

These are the **one-time, in-dashboard** steps to perform inside the PostHog UI after the code is deployed. None of them are created by the application automatically.

### 1. Confirm event ingestion (both sources)

1. Open the project → **Activity** (or **Activity Explorer**)
2. Confirm you see browser events (e.g. `signup_completed`) **and** the worker event `backtest_completed` with `source = "server"`
3. Open a `backtest_completed` event and confirm the properties `is_first`, `triggered_by`, `run_id`, `source`, `duration_ms` are present

### 2. Add a cutover Annotation (do this first)

The `backtest_completed` name spans both the retired client-side era and the new server-side era, so charts will mix them unless you mark the boundary.

1. Go to **Data Management** → or any insight's time axis → **Annotations**
2. Add an annotation dated **2026-06-07** with text like:
   `Cutover: backtest_completed now server-only (source="server"). Filter on source or is_first for a clean series.`

### 3. Annotate the event & property definitions

So the team reads the same meaning:

1. **Data Management** → **Events** → `backtest_completed` → add the description:
   *"Canonical activation signal. Emitted once per completed BacktestRun by the worker."*
2. **Data Management** → **Properties** → add descriptions for:
   - `is_first` — *"True only on the user's first-ever completed backtest (the activation moment)."*
   - `source` — *"`server` = worker-emitted (post-2026-06-07). Absent/other = retired client history."*
   - `triggered_by` — *"`auto` (wizard first-run) or `manual`."*

### 4. Build the Activation funnel insight

This is the north-star: *share of signups who reach a first completed backtest.*

1. **Insights** → **New insight** → **Funnel**
2. Step 1: `signup_completed`
3. Step 2: `backtest_completed`, **filtered** where `is_first = true` (equivalently `source = server`)
4. Save as **"Activation funnel"** and pin it to a dashboard

### 5. Create an "Activated users" cohort

1. **People & Groups** → **Cohorts** → **New cohort**
2. Condition: completed event `backtest_completed` where `is_first = true` (at least once)
3. Save as **"Activated users"** — reuse it for retention/comparison insights

### 6. (Optional) Time-to-activation insight

`time_to_first_backtest` is not sent as a property; derive it from `User.created_at → User.activated_at` in the DB, or build a PostHog funnel with a conversion-window/trends breakdown on the two steps above.

> **Filtering rule of thumb:** for any clean activation series, filter `backtest_completed` on `source = server` **and/or** `is_first` is set, and start the window at **2026-06-07**. Events before that date are retired client-side history and lack both fields.

---

## Testing the Integration

### 1. Verify Consent Banner

1. Clear localStorage (`localStorage.removeItem("bb.analytics.consent")`)
2. Reload the page
3. The consent banner should appear at the bottom
4. Click **Accept** → banner disappears, PostHog initializes

### 2. Verify server-side consent persistence

1. Log in, then accept (or change) consent in the banner / Settings card
2. Confirm the request: `PATCH /users/me/analytics-consent` returns 200
3. In the DB, `User.analytics_consent` for that user should be `"accepted"` (or `"declined"`)

### 3. Verify identity stitching

1. Log in (browser fires `identifyUser`)
2. Run a backtest to completion (worker fires `backtest_completed`)
3. In PostHog → **Persons**, open the person for that user id — both the browser events and the worker `backtest_completed` should appear under the **same** person

### 4. Verify the activation event

1. With consent accepted, run a user's **first** backtest to completion
2. In PostHog, the `backtest_completed` event should have `is_first = true` and `source = "server"`
3. Run a second backtest → the next `backtest_completed` should have `is_first = false`
4. In the DB, `User.activated_at` should be set (and not change on the second run)

### 5. Verify consent gating on the server

1. Set a user's consent to `declined` (Settings → Disable, or PATCH directly)
2. Run a backtest to completion
3. No `backtest_completed` event should reach PostHog, **but** `User.activated_at` is still stamped (activation stays reconstructable from the DB)

### 6. Verify Decline Flow (frontend)

1. Clear localStorage and reload
2. Click **Decline** on the consent banner
3. Navigate the app — no events should appear in PostHog
4. Verify no `ph_*` keys in localStorage

---

## Troubleshooting

### No events appearing in PostHog

**Check 1: Frontend env variable loaded?**
```js
console.log(process.env.NEXT_PUBLIC_POSTHOG_KEY)
// If undefined → env var not loaded at build time (see below)
```

**Check 2: Backend key set?**
```bash
docker compose exec backend sh -c 'python -c "from app.core.config import settings; print(bool(settings.posthog_api_key))"'
# Must print True for server-side backtest_completed to dispatch
```

**Check 3: Consent accepted?**
```js
localStorage.getItem("bb.analytics.consent")  // "accepted"
```
And server-side: `User.analytics_consent == "accepted"`.

**Check 4: PostHog initialized?**
- Look for `ph_*` keys in localStorage
- Check the Network tab for requests to `us.i.posthog.com` or `eu.i.posthog.com`

### `backtest_completed` never fires from the server

- `POSTHOG_API_KEY` is empty → backend analytics is a no-op (activation still stamped in DB, just not dispatched)
- The user's `analytics_consent` is `null` or `"declined"` → event is intentionally suppressed
- The worker process isn't running / the run never reached `completed`
- The event is queued but not flushed — the worker flushes on completion/shutdown; confirm `flush_backend_events` runs

### Frontend and worker events show as two different people

- Identity stitching not firing: confirm `identifyUser(String(user.id))` runs after login/signup and that the worker uses the **same** `str(user_id)` as `distinct_id`
- Mismatched project: frontend and backend must use the **same** `phc_` key and the **same** host (US vs EU)

### `NEXT_PUBLIC_POSTHOG_KEY` is undefined

**Cause**: The variable was not available when `next build` or `next dev` started.

- **Local dev**: ensure the root `.env` has the key, then restart the dev server
- **Docker**: ensure `.env` has the key before building, then `docker compose up -d --build`

### Consent banner not showing

**Cause**: Consent already set in localStorage.
```js
localStorage.removeItem("bb.analytics.consent")
location.reload()
```

### Charts mix old and new `backtest_completed`

**Cause**: The event name predates the cutover. Filter on `source = server` and/or `is_first`, and start the window at **2026-06-07** (add the annotation from [Manual PostHog Actions](#manual-posthog-actions)).

### Events firing but not in PostHog dashboard

- Wrong PostHog host (US vs EU mismatch)
- Key from a different project
- Ad-blocker blocking requests to `posthog.com` (frontend only)

### PostHog cookies set before consent

This should not happen — PostHog is only initialized after the user clicks Accept. If you see `ph_*` cookies before consent, check that `PostHogBootstrap` gates on `getConsent() === "accepted"` (via `initPostHog()`).

---

## References

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [PostHog Python SDK](https://posthog.com/docs/libraries/python)
- [PostHog Privacy & GDPR](https://posthog.com/docs/privacy)
- Canonical event definition: [`docs/analytics/backtest_completed.md`](docs/analytics/backtest_completed.md)
- Design rationale: [ADR-0007 — server-side, consent-gated activation event](docs/adr/0007-activation-event-server-side-consent-gated.md)
