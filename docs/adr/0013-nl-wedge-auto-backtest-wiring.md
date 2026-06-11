# ADR-0013 — Wiring the NL wedge into the auto-backtest: client-orchestrated, navigate-into-running

- **Status**: Accepted
- **Date**: 2026-06-11
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Strategy drafter, Working
  copy, Strategy version, Backtest, Activation, results_viewed, Entry path;
  [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md) — the wedge creates new
  strategies and auto-backtests every draft (lifecycle);
  [ADR-0011](./0011-strategy-drafter-nl-to-graph-generation.md) — NL→graph
  generation stops *before* the auto-backtest, "nothing partial persists";
  [ADR-0012](./0012-nl-wedge-review-surface.md) — the post-backtest review
  surface (§9 names the running→verdict landing and the #6 dependency);
  [ADR-0008](./0008-activation-is-first-result-viewed.md) — Activation is the
  first verdict viewed; [ADR-0005](./0005-working-copy-separate-from-versions.md)
  — a backtest freezes an immutable version; `docs/ACTIONS.md` #6 (this item),
  #4/#5 (prerequisites), #7 (the A/B that depends on cohort comparability).

## Context

ACTIONS #6 is the wire between the drafter (#4, ADR-0011) and the review
surface (#5, ADR-0012): after a natural-language draft succeeds, the user
must reach a *completed backtest* in one continuous motion, "ending on the
result/narrative." ADR-0011 deliberately stops at generation (NL → validated
working copy → `strategy.id`, "nothing partial persists"); ADR-0012 §9
deliberately depends on this item ("you cannot accept/reject a verdict that
does not exist") and names the target state — "land on the result page in a
running → verdict state" — but does not record *how* the auto-backtest is
triggered or *why* it is orchestrated the way it is.

The backlog wording — "reuse the existing wizard auto-save + auto-backtest
flow" — is imprecise. The wizard (`strategy-wizard.tsx`) auto-backtests
**only on `isFirstRun`**, and it **polls in-dialog** (a modal spinner with
rotating messages) before navigating to an already-completed run. The wedge
needs an auto-backtest on **every** draft and a different landing motion.
ADR-0006 §Consequences already flagged the first gap ("the auto-backtest path
is extended, not reused verbatim"); this ADR records the orchestration.

## Decision

**The wedge's auto-backtest is orchestrated client-side from the draft page,
which enqueues the run and immediately navigates into the result page's own
running → verdict poller. The drafter endpoint stays generation-only.**

Concretely:

1. **Client-orchestrated, on the draft page.** After `draftFromNl` returns
   `outcome: "success"`, the draft page calls `BacktestsApiClient.create` and
   then `router.push('/strategies/{id}/backtest?run={runId}')`. The drafter
   endpoint is **not** extended to enqueue the backtest: ADR-0011 scoped it to
   generation with a clean three-outcome contract ("nothing partial
   persists"), and folding a backtest enqueue into it would muddy that
   boundary and its failure taxonomy. Backtest orchestration already lives on
   the client for the wizard; the wedge joins it there.

2. **Navigate-into-running, not poll-in-place.** The wedge navigates to the
   result page *immediately* while the run is still `pending/running`, and the
   result page's existing poller (`useBacktestResults` + the `hasActiveRuns`
   interval) drives running → verdict in place. This is a **deliberate
   divergence** from the wizard's in-dialog poll-then-navigate: it is the state
   ADR-0012 §9 named, it reuses the result page's existing polling /
   `?run=` preselect / `results_viewed` / review-control plumbing with no new
   poller, and it makes the verdict feel computed in front of the user — the
   right feel for the wedge's rapid-fire "throw an idea, watch it resolve"
   loop. The two auto-backtest paths intentionally differ; they must not be
   "unified."

3. **One year, shared with the wizard.** The auto-backtest window is
   `yearAgo → now`, identical to the wizard's. The window is a **cohort-
   comparability invariant**, not a cosmetic default: the activation funnel
   and Time to activation (CONTEXT.md) slice `wizard` vs `nl_wedge` (ACTIONS
   #2/#7), and a different window would run different data and quietly bias the
   very A/B the wedge exists to win. Asset and timeframe come from the created
   Strategy (set at draft time), not a second source.

4. **A single `startAutoBacktest` helper owns the window + start telemetry.**
   Because the 1-year window is a comparability invariant, it must be one fact,
   not a literal duplicated across the wizard and the wedge. A small shared
   helper computes the window, calls `BacktestsApiClient.create`, and fires
   `auto_backtest_started` (`source` + `resolveCohort(entryPath)`). The wizard
   is routed through it but keeps its own poll loop; **the wizard's `isFirstRun`
   gating is unchanged** — only the enqueue mechanics are shared, not *when*
   the wizard fires.

5. **Enqueue-failure lands on the result page anyway.** By the time the draft
   page sees `success`, the Strategy is already persisted and marked
   under-review. If `BacktestsApiClient.create` then fails, the page still
   navigates to the result page (without `?run=`) and surfaces a toast. That
   keeps the degraded path on the surface that owns the whole review lifecycle
   (ADR-0012): the user runs it manually, it completes, and Accept/Edit/Reject
   appear exactly as in the happy path. Stranding the draft on the draft page,
   or dropping it on the canvas (which hosts no decision controls, ADR-0012
   §2), would leave an under-review strategy with no way to dispose of it.

6. **No new running-state UI.** #6 reuses the result page's existing
   running state verbatim; provenance is already signalled by the
   `AiDraftedBadge` (a projection of `entry_path = nl_wedge`). A richer
   running-state affordance, if wanted, is a #5 (review-surface) follow-up, not
   part of this wire — keeping ADR-0012's surface partition (banner on the
   canvas, controls on the result page) intact.

Telemetry: fire `auto_backtest_started` on enqueue; **do not** fire
`auto_backtest_completed` from the draft page — it has navigated away, and the
result page's `backtest_completed` poll-transition plus the canonical
`results_viewed` (Activation, ADR-0008) already cover completion.

## Consequences

**Positive:**
- The drafter endpoint keeps ADR-0011's clean generation-only contract; the
  auto-backtest reuses proven client + result-page plumbing with no new poller.
- The shared window makes `wizard`/`nl_wedge` verdicts and latencies
  comparable, protecting the #7 A/B from silent bias.
- The degraded path still resolves through the real review surface, so the
  disposition flow is coherent even when the enqueue fails.
- ADR-0005/0006 invariants hold for free: the auto-backtest freezes a version,
  so "strategy + working copy + frozen version + backtest run all exist" by
  verdict time, and the validator-clean graph (ADR-0011 §8) means #6 cannot
  produce a broken first impression.

**Negative / non-obvious:**
- **Two auto-backtest paths now diverge on purpose** (wizard poll-in-place vs
  wedge navigate-into-running). A reviewer tempted to "merge the two flows"
  would break either the wizard's onboarding spinner or the wedge's continuous
  motion — this divergence is deliberate.
- The wedge lands on the **full backtest page mid-run**, denser than the
  wizard's focused spinner. Accepted as scoped; richer running UX is a #5
  follow-up.
- ACTIONS #6's "reuse the wizard flow" wording is stale on two points
  (poll-in-place, `isFirstRun`); a reader trusting the backlog over this ADR
  would build the wrong motion.

## Alternatives considered

- **Backend enqueue inside the drafter endpoint** (return `strategy_id` +
  `run_id`). Rejected: couples generation and execution, reopening ADR-0011's
  single-responsibility, "nothing partial persists" contract and its failure
  taxonomy.
- **Poll-in-place like the wizard** (modal spinner, navigate after
  completion). Rejected: duplicates a bespoke poller, contradicts ADR-0012
  §9's named running→verdict landing, and hides the verdict behind a black-box
  modal — wrong for the rapid-fire wedge loop.
- **Enqueue from the result page on arrival.** Rejected: scatters the trigger
  and makes "did we already enqueue?" a stateful, racy check.
- **A shorter window (e.g. the result page's 180-day default).** Rejected:
  breaks `wizard`/`nl_wedge` cohort comparability for the #7 A/B.
- **Inline the enqueue, duplicating the 1-year literal.** Rejected: lets the
  comparability invariant drift between two files; the shared helper makes the
  window one fact.
- **Enqueue-failure stays on the draft page / routes to the canvas.** Rejected:
  strands an under-review strategy away from the surface that can dispose of it
  (the canvas hosts no decision controls, ADR-0012 §2).
