# CONTEXT.md — Blockbuilders domain glossary

Load-bearing names used across the codebase. Keep entries terse —
one line per concept. Detailed reasoning belongs in ADRs
(`docs/adr/`), not here.

## Domain concepts

These come from `PRODUCT.md` and describe what the product *is*.

- **Strategy** — a user-composed graph of blocks that defines an
  entry, an exit, and risk rules. Its live, editable definition is
  the Working copy; immutable snapshots are Strategy versions.
- **Working copy** — the single mutable strategy definition the
  user edits on the canvas. Exactly one per strategy, always
  present. Autosave writes here. The canvas always loads the
  working copy — there is no draft-vs-version fallback. UI may call
  this the "draft". The only way an old snapshot re-enters the
  working copy is the deliberate "restore version" action from a
  backtest, which overwrites it. _Avoid_: treating the working copy
  as a version, or reserving a magic `version_number = 0` for it.
- **Strategy version** — an immutable snapshot of a strategy
  definition, frozen automatically when a backtest runs (never by a
  user action, never autosaved). Backtests run against a specific
  version. Deduplicated by content: if the working copy is
  unchanged since the last version, the backtest reuses it, so one
  version may back many backtest runs. _Avoid_: "publishing" a
  version — versions are a byproduct of backtesting, not a
  deliberate publish step.
- **Publish (a strategy)** — make a strategy visible on the user's
  public profile (`Strategy.is_published`). A social/showcase
  action, unrelated to versioning or backtests. _Avoid_: using
  "publish" for freezing a version or for autosave.
- **Archive (a strategy)** — hide a strategy from the active list
  and free a plan slot (`Strategy.is_archived`). Frozen versions
  and backtest history are preserved, not deleted. The only archive
  concept in the system. _Avoid_: archiving individual versions.
- **Block** — a single node in a strategy graph. One of four
  categories: `indicator`, `logic`, `signal`, `risk`.
- **Port** — a typed connection point on a block (input or output).
  Carries one of: `series`, `signal`, `scalar`.
- **Backtest** — execution of a strategy against historical OHLCV
  candles, producing trades, an equity curve, and metrics.
- **Interpreter** — the backend component that walks the strategy
  graph and produces signals for the engine. See
  `backend/app/backtest/interpreter.py`.
- **Engine** — the backend component that consumes signals and
  simulates trades. See `backend/app/backtest/engine.py`.
- **PositionManager** — owns the state of the single open position
  during a backtest: entry, quantity, TP-ladder state, SL price, and
  excursions (MFE/MAE). Exposes `enter`, `check_exits`, and `close`;
  produces `Trade`s and returns PnL as a value. It is deliberately
  account-blind — the Engine loop owns equity, sizing, and the equity
  curve. See `backend/app/backtest/position_manager.py` and
  ADR-0004. _Avoid_: position tracker, trade manager.

## Architecture concepts

These name the seams that the codebase relies on. Use these terms
exactly when discussing refactors.

- **Block Catalogue** — the single source of truth for what blocks
  exist. Authored in Python under
  `backend/app/backtest/catalogue/`, one file per block.
  Projects to the frontend via a CI codegen step that emits
  `frontend/src/generated/blocks.ts`. Risk blocks (`position_size`,
  `take_profit`, `stop_loss`, `max_drawdown`, `time_exit`,
  `trailing_stop`) are handled inline in the interpreter as
  configuration, not computation, and are out of catalogue scope.
- **BlockSpec** — the declarative description of one block:
  identity (`type`, `category`, `label`), interface
  (`inputs`, `outputs`, `params`), and behavior reference. Pure
  data; safe to serialize and project to TypeScript.
- **ParamSpec** — one parameter on a block: kind, default, bounds
  or choices, UI hints. The 95% case is declarative
  (min/max/enum); cross-parameter rules live in the handler's
  `validate()`, not in ParamSpec.
- **BlockHandler** — the Python implementation behind a BlockSpec.
  Exposes `compute(ctx) -> outputs` and an optional
  `validate(params) -> Issues`. Co-located with its spec in the
  same file under `catalogue/`.
- **Block type identifier** — the string in `BlockSpec.type`
  (`"sma"`, `"rsi"`, …). **Stable forever** once shipped.
  Renames are forbidden; deprecate-and-add instead. Persisted
  strategies depend on these identifiers.
- **Catalogue migration hatch** — an optional `migrate(old_params)
  -> new_params` on a BlockHandler that upgrades persisted block
  instances when a param is added, removed, or renamed.
  Use sparingly; prefer stability.

## Market data concepts

These name the seams around external price data.

- **Price Provider** — the abstraction over an external source of
  crypto price data (spot and/or OHLCV). The seam that lets the app
  fail over between vendors. _Avoid_: data source, feed, API.
- **CryptoCompare** — the current (and first) Price Provider. Hits
  `min-api.cryptocompare.com`. Config/keys use `cryptocompare_*`.
  Commercially this is "CoinDesk Data" (CoinDesk acquired
  CryptoCompare in 2022); reserve **CoinDesk** for the billing /
  subscription relationship only, not the code. _Avoid_: CoinDesk
  (in code), vendor.

## Strategy & roadmap concepts

These name the strategic bets the roadmap is built on. Use them
exactly so the roadmap, brainstorm, and future work share one
vocabulary. See `docs/ROADMAP.md` and `docs/BRAINSTORM.md` for the
reasoning; ADR-0006 for the execution-free decision.

- **Activation** — the share of signups who reach a *first completed
  backtest*. The north-star metric: the only moment the core promise
  is delivered. _Avoid_: "onboarding done", "conversion", "signup
  rate".
- **Idea check** — the wedge: a user types a trading idea in plain
  English, the system drafts an auditable strategy graph on the
  canvas (one draft, accept/edit/reject), and a trusted backtest
  returns an honest verdict. Generation→verification, human on the
  leash. _Avoid_: "NL wedge", "type your idea", "idea adjudication",
  "resolve a belief".
- **Verified-result artifact** — a public, linkable, screenshot-ready
  page for a single honest backtest result. The organic distribution
  unit; distributes the result, not a follower count. _Avoid_:
  "Wordle result", "share card", "social post".
- **Signals-only handoff** — the one permitted notch up the autonomy
  slider: a verification-gated alert or export for a *backtested*
  strategy. Augmentation without custody — we hand off, never trade.
  _Avoid_: "execution", "automation", "live trading".
- **Verification engine** — the backtest engine *as the moat*:
  trusted, conservative, transparent about fees/slippage/limitations,
  free of look-ahead bias. When the point is defensibility ("people
  believe the number"), say verification engine; reserve plain
  "Engine"/"Backtest" for the runtime components above.

## Adjacent terms (not yet load-bearing, on the radar)

- **Strategy validator** — semantic checker for a whole strategy
  (connectivity, required signals, duplicate risk blocks).
  Currently backend-only (`services/strategy_validation.py`);
  candidate for promotion to a shared seam.
- **TradeExit vocabulary** — the enum of exit reasons (`tp`, `sl`,
  `signal`, …). Currently implicit; candidate for a small shared
  module.
