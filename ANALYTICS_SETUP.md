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
8. [Manual PostHog Actions](#manual-posthog-actions)
9. [Testing the Integration](#testing-the-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Blockbuilders uses [PostHog](https://posthog.com) for privacy-respecting product analytics:

- **GDPR-compliant**: No tracking until the user explicitly accepts the consent banner
- **Manual event capture only**: `autocapture` and automatic `pageview` are disabled
- **Consent revocable**: Users can change their preference at any time from Profile > Settings
- **Per-user identity**: On login/signup/OAuth the browser binds `posthog.identify(user.id)`, stitching the anonymous pre-login session into the user's timeline; `posthog.reset()` runs on logout

### Event taxonomy

| Event | Source | Role |
|-------|--------|------|
| `signup_completed`, `login_completed` | Frontend (browser SDK) | Auth funnel entry; identity bound on the same call |
| `results_viewed` | Frontend (browser SDK) | **Canonical activation event** — the human saw a backtest verdict |
| `page_view`, `strategy_created`, `strategy_saved`, `backtest_started` | Frontend (browser SDK) | Product engagement |
| `backtest_completed`, `auto_backtest_completed` | Frontend (browser SDK) | **Job telemetry only** — must never be used as the activation signal |
| `backtest_job_completed` | Backend (worker, server SDK) | **Coverage line** — server-side first-completion proxy, not consent-gated |

> **Activation (north-star)**: the **first per-user occurrence of `results_viewed`** — the moment the equity curve + narrative actually render to a human, not the moment the backend job reaches `status == "completed"`. It fires identically across every entry path via a single shared hook, carrying `entry_path` (today `manual | wizard | nl_wedge`; ACTIONS #2 splits `manual` into `blank_canvas | template_clone` and adds a derived `authoring_mode`). See [`docs/adr/0008-activation-is-first-result-viewed.md`](docs/adr/0008-activation-is-first-result-viewed.md), [`docs/adr/0009-activation-drop-off-cohorts.md`](docs/adr/0009-activation-drop-off-cohorts.md), and [`docs/activation-metric-runbook.md`](docs/activation-metric-runbook.md).

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
# PostHog Analytics — frontend (browser SDK)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# PostHog Analytics — backend (worker server SDK, powers the coverage line)
POSTHOG_API_KEY=phc_your_project_api_key
POSTHOG_HOST=https://us.i.posthog.com
```

> **Important**: The `NEXT_PUBLIC_*` variables are embedded into the frontend JavaScript bundle at build time. They are safe to expose (the PostHog project API key is a write-only ingest key, not a secret).

> **Backend key**: `POSTHOG_API_KEY` lets the worker emit the server-side `backtest_job_completed` coverage event (`backend/app/services/analytics.py`). Use the **same project key** as the frontend so events land in one project and stitch on `distinct_id = user.id`. If `POSTHOG_API_KEY` is empty, backend dispatch is a **safe no-op** — the app still works, but the coverage line will have no data.

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

### Identity Stitching

When a user authenticates, the frontend binds their PostHog identity so pre- and post-login activity belong to one person:

- **Login / signup / OAuth completion** → `identifyUser(user.id)` calls `posthog.identify(user.id)` (`frontend/src/context/auth.tsx`). PostHog automatically aliases the prior `$anon_distinct_id` to this identity, merging the anonymous session into the user's timeline.
- **Logout** → `resetIdentity()` calls `posthog.reset()`, ending the identified session so the next user on the device starts fresh.
- Both wrappers (`frontend/src/lib/analytics.ts`) are **consent-gated** — they no-op unless `getConsent() === "accepted"`. A user only becomes an identified PostHog person if they accepted analytics consent.
- The backend worker emits its coverage event with `distinct_id = str(user.id)` (`backend/app/services/analytics.py`), the **same identity** the frontend binds — so frontend and backend events land on one person.

### Activation Event (`results_viewed`)

Activation is the **first per-user `results_viewed`** event, emitted by a single shared hook so every entry path behaves identically:

- `useResultViewedTracking` (`frontend/src/hooks/useResultViewedTracking.ts`) fires `results_viewed` exactly once per `runId`, the moment a completed run's verdict renders.
- Dedup is keyed on `runId` alone (module-scoped `Set`), so re-renders, remounts, and cross-entry-path navigation to the same run never double-count.
- Payload: `{ strategy_id, run_id, entry_path }` where `entry_path ∈ { manual | wizard | nl_wedge }` **today**. ACTIONS #2 / ADR-0009 evolves this: `entry_path` becomes `wizard | blank_canvas | template_clone | nl_wedge` (read from a persisted `strategies.entry_path` column, retiring `manual`), plus a derived `authoring_mode ∈ { nl | manual }`.
  - **manual** — the manual backtest page adopts the shared tracker. (Post-#2: reports the strategy's true persisted path instead of hard-coding `manual`.)
  - **wizard** — the first-run wizard preselects its just-completed run and navigates to `/strategies/{id}/backtest?run={runId}&entry_path=wizard` so the verdict actually renders.
- `backtest_completed` / `auto_backtest_completed` are **job telemetry only** and must never be treated as the activation signal.

### Consent Management

- **Initial choice**: Consent banner at bottom of page (first visit)
- **Change later**: Profile > Settings > Analytics Privacy card
- **Storage**: `localStorage` key `bb.analytics.consent` (`"accepted"` or `"declined"`)

---

## Manual PostHog Actions

These are **one-time, in-dashboard** steps a human with PostHog project access must perform after the instrumentation is deployed. The code emits the events; PostHog will not show the activation north-star until the insights below are built. This section operationalizes the [Activation Metric Runbook](docs/activation-metric-runbook.md) — keep the two in sync.

> **Who does this**: a human reviewer/operator with dashboard access (HITL). None of it can be automated from the codebase.

### Action 1 — Confirm events are arriving

Before building any insight, generate at least one of each event end-to-end (see [Testing the Integration](#testing-the-integration)) and confirm in **Activity → Explore events** that you see:

- `signup_completed` and `login_completed` (with a following `$identify`)
- `results_viewed` (with `strategy_id`, `run_id`, `entry_path`)
- `backtest_job_completed` (server-side; only if `POSTHOG_API_KEY` is set on the backend)

If `results_viewed` never carries an `entry_path`, or `backtest_job_completed` never arrives, fix the deployment before building insights — the dashboard will be misleading otherwise.

### Action 2 — (Optional) Define & describe events

In **Data management → Events**, open each canonical event and add a description so the team reads them consistently:

| Event | Suggested description |
|-------|----------------------|
| `results_viewed` | Canonical activation event — verdict rendered to a human. First per-user occurrence = Activation. |
| `backtest_job_completed` | Server-side first-completion proxy. Coverage line only — **not** activation. |
| `backtest_completed`, `auto_backtest_completed` | Job telemetry. Do not use as activation. |

This is optional but strongly recommended — it prevents the next person from rebuilding the funnel on a job-completion event.

### Action 3 — Build the canonical activation funnel (north-star)

Create a **Funnel** insight named e.g. **"Activation — first result viewed"**:

| Setting | Value |
|---------|-------|
| Step 1 | `signup_completed` |
| Step 2 | `results_viewed` |
| Counted by | **Unique users**, **first-time** semantics (each user counted at most once, on first occurrence) |
| Conversion window | **Open-ended (no cap)** — activation is one-time/first-touch; a window would wrongly exclude slow users |
| Date range | **Starts at the cutover date `2026-06-07`** — never earlier (see Action 6) |

- **Do not add a consent filter** — the funnel is *implicitly* consent-scoped: both events and `posthog.identify` no-op without accepted consent, so only consenting, identified users can ever enter it.
- **Optional breakdown**: break Step 2 down by `entry_path` to get drop-off by entry path. This is the seam for the entry-path cohorts — optional on this insight, not required for the north-star number itself. The full diagnostic funnel, `time_to_activation`, attribution, and the cohort cutover live in [`activation-metric-runbook.md`](docs/activation-metric-runbook.md) §7 and [ADR-0009](docs/adr/0009-activation-drop-off-cohorts.md).

### Action 4 — Build the coverage line (job-based proxy, clearly labeled)

Create a second insight alongside the funnel — either a **Trend** (unique users, first occurrence of `backtest_job_completed`) or a side-by-side funnel `signup_completed → backtest_job_completed` (first-time, unique users), same date range as Action 3.

- **Mandatory label**: title/legend/caption must read **"Coverage (job-based proxy) — not activation"**.
- It must be **visually distinct** from the canonical funnel and **never** summed, averaged, or stacked with it. It measures the canonical metric's *blind spot* (users who declined consent never appear in the funnel but do complete jobs server-side) — not an alternative activation number.
- Database cross-check (sanity only): `SELECT count(*) FROM users WHERE has_completed_onboarding = true`.

### Action 5 — Assemble the dashboard + captions

Create a dashboard (e.g. **"Activation north-star"**) containing the funnel (Action 3) and the coverage line (Action 4). The caption/notes must document:

- **Consenting-user scope** — the canonical number is read over consenting users only; the coverage line quantifies the gap.
- **Cutover + no-backfill rule** — canonical series starts `2026-06-07` and is never extended backward (Action 6).
- **Known proxy semantics** — `results_viewed` fires on "completed run selected + verdict rendered", not on a viewport/visibility signal: a user who tabs away the instant the verdict renders is still counted, and a draft the user later rejects still counts. These are **intended** properties — note them so nobody "fixes" them later.

### Action 6 — Add the cutover annotation & enforce no-backfill

In PostHog, add an **annotation** on **`2026-06-07`** reading e.g. *"Activation cutover: `results_viewed` became the single canonical view event across all entry paths (#546–#548)."*

- All activation insights must have their **date range start at `2026-06-07`** — confirm no earlier data is included.
- **No backfill, ever**: do not reconstruct pre-cutover activations from old `results_viewed`, `backtest_completed`, or `auto_backtest_completed` rows and merge them into the canonical series. Before cutover the event fired only on the manual page, with ad-hoc dedup and no bound identity — counting it would blend two meanings into one line.
- Pre-cutover history is visible only through the coverage line (Action 4), which has fired consistently server-side and is already labeled as a proxy.

### Action 7 — Spot-check identity (no anonymous leakage)

Sample a handful of `distinct_id`s that appear in the canonical funnel and confirm **each resolves to an identified person** (has a `$identify` event in its history). If anonymous-only `distinct_id`s show up in the funnel, the consent/identity gating broke — investigate before trusting the number.

### HITL checklist (north-star — Actions 1–7)

- [ ] Events confirmed arriving with correct properties (Action 1)
- [ ] Canonical funnel: `signup_completed → results_viewed`, unique users, first-time, no window cap (Action 3)
- [ ] Funnel date range starts `2026-06-07`; no earlier data (Actions 3 & 6)
- [ ] Coverage line on `backtest_job_completed` built, visually distinct, labeled "Coverage (job-based proxy) — not activation" (Action 4)
- [ ] Dashboard caption documents consent scope, no-backfill/cutover, and proxy semantics (Action 5)
- [ ] `2026-06-07` cutover annotation added (Action 6)
- [ ] Spot-checked funnel `distinct_id`s all have an `$identify` event (Action 7)

---

## Manual PostHog Actions — Diagnostic Layer (drop-off cohorts)

> **Tracks GitHub [#561](https://github.com/pierrickmartino/blockbuilders.tech.bmad/issues/561)** — HITL. Spec: [`activation-metric-runbook.md`](docs/activation-metric-runbook.md) §7 and [ADR-0009](docs/adr/0009-activation-drop-off-cohorts.md). **Only start once the cohort events are actually flowing** (the `entry_path` column is stamped on all four creation paths and `results_viewed` carries `entry_path` / `authoring_mode`). This layer is a **diagnostic** — it never replaces the canonical north-star above.

### Action 8 — Build the drop-off diagnostic funnel

On the **existing "Activation north-star" dashboard**, add a **second, clearly labelled** funnel insight — e.g. **"Activation drop-off by step (diagnostic — not the activation rate)"**. Use **"any-of" event mapping** per step:

| Step | Milestone | Event(s) |
|------|-----------|----------|
| 1 | Signed up | `signup_completed` |
| 2 | Strategy authored | `strategy_created` (any source) |
| 3 | Backtest enqueued | `backtest_started` **or** `auto_backtest_started` |
| 4 | Verdict viewed | `results_viewed` |

- **Label it a diagnostic.** Its overall conversion is *stricter* than the canonical §1 rate (it requires steps 2–3) and must **never** be quoted as "the activation rate", summed with, or compared to the canonical 2-step funnel. The "biggest drop-off step" is simply the largest step-to-step fall in this viz.
- Keep the canonical 2-step funnel (Action 3) **untouched and visibly separated** from this diagnostic.

### Action 9 — Break down by `entry_path` with attribution at "strategy authored"

- **Breakdown** the diagnostic funnel by `entry_path` (`wizard | blank_canvas | template_clone | nl_wedge`), optionally also `authoring_mode` (`nl | manual`).
- **Attribution at step 2 ("Strategy authored")** — the first step where the path is known. **First-touch, per-user**: a user is attributed to their *first* authored strategy's `entry_path`.
- Users who **bounce between step 1 and step 2** have no path → name that bucket **"(no path — bounced before authoring)"** rather than hiding it.
- Strategies created **before** the `entry_path` column existed have `entry_path = null` → surface them as an explicit **`unknown`** cohort. Never retro-guess a path.

### Action 10 — Add the `time_to_activation` tile

- Add a tile reading the funnel's **PostHog-native time-to-convert** from `signup_completed` to first `results_viewed` (median / p90 / distribution), **sliceable by `entry_path`**.
- **No client-side number / no new event or numeric property** — read it off the funnel so it can never drift. Do **not** call this `time_to_first_backtest` (that implies the job/run; see ADR-0008).

### Action 11 — Add the cohort cutover annotation (separate from `2026-06-07`)

- Add a **second annotation** on the **`entry_path` deploy date** (the date all four creation paths started stamping the column) — **distinct** from the `2026-06-07` activation cutover.
- Entry-path breakdowns are trustworthy **only from that date** — start them there.
- The canonical 2-step series (§1) keeps running **unbroken from `2026-06-07`** and is never re-based to this newer date.

### HITL checklist (diagnostic layer — Actions 8–11)

- [ ] Diagnostic funnel built (4 steps, any-of mapping), labelled "diagnostic — not the activation rate", on the existing dashboard (Action 8)
- [ ] Breakdown by `entry_path`, attribution at step 2; "(no path)" bounce bucket named; `unknown` cohort visible (Action 9)
- [ ] `time_to_activation` tile = funnel time-to-convert, sliceable by `entry_path`, no client-side number (Action 10)
- [ ] Cohort cutover annotation added on the `entry_path` deploy date; no backfill of pre-column strategies (Action 11)
- [ ] Canonical 2-step funnel unchanged, continues from `2026-06-07`, never summed/compared with the diagnostic (Actions 8 & 11)

---

## Manual PostHog Actions — Retention A/B Experiment (`wjl_retention_ab`)

> **Tracks GitHub [#573](https://github.com/pierrickmartino/blockbuilders.tech.bmad/issues/573)** — HITL. Spec: [ADR-0010](docs/adr/0010-what-you-learned-retention-ab.md). This experiment manipulates **only the `WhatYouLearnedCard`**; the always-on `NarrativeCard` stays on in **both** arms. **Do not start it until exposure data is confirmed flowing** from the code path (the card wired behind the flag) — see Action 14.

### Action 12 — Create the `wjl_retention_ab` experiment

In **Experiments**, create an experiment on the feature flag **`wjl_retention_ab`**:

| Setting | Value |
|---------|-------|
| Variants | `control` / `test` |
| Split | **50 / 50** |
| Assignment | Per identified **`user.id`** (sticky, first-touch — `posthog.identify` runs at auth) |
| Statistics | **Two-sided, 95% significance / 80% power** on the primary metric |
| Duration | Let **PostHog's calculator** set it from the **live baseline** |

- Enrollment is read **once per user**, at the first benchmark-present completed verdict (the card's true eligibility). Unenrolled users (declined consent, PostHog not ready, flag unresolved) default to **seeing the card** — so the analyzed population is consenting users with a resolved variant.

### Action 13 — Define the metrics

| Metric | Type | Definition |
|--------|------|------------|
| **Second-backtest-rate** | **Primary** | User has **≥ 2 distinct `run_id`s** with a `results_viewed` within **7 days** of enrollment. **Distinct `run_id`s, not raw event count** — the in-memory `results_viewed` dedup resets on reload. View-based, consistent with ADR-0008. |
| **7-day return-rate** | Secondary | **≥ 1 `page_view`** on a calendar day **after** the enrollment day, within 7 days. |
| **Activation rate** | **Guardrail** | Must stay **flat** across arms. `results_viewed` fires independently of the card, so any movement signals an **instrumentation bug, not an effect** — investigate before trusting the result. |

- No event-schema change: PostHog joins these to the experiment via the flag-exposure event; `results_viewed` / `page_view` payloads are untouched.

### Action 14 — Confirm exposure before starting

Before pressing **Start**, confirm the flag-exposure (`$feature_flag_called`) events for `wjl_retention_ab` are actually arriving from the code path, with both `control` and `test` appearing. **If no exposure is flowing, fix the deployment first** — an experiment with no exposure data produces nothing.

### Action 15 — Record the pre-registered decision rules in the runbook

Capture the experiment definition and **both** rules in [`docs/activation-metric-runbook.md`](docs/activation-metric-runbook.md) so they travel with the result:

- **Three-way ship rule (pre-registered):**
  - **Positive & significant** → keep the card for all + greenlight #12/#19.
  - **Null** → keep the card (cheap, harmless); do **not** greenlight #12/#19 on this evidence.
  - **Negative** → remove the card.
- **Null-interpretation guard (must be recorded with the experiment):** because the always-on `NarrativeCard` is present in **both** arms, a null disproves only the *incremental* value of the What-you-learned card **on top of** the existing narrative — **not** the broader severity-as-retention thesis. Do **not** cancel #12/#19 on a misread.

### HITL checklist (retention A/B — Actions 12–15)

- [ ] `wjl_retention_ab` experiment created: `control` / `test`, 50/50, per-`user.id` sticky assignment (Action 12)
- [ ] Primary metric = ≥ 2 distinct `run_id`s with `results_viewed` within 7 days of enrollment (Action 13)
- [ ] Secondary metric = ≥ 1 `page_view` on a later calendar day within 7 days (Action 13)
- [ ] Activation-rate guardrail configured and confirmed flat across arms after launch (Action 13)
- [ ] Powering/duration set from the live baseline (two-sided, 95% / 80%) (Action 12)
- [ ] Exposure confirmed flowing before the experiment is started (Action 14)
- [ ] Runbook records the experiment definition, all three metrics, the three-way ship rule, and the null-interpretation guard (Action 15)

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

### 3. Verify Identity Stitching

1. With consent accepted, log in
2. In PostHog, confirm an `$identify` event fires and the `distinct_id` is the user's id
3. Confirm pre-login anonymous events and post-login events resolve to the **same person**
4. Log out → a `$reset` occurs; the next session starts anonymous again

### 4. Verify the Activation Event (`results_viewed`)

1. Run a backtest from the **manual** page until the verdict renders → expect one `results_viewed` with `entry_path: "manual"`
2. Run the **first-run wizard** to completion → expect one `results_viewed` with `entry_path: "wizard"` once the verdict lands
3. Reload / revisit the same run → **no** second `results_viewed` for that `run_id` (dedup works)

### 5. Verify Consent Revocation

1. Go to **Profile** > **Settings**
2. In the "Analytics Privacy" card, click **Disable**
3. PostHog should stop capturing events
4. Reload and verify no new events appear

### 6. Verify Decline Flow

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

### Anonymous `distinct_id`s in the activation funnel

**Cause**: identity binding (`posthog.identify`) is not running, so events stay on the anonymous `$anon_distinct_id`.

**Check**:
- Identity is consent-gated — confirm consent is `"accepted"` before login.
- Confirm `identifyUser(user.id)` runs on login/signup/OAuth (`frontend/src/context/auth.tsx`) and `resetIdentity()` on logout.
- Each funnel `distinct_id` should have an `$identify` event in its history.

### `backtest_job_completed` (coverage line) missing in PostHog

**Cause**: the backend worker has no PostHog key, so server-side dispatch is a no-op.

**Fix**:
- Set `POSTHOG_API_KEY` (and `POSTHOG_HOST`) in the backend environment — use the **same project** as the frontend so events stitch on `distinct_id = user.id`.
- The backend event is **not** consent-gated by design (it powers the coverage proxy). Confirm the worker can reach `POSTHOG_HOST`.
- Cross-check the DB proxy: `SELECT count(*) FROM users WHERE has_completed_onboarding = true`.

### `results_viewed` fired twice / not at all

- **Twice for one run**: should not happen — dedup is keyed on `run_id` (`useResultViewedTracking`). Check that the run id is stable across renders.
- **Never fires**: it only fires when `status === "completed"` and a `runId` is present. On the wizard path, confirm the just-completed run is preselected (`?run={runId}&entry_path=wizard`) so the verdict actually renders.

---

## References

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [PostHog identify (identity stitching)](https://posthog.com/docs/product-analytics/identify)
- [PostHog Funnels](https://posthog.com/docs/product-analytics/funnels)
- [PostHog Annotations](https://posthog.com/docs/data/annotations)
- [PostHog Privacy & GDPR](https://posthog.com/docs/privacy)
- **Activation north-star spec**: [`docs/activation-metric-runbook.md`](docs/activation-metric-runbook.md)
- **Activation decision record**: [`docs/adr/0008-activation-is-first-result-viewed.md`](docs/adr/0008-activation-is-first-result-viewed.md)
- **Analytics glossary**: `CONTEXT.md` → *Analytics concepts*
- Internal PRD: `docs/prd-posthog-analytics-privacy-consent.md`
- Internal Test Checklist: `docs/tst-posthog-analytics-privacy-consent.md`
