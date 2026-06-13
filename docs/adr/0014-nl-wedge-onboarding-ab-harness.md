# ADR-0014 — The NL-wedge onboarding A/B: wizard is the control, enrolled at the routing fork, analyzed intent-to-treat

- **Status**: Accepted
- **Date**: 2026-06-11
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Onboarding arm, Entry path,
  Authoring mode, Activation, results_viewed, Time to activation;
  [ADR-0008](./0008-activation-is-first-result-viewed.md) — Activation is the
  first verdict *viewed*, consent-gated, keyed to `posthog.identify(user.id)`;
  [ADR-0009](./0009-activation-drop-off-cohorts.md) — `entry_path` /
  `authoring_mode` cohorts and the deferral of the converting-path question to
  this A/B; [ADR-0010](./0010-what-you-learned-retention-ab.md) — the
  variant-aware experiment reader (`getExperimentVariant`), 7-day-return
  definition, and three-way ship-rule template; [ADR-0012](./0012-nl-wedge-review-surface.md)
  / [ADR-0013](./0013-nl-wedge-auto-backtest-wiring.md) — the wedge rides
  `strategy_drafter_enabled` and shares the wizard's 1-year window for cohort
  comparability; `docs/ACTIONS.md` #7 (this item), #1/#2/#4/#5/#6 (prerequisites).

## Context

ACTIONS #7 (`[P1 · S]`) proposes the eval that decides the product's central
bet: does the natural-language wedge beat "the current authoring model" for
*new* users? The backlog frames it as "**NL box vs. blank canvas**" —
"randomize new users between NL-first and blank-canvas-first onboarding;
primary metric is activation lift, secondary is 7-day return."

Grilling that wording against the code surfaced that, as with #5/#6
(ADR-0012/0013), the concrete nouns are stale or under-specified:

1. **New users do not land on a blank canvas.** `auth/callback/page.tsx`
   routes every un-onboarded user to `/strategies?wizard=true`. The authoring
   model a real new user meets today is the **wizard**, so "blank canvas" is
   the wrong control — testing against it would not answer "does the wedge beat
   what we ship today."
2. **The assignment moment fights the metric's consent gate.** ADR-0010's
   experiment enrolls *late* (at verdict render), well after consent resolves
   and PostHog has the flag. #7 must brand the user at the *onboarding fork*,
   which can fire **before** a brand-new user has accepted analytics consent —
   and `getExperimentVariant` returns `undefined` without consent. A naive
   "analyze all consenting users by their current variant" would let
   default-routed users contaminate the control arm (assignment ≠ analysis).
3. **The NL arm has a failure mode the wizard does not.** A draft can fail to
   generate or be unrepairable, so the user never reaches a verdict. How those
   users are counted decides whether the headline number is honest.
4. **"Activation lift" needs pinning** to the ADR-0008 canonical event, and the
   relationship to the `strategy_drafter_enabled` kill-switch (ADR-0012 §9) is
   unstated.

## Decision

**Run #7 as a two-arm PostHog experiment whose control is the wizard, that
enrolls a new user with an explicit exposure event at the `auth/callback`
routing fork, and is analyzed intent-to-treat over consenting users — reusing
the ADR-0010 experiment machinery and the ADR-0008 activation metric
unchanged.**

1. **Control is the wizard; "blank canvas" is stale.** Two **Onboarding arms**
   (CONTEXT.md): `wizard` (status-quo default) vs `nl_wedge` (the NL box). The
   test answers "does the wedge beat the front door we ship today," not the
   literal-but-counterfactual blank canvas. A three-arm wizard/blank/NL test
   was rejected as larger than `[P1 · S]` and as diluting the headline
   NL-vs-status-quo signal.

2. **Assignment: PostHog variant, `undefined → wizard`.** Reuse
   `getExperimentVariant` (ADR-0010) on a new `onboarding_ab` flag, read at the
   routing fork. `undefined` (consent not yet accepted, flag unresolved) routes
   to the wizard, preserving today's behavior — the same "undefined preserves
   status quo" stance as ADR-0010. Assignment is keyed to the identified
   `user.id` (ADR-0008), so it is per-user and sticky.

3. **Enrollment: exposure event at the routing fork, not post-hoc.** A user is
   enrolled only when the variant **resolves at the routing fork**; an explicit
   exposure event captures the arm actually used. Users routed to the wizard by
   *default* (`undefined`) are **not** enrolled and are never folded into
   control, even if they later accept consent. This keeps **assignment ==
   analysis** and is the direct analogue of ADR-0010's verdict-render anchor.
   The analyzed population is therefore consenting users with a resolved variant
   — consistent with ADR-0008's canonical-rate stance.

4. **Analysis: intent-to-treat.** Enrolled users are analyzed by their
   *assigned* arm regardless of what they click afterward (an NL-arm user who
   abandons the box and builds on the canvas still counts as NL). The
   **Onboarding arm** is the assigned surface; the existing `entry_path`
   records the realized surface — they are deliberately distinct (CONTEXT.md).

5. **Metrics (no event-schema change).**
   - **Primary — activation rate:** ≥ 1 `results_viewed` per enrolled user
     (ADR-0008), arm vs arm, measured from the routing-fork enrollment.
   - **Secondary — 7-day return-rate:** ≥ 1 `page_view` on a calendar day after
     the enrollment day within 7 days (verbatim ADR-0010).
   - **Secondary — Time to activation from enrollment:** PostHog-native
     time-to-convert from **routing-fork enrollment** to first `results_viewed`.
     Deliberately *not* the canonical **Time to activation** of
     `CONTEXT.md` / ADR-0009, which is anchored at `signup_completed`; this one
     is anchored at enrollment (the post-signup routing fork), so it is a
     distinct metric and is named distinctly to keep the two dashboards from
     colliding. Diagnostic, never the headline — a faster path that activates
     fewer people is the worse bet.

6. **Failure handling preserves ITT.** **Infra-only** failures — the user was
   never genuinely exposed (NL box never rendered, app/PostHog outage) — are
   excluded and ideally never enroll. **Drafter failures** — the box rendered,
   the user typed, generation failed or produced an unrepairable graph — are
   **kept** in the NL arm's denominator as non-activations: they are the
   wedge's real reliability cost, and the wizard has no equivalent. Excluding
   them would launder that cost and violate the ITT decision (4).

7. **Flag topology: drafter is a precondition and a true abort.** Two distinct
   flags: `strategy_drafter_enabled` (boolean emergency stop, ADR-0012 §9) and
   `onboarding_ab` (the variant). The experiment enrolls only where the drafter
   is on. Pulling the kill-switch **stops new enrollment and ends the
   experiment**; it must **not** silently re-route in-flight NL-arm users to the
   wizard, which would contaminate ITT. The two flags are never folded into one.

8. **Ship rule: 50/50, two-sided 95% / 80% power on activation rate**, with
   PostHog's calculator setting duration from the live baseline. Three-way,
   pre-committed: **positive & significant** → NL-first becomes the default
   front door for new users and the roadmap points at deepening the wedge;
   **null** → keep the wizard as default, NL stays available but is *not*
   promoted to the front door and further wedge-deepening is not greenlit on
   this evidence; **negative** → keep the wizard, NL demoted to an opt-in
   surface. Guardrails are operational: a **sample-ratio-mismatch** check
   (catches assignment/consent-skew bugs) and the **drafter cost/error rate**
   (ADR-0011 §9 cap). Activation cannot be a guardrail here — it is the primary.

9. **Prerequisites; GA not required.** #7 switches on once: the wedge is
   functional end-to-end behind `strategy_drafter_enabled` (#4/#5/#6,
   ADR-0011/0012/0013); the `results_viewed` activation metric is live and
   trustworthy (#1, ADR-0008); and `entry_path` stamping is shipped (#2,
   ADR-0009) so NL-arm and wizard-arm strategies are cohort-comparable (same
   1-year window, ADR-0013 §3). The wedge does **not** need to be GA — the
   experiment runs behind the flag and its win is precisely what earns the
   GA / front-door promotion.

Out of scope: a three-arm test; any change to the `results_viewed`,
`page_view`, or `nl_draft_*` event schemas; promoting the **Onboarding arm**
to a stored column (it is a PostHog-side assignment, like `wjl_retention_ab`).

## Consequences

**Positive:**
- The test measures the wedge against the front door we actually ship, so a
  win/loss maps directly onto a roadmap decision.
- Reuses ADR-0010's `getExperimentVariant`, ADR-0008's activation event, and
  ADR-0013's shared 1-year window — keeping #7 a genuine `[P1 · S]` with no new
  metric and no schema change.
- Routing-fork enrollment + ITT keeps assignment == analysis, so the headline
  number is not contaminated by consent-timing defaults.

**Negative / non-obvious:**
- **ACTIONS #7's title is wrong** ("blank canvas"); a reader trusting the
  backlog over this ADR would build the wrong control arm.
- **The experiment population is consenting users only**, and pre-consent users
  are excluded rather than defaulted-into-control. This is a *known, bounded*
  bias (the same one ADR-0008 accepts for the north-star), not a silent one —
  watch the SRM guardrail for leakage.
- **Drafter failures count against the NL arm by design.** A reviewer expecting
  "technical failures excluded" should know this is deliberate: the wedge's
  reliability is part of what is being tested.
- **The kill-switch is an experiment-ending abort, not a graceful per-user
  fallback.** Tripping it mid-run forfeits the in-flight cohort rather than
  biasing it.

## Alternatives considered

- **Control = blank canvas (literal title).** Rejected: not the status quo, so
  the result would not say whether the wedge beats what new users get today.
- **Three arms (wizard / blank canvas / NL).** Rejected: larger than `[P1 · S]`,
  needs more traffic, and dilutes the headline NL-vs-status-quo signal.
- **Analyze all consenting users by their current variant (no exposure
  anchor).** Rejected: default-routed users contaminate control; assignment ≠
  analysis.
- **Server-side deterministic bucketing at signup.** Rejected for this slice: a
  new column/mechanism heavier than `[P1 · S]`; the PostHog reader already
  exists. Reconsider if pre-consent skew proves material on the SRM check.
- **Block routing until the flag resolves.** Rejected: a blocking spinner on the
  first-impression path that still fails for non-consenting users.
- **Single combined flag (fold the kill-switch into the variant).** Rejected:
  loses the independent emergency stop and conflates "safe to serve" with
  "which arm."
- **Exclude all generation failures from the NL arm.** Rejected: flatters NL and
  breaks ITT by deleting the treatment's own failure mode.
- **Primary = time-to-activation.** Rejected: the north-star is the activation
  *rate*; latency is a diagnostic secondary.
