# ADR-0009 — Activation drop-off cohorts: `entry_path` + `authoring_mode`

- **Status**: Accepted
- **Date**: 2026-06-08
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Activation, results_viewed,
  Entry path, Authoring mode, Time to activation;
  [ADR-0008](./0008-activation-is-first-result-viewed.md) — activation is
  the first verdict *viewed*; [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md)
  — the NL wedge drafts *new* strategies;
  [docs/activation-metric-runbook.md](../activation-metric-runbook.md);
  `docs/ACTIONS.md` #2

## Context

ADR-0008 made Activation a trustworthy north-star: the first per-user
`results_viewed`. It tells us *whether* a user activates, not *where* they
stall or *which entry path* works. ACTIONS #2 (`[P0 · S]`) asks for the
drop-off cohorts and a time-to-first-backtest measure on top of that
foundation.

Building it surfaced a fractured vocabulary. The shipped activation event
carried a single `entry_path ∈ { manual | wizard | nl_wedge }`; the
`strategy_created` event carried a separate `source ∈ { modal | wizard }`
(and the template-clone path emitted *nothing*); and the backlog item named
yet a third set — "wizard, blank canvas, template clone" plus an orthogonal
"NL-vs-manual authoring." `manual` was a catch-all hiding two genuinely
different paths (blank canvas vs. template clone), and "NL-vs-manual" was
being treated as a second dimension when `nl_wedge` was already a *value
inside* `entry_path`. None of the three vocabularies could answer both
"does template-clone drop off more than blank-canvas?" and "does NL beat
hand-authoring?"

## Decision

**Model activation cohorts as two orthogonal properties, persist the
provenance on the strategy, and add a labelled *diagnostic* funnel that
never displaces the canonical north-star.**

1. **Two orthogonal dimensions** (CONTEXT.md):
   - **`entry_path`** — the launch surface: `wizard | blank_canvas |
     template_clone | nl_wedge`. This **retires `manual`**, splitting it
     into the two paths it hid.
   - **`authoring_mode`** — how the graph was authored: `nl | manual`.

2. **Persist `entry_path` on `strategies`; derive `authoring_mode`.** A new
   column is stamped once, at creation, by each of the four paths (the
   template-clone endpoint now stamps `template_clone` and emits the
   previously-missing `strategy_created`). Every analytics event reads the
   value from the loaded strategy, so the manual backtest page stops
   hard-coding `"manual"` and reports the true origin even after a reload or
   in a later session. `authoring_mode` is **not stored** — today it is a
   pure function of `entry_path` (`nl_wedge → nl`, else `manual`), because
   ADR-0006 guarantees NL only drafts *new* strategies. The events still
   carry *both* props; only storage is single (YAGNI).

3. **A 4-step diagnostic funnel, distinct from the canonical north-star.**
   Path-agnostic semantic milestones, each mapped to an "any-of" event set:
   `signup_completed` → strategy authored (`strategy_created`) → backtest
   enqueued (`backtest_started | auto_backtest_started`) → verdict viewed
   (`results_viewed`). The **2-step `signup_completed → results_viewed`
   funnel remains the sole canonical activation rate** (ADR-0008 untouched);
   the 4-step funnel answers *where* people stall and is labelled so its
   stricter overall conversion is never quoted as "the activation rate".

4. **`time_to_activation`**, not `time_to_first_backtest`. The measure is
   the elapsed time from `signup_completed` to the user's first
   `results_viewed`, computed as the funnel's PostHog-native time-to-convert
   (no client-side number, no new property). The backlog name
   `time_to_first_backtest` is rejected as load-bearing vocabulary: it
   implies the *job/run*, reviving the job-vs-view drift ADR-0008 retired.

5. **First-touch, per-user attribution.** A user who touches multiple paths
   before activating is attributed to their **first** authored strategy's
   `entry_path`, keeping the funnel per-user and aligned with the
   north-star's unique-user semantics. The "what actually drives activation"
   question is answered cleanly by the randomized #7 A/B (path *assigned*,
   no attribution puzzle), not from observational data.

6. **Own cutover, no backfill.** The cohort breakdown is trustworthy only
   from the date the column ships and all four paths stamp it — a *later*
   date than the 2026-06-07 activation cutover. It gets its own annotation;
   the headline 2-step series keeps running unbroken from 2026-06-07.
   Pre-instrumentation strategies have `entry_path = null`, surfaced
   honestly as an `unknown` cohort — never retro-guessed.

## Consequences

**Positive:**
- ADR-0008's canonical number is untouched; the diagnostic sits beside it,
  refining "where" without forking "the rate".
- Persisting on the strategy makes the cohort survive reloads, new sessions,
  and the manual backtest page — the only way to actually distinguish
  `blank_canvas` from `template_clone`, which client-threading could not do.

**Negative / non-obvious:**
- **Analytics provenance now lives on the domain `strategies` table.** A
  reviewer may read this as scope-creep on the core model; it is deliberate
  — it is the single source of truth that lets every downstream event report
  a trustworthy path. Do not "clean it up" into client-only state.
- **`authoring_mode` is derived, not stored.** This is intentional under
  ADR-0006. If "talk-to-your-canvas" NL *editing* of existing strategies
  ever ships (which reopens ADR-0006), `authoring_mode` stops being a pure
  function of `entry_path` and must become its own stored value — reopen
  this ADR then.
- **The 4-step funnel's overall conversion is lower than the canonical
  rate** by construction (it requires passing through intermediate steps).
  Labelled accordingly; never summed or compared against the 2-step number.
- **First-touch attribution slightly miscredits path-switchers** — a user
  who bounced off blank-canvas then activated via a template is counted
  under `blank_canvas`. Accepted as the more honest "where did they first
  stall" reading; the converting-path question is deferred to #7.

## Alternatives considered

- **One expanded flat enum** (`entry_path`:
  wizard/blank_canvas/template_clone/nl_wedge; "NL-vs-manual" derived from
  it). Rejected: permanently couples the launch-surface and authoring
  questions, making the NL-vs-hand-authoring bet (#7) awkward to slice.
- **Thread the cohort value client-side** (URL params + context, no backend
  change). Rejected: evaporates on reload/renavigation, leaves the
  template-clone path emitting nothing, and the manual page still could not
  recover the true path — defeating the entire point of splitting `manual`.
- **Promote the 4-step funnel to the canonical north-star.** Rejected:
  reopens ADR-0008 and changes the north-star number's meaning for a
  `[P0 · S]` instrumentation refinement.
- **Per-strategy-attempt funnel** (one row per strategy, zero attribution
  ambiguity). Rejected as the *primary* view: it stops being a per-user
  funnel and double-counts multi-strategy users. Retained as an optional
  *secondary* "which path produces backtests" view.
