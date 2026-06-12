# ADR-0016 — Cost-bounding the NL wedge: anti-abuse ceiling, not a monetization gate

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Strategy drafter, Repair pass,
  Working copy; [ADR-0011](./0011-strategy-drafter-nl-to-graph-generation.md)
  — the drafter seam, single-shot generation, the three-outcome contract, and
  the deferral of "caching / per-user caps" to this item;
  [ADR-0015](./0015-nl-wedge-repair-pass-regenerate-not-patch.md) — the repair
  pass is a second LLM call bounded by `strategy_drafter_max_repairs`, "#9
  bounds it"; [ADR-0007](./0007-subscription-gates-on-depth-not-throughput.md)
  — subscription gates on verification *depth*, never idea *throughput*, and
  demotes `max_backtests_per_day` to "a coarse anti-abuse ceiling (or
  dropped)"; [ADR-0005](./0005-working-copy-separate-from-versions.md) —
  content-dedup reuses a Strategy version for identical graphs;
  [ADR-0013](./0013-nl-wedge-auto-backtest-wiring.md) — the rapid-fire "throw
  an idea, watch it resolve" loop; `docs/ACTIONS.md` #9 (this item), #4/#8
  (the drafter and repair pass it bounds).

## Context

ACTIONS #9 ("Cost-bound the inference") guards against the NL wedge's LLM
generation becoming "a runaway cost center." Its 2026-06-05 wording proposed
four mechanisms; three are already settled or shipped by the time #9 is built:

- **"constrain to small single-shot drafts"** — done in ADR-0011 (single-shot
  structured outputs, no agentic loop; `max_tokens=4096`, bounded timeout).
- **"the human verify step (#5) bounds spend"** — settled in ADR-0012/0013
  (one draft → one verdict, no auto-iteration).
- **"cache common intents"** — never built; reconsidered here.
- **"cap per-user draft volume"** — never built, and it collides head-on with
  ADR-0007, which decided the wedge must not be gated on idea *throughput*.

So the real question #9 settles is narrow: **what cost bound is left to add,
given the wedge's frictionless-throughput promise (ADR-0007) forbids the
obvious throttle?** The cost center being bounded is the **Strategy drafter**
(the LLM call), not the backtest — backtest cost is already governed by
ADR-0007 (history depth) and ADR-0005 (version dedup).

## Decision

**The drafter is cost-bound by two things only: a flat per-user *anti-abuse*
ceiling kept deliberately outside `PLAN_LIMITS`, and per-request token
observability. Drafting is never a monetization gate, and the LLM layer is
not cached.**

1. **A flat, anti-abuse ceiling — not a paid lever.** The drafter endpoint
   (`POST /strategies/draft-from-nl`) carries a per-user rate limit reusing
   the existing `auth.py:_check_rate_limit` pattern: a **Redis fixed-window
   counter keyed on `user.id`, fail-open** if Redis is down. The limit is a
   single flat value (`strategy_drafter_max_per_window` /
   `_window_seconds`, default 30 / 3600), **identical across free/pro/premium
   and deliberately NOT in `PLAN_LIMITS`**. Keeping it off the `PLAN_LIMITS`
   surface is the whole point: ADR-0007 made depth the monetization axis and
   ruled throughput out, so a draft throttle that lived next to
   `max_backtests_per_day` would invite exactly the "monetize drafts" drift
   ADR-0007 forbids. The threat model is a scripted-abuse account, not a paying
   customer.

2. **Every request that reaches the LLM counts; a repair counts as one.** The
   counter increments on entry to the drafter call, so `success`, `declined`,
   *and* infra-failure all decrement the window (all burn tokens). A repair
   pass (ADR-0015) is part of the same request, so a draft-plus-repair is
   **one** unit against the ceiling — the user-facing limit is not coupled to
   the internal `max_repairs` mechanism. The `disabled` short-circuit and the
   `StubStrategyDrafter` (no-key) path cost nothing and do not count; in a
   validly-configured deployment `enabled=true` implies a key is present
   (startup validation, ADR-0011 §5), so "enabled but stub" cannot occur.

3. **Tripping the ceiling returns HTTP 429.** ADR-0011 partitions the
   endpoint contract — `outcome` (`success`/`declined`/`disabled`) carries
   *generation* results; a non-200 carries a *serve* failure (503 for infra).
   A rate-limit is a client-caused serve condition, so **429** is its correct
   semantic, parallel to the existing 503 path, with an honest retryable
   message ("drafting faster than we allow right now — try again shortly"). It
   is not folded into the 200 `outcome` union.

4. **Token observability, tokens not dollars.** The drafter surfaces usage via
   `instructor`'s `create_with_completion`; usage flows up the seam as a
   provider-neutral `TokenUsage`, is summed across the draft + any repair call
   in `draft_and_repair`, and the endpoint emits **one structured log line per
   request** (input/output tokens, model, provider, resolution, repair_count)
   beside the existing `strategy_draft_resolution` line. **No DB table** (YAGNI,
   write amplification) and **no in-code price map** — raw tokens + model are
   logged and dollars are computed in the log/BI layer, because prices change
   and ADR-0011 makes the model swappable. This is what makes "predictable unit
   economics" measurable rather than asserted.

5. **No caching at the LLM layer.** The backlog's "cache common intents" is
   rejected: NL text is free-form, so an exact-match cache hits ~never; a
   semantic (embedding-similarity) cache would return *another user's* graph
   for a "similar" idea, breaking the "adjudicate **my** idea" faithfulness
   promise ADR-0015 was built to protect; and ADR-0005's content-dedup already
   caches the *expensive* downstream cost (the backtest) whenever two drafts
   compile to the same graph.

## Consequences

**Positive:**
- The wedge's frictionless-throughput promise (ADR-0007) and the cost bound
  stop fighting: drafting is unthrottled for any real user, while a script is
  capped per account and every token is visible.
- Cost becomes observable per request without new infrastructure, so the
  ceiling can be tuned from evidence rather than guessed.
- The trust/faithfulness regime (ADR-0015) is preserved — no cache can serve a
  user a graph they did not ask for.

**Negative / non-obvious:**
- **The draft limit is intentionally NOT in `PLAN_LIMITS`.** A future engineer
  will look for it there (where every other limit lives) and not find it. This
  is deliberate, not an oversight: drafting is anti-abuse-throttled, never
  monetized.
- **A reader will be tempted to add the cache the backlog asked for.** This ADR
  exists partly to stop that; the cache is a faithfulness hazard, not a missing
  feature.
- **The 30/hr default could brush a power-user** in a fast demo loop
  (ADR-0013), returning a 429 on the wedge's core motion. It is env-tunable;
  the mitigation is to raise the value if post-launch telemetry (especially
  under the #7 A/B) shows real users hitting it.

## Alternatives considered

- **Per-tier draft quota inside `PLAN_LIMITS`** (e.g. `max_drafts_per_day`).
  Rejected: plants a throughput lever in the exact structure ADR-0007 said the
  wedge must not be gated by, inviting a "monetize drafts" drift.
- **No cap at all** (rely on single-shot + `max_repairs` + the verify step).
  Rejected: bounds *per-request* cost but leaves a scripted account free to make
  unlimited requests, and leaves spend invisible.
- **Count only successful drafts against the ceiling.** Rejected: lets a user
  burn unlimited tokens on garbage prompts that always `decline`, defeating the
  bound.
- **Count each LLM call (draft + each repair) separately.** Rejected: couples
  the user-facing limit to the internal `max_repairs` mechanism the user cannot
  see, and re-opens ADR-0015's cost framing.
- **Exact-match or semantic cache on NL text.** Rejected: ~zero hit rate on
  free-form prose (exact), or a direct faithfulness hazard (semantic); the
  expensive backtest is already deduped by ADR-0005.
- **A new DB table of per-draft cost records.** Rejected: a migration plus a
  write on every draft and a price column that goes stale — more than #9's "see
  the spend" need requires.
- **Token-bucket / `slowapi` for the limiter.** Rejected: a new dependency and
  pattern for a coarse ceiling we hope never bites; the proven fixed-window
  `auth.py` pattern is the KISS fit.
