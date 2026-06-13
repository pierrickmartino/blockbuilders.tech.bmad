# ADR-0007 — Subscription gates on verification depth, not idea throughput

- **Status**: Accepted
- **Date**: 2026-06-06
- **Related**: [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md) (NL
  wedge auto-backtests every draft), [ADR-0002](./0002-single-writer-price-cache.md)
  (price cache), [ADR-0005](./0005-working-copy-separate-from-versions.md)
  (version dedup); [CONTEXT.md](../../CONTEXT.md) — Backtest, Alert,
  Shared backtest; `docs/BRAINSTORM.md` §6 + decisions #1/#3

## Context

§6 of the brainstorm leaves the core business-model question open:
is the lab a **subscription** product (people pay recurring for the
lab itself) or a **funnel** product (the lab is free top-of-funnel,
money is made downstream)? Two prior decisions constrain the answer
hard:

- **Custody stays at zero (decision #1).** A funnel funnels *to* a
  revenue pool. With no custody and no execution, the only downstream
  pool is affiliate kickbacks from execution platforms — low-LTV and
  owned by incumbents (§7). There is no rich basin to funnel into, so
  pure-funnel is structurally weak here.
- **The NL wedge auto-backtests every draft (ADR-0006).** The current
  gates are `max_strategies`, `max_backtests_per_day`, and
  `max_history_days`. Once each idea-sentence triggers a backtest,
  `max_backtests_per_day` becomes a throttle on *the exact action the
  wedge exists to make frictionless* — gating it contradicts the
  wedge.

The unit-economics objection to "don't throttle the wedge" is real:
backtests are the cost center (compute + market-data fetch). So the
gate must move, not vanish.

## Decision

**Subscription is the primary revenue engine, and it gates on
verification *depth*, never on idea *throughput*.**

- **Gate on `max_history_days`** (already a tier axis: Free 1yr /
  Pro 3yr / Premium 10yr). History depth is simultaneously the real
  cost driver (a 10-year run is ~10× the candles of a 1-year run) and
  the willingness-to-pay axis (*"does my idea survive multiple cycles
  / a bear market?"*). Cost driver and value gate are the same lever.
- **The NL wedge runs a cheap short-window auto-backtest by default,
  unthrottled.** Enough to deliver *a* verdict (the magic moment);
  deep multi-cycle verification is the upsell.
- **`max_backtests_per_day` is demoted** from primary gate to a coarse
  anti-abuse ceiling (or dropped). It is no longer a monetization
  lever.
- **Alerts (decision #1) are an expansion lever inside the
  subscription**, not a separate funnel business — one notch up the
  autonomy slider, sold as a Premium feature (concurrent live
  Alerts, export). They double as the §2 churn antidote: an Alert
  that pings a dormant user when their tested idea fires is the
  between-spikes re-engagement hook that episodic pain otherwise lacks.
  (The Alert system already ships — see decision #1; the lever is
  hardening + gating it, not building it.)

Cost is amortized by one existing seam: ADR-0002's single-writer price
cache shares market-data fetch across users, so repeated runs over the
same window/asset reuse cached candles instead of re-fetching.

Note ADR-0005's content-dedup does **not** amortize backtest *compute*:
`freeze_for_backtest` dedupes the `StrategyVersion` row only
(`backend/app/services/version_freezer.py`), but `create_backtest`
(`backend/app/api/backtests.py`) still unconditionally creates a new
`BacktestRun` and enqueues `run_backtest_job` for it — so an identical
draft re-runs the full computation. If result-level reuse is wanted later
(skip enqueueing when a completed `BacktestRun` already exists for the
deduped `strategy_version_id`), it must be built explicitly; the cost case
here rests on the price cache, not on version dedup.

## Consequences

**Positive:**
- The wedge and the pricing model stop fighting: testing an idea is
  free-flowing; the expensive, paid action (deep verification) is the
  gate.
- One lever (`max_history_days`) carries cost control *and*
  monetization *and* the product's value story — no new billing
  primitive.

**Negative / non-obvious:**
- **Reverses a shipped pricing lever.** `max_backtests_per_day` is
  live in `PLAN_LIMITS`; demoting it is a real pricing change with
  grandfathering implications for existing/beta users. Must be
  sequenced *before* the NL wedge ships, or the wedge launches into a
  gate that punishes its core action.
- The short-window wedge default means the *first* verdict a user
  sees is shallow; the UI must make "verify deeper (multi-cycle)" an
  obvious, valuable next step rather than a hidden paywall, or the
  honesty thesis (§1) is undercut.
- This is a strategic bet, not a proven model. It should be measured
  by the §9 iterators-vs-executors split and depth-upgrade conversion,
  and reopened if depth turns out not to drive willingness to pay.

## Alternatives considered

- **Pure funnel** (free lab → monetize execution handoff). Rejected:
  zero custody leaves only thin, incumbent-owned affiliate revenue
  downstream; no basin to funnel into.
- **Keep `max_backtests_per_day` as the primary gate.** Rejected:
  directly throttles the NL wedge's core action (ADR-0006), turning
  the magic moment into a paywall.
- **Per-backtest metered billing.** Rejected: meters the exact action
  the wedge makes frictionless, reintroduces the cost-anxiety §2 says
  the "lab" framing exists to remove, and adds billing complexity the
  flat-rate model deliberately avoids.
