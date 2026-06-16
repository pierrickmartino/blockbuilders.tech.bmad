# ADR-0021 — The performance alert is result-anchored and inherits the engine's trust

- **Status**: Accepted
- **Date**: 2026-06-16
- **Related**: [ADR-0005](./0005-working-copy-separate-from-versions.md)
  (working copy vs. frozen versions), [ADR-0007](./0007-subscription-gates-on-depth-not-throughput.md)
  (alerts are a Premium expansion lever — "harden + gate, not build"),
  [ADR-0002](./0002-single-writer-price-cache.md) (shared candle cache);
  [CONTEXT.md](../../CONTEXT.md) — Alert, Notification, Strategy version,
  Working copy; `docs/ACTIONS.md` #16

## Context

The Alert system already ships: an `alert_rules` table with two
subtypes (a **performance alert** bound to `strategy_id`, evaluated
inside `run_backtest_job` only when `triggered_by='auto'`; and a bare
**price alert** on spot price). ACTIONS #16 and ADR-0007 both frame the
work as *hardening*, not building.

The shipped performance alert does not yet inherit the engine's trust —
the one property that justifies the feature ("the alert inherits the
engine's trust" so a user is pinged only on a verdict they verified and
believed). Four concrete gaps:

1. **Not verification-gated.** An alert can be created on a strategy
   that was never backtested.
2. **Bound to the mutable strategy, not a frozen version.** Editing the
   working copy silently changes what the alert would watch.
3. **Fires off a fixed daily cron, timeframe-blind.** Evaluation keys on
   "today" as a *date* (`run.date_to`), so a 1h strategy is pinged up to
   ~24h late, and a re-backtest ending "now" can include the *forming*
   candle — violating the completed-candles-only / no-look-ahead
   guarantee the Trust page (ADR-0017) makes.
4. **Coupled to `auto_update_enabled`.** An alert with auto-update off
   silently never fires.

## Decision

**Harden the performance alert into a result-anchored, version-pinned
surface that re-runs the full engine on the strategy's own timeframe —
so it inherits engine trust at both the logic and the data level. The
price alert is explicitly out of scope.**

- **Scope: performance alert only.** The price alert is the un-verified
  "blind alert" (no strategy to verify; gating a spot tripwire on a
  backtest is incoherent). It is walled off as a separate product and
  left untouched.
- **Result-anchored creation.** An alert is created from the **backtest
  result page** and *pinned to the exact frozen `strategy_version` whose
  verdict the user is viewing* (new non-null `alert_rules.strategy_version_id`).
  Verification-gating falls out of the surface for free — a result page
  implies a completed backtest.
- **Passive edits never move the pin; re-binding is deliberate.**
  Cardinality stays **one active performance alert per strategy**.
  Creating an alert from a *newer* result re-pins old→new (replace, not
  accumulate). A pin left behind by edits is surfaced as a **stale
  alert**, never auto-moved.
- **Timeframe-aligned firing on closed candles.** The alert drives a
  full re-backtest of its **pinned version** on a cadence matching the
  strategy's timeframe (hourly for `1h`, every 4h for `4h`, daily for
  `1d`), and evaluates only the **latest *closed* candle** — never the
  forming one. The whole engine stays in the loop (same interpreter,
  next-candle-open execution, position state), so the alert fires on a
  *real simulated transition*, not a side-channel approximation.
- **The alert is its own scheduler.** Evaluation moves off the
  `triggered_by='auto'` / `auto_update_enabled` path onto a dedicated
  alert-driven path (`triggered_by='alert'`), keyed to the pinned
  version + timeframe. `auto_update_enabled` remains an independent
  "keep my *current* result fresh" setting on the evolving strategy; the
  two never piggyback (different targets, different cadences).
- **Idempotency keys on the candle, not the run.** A `last_fired_candle_ts`
  watermark advances to the newest closed candle each run. Entry
  (`flat→long`) / exit (`long→flat`) fire once per transition on candles
  newer than the watermark; the **drawdown threshold** fires on a
  level-crossing (below→above), re-arming when it drops back under. A
  catch-up run spanning several new candles sends **one coalesced**
  notification, not a burst.
- **Migration: deactivate, don't backfill.** Existing performance-alert
  rows (strategy-bound, no pin) are set `is_active=False` with a one-time
  in-app Notification asking the user to re-create from a result. With
  2–5 real users, a guessed version pin (which version did they *mean*?)
  would silently fire on logic they never chose — the exact trust
  violation this ADR removes.
- **Archive → deactivate (no auto-resume); delete → cascade.** Archiving
  is "I'm done for now"; burning hourly compute on a hidden strategy
  contradicts it, and re-pinning from a result is the clean, deliberate
  re-enable path.

Out of scope (noted follow-ups): the **Premium entitlement gate**
(ADR-0007) — a one-line check at the new creation endpoint, plus
concurrent-alert limits and grandfathering — is its own slice, not
bundled into this correctness hardening.

## Consequences

**Positive:**
- The alert watches *exactly* the version that produced the verdict the
  user believed — trust inheritance is literal, not asserted.
- Completed-candles-only is preserved end to end: no forming-candle
  fire, no look-ahead, matching the Trust page's promise.
- "What does my alert watch?" only ever changes by a deliberate act.

**Negative / non-obvious:**
- **Bounded but real new compute.** A `1h`-alert strategy re-runs the
  full engine hourly. Cost is bounded by *alert count* (Premium, opt-in,
  one-per-strategy), not user count, and amortized by the ADR-0002 price
  cache — but it is more than the old single daily cron.
- **Pinned alerts can go stale.** A user editing toward a new idea but
  never re-backtesting keeps getting pinged on the old version. This is
  deliberate (auto-moving the pin would break trust inheritance);
  mitigated by the stale-alert surfacing, not by following edits.
- **Reverses shipped behavior.** Performance-alert evaluation *moves
  off* the `triggered_by='auto'` hook; existing rows are deactivated.
  This is a behavior change, sequenced with a user notification.

## Alternatives considered

- **Strategy-anchored, pin to "latest completed backtest."** Rejected:
  needs a separate verification guard, and "latest" drifts as the user
  re-backtests — the alert silently tracks a moving target instead of
  the verdict the user verified.
- **Keep the daily cron, just fix "today" → "last closed candle."**
  Rejected: leaves sub-daily alerts ~24h coarse, breaking the
  "ping me when this triggers" promise for `1h`/`4h` strategies.
- **Lightweight interpreter-only signal check per candle (no full
  re-sim).** Rejected: a stateless "entry condition is true" check
  ignores simulated position state, so it isn't what the user
  backtested — it forks alert logic into a hardened path and a
  trust-leaking path on the same row.
- **Backfill existing rows by pinning to the latest version.** Rejected
  for 2–5 users: trades the clean trust guarantee for negligible
  convenience.

## How to apply

- **Backend authors**: an `alert_rules.strategy_version_id` is non-null
  for performance alerts; never re-point it on a working-copy edit. Use
  `triggered_by='alert'` for alert-driven runs; never evaluate
  performance alerts off the `auto` / `auto_update_enabled` path.
  Evaluate only candles strictly newer than `last_fired_candle_ts` and
  already closed.
- **Frontend authors**: the only creation surface is the result page;
  there is no strategy-settings creation of performance alerts. Render
  the stale-alert state; re-pin is an explicit action from a newer
  result.
- **Reviewers**: a PR that lets a performance alert bind to a strategy
  without a version, evaluate on the forming candle, ride the daily
  `auto` run, or follow working-copy edits is a boundary change —
  require it to reopen this ADR.
