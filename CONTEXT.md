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
  backtest, which overwrites it. All its lifecycle transitions —
  eager **create** (seeded with the default definition or with a
  template / NL-draft / duplicate definition), **get**, autosave
  **save**, **freeze** (content-dedup → **Strategy version**), and the
  not-yet-built **restore** — live in one transaction-agnostic Working
  copy module (`services/working_copy.py`): every function flushes and
  the calling route or worker owns the commit, and `strategy_versions`
  is written *only* by its freeze path (ADR-0005). _Avoid_: treating the
  working copy as a version, or reserving a magic `version_number = 0`
  for it.
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
  action, unrelated to versioning or backtests. **Frozen** (`docs/ACTIONS.md`
  #18 / ADR-0023): the public profile it feeds is gated off behind
  `social_features_enabled`, and `is_published` never had a setter in the
  first place — so Publish is dormant, not live. _Avoid_: using
  "publish" for freezing a version or for autosave.
- **Shared backtest** — a public, link-only view of a single
  backtest *result*, reached by an unguessable token
  (`/share/backtests/{token}`). Three defining properties:
  *token-gated* (not on a profile, not tied to a handle),
  *result-only* (shows metrics, equity curve, narrative, and a
  cost disclosure — but **never** the strategy graph *or the
  idea/name* that produced it), and *verification-gated* (only a
  real Backtest can produce one). The surviving organic-distribution
  artifact (the "Wordle result" pattern): a *social-card-ready*
  surface whose link unfurls into a rich preview carrying the
  honest result itself (asset, return, drawdown, equity sparkline)
  — the actual number travels, not a brand or a follower count.
  Distinct from Publish, which it outlives when vanity-social
  surfaces are frozen. _Avoid_: publish (that is profile
  visibility), public profile, share link; reading "result-only"
  as "metrics-only" (it includes narrative + costs) or as licence
  to expose the strategy graph/idea.
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
- **Comparison run** — a **Backtest** re-executed solely to
  manufacture a *coachable pair* for **Tweak coaching**: an engine
  re-run of a **Strategy version** over the *intersection window* of
  two selected runs (same asset/timeframe/costs), tagged
  `triggered_by='comparison'` (`docs/ACTIONS.md` #19). Minted **only**
  when the two selected runs' windows differ; an already-aligned pair
  is coached directly with no re-run. Walled off like an `auto`
  re-backtest is a byproduct: excluded from the mainline run history,
  from **Activation** (never fires `results_viewed`), and from
  alert-pinning (ADR-0021). _Avoid_: treating it as a user-initiated
  backtest; letting it inflate the activation north-star; coalescing
  it into the `manual`/`auto` `triggered_by` values.
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
- **Backtest pipeline** — the deterministic assembly that turns a
  validated **Strategy version** plus its candles into a **RunOutcome**:
  it runs the **Interpreter** → **Engine**, computes the benchmark curve
  and metrics (return / alpha / beta), serializes the three result
  artifacts (equity curve, benchmark curve, and trades via the
  **Backtest trades artifact**), and maps the engine result onto the
  run's metric fields. **Pure** — no DB, S3, Redis, or candle fetch: it
  takes a `ValidatedStrategy` + candles + `BacktestParams` and *returns a
  value*, so it is unit-testable without the worker. Sits one level above
  the **Engine** (`run_backtest`, the trade simulator) and must not be
  confused with it. The worker (`worker/jobs.py`) is the thin shell
  around it — run status transitions, candle fetch, artifact upload,
  post-run side-effects (notifications / alerts / onboarding / analytics)
  and error→status mapping all stay in the shell. _Avoid_: calling it the
  engine or the runner; giving it I/O; folding the post-run side-effects
  into it.
- **RunOutcome** — the immutable value the **Backtest pipeline** returns:
  the result metrics, the benchmark metrics (return / alpha / beta), the
  `used_backup_data` flag, and the three ready-to-upload artifact
  payloads. The worker copies its metrics onto the **Backtest** run row
  and uploads its payloads. _Avoid_: putting artifact S3 keys on it (the
  worker assigns those after upload); mutating it.

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
- **Explanation template** — a short phrase string carried by each
  **catalogue** output `PortSpec` (`explain`), projected into
  `blocks.ts`, that the canvas renders into the plain-English strategy
  summary. Plain `{param_name}` substitution only — no conditionals —
  with an absent param falling back to the **ParamSpec** default. The
  single source of an indicator/input block's phrasing, co-located with
  the **BlockHandler** that computes it, so a new catalogue block ships
  its explanation with its spec instead of being hand-mirrored on the
  client. Scope is **catalogue leaf blocks only**: **logic** blocks
  (composed by the client explanation generator) and the inline **risk**
  blocks (out of catalogue scope) keep their client-side formatting.
  _Avoid_: a template DSL with branching; duplicating the port `label`
  (a UI caption, not a phrase); a server round-trip (the canvas
  explanation is rendered client-side, live, per keystroke).
- **Block type identifier** — the string in `BlockSpec.type`
  (`"sma"`, `"rsi"`, …). **Stable forever** once shipped.
  Renames are forbidden; deprecate-and-add instead. Persisted
  strategies depend on these identifiers.
- **Catalogue migration hatch** — an optional `migrate(old_params)
  -> new_params` on a BlockHandler that upgrades persisted block
  instances when a param is added, removed, or renamed.
  Use sparingly; prefer stability.
- **Strategy diff** — the deterministic *semantic* comparison of two
  **Strategy versions**' definition graphs (`docs/ACTIONS.md` #19):
  per-block param changes, block add/remove, and connection changes,
  with each changed block classified **risk-block** (the six
  inline-config risk blocks — `stop_loss`, `take_profit`,
  `trailing_stop`, `position_size`, `time_exit`, `max_drawdown`) vs
  **structural** (catalogue `indicator`/`logic`/`signal` blocks).
  The seam that gates **Tweak coaching**'s two tiers: an
  all-risk-block-param diff leaves the entry/exit **signals
  byte-identical** (causal tier); any structural change moves entries
  (descriptive tier). Blocks matched by id. _Avoid_: a visual/canvas
  diff (this is semantic, for attribution, not a rendered overlay);
  importing the NL-wedge "there is no diff" framing (ADR-0012 had no
  baseline — here two versions exist).
- **Backtest trades artifact** — the canonical serialized form of a
  **Backtest**'s trades, persisted as `trades.json`
  (`services/backtest_trades_artifact.py`). The single seam that owns
  the per-trade wire schema and its backward-compatible decode:
  `dump_trades(list[Trade]) -> list[dict]` and
  `load_trades(list[dict]) -> list[TradeDetail]`. Tolerant of older
  artifacts (added/optional fields default; an absent `pnl_pct` is
  *recomputed* from entry/exit, never silently `0`) but strict on
  structure (a record missing `entry_time`/`exit_time` raises). **Pure**
  — S3 read/write stays in `backtest/storage.py`; the module never
  touches infra. Every reader crosses it (status response, trade detail,
  compare), replacing the hand-built dict in `worker/jobs.py` and the
  duplicate re-parsing across `api/backtests.py` and
  `services/backtest_responses.py`. _Avoid_: re-deriving the trade dict
  shape at any call site; folding S3 I/O into it; widening it to the
  equity/benchmark curve files (plain point lists with no per-field
  decode — out of scope).

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
- **Sentiment feed** — the abstraction over an external source of a
  single market-**sentiment** indicator (latest value + short history),
  mirroring the **Price Provider** pattern but *not* its failover: three
  independent feeds — fear/greed (Alternative.me), long/short and funding
  (Binance) — each from one vendor, behind a small `SentimentFeed`
  protocol (a thin httpx `fetch` wrapping a pure `parse`). One
  `collect_sentiment(asset)` module assembles their readings into a
  snapshot carrying per-feed `SourceStatus`; partial availability is
  expected (one feed down still returns the others). Distinct from the
  **Price Provider** (price / OHLCV, multi-vendor failover, ADR-0003) and
  the single-writer spot cache (ADR-0002): no circuit breaker, no
  failover, and the 15-minute response cache stays in the route.
  _Avoid_: folding it into the Price Provider or its router; giving it a
  breaker; caching inside the feed.

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
- **Tweak coaching** — the deterministic, *comparative* explanation of
  **why** a re-tested **Strategy version**'s backtest differs from an
  earlier version's, surfaced via an **"Explain this delta"** action on
  the existing compare surface (`docs/ACTIONS.md` #19, Group G). The
  retention loop's payoff: it turns a tweak-and-re-test into a learning
  step. **Diagnostic, never advisory** — it states what changed in the
  graph and what that change did to the trades and the result, never
  what the user *should* do next (honours the "never a tip" guardrail,
  #20). Two tiers gated on the **Strategy diff**: *causal* per-trade
  attribution only when every change is a risk-block param edit (signals
  unchanged, trades matched by `entry_time` into matched / A-only /
  B-only buckets, each exit difference attributed via its
  `exit_reason`); otherwise *descriptive* — the change-list plus the
  engine-computed net delta, with **no** causal claim. The net delta is
  always engine-truth; the bucket narrative must reconcile to it, never
  replace it. Distinct from the single-run **Narrative card** (verdict
  prose) and the **What-you-learned card** (first-run buy&hold delta),
  and from the per-trade **exit explanations** (`explanation.py`, which
  say *what* exited, not *why your edit changed it*). _Avoid_: "coaching"
  as advice/tips; conflating with the Narrative card; asserting a cause
  when any structural block changed.

## Adjacent terms (not yet load-bearing, on the radar)

- **Felt severity** — the dollar form of the buy-and-hold comparison: the
  result expressed not as a percentage-point delta but as money this idea
  *would have cost or made you versus simply holding* (`docs/ACTIONS.md` #12).
  Defined as `final_balance − initial_balance·(1 + benchmark_return_pct/100)`,
  framed by four loss-aware regimes (delta sign × the strategy's own P/L), and
  surfaced on **both** result cards. **Committed (not yet built):** lands in the
  **What-you-learned card** (colored green/red, the variable the #3 A/B tests)
  and as an uncolored prose sentence in the **Narrative card** (no
  `BacktestSummary` shape change). Only emitted when the strategy diverges from
  the benchmark (`|alpha| > 0.05`), so an absent benchmark — which the engine
  collapses to `0.0` — never produces a dollar figure. See the ADR-0010
  amendment for how it folds into the #3 experiment. _Avoid_: equating with the
  pp-only "alpha" sentence already in `narrative.py`; calling it CAPM alpha
  (the engine's `alpha` is a plain return delta, not beta-adjusted).
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
  (and optionally an **Execution handoff** webhook) when a
  condition is met. The shipped "signals-only / no custody" surface
  (`alert_rules` table, `AlertsApiClient`): Blockbuilders never
  trades, an Alert only pings the user / hands off elsewhere. Two
  subtypes: a **performance alert** (bound to a strategy, evaluated
  on its scheduled auto re-backtest) and a **price alert** (a bare
  asset+threshold tripwire on spot price, with optional webhook).
  **Target rules the shipped code does not yet meet (#16 hardening):**
  a performance alert is *result-anchored* — created from the **backtest
  result page** ("ping me when *this* triggers") and *pinned to the
  exact frozen Strategy version whose verdict the user is viewing*, not
  the mutable working copy. This makes it *verification-gated* for free
  (a result page implies a completed backtest) and makes the trust
  inheritance literal (it watches the precise version that was
  believed). It should also fire on **closed candles of the backtested
  timeframe**, so it inherits the engine's trust at both the logic and
  data levels. Editing the working copy must not change what a live
  Alert watches (passive edits never move the pin). Cardinality is
  **one active performance alert per strategy**: re-binding to a newer
  version is a *deliberate* act (creating from a newer result page
  re-pins old→new, replacing — never accumulating per-version zombies),
  and a pin left behind by edits is surfaced as a **stale alert** but
  never auto-moved. Evaluation is **alert-driven** (`triggered_by='alert'`,
  decoupled from `auto_update_enabled`), keyed to a `last_fired_candle_ts`
  watermark; archive deactivates, delete cascades. Full design in
  **ADR-0021**.
  The bare **price alert** does *not* inherit engine trust (no
  strategy, spot-evaluated) — it is the "blind alert" the brainstorm
  guardrail warns against. **Resolved (#16):** it is walled off as a
  separate un-verified product, *not* folded into the trust story and
  *not* gated on a backtest (gating a spot tripwire on a backtest is
  incoherent — there is no strategy to verify). #16 hardens only the
  **performance alert**. _Avoid_: signal (reserved for the internal port/block
  concept), trigger (use "Alert" for the rule, "fires" for the
  event), notification (that is the delivered message, not the rule),
  webhook (one delivery channel, not the concept).
- **Notification** — a delivered message in the user's inbox
  (`notify_in_app`) or email (`notify_email`), e.g. a finished
  backtest or a fired Alert. The *message*, distinct from the
  **Alert** *rule* that produced it. _Avoid_: alert (that is the
  rule), signal.
- **Execution handoff** — the optional outbound webhook channel on a
  **performance alert** (`docs/ACTIONS.md` #17): when the pinned
  **Strategy version** fires on a closed candle, Blockbuilders POSTs a
  *signal-framed* JSON event (asset, timeframe, `event` =
  entry/exit/drawdown, the closed-candle timestamp, strategy name, a
  result link) to a user-supplied URL — **never an order** (no
  side/size/leverage/price target), so "the hand-off, never the trade"
  stays literally true. A third delivery channel beside in-app and
  email, riding the #16/ADR-0021 firing decision; one POST per discrete
  event (not coalesced like the human-facing Notification),
  fire-and-forget. Generic (any inbound-webhook sink: 3Commas, Cornix,
  relays) — **not** TradingView (a webhook *source*, not a sink) and
  **not** a downloadable artifact. Full design in **ADR-0022**.
  _Avoid_: "export" (the stale #17 title — implies a downloadable
  Pine/CSV artifact this is not); order, trade signal; folding it into
  the un-verified bare price-alert webhook.
- **Literacy track** — _(on the radar, `docs/ACTIONS.md` #15, not
  built)_ an ordered, content-bearing **curriculum** that ramps a
  user from intuition toward competence *by testing real ideas*,
  sequencing existing assets (metrics glossary, strategy guide,
  contextual tooltips, seed templates, the Narrative /
  What-you-learned cards) into staged units. Organized as a small
  set of ordered **Modules**, each holding several template-anchored
  **Lessons**. Navigation is **open**: ordering supplies a recommended
  next step plus a progress bar, never a gate — every lesson is a
  directly-linkable, indexable page (a hard unlock would break both the
  SEO surface and template-keyed completion, which can land
  out-of-order). A *taught sequence* — categorically distinct from the
  **Milestone** surface below (passive activity badges). Full design
  in **ADR-0020**. _Avoid_: conflating with the `/progress` milestones;
  "course" / "tutorial" (reserve "Literacy track").
- **Milestone** — the existing auto-derived, non-persisted boolean
  signposts on `/progress` (`first_strategy`, `saved_version`,
  `first_backtest`, `reviewed_results`) plus their threshold
  **achievement** badges, computed from strategy/backtest counts.
  Renamed from the code's current "lesson" to free that word for a
  **Literacy track** unit. Marks *what you've done*, not *what you've
  been taught*. **Distinct from — and untouched by — the frozen profile
  badges** (`services/badges.py`'s `first_public_strategy` / `ten_followers`
  / `hundred_backtests`, surfaced only on the public profile and gated off
  by ADR-0023): Milestones are activation/onboarding scaffolding and
  survive the #18 freeze. _Avoid_: "lesson" (now reserved for a Literacy
  track unit); conflating the kept `/progress` Milestones with the frozen
  vanity profile badges.
- **Module** — _(on the radar, not built)_ the mid-level grouping of
  a **Literacy track**: a small set of ordered modules named for the
  learning arc (intuition → risk & drawdown → playbook), each holding
  several template-anchored **Lessons**. The track's pedagogical spine
  and a natural public/SEO landing unit (one page per module);
  template `difficulty` maps onto module boundaries. Surfaced as a
  **hybrid** (the **Trust page** / ADR-0017 pattern): the module/lesson
  *teaching* is a public, indexable content shell readable logged-out
  (which makes it the public home for the otherwise auth-gated
  glossary / strategy-guide content — the `docs/ACTIONS.md` #14
  follow-up), while the clone→backtest action and per-user progress
  require auth. _Avoid_: "chapter" / "stage" / "section" (reserve
  "Module"); flattening modules into a single lesson list.
- **Lesson** — _(on the radar, not built)_ one unit of a **Literacy
  track**, anchored on a single seed **template**: the user clones it,
  runs its backtest, and surrounding glossary / strategy-guide content
  frames the concept that template was built to teach (the template's
  `teaches_description`). The hands-on backtest *is* the teaching, not
  a footnote. A Lesson is **complete** when the user first *views the
  verdict* of a backtest on its template (the `results_viewed` act,
  attributed **template-keyed** via a strategy's source template — any
  door counts, not only a track-initiated clone). Completion is
  **durable and monotonic**: recorded once and surviving later archive
  / delete of the practice strategy, exactly like **Activation**
  (never derived from current rows). _Avoid_: equating with a
  **Milestone** (an activity badge, not a taught unit); a Lesson with
  no tested idea (the test is the pedagogy); deriving completion on
  read (it must survive deletion).
