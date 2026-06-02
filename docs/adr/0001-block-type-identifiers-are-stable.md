# ADR-0001 — Block type identifiers are stable forever

- **Status**: Accepted
- **Date**: 2026-05-22
- **Related**: [CONTEXT.md](../../../CONTEXT.md) — Block Catalogue, BlockSpec, Catalogue migration hatch

## Context

Strategies are persisted as JSON in `strategy_versions.definition_json`.
Each block instance carries a `type` field (`"sma"`, `"rsi"`, …) that
references a Block Catalogue entry. The catalogue is the single source
of truth for what blocks exist and how they behave (see CONTEXT.md).

A user who saved a strategy in month N must be able to load, edit, and
backtest it in month N+12. The block `type` string is the join key
between persisted user data and live catalogue code.

Three stances on identifier evolution were considered:

1. **Stable forever.** Identifiers never change once shipped.
   Param-shape changes go through a per-block `migrate(old_params) ->
   new_params` hatch.
2. **Versioned spec.** Each `BlockSpec` carries a version; old
   strategies upgrade on load via per-version migrators.
3. **Pinned-at-save reproducibility.** Strategies pin a catalogue
   version; the interpreter loads the historical spec at backtest time.
   Old handlers are kept indefinitely.

## Decision

**Option 1: block type identifiers (`BlockSpec.type`) are stable forever.**

- Once a block ships, its `type` string MUST NOT be renamed.
- A block that needs to be retired is marked deprecated and a successor
  with a new `type` is added. The deprecated block remains
  loadable indefinitely so old strategies still open.
- Param-shape changes (rename, add, remove, default change) go through
  an optional `migrate(old_params) -> new_params` on the BlockHandler.
  The migration runs when a strategy is loaded; the upgraded params
  are then treated as canonical.
- The BlockSpec carries **no** version field. The catalogue has one
  authoritative shape at any point in time; `migrate` exists to bring
  persisted instances forward into it.

## Consequences

**Positive:**
- Persisted strategies remain valid across catalogue evolution with
  zero per-strategy migration work at the DB layer.
- The interpreter, validator, and frontend each see exactly one spec
  per block type — no version dispatch.
- The cost of a bad name surfaces at design review, not at upgrade
  time. This is the cheap moment to catch it.

**Negative:**
- A poorly chosen identifier is permanent. PR review of new blocks
  must treat `type` strings as schema, not labels.
- Reproducibility of historical backtests is **not** guaranteed across
  handler behaviour changes. A bug fix in the RSI handler will
  retroactively change past backtest results when they are re-run.
  This is acceptable for a strategy lab; it would not be acceptable
  for a live trading audit log.

**Neutral:**
- The `migrate` hatch is opt-in per handler. Handlers without one are
  assumed to have stable params.

## Alternatives considered

- **Option 2 (versioned spec)** was rejected because it forces every
  caller (interpreter, validator, frontend codegen, OpenAPI) to handle
  N versions per block. The locality win of the Block Catalogue would
  erode within a few iterations.

- **Option 3 (pinned-at-save reproducibility)** was rejected because
  Blockbuilders is a strategy lab, not an audit system. Users iterate
  on strategies; they re-run backtests expecting current behaviour.
  Keeping historical handlers alive forever is a large carrying cost
  for a guarantee the product does not need. Revisit this ADR if the
  product evolves toward regulated or auditable backtests.

## How to apply

- **Reviewers**: treat any PR that renames a `BlockSpec.type` as a
  breaking change. Require deprecate-and-add instead.
- **Block authors**: if you need to change param shape, add a
  `migrate` method on the handler in the same PR. Cover it with a
  test against a representative old-shape payload.
- **Architecture reviews**: do not re-suggest "let's rename `sma` to
  `simple_moving_average` for clarity." That conversation is closed.
