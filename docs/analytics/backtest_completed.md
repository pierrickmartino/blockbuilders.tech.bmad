# Canonical event: `backtest_completed`

The single source of truth for "a backtest finished," and the anchor for the
**Activation** north-star. Definition lives here so it stops drifting. The *why*
is in [ADR-0007](../adr/0007-activation-event-server-side-consent-gated.md).

## Definition

| Field | Value |
|---|---|
| **Event name** | `backtest_completed` |
| **Emitted from** | The worker (`backend/app/worker/jobs.py`), when a run reaches `completed`. |
| **Cardinality** | Exactly once per completed `BacktestRun` (server-observed; not lossy). |
| **distinct_id** | `str(user_id)` — same id the frontend pins via `posthog.identify`. |
| **Consent gate** | Fires only when `User.analytics_consent == "accepted"`. `null`/`declined` → no event. |

### Properties

| Property | Type | Notes |
|---|---|---|
| `is_first` | bool | `True` only on the user's first-ever completed backtest. Computed from `User.activated_at` (set in the same transaction). This is the activation signal. |
| `triggered_by` | string | `"auto"` or `"manual"` — from `BacktestRun.triggered_by`. |
| `strategy_id` | uuid | |
| `run_id` | uuid | The `BacktestRun` id; also sent as `correlation_id`. |
| `duration_ms` | int | Worker-measured job duration. |
| `source` | string | Always `"server"`. Disambiguates new events from the retired client-side history. |

> Deferred to ACTIONS #2 (cohorts): entry-path attribution (wizard vs blank
> canvas vs template) and an explicit `time_to_first_backtest` measure. The worker
> does not know entry-path today, and time-to-activation is derivable from
> `User.created_at` → `User.activated_at` without a new property.

## Activation, defined

> **Activation = the share of signups who reach a first completed backtest.**

In PostHog: a `signup_completed` person who later has a `backtest_completed` with
`is_first == true`. Anchored server-side by `User.activated_at` (non-null ⇒
activated), so the metric is reconstructable from the database independent of
PostHog.

`activated_at` is **distinct from `has_completed_onboarding`** — the latter is a
UI flag (gates the first-run summary card). They are set in the same place but
mean different things; per `CONTEXT.md`, activation must not be conflated with
"onboarding done."

## Identity stitching

The frontend calls `posthog.identify(String(user.id))` after login/signup (and
after consent) and `posthog.reset()` on logout. Without this, frontend events
(anonymous device id) and this worker event (`user_id`) would be different
persons and the funnel would not connect.

## Retired events

These client-side events are removed; the worker owns "completed":

- `backtest_completed` (results page) — was lossy on tab-close / already-completed loads.
- `auto_backtest_completed` (wizard first-run) — split the wizard path under a second name.

Still emitted (unchanged): `backtest_started`, `auto_backtest_started`,
`results_viewed`, and the `wizard_*` events.

## Cutover & backfill

- **Cutover date:** 2026-06-07. The `backtest_completed` name spans both the old
  client-side and new server-side eras; filter on `source == "server"` (and/or
  the presence of `is_first`) plus this date for a clean series — events before
  2026-06-07 are the retired client-side `backtest_completed` /
  `auto_backtest_completed` history and lack both fields.
- **Backfill:** an Alembic data migration seeds `User.activated_at` from each
  user's earliest completed run. Events are **not** replayed into PostHog (no
  historical consent records). Pre-cutover activation is computed from the DB.
