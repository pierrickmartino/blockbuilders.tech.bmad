# ADR-0012 — The NL-wedge review surface: post-backtest accept/edit/reject on the result page

- **Status**: Accepted
- **Date**: 2026-06-11
- **Related**: [CONTEXT.md](../../CONTEXT.md) — AI-drafted, Draft outcome,
  Working copy, Strategy version, Shared backtest, Activation,
  results_viewed, Entry path; [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md)
  — the wedge creates new strategies and the accept/edit/reject lifecycle
  (this ADR fixes the *surface* that lifecycle is driven from);
  [ADR-0011](./0011-strategy-drafter-nl-to-graph-generation.md) — NL→graph
  generation (#4, stops before this); [ADR-0005](./0005-working-copy-separate-from-versions.md)
  — the canvas always loads the working copy, no status column;
  [ADR-0008](./0008-activation-is-first-result-viewed.md) — Activation is the
  first verdict viewed; `docs/ACTIONS.md` #5 (this item), #6 (prerequisite),
  #13 (the shareable artifact, deferred).

## Context

ACTIONS #5 ("Accept / edit / reject diff UI on the canvas") was written
in the wedge-era backlog (2026-06-05) before ADR-0006 and ADR-0011
existed. Read literally it describes a **review-before-apply gate on the
canvas**: render the AI's draft as a *diff* (highlight added
blocks/connections), and *"nothing auto-applies."* That mental model —
the AI proposes an edit to your existing graph, you accept/reject it
hunk-by-hunk — is incompatible with the decisions made since:

- **ADR-0006** fixed the *lifecycle*: a draft **creates a new strategy**,
  is **auto-backtested**, and *then* the user decides. By the time any
  decision is possible, "a strategy + working copy + frozen version +
  backtest run all exist." It explicitly rejected the "talk-to-your-canvas"
  option where the AI edits the current graph.
- **ADR-0011** fixed *generation* (#4): NL → IR → compiled working copy →
  validator gate → persisted, `strategy.id` returned. It stops *before*
  the auto-backtest (#6) and this review surface (#5).

So #5 is not greenfield — its *semantics* (Accept = keep + artifact,
Edit = keep + edit, Reject = hard-delete) are already locked by ADR-0006.
What #5 actually owns is the **review/disposition surface**: where the
three actions live, what the user is looking at when they choose, what
the in-between "under review" state is, and what signal the choice emits.
Several interlocking forks had to be resolved together; the literal
ACTIONS #5 wording ("diff", "on the canvas", "nothing auto-applies",
"clean accept/reject signal") is stale on every count and is corrected
here.

## Decision

**Accept / Edit / Reject is a post-backtest disposition made on the
result page, not a pre-apply diff gate on the canvas. The drafted
strategy is fully real and persisted throughout; "under review" is a
UI-only condition, never a database status.**

Concretely:

1. **Decision happens after the auto-backtest, driven by the verdict.**
   The wedge's promise is "find out if you're right," so the user judges
   the *result* (equity curve + narrative), not a bare graph. A
   pre-persist / pre-backtest gate is rejected — it would reopen ADR-0006
   and ADR-0011 and force a blind decision.

2. **The control surface is the result page.** Accept / Edit / Reject sit
   next to the verdict. The canvas shows only a non-committal "AI draft —
   under review" banner and does **not** host the decision buttons; the
   canvas's role is the *destination* of **Edit**.

3. **No "diff."** A brand-new strategy (ADR-0006) has no baseline, so
   per-element added/changed highlighting has nothing to contrast against
   — it would be all-"added", all the time. The whole drafted graph is a
   single "under review" state; the diff framing is dropped. (A real diff
   could re-enter only in a future "talk-to-your-canvas" feature, which
   ADR-0006 already reserved for a separate decision.)

4. **"Under review" is UI-only; no status column.** The drafted strategy
   is an ordinary `Strategy` from creation (ADR-0011 already persists it).
   List-cleanliness comes from ADR-0006's hard-delete on reject, **not**
   from a pending/`is_under_review` flag — preserving ADR-0005's
   no-status-enum discipline. Provenance is the existing
   `entry_path = nl_wedge`, surfaced as the **AI-drafted** badge
   (CONTEXT.md): origin, not current authorship, so it survives Edit.

5. **Four dispositions, with "Keep" distinct from "Accept."**
   - **Accept** — keep + *unlock shareability* (the result becomes
     eligible for the existing deliberate Share action). This pins
     ADR-0006's ambiguous "mints the shareable artifact" to mean
     **makes-mintable**, *not* auto-publish: Accept does **not** create a
     live public token as a side effect. The rich shareable artifact
     (OG-image / public page) is **#13**, deferred; #5 reuses existing
     share plumbing and stops.
   - **Edit** — keep; the drafted graph becomes an ordinary working copy
     edited on the canvas under normal autosave (verbatim ADR-0006).
   - **Keep** — stays in the list with no artifact. Reached via the
     abandonment modal's "Keep" or a hard browser exit. **Keep ≠ Accept**:
     Accept additionally unlocks sharing; Keep does not. Accept is
     therefore a real action ("this is worth sharing"), not a synonym for
     "save" (it is already saved).
   - **Reject** — hard-delete the strategy + working copy + frozen version
     + backtest run (ADR-0006).

6. **Abandonment = confirm-on-exit, with hard-exit resolving to Keep.**
   The browser only permits a custom Keep/Discard/Cancel modal on
   **in-app navigation**; a **hard browser exit** (tab close, refresh,
   URL change) can show only the native `beforeunload` prompt and cannot
   reliably run a delete on unload. So a hard exit **persists as Keep** —
   we do not attempt an unreliable unload-delete. Discard-on-hard-exit was
   considered and rejected: the only robust way to get it is to persist
   nothing until an explicit Accept/Edit, which reopens ADR-0006/0011.

7. **Reject is one-click with an Undo toast, not a pre-confirm.** This
   matches the repo's existing node-delete pattern (`handlePopoverDeleteNode`,
   ~5 s Undo toast) and keeps the wedge's "throw ideas away cheaply" loop
   frictionless. The hard-delete is committed only **after** the grace
   window elapses without undo; an Undo cancels it. Consistent with (6),
   a hard exit that interrupts the grace window **resolves to Keep**, so
   Reject is durable only once the window closes. (A pre-confirm dialog +
   immediate synchronous hard-delete was the rejected alternative.)

8. **The eval signal is a four-way graded `Draft outcome`, not a boolean.**
   ACTIONS #5's "clean accept/reject signal" is stale: the product has
   four terminal dispositions, and they grade the drafter differently.
   Logged as a single `nl_draft_outcome` dimension
   (`accepted | edited | kept | rejected`) on the `nl_draft_*` event
   family (CONTEXT.md → Draft outcome). **`edited` is first-class** — it
   is the drafter's most actionable signal (a draft close enough to keep
   but the user felt they had to refine) and must not collapse into
   `accepted`. It fires on **clicking Edit**, not on a provable graph
   mutation, keeping the four outcomes a clean 1-of-4 choice at the
   decision point. The outcome is **decoupled from Activation**: a
   `rejected` draft still activated (the verdict was witnessed), and
   Activation (`results_viewed`) survives the hard-delete (ADR-0008,
   CONTEXT.md).

9. **#5 depends on #6; it is not the sibling ACTIONS.md implies.** The
   backlog critical path lists `#4 → (#5, #6)` as parallel, but you cannot
   accept/reject a verdict that does not exist. #5 takes a hard dependency
   on #6's auto-backtest path: after "Generate", the flow is draft →
   persist → auto-backtest → land on the result page in a
   running → verdict state, review controls appearing when the verdict
   renders. The real ordering is `#6 → #5` (or one combined slice). #5's
   review surface rides on the existing `strategy_drafter_enabled` flag —
   no separate flag — since it can only appear for `nl_wedge` strategies.

Out of scope for #5: a "regenerate / try another draft" button (invites
the per-user inference cost ADR-0011 #9 bounds); the #13 shareable
artifact; any per-element diff or talk-to-your-canvas editing.

## Consequences

**Positive:**
- The decision sits next to the evidence it is about; no blind keep/reject.
- ADR-0005's no-status discipline is untouched — "under review" adds no
  column; provenance reuses `entry_path`.
- The four-way outcome preserves signal the product already generates
  (especially `edited`), instead of flattening it to a boolean.
- Accept stays a meaningful, deliberate act (unlock sharing) rather than a
  redundant "save", and no surprising public URL is published as a side
  effect.

**Negative / non-obvious:**
- **ACTIONS #5's own wording is wrong on four points** (diff, on-canvas,
  nothing-auto-applies, binary signal). A reader trusting the backlog over
  this ADR will build the wrong feature.
- **ADR-0006's "rejected drafts vanish" holds only for *explicit* Reject.**
  Under confirm-on-exit + hard-exit-keeps, abandoned-by-tab-close drafts
  accumulate as ordinary strategies. Accepted as a first-increment cost;
  the UI nudges toward explicit Reject.
- **Reject is not a synchronous hard-delete.** The grace-window/Undo design
  means a brief interval where the rows still exist, and an interrupted
  window degrades to Keep. Reviewers expecting an immediate `DELETE` on
  click should know this is deliberate.
- **#5 is not independently shippable** — it needs #6. The backlog's
  parallelism is corrected to a dependency here.

## Alternatives considered

- **Pre-apply diff gate on the canvas (literal ACTIONS #5).** Rejected:
  forces a blind decision before the verdict, has no baseline to diff
  against, and reopens ADR-0006/0011.
- **Decision controls on the canvas, or mirrored on both canvas and result
  page.** Rejected: the evidence is the verdict (result page); mirroring is
  two sources of truth for one action with a sync burden and no gain.
- **A persisted `is_under_review` / pending status.** Rejected: revives the
  status-column smell ADR-0005 removed; cleanliness already comes from
  hard-delete on reject.
- **Abandonment = implicit keep (silent), or implicit reject (sweep on
  exit).** Rejected in favour of confirm-on-exit: silent keep clutters the
  list without acknowledgement; sweep-on-exit surprise-deletes a real
  backtested result and cannot be done reliably on unload anyway.
- **Accept auto-publishes a live share link.** Rejected: an outward-facing,
  surprising side effect; sharing stays the deliberate action it is today.
- **Reject = pre-confirm dialog + immediate hard-delete (no undo).**
  Rejected: friction on the rapid-fire discard loop and a departure from
  the repo's Undo-toast delete pattern.
- **Treat the eval signal as a boolean accept/reject (per ACTIONS #5).**
  Rejected: collapses `edited` and `kept`, discarding the drafter's most
  useful failure signal.
