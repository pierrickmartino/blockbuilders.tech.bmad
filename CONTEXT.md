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
- **Shared backtest** — a public, link-only view of a single
  backtest *result*, reached by an unguessable token
  (`/share/backtests/{token}`). Three defining properties:
  *token-gated* (not on a profile, not tied to a handle),
  *result-only* (shows metrics + equity curve, **never** the
  strategy graph), and *verification-gated* (only a real Backtest
  can produce one). The surviving organic-distribution artifact
  (the "Wordle result" pattern) — distinct from Publish, which it
  outlives when vanity-social surfaces are frozen. _Avoid_: publish
  (that is profile visibility), public profile, share link.
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

## Analytics concepts

These name the activation north-star and its instrumentation.

- **Activation** — the north-star moment: a user *sees the verdict*
  of their **first** backtest (equity curve + narrative actually
  rendered to the human), not merely the backend job finishing.
  Canonically the first per-user occurrence of the **results_viewed**
  event, fired identically across every entry path (wizard, manual
  run, NL wedge). A draft the user ultimately rejects still counts —
  they witnessed an honest verdict — so Activation is recorded on
  verdict render, independent of any later keep/reject, and survives
  the NL-wedge hard-delete (ADR-0006). _Avoid_: "completed backtest"
  meaning the backend `status == "completed"` row; equating
  activation with job completion.
- **results_viewed** — the single canonical client event marking that
  the human saw a backtest verdict; its first occurrence per
  identified user *is* Activation. Client-side and consent-gated, so
  the canonical activation rate is read over consenting users, with
  the server-side job-completion count kept only as a coverage check.
  Per-user identity comes from `posthog.identify(user.id)` at auth.
  _Avoid_: `backtest_completed`, `auto_backtest_completed` (these are
  job-completion telemetry, not view events, and must not be used as
  the activation signal).

## Adjacent terms (not yet load-bearing, on the radar)

- **Strategy validator** — semantic checker for a whole strategy
  (connectivity, required signals, duplicate risk blocks).
  Currently backend-only (`services/strategy_validation.py`).
  **Promotion committed** (not yet built): the NL wedge
  (`docs/BRAINSTORM.md` decision #3) makes it a generation-time
  gate — every LLM-drafted graph must pass the validator (with a
  repair pass on failure) *before* the auto-backtest, so a
  malformed draft never reaches the user. This moves it from
  optional check toward load-bearing seam.
- **TradeExit vocabulary** — the enum of exit reasons (`tp`, `sl`,
  `signal`, …). Currently implicit; candidate for a small shared
  module.
- **Alert** — a user-configured rule that fires a **Notification**
  (and optionally a webhook export to an execution platform) when a
  condition is met. The shipped "signals-only / no custody" surface
  (`alert_rules` table, `AlertsApiClient`): Blockbuilders never
  trades, an Alert only pings the user / hands off elsewhere. Two
  subtypes: a **performance alert** (bound to a strategy, evaluated
  on its scheduled auto re-backtest) and a **price alert** (a bare
  asset+threshold tripwire on spot price, with optional webhook).
  **Target rules the shipped code does not yet meet:** a performance
  alert should be *verification-gated* (creatable only for a
  backtested strategy) and *bound to the frozen Strategy version*
  that was backtested — not the mutable working copy — and should
  fire on **closed candles of the backtested timeframe**, so it
  inherits the engine's trust at both the logic and data levels.
  Editing the working copy must not change what a live Alert watches.
  The bare **price alert** does *not* inherit engine trust (no
  strategy, spot-evaluated) — it is the "blind alert" the brainstorm
  guardrail warns against; treat it as a separate un-verified product
  or gate it. _Avoid_: signal (reserved for the internal port/block
  concept), trigger (use "Alert" for the rule, "fires" for the
  event), notification (that is the delivered message, not the rule),
  webhook (one delivery channel, not the concept).
- **Notification** — a delivered message in the user's inbox
  (`notify_in_app`) or email (`notify_email`), e.g. a finished
  backtest or a fired Alert. The *message*, distinct from the
  **Alert** *rule* that produced it. _Avoid_: alert (that is the
  rule), signal.
