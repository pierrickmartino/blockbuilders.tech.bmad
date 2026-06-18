# ADR-0024 — Tweak coaching is deterministic, comparative, diff-attributed explanation

- **Status**: Accepted
- **Date**: 2026-06-18
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Tweak coaching, Strategy
  diff, Comparison run, Strategy version, Working copy, Activation,
  Narrative card; [ADR-0004](./0004-position-manager-owns-position-not-account.md)
  (single open position → the path-dependence this design must respect);
  [ADR-0010](./0010-what-you-learned-retention-ab.md) §6 + its 2026-06-18
  amendment (the #19 ship gate, re-scoped); [ADR-0012](./0012-nl-wedge-review-surface.md)
  / [ADR-0013](./0013-nl-wedge-auto-backtest-wiring.md) (the navigate-into-running
  poller this reuses, and the "there is no diff" framing this case
  *inverts*); [ADR-0016](./0016-nl-wedge-cost-bound-anti-abuse-not-monetization.md)
  (cost-bounding ethos applied to Comparison runs);
  [ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md) (the
  verification/trust moat this design must not breach);
  [ADR-0021](./0021-performance-alert-inherits-engine-trust.md) (alert-pinning,
  which Comparison runs are walled off from); `docs/ACTIONS.md` #19 (this
  item), #15 (the literacy track this feeds), #20 ("never a tip").

## Context

ACTIONS #19 ("Polish the tweak-and-re-test loop") reads as a greenfield
pair: "side-by-side run comparison plus plain-English 'why your idea
underperformed' coaching." Grilling the plan against the code shows the
first half **already ships** end-to-end: `POST /backtests/compare`
(`backend/app/api/backtest_compare.py`, 2–4 runs, aligned metrics +
equity curves), the full compare page
(`frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx`, a
12-metric table with best-value highlighting and overlaid equity
curves), the run-selection UI (`BacktestRunsList`, `AllRunsDrawer`), and
the Trust-page link per ADR-0017. CONTEXT.md already names this the
compare surface.

The unmet half is the **interpretation layer**: the compare table shows
numbers side by side but never *explains the delta*. `narrative.py`
produces a single-run verdict; `explanation.py` produces per-trade
*what-happened* exit reasons ("Stop loss hit at $X"). Neither says *why
the re-test changed the result* ("your tighter stop exited before the
recovery"). So #19 collapses to one new thing — **Tweak coaching** — and
its whole risk is that "why you underperformed" is a **causal claim**,
and deterministic causal attribution is only sometimes legitimate.

Two structural facts from the code constrain any honest answer:

1. **`BacktestRun.strategy_version_id`** links every run to its frozen
   **Strategy version**, so two runs' definition graphs are diffable and
   their trade blobs (`trades_key`) are loadable — comparative
   attribution is *tractable*.
2. **`PositionManager` owns a single open position** (ADR-0004), so exit
   timing is **path-dependent**: changing a stop changes when capital
   frees, which changes which *later* entries are even possible. "Same
   entries, just different exits" is false beyond the first divergence.

## Decision

**Tweak coaching is a deterministic, comparative, diff-attributed
explanation of why one Strategy version's backtest differs from an
earlier version's — diagnostic, never advisory — surfaced via an
"Explain this delta" action on the existing compare surface.** It asserts
a *cause* only where the controlled experiment makes the cause
deterministically provable, and otherwise *describes*.

1. **Eligibility.** A coachable pair is two runs of the **same**
   `strategy_id`, asset, timeframe, and cost params, differing in
   `strategy_version_id`. The test window **may differ** — we restrict to
   the **intersection** of the two windows, which *removes* (not
   introduces) the window confound by forcing both versions onto the same
   candles. Different strategy / same version / sub-floor overlap → no
   coaching (§7).

2. **Intersection via engine re-run, not slicing.** When the windows
   differ we **re-run both versions over the intersection through the
   real engine** (a **Comparison run**), rather than post-hoc slicing the
   stored equity curves/trades. Re-running from the same `initial_balance`
   over identical candles makes every number engine-truth and **dissolves
   all slicing hazards** — equity rebasing, straddling trades, and
   path-dependent starting state simply do not arise. *Rejected:* slicing
   stored results (cheap and instant, but a re-derivation whose numbers
   deliberately diverge from the engine numbers in the table above them —
   an avoidable collision with the ADR-0017 trust moat). An
   already-aligned pair (windows match) is coached directly with **no**
   re-run; the re-run is the conditional, cost-bearing branch only.

3. **Comparison runs are walled-off byproducts.** A Comparison run is
   tagged `triggered_by='comparison'` (a third value beside
   `manual`/`auto`) and is **excluded from the mainline run history, from
   Activation (it never fires `results_viewed`), and from alert-pinning
   (ADR-0021)** — it is an experiment artifact like an `auto`
   re-backtest, not a user run. Leaving it untagged would inflate the
   activation north-star and clutter history.

4. **Two tiers gated on the Strategy diff.** The **Strategy diff** (a new
   deterministic *semantic* diff of the two `definition_json` graphs:
   per-block param changes, block add/remove, connection changes, each
   block classified risk-block vs structural) decides which tier applies:
   - **Tier 1 — causal — iff *every* change is a risk-block *param*
     edit** (no block add/remove, no connection change, no
     `indicator`/`logic`/`signal` block touched). Then the entry/exit
     **signals are byte-identical**, so trades match by `entry_time` into
     three buckets — **matched** (same entry in both → the exit genuinely
     differs → airtight per-trade claim), **A-only** / **B-only** (the
     capital-availability side-effect of the changed exit timing). Each
     matched exit difference **self-attributes** to a specific risk knob
     via its `exit_reason` (an `sl` exit → the stop change; an earlier
     `tp` → the take-profit change), so even *multiple* risk-param changes
     stay attributable.
   - **Tier 2 — descriptive — for any structural change** (or any block
     add/remove, *including* of a risk block, since that changes whether
     an exit path exists at all). Show the change-list + the
     engine-computed net delta + set-level facts ("12 trades vs. 9"), with
     an explicit *no-attribution* disclaimer. **No** trade pairing, **no**
     `exit_reason` routing, **no** causal claim.

5. **Observed-not-speculated invariant.** Tier 1 **never** speaks in
   counterfactuals ("would have recovered"). Because (ii) gives us two
   *real* runs, it reports the counterpart run's **actual** outcome:
   "your tighter stop exited this trade at −1%; the same entry closed at
   +4% under your previous stop." The net engine delta is always the
   source of truth; the bucket narrative must **reconcile** to it, never
   replace it.

6. **Catalogue.** Rich coaching for the four **exit-timing** risk blocks
   (`stop_loss`, `take_profit`, `trailing_stop`, `time_exit`) — the ones
   that reshape the buckets. One-liners for `position_size` (mechanical
   scaling; nuance: it can interact with the equity-based `max_drawdown`
   kill-switch) and `max_drawdown` (kill-switch moved). Aggregate-first
   ("4 trades exited early, −6pp net"); per-trade specifics reuse the
   existing `TradeDrawer`, not a new list.

7. **Suppression → fall back to the plain compare table.** No diff
   (identical versions); empty or sub-`MIN_OVERLAP_CANDLES` intersection;
   different `strategy_id`; or a failed Comparison run. Each degrades
   gracefully with a plain message; the table (engine numbers) always
   stands.

8. **Shape.** Coaching is computed **server-side** in a deterministic
   `backend/app/backtest/coaching.py` beside `narrative.py` /
   `explanation.py`, consuming both runs' trades + both versions'
   `definition_json`. One endpoint `POST /backtests/coach` with two modes:
   **sync** when the pair is aligned; **enqueue the Comparison runs +
   return a pending token** when windows differ, polled via the existing
   backtest-status poller (ADR-0012/0013 — no new polling infra), then
   re-called. The action is an **explicit, cost-aware** click: when it
   will spend two Comparison runs it first shows a one-line confirm and
   reuses the existing backtest rate limits (ADR-0016). The frontend only
   renders, in a collapsible panel **under** the metrics table (the table
   stays the engine-truth source).

9. **Gate (see ADR-0010 amendment).** ADR-0010 §6 gated #19 on a positive
   #3. Re-scoped to **build now, ship prominently on a non-negative #3**:
   this coaching is deterministic/diagnostic (a different mechanism than
   #3's severity card), independently justified by the Eureka/literacy
   thesis (it feeds #15), and — unlike #12 — is **not a variable inside
   the #3 experiment**, so building it cannot confound the in-flight test.

## Consequences

**Positive:**
- A failed re-test becomes a learning step without leaving the trust
  moat: every cited number is engine-computed, and causation is asserted
  only where it is deterministically provable.
- Re-running over the intersection turns an ambiguous "compare two
  arbitrary runs" into a *controlled experiment*, dissolving the slicing
  hazards entirely.
- The Strategy diff is a reusable semantic seam (candidate substrate for
  future version-history / change-review surfaces).

**Negative / non-obvious:**
- **Coaching is frequently absent or merely descriptive.** Most ad-hoc
  compares a user assembles by hand are multi-change or structural → Tier
  2, or sub-floor-overlap → suppressed. This is the honest cost of not
  fabricating causes; the follow-up "re-test this tweak over a fixed
  window" button (the deferred wiring polish) is the path to making
  eligible pairs *on purpose*.
- **Comparison runs spend real compute** and create rows that must stay
  invisible to history/Activation/alert-pinning. The `triggered_by`
  enum-value and these three exclusions are load-bearing; a future reader
  must not "fix" the missing activation event.
- **The observed-not-speculated invariant is permanent.** Any future
  "would have…" phrasing in coaching is a regression, not a copy tweak —
  it reintroduces the counterfactual the trust moat forbids.
- **Tier-1's per-trade pairing depends on ADR-0004's single-position
  model.** If the engine ever supports concurrent positions, the
  `entry_time` three-bucket match must be revisited.

## Alternatives considered

- **Single-run coaching on the result page** (no comparison). Rejected:
  #19's pain is the *tweak* loop; the canonical insight is comparative.
- **Slice stored results to the intersection** (ii's alternative).
  Rejected: re-derivation that diverges from engine numbers — a trust
  collision — and inherits equity-rebasing/straddle ambiguity.
- **Always re-run, version-anchored surface** (option B). Rejected:
  wastes a re-run when stored runs are already a clean controlled pair,
  and adds a second comparison surface beside the existing one.
- **Broad causal attribution** (assert causes for entry/multi-change
  diffs). Rejected: not deterministically provable → fabrication in the
  verdict path.
