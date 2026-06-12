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
- **Trust page** — the public, standalone "How Backtests Work"
  methodology page (`/how-backtests-work`) that documents the
  engine's assumptions (default fees/slippage/spread, next-candle-open
  execution, OHLCV-only, completed-candles-only / no look-ahead) in
  plain language. The marketed face of the verification moat
  (`docs/ACTIONS.md` #10): it lives **outside** the app shell
  (no auth gate, no sidebar) so a prospect arriving from a **Shared
  backtest** can read it, and is linked from *every result* (in-app
  result, compare, Shared backtest). A single canonical public URL.
  _Avoid_: treating it as an in-app reference page like the
  metrics-glossary / strategy-guide (those stay inside the app shell,
  chromed and auth-gated); calling it a generic "docs page".
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
- **Entry path** — *how a strategy came to exist*, the launch-surface
  cohort dimension for the activation funnel. Four values:
  `wizard`, `blank_canvas`, `template_clone`, `nl_wedge`. Orthogonal to
  **Authoring mode**. Supersedes the original three-valued
  `entry_path` (`manual | wizard | nl_wedge`): the old catch-all
  `manual` is split into the two paths it was hiding (`blank_canvas`,
  `template_clone`). _Avoid_: `manual` (retired — it conflated blank
  canvas with template clone); reusing this for authoring method.
- **AI-drafted** — the user-facing provenance label for a strategy
  born from the NL wedge, rendered as a badge wherever the strategy
  surfaces (list, canvas header, result page). A pure projection of
  `entry_path = nl_wedge` — **no new column, no new status**. Marks
  *origin*, not current authorship: it is permanent and **survives
  Edit** (a heavily hand-edited AI draft is still "AI-drafted"), so it
  intentionally tracks `entry_path` (origin), not `authoring_mode`
  (which a human edit would falsify). _Avoid_: "AI-generated" /
  "AI-built" (overclaim ongoing AI authorship the user's edits may have
  replaced); a separate `is_ai` flag (redundant with `entry_path`).
- **Authoring mode** — *how the strategy graph was authored*, the
  second cohort dimension, orthogonal to **Entry path**. Two values:
  `nl` (drafted from the natural-language box) and `manual` (assembled
  on the canvas, including the wizard and template paths). Lets the NL
  wedge be measured against hand-authoring (ACTIONS #7) independently
  of which surface launched the strategy. _Avoid_: folding this into
  `entry_path`; note `nl_wedge` (an entry path) and `nl` (an authoring
  mode) are related but distinct — an NL-drafted strategy is
  `entry_path = nl_wedge`, `authoring_mode = nl`.
- **Time to activation** — the latency form of **Activation**: elapsed
  time from a user's `signup_completed` to their **first**
  `results_viewed` (first verdict viewed). Derived in PostHog as the
  activation funnel's time-to-convert; sliceable by **Entry path** /
  **Authoring mode**. _Avoid_: `time_to_first_backtest` (the name
  implies the *job/run*, reviving the job-vs-view drift ADR-0008
  retired); anchoring the terminal on `backtest_started` or
  `backtest_job_completed`.
- **Draft outcome** — the terminal disposition of an NL draft after the
  user reviews its verdict (ACTIONS #5), logged as a single graded
  dimension on the `nl_draft_*` event family, **not** a boolean
  accept/reject. Four values: `accepted` (kept + shareable artifact
  minted), `edited` (kept, chose to refine on the canvas — fires when
  the user clicks **Edit**, not on a provable graph mutation), `kept`
  (stays in the list, no artifact — the abandonment-modal "Keep" or a
  hard browser exit), `rejected` (hard-deleted per ADR-0006). `edited`
  is first-class on purpose: it is the drafter's most actionable signal
  (a draft that was *close* enough to keep but the user felt they had to
  refine), so collapsing it into `accepted` is forbidden. **Decoupled from Activation**: the
  outcome says nothing about whether the user activated — a `rejected`
  draft still counts as Activation (the verdict was witnessed; see
  **Activation**, which survives the hard-delete). _Avoid_: a boolean
  accept/reject (ACTIONS #5's stale framing); folding `edited`/`kept`
  into `accepted`; treating `rejected` as un-activation.

- **Onboarding arm** — the randomized onboarding front door a *new* user
  is assigned to for the #7 A/B (ADR-0014): `nl_wedge` (the natural-language
  box) vs `wizard` (the status-quo default). The control is the **wizard**,
  the surface new users actually meet today (`auth/callback` routes
  un-onboarded users to `?wizard=true`) — *not* the "blank canvas" the
  backlog title names. Distinct from **Entry path**: the arm is the surface a
  user was *assigned* (intent-to-treat, fixed at signup), while `entry_path`
  records the surface a strategy was *actually* born from. _Avoid_: "NL vs
  blank canvas" (the blank canvas is not the new-user control — the wizard
  is); conflating the assigned arm with the realized `entry_path`.

## First-run & retention surfaces

These name two distinct result-page cards that the backlog (`docs/ACTIONS.md`
#3, #12) repeatedly conflates as "the narrative card". They are different
components with different lifecycles — keep them apart.

- **What-you-learned card** — the **first-run-only**, frontend-computed
  strategy-vs-buy-and-hold delta summary shown once per device under the
  `bb.first_run_summary_card_seen` gate, suppressed when benchmark data is
  absent. The card the retention A/B (#3) manipulates. See
  `frontend/src/components/WhatYouLearnedCard.tsx`. _Avoid_: "narrative card"
  (that is a different, always-on component); "showFirstRunExplanations"
  (a flag name that does not exist in code).
- **Narrative card** — the **always-on**, backend-generated prose verdict
  rendered on every completed run that has a narrative (not first-run-scoped).
  Left **on in both arms** of the #3 A/B, so it is never the experiment's
  manipulated variable. See `frontend/src/components/NarrativeCard.tsx` and
  `backend/app/backtest/narrative.py`. _Avoid_: equating with the
  What-you-learned card; treating it as first-run-gated.

## Adjacent terms (not yet load-bearing, on the radar)

- **Strategy validator** — semantic checker for a whole strategy
  (connectivity, required signals, duplicate risk blocks).
  Currently backend-only (`services/strategy_validation.py`).
  **Promotion committed** (not yet built): the NL wedge
  (`docs/BRAINSTORM.md` decision #3) makes it a generation-time
  gate — every drafted graph must pass the validator (with a
  repair pass on failure) *before* the auto-backtest, so a
  malformed draft never reaches the user. This moves it from
  optional check toward load-bearing seam.
- **Strategy drafter** — the seam that turns a natural-language
  idea into a candidate strategy graph (the NL wedge,
  `docs/ACTIONS.md` #4). Provider-agnostic by design: like the
  **Price Provider**, it abstracts an external vendor (the LLM)
  behind one interface so the model can be swapped or configured
  (Anthropic, OpenAI, OpenRouter, …) without touching callers. Its
  output is untrusted and is only ever surfaced after passing the
  **Strategy validator**; an accepted draft becomes an ordinary
  **Working copy** (ADR-0006). _Avoid_: "draft" alone (the UI
  already calls the working copy the "draft" — the drafter
  *produces* one, it is not the thing produced); "generator".
- **Repair pass** — the single, bounded LLM re-generation triggered
  when a drafted graph *compiles* but fails the **Strategy validator**
  (`docs/ACTIONS.md` #8). The model is shown its prior draft and the
  failing checks and asked to fix them. Distinct from two neighbours it
  is easily confused with: the **Strategy drafter**'s library-level
  *schema-retries* (which fix the IR's *shape*, not its *legality*, and
  are invisible to callers), and a user **reject** (a *valid,
  backtested* draft the user discards — ADR-0006 — not a malformed
  one). A repair that still fails the validator ends in a **decline**:
  the draft is never surfaced broken. _Avoid_: "retry" (ambiguous
  across all three — name the layer); calling a deterministic
  param-clamp or default-injection a repair pass (there is none — repair
  is always model re-generation, to preserve faithfulness to the user's
  idea).
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
