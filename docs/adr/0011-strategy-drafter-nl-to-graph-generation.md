# ADR-0011 — The Strategy drafter: provider-agnostic NL→graph generation

- **Status**: Accepted
- **Date**: 2026-06-10
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Strategy drafter,
  Strategy validator, Block Catalogue, BlockSpec/ParamSpec, Working
  copy; [ADR-0006](./0006-nl-wedge-drafts-new-strategies.md) — the
  wedge creates new strategies (lifecycle); [ADR-0005](./0005-working-copy-separate-from-versions.md)
  — the canvas always loads the working copy; [ADR-0001](./0001-block-type-identifiers-are-stable.md)
  — block type identifiers are stable; [ADR-0003](./0003-multi-provider-price-failover.md)
  — multi-provider Price Provider seam (the precedent for a vendor
  abstraction); `docs/ACTIONS.md` #4 (this item), #5/#6/#8/#9 (siblings).

## Context

ACTIONS #4 turns a natural-language idea ("buy ETH when RSI drops
below 30") into a drafted block graph the user can verify. ADR-0006
already fixed the *lifecycle* — a draft creates a new strategy, never
edits the current canvas, and is kept/edited/rejected downstream. This
ADR fixes the *generation architecture*: how the sentence becomes a
graph. None of it exists yet — there is no LLM dependency anywhere in
the stack today — so every decision here is greenfield.

Scope of #4 (the smallest verifiable increment): `NL text → new
Strategy + working copy (persisted) → a validated graph rendered on
the existing canvas`. It stops before the auto-backtest (#6), the
accept/edit/reject diff UI (#5), the salvage/repair loop (#8), and
caching/per-user caps (#9). It is single-shot.

Several non-obvious forks had to be resolved, each with real
alternatives. They are recorded as one decision because they are
interlocking — the trust model, the output representation, the
provider abstraction, and the failure taxonomy only make sense
together.

## Decision

**The NL wedge generates graphs through a provider-agnostic
*Strategy drafter* seam that emits a constrained semantic
representation, which a deterministic compiler expands and the
existing Strategy validator gates. The model is untrusted; the
validator is the trust boundary.**

Concretely:

1. **LLM generation, validator as the trust backstop.** The drafter
   uses an LLM (not a deterministic NL parser) because the wedge's
   premise is free-form intuition, not near-structured phrasing. The
   model's output is never trusted to be correct — it only has to
   *pass the Strategy validator*. Untrusted generator + trusted gate is
   the regime where an LLM is safe to use.

2. **Backend-side.** Generation runs in a FastAPI endpoint, not the
   browser: provider API keys stay server-side, the Python Strategy
   validator is an in-process call, and a single trusted chokepoint
   exists for the future cost controls of #9.

3. **Semantic IR + deterministic compiler — not direct definition
   output.** The model emits a tight *semantic* draft (which block
   types, their params, which connects to which by reference). A
   deterministic compiler then mints block ids, looks up the correct
   **Port**s from the catalogue, and lays out positions, producing the
   canonical working-copy definition. The model never hand-authors
   ids, port references, or x/y — exactly the mechanical details where
   it is least reliable and a single typo yields an invalid graph.

4. **Structured outputs as the mechanism.** This is single-shot
   constrained extraction (NL → one IR object), so structured outputs
   (Pydantic schema in, validated object out) fit — not tool use, not
   an agentic loop. The schema enforces *shape* (valid block-type
   enum, required fields); the Strategy validator enforces *legality*
   (numeric bounds, connectivity, required exit). Structured outputs
   do not enforce numeric bounds — that is acceptable because the
   validator owns legality regardless.

5. **Provider-agnostic `StrategyDrafter` seam.** The drafter abstracts
   the LLM vendor behind one interface, exactly as the **Price
   Provider** (ADR-0003) abstracts the price vendor, so the model can
   be configured (Anthropic, OpenAI, OpenRouter, …) or swapped without
   touching callers. It is implemented over a cross-provider library
   (`instructor`), which gives Pydantic structured outputs plus
   validation-retry uniformly across providers. Configuration:
   `strategy_drafter_{provider,model,base_url,enabled}` plus
   per-provider keys; default `anthropic` / `claude-sonnet-4-6`;
   gated by `strategy_drafter_enabled`; at startup only the *selected*
   provider's key is required.

6. **Catalogue-derived vocabulary, unioned with the inline risk
   blocks.** The Block Catalogue is the single source of truth and
   already projects to the frontend; the drafter adds a backend
   projection to (i) the IR schema (block-type enum + per-type param
   shapes) and (ii) a compact prompt vocabulary (labels + one-liners).
   New blocks become draftable automatically when added to the
   catalogue. Because the risk blocks (`position_size`, `take_profit`,
   `stop_loss`, `max_drawdown`, `time_exit`, `trailing_stop`) are
   deliberately *out of catalogue scope* yet are the usual way to
   satisfy the validator's "must have an exit" rule, the drafter's
   vocabulary is **catalogue blocks ∪ inline risk blocks**.

7. **The IR is a discriminated `drafted | declined` union.** Structured
   outputs would otherwise force the model to emit *some* graph for
   "buy when Elon tweets" — and that graph might even pass the
   validator while bearing no relation to the request (legality is not
   faithfulness). A first-class `declined` arm lets the model say "I
   can't express this with the available blocks" and carry a
   plain-language reason.

8. **Three outcome classes; nothing partial persists.** The endpoint
   distinguishes (a) **success** — drafted, compiled, validator-clean →
   Strategy + working copy persisted, id returned; (b) **refusal** —
   model `declined` *or* compiled graph failed the validator → nothing
   persisted, plain-language reason returned (a valid response, not a
   server error); (c) **infrastructure failure** — provider
   timeout/5xx/rate-limit/auth, or `instructor` exhausted its
   schema-retries → nothing persisted, "try again" via the envelope's
   error path. Validation happens *before* persistence, so generation
   failures never create rows; ADR-0006's reject-hard-delete is
   reserved for a user discarding a valid, backtested draft downstream.
   The call is a blocking `POST` with a timeout; no re-draft beyond
   `instructor`'s bounded schema-retries (single-shot, per #9).

9. **Reuse the existing canvas load path.** The endpoint returns the
   new `strategy.id`; the canvas hydrates from the persisted working
   copy exactly as the wizard/blank-canvas paths do (ADR-0005 — there
   is no second way into the canvas). The drafter sets
   `entry_path = nl_wedge` on the Strategy.

## Consequences

**Positive:**
- The model is swappable and the failure surface is contained: a
  malformed or unfaithful draft cannot reach the user, and a partial
  draft cannot pollute the strategy list.
- The IR/compiler split makes whole classes of error structurally
  impossible (bad ports, dangling ids) rather than something the
  repair loop must catch.
- New catalogue blocks become draftable with no drafter code change,
  preserving the SSOT discipline of ADR-0001.
- The seam matches an existing, blessed pattern (Price Provider), so
  it is idiomatic to the codebase rather than a novel abstraction.

**Negative / non-obvious:**
- Introduces the **first LLM dependency** in the stack — a new vendor,
  new keys, new latency, new failure mode — plus the `instructor`
  dependency. #9 exists to bound the cost; the flag bounds the blast
  radius.
- The **semantic IR is a second representation** to maintain alongside
  the canonical definition, and the compiler is net-new code #4 owns.
  This is the price of not making the model do clerical work.
- The drafter's vocabulary **reaches outside the catalogue** to include
  inline risk blocks — a reviewer expecting "catalogue is the whole
  vocabulary" should know this union is deliberate, not an oversight.
- Structured outputs **do not enforce param bounds**; relying on the
  validator for legality is intentional and must not be "fixed" by
  trying to encode bounds in the schema.

## Alternatives considered

- **Deterministic NL parser (no LLM).** Rejected: only wins on inputs
  that are already near-structured, defeating the wedge's reason to
  exist. The A/B (#7) may reveal users type structured phrases — treat
  that as a finding, not a starting assumption.
- **Model emits the full canonical definition directly.** Rejected:
  forces the model to hand-author ids, port references, and positions
  — the mechanical details it is worst at — and leans harder on the
  #8 repair loop to fix errors the IR/compiler split makes impossible.
- **Strict tool use instead of structured outputs.** Rejected: this is
  one-shot extraction, not tool-calling; structured outputs are the
  direct fit.
- **Native per-provider SDK adapters** behind the seam. Rejected:
  hand-maintaining per-provider structured-output quirks forever, when
  a battle-tested library normalizes them.
- **OpenAI-compatible Chat Completions only** (reach every model
  through OpenRouter). Rejected: makes OpenRouter a hard dependency for
  reaching Anthropic, an odd coupling for a shop that would want a
  direct Anthropic key as the default path.
- **Infer asset/timeframe from the prose.** Rejected in favour of
  explicit UI controls: the controls are authoritative, the asset is
  inherently valid (picker is populated from the supported universe),
  and the drafter is freed to draft the graph only.
- **Always emit a graph and lean on the validator** (no `declined`
  arm). Rejected: a validator pass proves legality, not faithfulness;
  without a first-class "no", the wedge confidently drafts nonsense.
- **One in-scope repair retry on validator failure.** Deferred to #8:
  #4 only gates pass/fail and declines; salvaging invalid-but-fixable
  drafts is #8's job.
