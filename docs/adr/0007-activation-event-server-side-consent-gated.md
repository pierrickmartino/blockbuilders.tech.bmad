# Activation is emitted server-side, consent-gated, anchored on `activated_at`

The canonical activation event (`backtest_completed`) is emitted **from the
worker** when a backtest run completes — not from the browser. It fires once per
completed run, carries `is_first` computed from a new `User.activated_at` anchor,
and is gated on a server-persisted `User.analytics_consent == "accepted"`. The
two client-side completion events (`backtest_completed` on the results page,
`auto_backtest_completed` in the wizard) are retired so the worker is the single
source of truth. The frontend adds `posthog.identify(user.id)` on login/signup
and `posthog.reset()` on logout so its anonymous person merges onto the
`user_id` distinct-id the worker already uses.

## Status

accepted

## Why

Activation — the share of signups who reach a *first completed backtest* — is the
north-star, and every strategic bet downstream is unfalsifiable until it is
trustworthy (`BRAINSTORM.md` decision #2). The pre-existing instrumentation could
not be trusted for three structural reasons:

1. **Client-side completion events are lossy.** Both fired from a browser polling
   loop, so they were lost if the user closed the tab during the (up to 5-minute)
   poll, or if the results page was opened on an already-finished run. The worker
   is the only place a completion is observed exactly once, reliably.
2. **The wizard path used a different event name** (`auto_backtest_completed`)
   than the manual path (`backtest_completed`), so "first completed backtest"
   was split across two names. A completed run is a completed run regardless of
   how it was triggered; emitting from the worker dedups the paths for free.
3. **Identity was never stitched.** There was no `identify()` call, so
   `signup_completed` (anonymous device id) and any user-keyed event were
   *different PostHog persons* — signup→activation could not be a funnel at all.

Anchoring on a dedicated `User.activated_at` timestamp (rather than reusing
`has_completed_onboarding`) keeps activation distinct from onboarding — they are
different concepts in `CONTEXT.md` — gives an idempotent `is_first` guard, and
makes the historical backfill a single `UPDATE`.

## Considered options

- **Keep it client-side, consolidated (rejected).** One browser event instead of
  two. Still lossy on tab-close, still needs `identify()`, and still under-counts
  activation by every user who declines consent or leaves early. It does not make
  the number trustworthy, which was the whole job.
- **Server-side, fire for everyone regardless of consent (rejected).** Maximally
  complete, but it tracks users who declined and breaks the product's stated
  "no tracking until the user accepts the banner" posture (`ANALYTICS_SETUP.md`).
- **Server-side, consent-gated (chosen).** Trustworthy *and* honors the consent
  promise. The cost is that consent — previously `localStorage`-only — must now be
  persisted server-side (`User.analytics_consent`, written by a small endpoint the
  consent banner calls), and that users who decline remain invisible to the metric
  by design.

## Consequences

- **Decliners are invisible by design.** The north-star is "activation among
  consented users," not all users. That is the deliberate privacy trade-off; a
  future revisit of the consent posture would change the denominator.
- **Consent is now server state with last-writer-wins semantics.** Consent is
  per-device (`localStorage`); the persisted `User.analytics_consent` reflects the
  most recent device decision. Acceptable for a per-user north-star; do not treat
  it as a per-device audit log.
- **The `backtest_completed` series spans a cutover.** After this lands the name
  carries both the old (lossy, client-side) and new (reliable, server-side) events.
  New events carry `source: "server"` and `is_first`; filter on those and the
  documented cutover date to read a clean series. See
  `docs/analytics/backtest_completed.md`.
- **Backfill is DB-only.** `activated_at` is seeded from each user's earliest
  completed run; events are **not** replayed into PostHog because we have no record
  of historical consent. Pre-cutover activation is computed from the database, not
  from the PostHog timeline.
