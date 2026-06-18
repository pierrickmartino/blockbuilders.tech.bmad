# ADR-0010 — "What you just learned" retention A/B: scope, mechanism, and metrics

- **Status**: Accepted
- **Date**: 2026-06-09
- **Related**: [CONTEXT.md](../../CONTEXT.md) — What-you-learned card,
  Narrative card, Activation, results_viewed;
  [ADR-0008](./0008-activation-is-first-result-viewed.md) — activation is the
  first verdict *viewed*; [ADR-0009](./0009-activation-drop-off-cohorts.md) —
  activation drop-off cohorts; `docs/ACTIONS.md` #3 (the backlog item this
  resolves), #12 (felt-severity narrative), #19 (coaching loop)

## Context

ACTIONS #3 (`[P0 · S]`) proposes split-testing return-rate and
second-backtest-rate for users who see "the narrative card" versus those who
don't, "using the existing `showFirstRunExplanations` flag." Grilling the plan
against the code surfaced that almost every concrete noun in that sentence is
wrong or ambiguous:

1. **`showFirstRunExplanations` does not exist in code.** The string appears
   only in `docs/ACTIONS.md` and `docs/product/product.md`. The card the
   backlog wants to test is gated by `showSummaryCard`
   (`frontend/src/app/(app)/strategies/[id]/backtest/page.tsx`), which is
   `user.has_completed_onboarding && !getSummaryCardSeen()`, where
   `getSummaryCardSeen()` reads the per-device localStorage key
   `bb.first_run_summary_card_seen`. That is a first-run gate, **not** an
   experiment-assignment mechanism — today every onboarded first-run user
   sees the card, so there is no holdout arm to compare against.
2. **"The narrative card" is two different components.** The
   `WhatYouLearnedCard` (first-run-only, frontend-computed strategy-vs-
   buy-and-hold delta) is distinct from the `NarrativeCard` (always-on,
   backend-generated prose from `backend/app/backtest/narrative.py`). The
   backlog conflates them.
3. **The boolean flag helper can't run an experiment.** `getFeatureFlag()`
   (`frontend/src/lib/feature-flags.ts`) returns `false` whenever analytics
   consent is not `"accepted"` or PostHog hasn't resolved the flag — collapsing
   "no consent", "not ready", and "assigned to control" into one value.

## Decision

Run the A/B as a **PostHog experiment that manipulates only the
`WhatYouLearnedCard`**, layered on the existing first-run localStorage gate,
measured off existing activation events.

1. **Mechanism.** A PostHog experiment flag (`wjl_retention_ab`) is read via a
   new *variant-aware* reader returning `"control" | "test" | undefined`
   (distinct from the boolean `getFeatureFlag`, which stays for the
   `canvas_flag_*` flags). Assignment is keyed to the identified `user.id`
   (`posthog.identify` runs at auth, ADR-0008), so it is per-user and sticky.

2. **Scope: `WhatYouLearnedCard` only.** The always-on `NarrativeCard` stays
   on in **both** arms. Withholding it would be a far larger product change and
   would confound the test. Consequence (see below): the experiment measures
   the *incremental* value of the What-you-learned card **on top of** the
   existing narrative — not the broader severity-as-retention thesis.

3. **Unenrolled users default to seeing the card.** `undefined` (declined
   consent, PostHog not ready, flag unresolved) → render the card, preserving
   today's behavior and avoiding a silent UX regression for the
   privacy-conscious users ADR-0008 protects. Only consented users with a
   resolved variant are split; the analyzed population is consenting users,
   consistent with ADR-0008's canonical-rate stance.

4. **Metrics (no event-schema change).**
   - **Primary — second-backtest-rate:** the user has **≥ 2 distinct
     `run_id`s** with a `results_viewed` within 7 days of enrollment. Distinct
     run_ids (not raw event count) because the in-memory `results_viewed`
     dedup resets on reload. View-based, consistent with ADR-0008.
   - **Secondary — 7-day return-rate:** ≥ 1 `page_view` on a calendar day
     after the enrollment day, within 7 days.
   - PostHog joins both to the experiment via the flag-exposure event, so the
     `results_viewed` / `page_view` payloads are untouched.

5. **Enrollment.** The variant is read **only** at the first benchmark-present
   completed verdict (the card's true eligibility:
   completed + non-zero-trade + `summary` + `showSummaryCard` +
   `benchmark_return_pct != null`). Both arms close the first-run gate
   (`markSummaryCardSeen()`) at that moment, so enrollment is a symmetric,
   once-per-user, run-#1 anchor and the card becomes **show-once** (a
   deliberate change from today's persist-until-dismissed behavior).

6. **Decision rule.** 50/50, two-sided at 95% / 80% power on the primary, with
   PostHog's calculator setting duration from the live baseline. **Activation
   rate is a flat guardrail** — `results_viewed` fires independently of the
   card, so any movement signals a bug, not an effect. Three-way ship rule:
   **positive & significant** → keep the card for all, greenlight #12/#19;
   **null** → keep the card (cheap, harmless) but do *not* greenlight #12/#19
   on this evidence; **negative** → remove the card.

## Consequences

- **A null result is bounded in meaning.** Because `NarrativeCard` is present
  in both arms, a null kills only the *incremental* value of the
  What-you-learned card — **not** the severity-as-retention thesis behind #12
  and #19. This guard must travel with the result, or a reader will wrongly
  cancel the narrative roadmap. Testing the full thesis (withhold both cards)
  is a separate, larger experiment, out of scope for a `[P0 · S]`.
- **Primary metric reinterprets the backlog.** #3's prose foregrounds "return
  visits"; we make second-backtest-rate primary (the loop that actually funds
  #12/#19) and demote return-rate to secondary. Both remain measured.
- **Card becomes show-once.** Closing the first-run gate at enrollment for both
  arms changes the existing persist-until-dismissed behavior. Accepted for a
  clean, symmetric enrollment anchor.
- **`docs/ACTIONS.md` and `docs/product/product.md` still name a phantom
  flag.** `showFirstRunExplanations` should be corrected to point at the real
  gate when those docs are next touched.

## Alternatives considered

- **Reuse a raw localStorage boolean as "the flag."** Rejected: gives no
  randomized, identity-stable assignment and no server-side experiment
  analysis.
- **Gate the card on the boolean `getFeatureFlag`.** Rejected: silently drops
  the card for non-consenting users and pollutes the control arm with
  "no consent / not ready" users.
- **Manipulate both cards (or the `NarrativeCard`).** Rejected for a
  `[P0 · S]`: a much larger product change that withholds the always-on
  verdict; retained as a possible future full-thesis experiment.
- **Primary = pure return-rate.** Rejected as primary: a lone `page_view` is a
  weak product signal versus re-running the test loop; kept as the secondary.

## Amendment (2026-06-15) — #12 felt-severity lands *before* #3, in the tested card

ACTIONS #12 ("sharpen the narrative into *felt* severity") was originally gated
**downstream** of this experiment: the Decision §6 ship rule greenlights #12/#19
only on a **positive** #3 result. Grilling #12 against the code reversed that
ordering for #12 (only). #3 is implemented but **not yet live**, so no enrollment
is in flight to confound — and the strongest version of the card to test is the
*already-sharpened* one. We therefore land #12 in **both** result cards now, and
#3, when launched, tests the sharpened card against the holdout.

What this changes about the experiment:

1. **The manipulated variable is the sharpened What-you-learned card.** Its
   delta vs buy-and-hold is now expressed in **dollars** (felt severity), not
   percentage-points only. Enrollment, metrics, and the 50/50 mechanism are
   unchanged — only the card's *content* is richer.
2. **The held-constant Narrative-card baseline is also sharpened**, but stays
   **on in both arms**, so #3 still isolates the *incremental* value of the
   What-you-learned card on top of the narrative. The baseline is simply a
   better narrative in both arms; the contrast the experiment measures is intact.
3. **#12's greenlight clause in §6 is void; #19's still stands.** #12 is no
   longer evidence-gated on #3. #19 (coaching loop) remains gated on a positive
   result.

Felt-severity design decisions that interact with this experiment (full content
spec lives with the #12 work, summarised here because they touch the tested
surfaces):

- **New content = the buy-and-hold delta in dollars.** `felt_delta_usd =
  final_balance − initial_balance·(1 + benchmark_return_pct/100)`. The absolute
  dollar outcome was already in `narrative.py`; only the *vs-holding* delta was
  pp-only.
- **Four loss-aware regimes** keyed on delta sign × the strategy's own P/L:
  up/+ → "made you $X more than holding"; up/− → "cost you $X versus holding";
  down/+ → "saved you $X — it lost less than holding would have"; down/− → "cost
  you $X more than holding".
- **Backend Narrative card stays flat prose** (gains the dollar sentence,
  uncolored) — **no `BacktestSummary` shape change**. Coloring lives only in the
  What-you-learned card, which already renders green/red natively (avoids an API
  change mid-experiment and the `dangerouslySetInnerHTML` XSS path).
- **Absent-benchmark guard, no schema change.** The engine collapses "no
  benchmark" to `(0.0, 0.0, 0.0)`, so a missing benchmark is indistinguishable
  from a genuine 0% one. The dollar clause is emitted **only inside the
  outperform/underperform branches** (`|alpha| > 0.05`; frontend mirrors with its
  existing `|delta| < 1` small-band), so an absent benchmark (`alpha == 0`) lands
  on-par and **never** prints a dollar figure. This prevents the dollar delta
  from becoming a confident fabrication.
- **Known out-of-scope gap (not amplified):** with an absent benchmark the
  existing prose still claims "performed on par with buy-and-hold" — a latent
  honesty gap belonging to the trust moat (#10 / ADR-0017), not fixed here. #12
  deliberately does not *add* a dollar figure to that false claim.

## Amendment (2026-06-18) — #19's gate re-scoped from *build* to *prominence*

The §6 ship rule gated #19 (the coaching loop) on a **positive** #3 result,
and the 2026-06-15 amendment, while un-gating #12, explicitly kept "#19
(coaching loop) remains gated on a positive result." Grilling #19 against the
code (see [ADR-0024](./0024-tweak-coaching-is-deterministic-comparative-attribution.md))
reframed what #19 *is* and reverses the **build** half of that gate, while
keeping a **prominence** gate.

Why the original gate over-reached for #19:

1. **Different mechanism, independent thesis.** #19 turned out to be **Tweak
   coaching** — a *deterministic, comparative, diff-attributed* explanation of
   why a re-tested **Strategy version** differs from an earlier one — not more
   severity narrative. Its justification is the Eureka/literacy thesis (it
   feeds #15), which a null #3 (the *incremental* value of the severity card on
   top of the always-on narrative) does **not** falsify. The §6 ship rule's own
   "null result is bounded in meaning" consequence already says a null kills
   only the What-you-learned card's increment, not the broader thesis.
2. **It cannot confound #3.** Unlike #12 (which lands *inside* the tested
   What-you-learned card), Tweak coaching lives on the **compare surface** and
   is **not a variable in the #3 experiment**. Building it while #3 is in flight
   changes nothing the experiment measures.
3. **It is self-contained and engine-trusted.** Deterministic, server-side, and
   behind the existing flag infrastructure — buildable without touching the
   verdict path or the experiment.

What this changes:

- **Build gate → removed.** #19 may be designed and built now (it is —
  ADR-0024).
- **Prominence gate → retained, relaxed to non-negative.** Making "Explain this
  delta" a loud, default affordance waits until #3 reads **non-negative**. A
  *negative* #3 (the severity card actively *hurts* retention) is the one signal
  that should give us pause about adding more post-result content; a null is not.
- This mirrors the move the 2026-06-15 amendment made for #12 (un-gate via
  amendment with explicit reasoning), applied to #19's build step only.
