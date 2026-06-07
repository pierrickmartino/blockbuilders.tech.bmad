# ADR-0006 — The NL wedge drafts new strategies; it does not edit the canvas

- **Status**: Accepted
- **Date**: 2026-06-06
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Working copy, Strategy
  version, Backtest; [ADR-0005](./0005-working-copy-separate-from-versions.md)
  — working copy / version split; `docs/BRAINSTORM.md` decision #3

## Context

The natural-language wedge (BRAINSTORM.md §5, decision #3) lets a user
type a trading idea in English and get a drafted strategy graph they can
verify. "Shown on the canvas, accept/edit/reject" (the Karpathy "leash")
has to be reconciled with ADR-0005, which is absolute: *the canvas always
reads and writes the single working copy; there is no third place a
strategy definition can live.*

Two readings were possible:

- **(A) new-strategy-from-a-sentence** — each draft creates a *new*
  strategy, exactly like the wizard's existing path (`generateTemplate`
  → seed working copy → return a new `strategy.id`).
- **(B) talk-to-your-canvas** — the draft overwrites the *current*
  strategy's working copy, so "reject" needs an undo of the prior working
  copy.

(B) reintroduces a draft-vs-prior-state concept and a new overwrite/restore
path — precisely the fused-concept complexity ADR-0005 was written to
remove. The wedge's job (§5: "resolve a belief you already hold") is a
*fresh* idea, not an edit of an existing graph.

## Decision

**The NL wedge creates new strategies. It never edits an existing canvas.**

- A draft creates a new strategy, seeds its working copy, and
  auto-backtests it. Per ADR-0005 the backtest **freezes an immutable
  version**, so by the time the user decides, a strategy + working copy +
  frozen version + backtest run all exist.
- **Accept** keeps the strategy and mints the shareable verified-result
  artifact (§7). Accept is the *only* path that mints an artifact — an
  abandoned result is not one the user wants to share.
- **Edit** keeps the strategy; the drafted graph is now an ordinary
  working copy edited on the canvas under normal autosave. No new
  mechanism.
- **Reject** **hard-deletes** the strategy, its working copy, the
  auto-frozen version, and the backtest run. An abandoned question
  consumes no plan slot and leaves no junk in the active or archived list.

"Talk-to-your-canvas" (B) is a legitimate future feature, but it is a
*new* capability that must reopen this ADR — not something to smuggle in
under "reuse the wizard path."

## Consequences

**Positive:**
- ADR-0005 is untouched: the canvas still always shows a real working
  copy; the wedge is a sibling of the wizard, not a new load path.
- The wedge stays friction-free — rapid-fire idea testing does not fill
  the strategy list or burn plan slots, because rejected drafts vanish
  completely.

**Negative / non-obvious:**
- **Reject hard-deletes a frozen `strategy_versions` row.** On its face
  this looks like a breach of ADR-0005 ("never write `strategy_versions`
  outside the backtest-freeze path … genuinely immutable"). It is not:
  immutability means a version is never *mutated in place*; deleting an
  entire strategy the user explicitly discarded is a different operation.
  The version was auto-frozen as a byproduct of the wedge's
  auto-backtest and was never user-acknowledged. Reviewers should expect
  this delete path and not "fix" it.
- The wizard only auto-backtests on `isFirstRun`
  (`strategy-wizard.tsx`). The wedge needs auto-backtest on *every*
  draft, so the auto-backtest path is extended, not reused verbatim.

## Alternatives considered

- **Reject = archive** (`is_archived`, frees the slot, preserves
  history). Rejected: archive is for "strategies I made and want to
  retire," not "questions I asked"; it silently fills the archive list
  with abandoned experiments.
- **Reject = count as a real strategy** (do nothing special). Rejected:
  cleanest data model, worst wedge friction — a Free user burns their
  slot allowance in three rejected experiments.
