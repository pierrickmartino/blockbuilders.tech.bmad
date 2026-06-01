# ADR-0004 — PositionManager owns the position, not the account

- **Status**: Accepted
- **Date**: 2026-06-01
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Engine, PositionManager;
  issue #448 (extract PositionManager from the backtest engine loop)

## Context

`run_backtest` interleaved three kinds of state in one ~450 LOC loop:
*position* state (entry price, quantity, TP-ladder triggered flags,
SL price, MFE/MAE excursions), *account* state (running `equity`, peak
equity, drawdown), and *recording* state (the trades list and equity
curve). Issue #448 extracts a `PositionManager` to give the position
state a home. The open question was where to draw the line: should
`PositionManager` also own `equity` — sizing positions internally and
serving as the source of truth for the balance?

## Decision

**`PositionManager` owns the position only. The Engine loop owns the
account.**

- Entry sizing stays in the loop: it computes `qty` from `equity *
  position_size_pct / 100` and passes `qty` into `enter()`.
- Realized PnL is a **return value**. `close()` and each partial
  take-profit return a `Trade` (with its `pnl`); the loop applies
  `equity += trade.pnl`. `PositionManager` never references `equity`.
- Mark-to-market for the equity curve stays in the loop, reading the
  position's `entry_price`/`position_size` through an accessor.
- One long-lived `PositionManager(fee_rate, slippage_rate,
  spread_rate)` is reused across trades; `enter()` initialises
  per-position state and resets the prior.

## Consequences

**Positive:**
- `PositionManager` is unit-testable with synthetic single candles and
  a `RiskConfig` — no equity, no full candle arrays, no
  `StrategySignals`. This is the leverage the refactor was for.
- Mark-to-market and compounding stay trivial: equity lives in exactly
  one place, mutated in exactly one direction (PnL flows out, never in).
- Position-state bugs concentrate in one class; account bugs stay in
  the loop.

**Negative:**
- Position sizing is *not* encapsulated with the position. A future
  reader extending sizing (e.g. volatility targeting) edits the loop,
  not `PositionManager`.
- The split assumes a single open position at a time. Concurrent or
  netted positions would require revisiting this boundary — the loop's
  equity ownership currently bakes in one-position-at-a-time.

## Alternatives considered

- **PositionManager owns equity** (sizes internally, exposes the
  balance) was rejected. It couples account-level state into the
  position object, complicates mark-to-market (two sources of truth for
  equity), and forces every position unit test to set up an account.
  The encapsulation it buys — sizing next to the position — is not
  worth that cost while the model is one-position-at-a-time. Revisit
  this ADR if the engine grows concurrent positions or portfolio-level
  sizing.

## How to apply

- **Block/engine authors**: keep `PositionManager` account-blind. If
  you need `equity` inside it, that is the signal to reopen this ADR,
  not to thread a balance in.
- **Reviewers**: a PR that adds an `equity` field or balance argument
  to `PositionManager` is a boundary change — require it to update this
  ADR.
