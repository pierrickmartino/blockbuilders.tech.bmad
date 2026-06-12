# ADR-0015 — The NL-wedge repair pass: re-generate, never patch

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Repair pass, Strategy
  drafter, Strategy validator, Working copy; [ADR-0011](./0011-strategy-drafter-nl-to-graph-generation.md)
  — NL→graph generation, the untrusted-model/trusted-validator boundary,
  the "three outcome classes," and the explicit deferral of "one in-scope
  repair retry" to this item; [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md)
  — the wedge drafts new strategies and a user **reject** hard-deletes a
  *valid* draft (not the failure this ADR governs); `docs/ACTIONS.md` #8
  (this item), #4 (the drafter it extends), #9 (the cost bound it respects).

## Context

ACTIONS #8 ("Map NL output to existing validation rules") adds the
**repair** half of the wedge's "repair-or-explain" promise. The other
halves already shipped with #4 (ADR-0011): every drafted graph is
compiled and run through the existing **Strategy validator** *before*
persistence, and a failure is "explained" by returning the validator's
trusted plain-language message as a `declined` outcome. ADR-0011
explicitly deferred the missing piece — *"one in-scope repair retry on
validator failure … salvaging invalid-but-fixable drafts is #8's job."*

So #8 is narrow: when a draft *compiles* but *fails the validator*,
attempt a bounded repair before falling through to the existing decline.
The open question this ADR settles is **what "repair" is allowed to
mean**, because a tempting cheaper option exists and would quietly
corrupt the product's core promise.

When the validator rejects a draft, many failures look mechanically
fixable without spending another LLM call:

- `MISSING_EXIT` → inject a default `stop_loss`.
- `INVALID_PERCENT` (`position_size: 500%`) → clamp to `100%`.
- `UNCONNECTED_SIGNAL` / dangling connection → drop the offending edge.

Each is a deterministic patch: cheap, instant, no provider round-trip.
The pull to "just fix it in code" is real and will recur every time an
engineer reads the validator error list.

## Decision

**A repair pass is always a single, bounded LLM *re-generation* of the
graph from the user's original idea plus the failing checks. It is never
a deterministic patch — no default-injection, no param-clamping, no
edge-dropping. A repair that still fails the validator ends in a
`declined` outcome; the draft is never surfaced broken.**

The reason is **faithfulness**, which the validator does not protect. The
validator proves a graph is *legal* (ADR-0011 calls this out: "a
validator pass proves legality, not faithfulness"). It says nothing about
whether the graph still expresses *the user's idea*. Deterministic
patches trade faithfulness for legality:

- Injecting a default `stop_loss` for `MISSING_EXIT` **fabricates a risk
  rule the user never expressed** — and the wedge then *backtests it*
  (#6) and shows the user a verdict for a strategy **we** invented, not
  the one they asked about. That is a direct breach of the wedge's whole
  premise: "find out if **your** idea works."
- Clamping `position_size: 500%` → `100%` **silently changes the
  strategy's meaning** under the user's nose.

An LLM re-generation, by contrast, reasons about what the user's stated
intent *implies* (an RSI-overbought exit for an RSI-oversold entry, say),
so a successful repair stays faithful. And if the idea is genuinely
inexpressible with the available blocks, the model can still `decline` on
the retry — repair never forces a graph into existence.

This is the same untrusted-generator / trusted-gate regime ADR-0011
established: the **Strategy validator** remains the only trust boundary;
the repair pass is just a *second, error-informed generation attempt*
behind it, not a new way to make the validator pass.

Scope notes (the reversible mechanics live in the FEAT spec, not here):
the repair is bounded (default one retry, respecting #9's cost ceiling),
orchestrated outside the drafter seam (the drafter stays generation-only;
it learns to *re-generate given prior errors*, not to validate), and is
distinct from the **Strategy drafter**'s library-level *schema-retries*,
which fix the IR's *shape* rather than its *legality*.

## Consequences

**Positive:**
- The wedge never shows or backtests a strategy the user did not express.
  The "adjudicate **my** idea" promise — and the trust framing built on
  it — survives the repair path intact.
- The trust boundary stays singular: one validator, gating both the
  first draft and the repair. No second, weaker "good enough after
  patching" path to reason about.
- Whole classes of "helpful" silent corruption (fabricated risk rules,
  clamped sizing) are ruled out by principle, not left to a reviewer to
  catch case by case.

**Negative / non-obvious:**
- A repair **costs a second LLM call and adds latency** before the
  auto-backtest starts (the user is on a spinner, ADR-0013). This is the
  deliberate price of faithfulness over the free deterministic fix; #9
  bounds it (one retry by default, tunable to zero).
- Some drafts that a deterministic patch *could* have salvaged will
  instead `decline`. That is **the intended trade**: a clean "I couldn't
  draft that" is honest, whereas a silently-patched strategy is a lie the
  user only discovers — if ever — by inspecting a graph they were told
  was theirs.
- A future reader will be tempted to "optimize" `MISSING_EXIT` into a
  default-injection. This ADR exists to stop that: it is not an oversight
  that we re-generate instead of patch.

## Alternatives considered

- **Deterministic repair (patch the graph in code).** Rejected as a
  faithfulness hazard: cheap and fast, but it fabricates or mutates the
  user's strategy to satisfy the validator, then backtests the result as
  if it were theirs. Legality without faithfulness is exactly the failure
  the wedge cannot afford on a first impression.
- **Deterministic patch first, LLM re-gen as fallback.** Rejected: the
  "harmless" patches (default exit, clamp) are precisely the unfaithful
  ones; the cases where a patch is *truly* meaning-preserving are rare
  enough not to justify a second repair mechanism and the conflation risk
  it introduces.
- **No repair at all — decline on first validator failure** (today's
  behavior). Not wrong, just leaves salvageable drafts on the table; #8's
  reason to exist is to recover the *faithfully* fixable ones. Retained
  as the `max_repairs = 0` configuration, so repair can be switched off
  without removing the code.
- **Unbounded re-generation until valid.** Rejected: violates #9's cost
  bound and the wedge's single-shot framing; marginal fix-rate after one
  error-informed retry is low, and each attempt adds user-visible
  latency.
