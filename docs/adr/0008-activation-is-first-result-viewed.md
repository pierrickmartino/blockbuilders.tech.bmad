# Activation is the first result *viewed*, not the first backtest *completed*

## Context

Signup → first-completed-backtest is the only moment Blockbuilders
delivers its core promise, and it is the north-star that unblocks the
NL-wedge A/B (ACTIONS #7) and the retention split (ACTIONS #3). But the
funnel was untrusted: four different "done" events existed with three
different meanings — two job-completion events
(`backtest_completed` on a frontend poll transition, `backtest_job_completed`
server-side), a wizard job event (`auto_backtest_completed`), and a true
view event (`results_viewed`) that only fired on the manual backtest page.

## Decision

**Activation is the first per-user occurrence of `results_viewed`** — the
moment a human sees the verdict (equity curve + narrative rendered), not
the moment a backend job reaches `status == "completed"`. Concretely:

1. **`results_viewed` is the single canonical activation event**, fired on
   the same "completed run selected + results rendered" trigger across all
   entry paths (wizard, manual run, NL wedge). The wizard preselects its
   just-completed run so the verdict actually renders. `backtest_completed`
   and `auto_backtest_completed` are demoted to job telemetry and must
   never be used as the activation signal.
2. **Per-user identity** comes from `posthog.identify(user.id)` at
   login/signup (`reset()` on logout), so "first per user" and dedup across
   retries and entry paths are native, not computed over a property.
3. **The canonical rate is read over consenting users** (the event is
   client-side and consent-gated). The server-side job-completion count is
   kept only as a labeled coverage/sanity check, never as the north-star.
4. **No backfill into the canonical metric.** View-based activation starts
   clean at cutover; history is shown only as an explicitly-labeled
   job-based *proxy* line, never merged into the canonical number.

A draft the user later rejects still counts (they witnessed an honest
verdict): activation is recorded on verdict render, independent of any
later keep/reject, and survives the NL-wedge hard-delete (ADR-0006).

## Consequences

- The "viewed" trigger is a deliberate proxy (selected + rendered), not a
  viewport/visibility gate — it may slightly over-count a user who tabs
  away instantly. Accepted as good enough for the north-star; viewport
  gating was rejected as over-built.
- The canonical number undercounts users who decline analytics consent.
  This is a *known, measured* bias (quantified against the server coverage
  line), not a silent one — preferred over a server-side view beacon that
  would record behavioural analytics without consent and clash with the
  privacy brand.
- Adding `entry_path` to `results_viewed` is the seam that unblocks the
  drop-off-by-entry-path cohorts (ACTIONS #2).
