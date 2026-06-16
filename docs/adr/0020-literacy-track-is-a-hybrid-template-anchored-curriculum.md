# ADR-0020 — The Literacy track is a hybrid, template-anchored curriculum with durable completion

- **Status**: Accepted
- **Date**: 2026-06-16
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Literacy track, Module,
  Lesson, Milestone, Activation, results_viewed, Entry path, Trust page;
  `docs/ACTIONS.md` #15 (this item), #14 (llms.txt — its deferred
  "promote glossary/strategy-guide to public" follow-up is addressed
  here), #11 (golden suite — extended here), #4 (decision to prune
  vanity-social surfaces, which bounds the educator scope);
  [ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md)
  (the public-content / auth-gated split pattern reused here),
  [ADR-0008](./0008-activation-is-first-result-viewed.md) (durable,
  delete-surviving completion, mirrored here),
  [ADR-0012](./0012-nl-wedge-review-surface.md) /
  [ADR-0013](./0013-nl-wedge-auto-backtest-wiring.md) (the
  navigate-into-running auto-backtest flow this reuses — a build
  prerequisite),
  [ADR-0018](./0018-golden-backtest-regression-suite.md) (the golden
  pipeline the new templates join).

## Context

ACTIONS #15 ("Literacy track from glossary + templates", `[P2 · L]`) reads
as a single greenfield feature: "a guided *learn strategy literacy by
testing real ideas* track built on existing assets (metrics glossary,
'what this teaches', contextual tooltips, templates)." Grilling it against
the codebase and CONTEXT.md surfaced that almost every load-bearing word
collides with something already shipped, and that the "Large" sizing hides
a stack of independent decisions:

1. **A vocabulary collision.** `/progress` already ships "lessons" (four
   auto-derived booleans: `first_strategy`, `saved_version`,
   `first_backtest`, `reviewed_results`) and "achievements". Those are
   *activity badges*, not a *taught sequence*. #15's "literacy track" needs
   the word "lesson" for a curriculum unit.
2. **No source linkage exists.** `clone_template` copies a template's
   `definition_json` and stamps `entry_path = template_clone`, but the
   resulting `Strategy` **forgets which template it came from** — so
   "did the user test the idea this lesson teaches?" is not derivable
   today.
3. **The source content is auth-gated.** The metrics-glossary and
   strategy-guide sit behind the `(app)` gate; ADR/#14 explicitly
   *excluded* them from `llms.txt` for that reason, and CONTEXT.md's Trust
   page entry *commits* that they "stay inside the app shell, chromed and
   auth-gated." Yet #15's named SEO/"teachers share" wins require that
   content to be public.
4. **Two product precedents constrain the shape.** Activation is recorded
   as a durable, delete-surviving fact (ADR-0008), not derived from current
   rows; and the NL wedge already built a low-friction
   clone→auto-backtest→navigate-into-running motion (ADR-0012/0013).

So #15 is not "build a tutorial page." It is a coherent architecture that
must reconcile a new concept hierarchy, a public/authed split, durable
progress, and reuse of existing plumbing — without contradicting positions
the codebase already took.

## Decision

**The Literacy track is a hybrid public/authed, template-anchored
curriculum whose units complete on a durable, delete-surviving "verdict
viewed" — distinct from the `/progress` milestones, open-navigation, and
built by mirroring existing content rather than relocating it.**

Concretely:

1. **New concept hierarchy, distinct from milestones.** A **Literacy
   track** contains ordered **Modules** (~3, named for the arc *intuition →
   risk & drawdown → playbook*), each holding template-anchored
   **Lessons**. These are a *taught sequence*. The existing `/progress`
   booleans/badges are renamed **Milestones** (an activity surface) to free
   the word "lesson". Rejected: folding the track *into* the existing
   lessons (conflates "what you did" with "what you were taught") and a
   no-new-model presentation-only view (cannot carry durable progress).

2. **Template-anchored lessons; long, authored curriculum.** Each Lesson is
   hung on **one seed template** — the user clones it, the auto-backtest
   runs, and the existing `teaches_description` + glossary/strategy-guide
   content frames the concept; the hands-on backtest *is* the teaching. The
   track is deliberately **long** (~12 templates, ~4 per module), so the
   "L" effort is substantially *content authoring*. Rejected: a tight
   ~5-lesson track (chosen against — the arc richness was judged worth the
   authoring cost); concept-anchored lessons with templates as mere
   illustrations (the test must be the spine, not a footnote).

3. **Hybrid surface, content mirrored not moved.** The module/lesson
   *teaching* is a **public, indexable, server-rendered** content shell
   (the ADR-0017 pattern), making the literacy pages the public home for
   the otherwise auth-gated glossary/strategy-guide content. The clone→
   backtest action and per-user progress require auth. Crucially the
   dedicated `/metrics-glossary` and `/strategy-guide` *routes* **stay
   auth-gated** (honoring CONTEXT.md's Trust-page commitment); only their
   *content* goes public, sourced from shared libs — the glossary is
   already a lib (`lib/metrics-glossary-content`), the strategy-guide's
   hardcoded JSX is **extracted into a content module** so both surfaces
   share one source. `llms.txt` (#14) then points at the public lesson/
   module pages instead of the gated reference routes. Rejected: relocating
   the glossary/guide pages out of `(app)` (would retract the Trust-page
   commitment and rework nav); re-authoring fresh per-lesson prose
   (discards existing assets, fights #15's premise).

4. **Completion = a durable, template-keyed "verdict viewed".** A Lesson
   completes when the user first *views the verdict* of a backtest on its
   template — the same `results_viewed` act that defines **Activation**.
   Attribution is **template-keyed**: any viewed verdict on the lesson's
   template counts (a gallery clone of the same template completes the
   lesson too — the genuine learning act is identical regardless of which
   door it came through). Completion is **durable and monotonic**: a
   write-once `LessonCompletion` record (user + lesson + `completed_at`),
   stamped on first verdict and **surviving later archive/delete** of the
   practice strategy — mirroring ADR-0008's delete-surviving Activation.
   Attribution requires a new generic **`source_template_id`** (nullable
   FK) on `Strategy` — which also fixes the latent "clones forget their
   origin" gap. Rejected: derive-on-read completion (archiving the practice
   strategy would *un-complete* the lesson — contradicts ADR-0008);
   track-instance-keyed attribution via a literacy-specific column
   (bureaucratic — forces re-doing a test the user already ran); a
   started/in-progress state machine ("resume" is just the first lesson
   without a completion, in order).

5. **The lesson test reuses the NL-wedge navigate-into-running flow.**
   "Test this idea" reuses the ADR-0012/0013 motion: clone the lesson's
   template → client-orchestrated auto-backtest (same fixed 1-year window)
   → land on the result page while it runs → poller drives running→verdict
   → stamp `LessonCompletion` + `results_viewed`. The canvas stays one
   click away for the curious but is *not* the landing. This makes the
   ADR-0012/0013 plumbing a **build prerequisite**. Rejected: the
   gallery-clone-to-canvas flow (a drop-off cliff — completion *is* the
   verdict, and the canvas buries it); the wizard `isFirstRun` in-dialog
   poll (gated and dialog-bound, wrong for a repeatable lesson).

6. **Open navigation, never gated.** Lessons are shown in order with a
   recommended next step and a progress bar, but every lesson is reachable
   anytime and is a directly-linkable, indexable page. Hard gating is
   *incompatible* with both the public SEO surface (an indexable page
   cannot sit behind "finish the previous lesson") and template-keyed
   completion (which lands out-of-order). Rejected: linear unlock and
   module-gating.

7. **Educator surface is explicitly out.** "Teachers share what teaches" is
   served *implicitly* — the public, linkable lesson pages **are** the
   shareable unit (a teacher shares a URL). No teacher-authoring,
   assignment, or roster machinery: that is exactly the surface-area sprawl
   `docs/ACTIONS.md` decision #4 pruned (profiles/badges/digests as vanity
   social), and reopening it is out of scope.

8. **All literacy templates are golden-pinned (#11 / ADR-0018).** Every new
   template becomes a CI golden fixture through the real `validate →
   interpret → run` pipeline, extending ADR-0018's deferred catalogue
   coverage. Lesson teaching prose **must not hardcode result numbers** —
   teach the concept, let the live verdict supply the figures, so engine/
   data drift never makes a lesson lie. Rejected: pinning none (forfeits
   moat coverage) and opportunistic pinning of only new-block-type
   templates (chosen against in favor of full coverage, accepting the
   re-baseline tax).

## Consequences

**Positive:**
- One coherent retention + distribution surface that reuses the wedge's
  auto-backtest flow, the glossary/tooltip libs, and the Activation event
  semantics rather than re-inventing them.
- Resolves the #14 follow-up (a public home for the teaching content) and
  extends the #11 golden suite's catalogue coverage as a byproduct.
- Progress is honest and permanent: completing a lesson is an earned fact
  that survives deleting the practice strategy, consistent with Activation.

**Negative / non-obvious:**
- **New persistence is a contract.** `source_template_id` on `Strategy`
  and the `LessonCompletion` record are durable schema; the public lesson/
  module pages are a public payload. All are effectively permanent.
- **Template-keyed completion is deliberately "leaky."** A gallery clone of
  a lesson's template completes the lesson, so the track *cannot* cleanly
  measure "engaged via the track" vs "cloned from the gallery". This was
  chosen on purpose (reward the act, not the navigation path); a future
  need for that funnel would require track-instance attribution.
- **Golden-pinning all ~12 templates carries a re-baseline tax** — every
  template tweak forces a snapshot refresh. Accepted because "trust in the
  number" is the moat.
- **Build ordering risk.** The decision is to build now (in parallel with
  the wedge), but the lesson test flow depends on ADR-0012/0013 shipping
  first, and the surface is a *retention* play whose payoff assumes the
  *acquisition* wedge (Group B) proves out — the backlog's own
  "right move, wrong time" caution applies if the wedge is later cut.
- **The strategy-guide JSX extraction** is a prerequisite refactor (its
  content is not reusable until it lives in a shared module).
