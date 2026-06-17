# ADR-0022 — Export to execution platforms is a signal handoff, not an order

- **Status**: Accepted
- **Date**: 2026-06-17
- **Related**: [ADR-0021](./0021-performance-alert-inherits-engine-trust.md)
  (performance alert is result-anchored, version-pinned, fires on closed
  candles), [ADR-0007](./0007-subscription-gates-on-depth-not-throughput.md)
  (alerts + export are a Premium expansion lever), [ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md)
  (the trust/honesty brand); [CONTEXT.md](../../CONTEXT.md) — Alert,
  Notification, Execution handoff, Strategy version; `docs/ACTIONS.md` #17

## Context

ACTIONS #17 ("Export to execution platforms") proposes letting a user
hand a *backtested* strategy to 3Commas / TradingView so they act on the
verified version instead of rebuilding it and trading on vibes. The
2026-06-05 title bundles three architecturally unrelated mechanisms — a
live webhook, a downloadable static config (Pine / 3Commas), and a CSV —
and predates ADR-0021, which since reshaped the performance alert into a
trust-inheriting, version-pinned, closed-candle firing surface.

Two hard constraints frame the decision:

- **Signals-only / zero custody (brainstorm decision #1).** Blockbuilders
  never holds funds and never trades. Anything that *directs* a trade
  (side, size, leverage, price targets) erodes that guardrail and invites
  investment-advice / regulatory exposure.
- **The trust moat is the verified number (ADR-0017).** Any path that
  re-implements the engine elsewhere (e.g. a generated Pine port) forks
  the verdict the user actually verified.

The codebase already ships the relevant plumbing: `alert_rules` carries
`notify_webhook` / `webhook_url` with SSRF validation (`validate_webhook_url`
in `api/alerts.py`) and live delivery (`_send_price_alert_webhook` in
`worker/jobs.py`) — but only on the **price** alert, which does *not*
inherit engine trust.

## Decision

**#17 is a generic outbound *webhook* added to the #16/ADR-0021
performance alert, carrying a signal-framed event — never an order. The
hand-off, never the trade.**

- **Mechanism: a webhook channel, not a downloadable artifact.** The
  webhook is a third delivery channel beside in-app and email, reusing
  the existing `alert_rules.notify_webhook` / `webhook_url` columns on the
  **performance alert** (no new table). It rides ADR-0021's firing
  decision, so it inherits engine trust (result-anchored, version-pinned,
  closed candles only). **#17 therefore depends on #16.**
- **Generic outbound sink; TradingView dropped as a destination.** We POST
  documented JSON to a user-supplied URL (3Commas signal bots, Cornix,
  relays, the user's own endpoint). TradingView is a webhook *source*, not
  a sink — it cannot be POSTed to — so it is not a target. The payload is
  generic, not platform-proprietary.
- **Signal framing, enforced by omission.** The payload states the *event
  that fired* — `type`, `event` (`entry`/`exit`/`drawdown_threshold`),
  `asset`, `timeframe`, the **closed** `candle_ts`, `strategy_name`,
  `strategy_version_id`, `result_url`, `fired_at`, plus `exit_reason` /
  `drawdown_pct` where relevant. It deliberately **omits** every order
  primitive: no `side`/buy/sell verb, no size, no leverage, no live price
  target — and never the strategy graph. What the receiver does with the
  signal is the user's pre-configured choice on their platform.
- **The Shared-backtest gag does not transfer.** Including `strategy_name`
  and `result_url` is fine here: the webhook goes to a sink the *user
  themselves* configured (their data, their endpoint), unlike the public
  **Shared backtest**, whose result-only gag exists to stop the idea
  leaking to strangers.
- **Per-event delivery, fire-and-forget.** The human-facing in-app/email
  Notification stays **coalesced** (ADR-0021); the webhook emits **one
  POST per discrete fired event, in order** — an execution sink needs
  entry@T1 and exit@T3 as two ordered events, not one merged "something
  happened." Delivery matches the shipped price-alert posture: 10s
  timeout, structured logging, **no retry / DLQ** (no new infra per
  `backend/CLAUDE.md`), and `follow_redirects=False` (a redirect is an
  SSRF bypass; the price path is flagged to match). The
  `last_fired_candle_ts` watermark **advances regardless of webhook
  success** — a flaky sink must not re-fire the in-app notification
  forever, so a failed POST is simply lost (honest cost of
  fire-and-forget).
- **SSRF: reuse at create/update only.** `validate_webhook_url` (HTTPS-only,
  blocks private/loopback/link-local) is wired into the performance branch
  of `AlertRuleCreate` / `AlertRuleUpdate`. We knowingly accept the same
  DNS-rebinding / TOCTOU gap the shipped code has; a standing channel
  widens it, so "re-validate at fire / egress allowlist / pin resolved IP"
  is a recorded security follow-up.
- **Ungated for now.** ADR-0007 names export a Premium lever, but ADR-0021
  deferred the *whole* performance-alert entitlement gate as its own
  slice. Gating only the webhook checkbox while the alert it rides on is
  free is incoherent and would force inventing an alert entitlement axis
  (`PLAN_LIMITS` has none) mid-slice. Ship ungated; the webhook becomes
  Premium when the ADR-0021 entitlement follow-up lands.
- **Surface: the result page only.** Config (a "send to a webhook"
  toggle + URL) lives in `PerformanceAlertPanel` — the sole
  performance-alert surface (ADR-0021) — with an inline honesty
  disclosure ("Blockbuilders posts a *signal*; it never places a trade or
  moves funds") and a "what we send" example, so the custody boundary is
  visible at the exact moment a user wires up an execution sink.

Out of scope:

- **CSV** is split off as its own data-export slice (a download of result
  data, unrelated to execution, the alert, or signal framing).
- **The Premium entitlement gate** — folded into the ADR-0021 follow-up.
- **Outbound-webhook egress hardening** (rebinding/TOCTOU) — security
  follow-up.

## Alternatives considered

- **Generate TradingView Pine Script (static export).** Rejected, and not
  merely deferred: a block graph → Pine port is a lossy compiler, and a
  port that diverges from our engine produces a *different* result than
  the one the user verified — silently forking the trust moat (ADR-0017).
  This is anti-thesis, not a backlog item.
- **A downloadable 3Commas "config" artifact.** Rejected: 3Commas signal
  bots are driven by the inbound webhook we already build; DCA bots are
  configured in 3Commas' own UI. There is no meaningful static artifact to
  emit.
- **Order-framed payload (side/size/leverage/TP/SL).** Rejected: even
  without custody, directing a trade reads as investment advice and
  breaks "never the trade." We *have* the simulated risk-block outputs but
  deliberately do not export them.
- **A separate `webhook_exports` table.** Rejected: duplicates ADR-0021's
  firing/idempotency machinery and splits "what does my alert do" across
  two rows. The webhook is just a delivery channel on the existing rule.
- **Coalesce the webhook like the in-app Notification.** Rejected: a
  merged message is useless to an execution bot, which needs discrete
  ordered transitions.

## How to apply

- **Backend authors**: accept `notify_webhook` / `webhook_url` on the
  performance branch of `AlertRuleCreate` / `AlertRuleUpdate`; call
  `validate_webhook_url` there. In the performance-alert firing path, after
  the coalesced Notification, loop the ordered fired events and POST one
  signal-framed payload each (`follow_redirects=False`, 10s timeout,
  log-on-failure). Never include order primitives or the strategy graph.
  Never gate watermark advancement on delivery.
- **Frontend authors**: webhook config is in `PerformanceAlertPanel`
  only; render the honesty disclosure and the "what we send" example;
  HTTPS-only hint.
- **Reviewers**: a PR that adds `side`/size/leverage/price-target to the
  payload, exports the strategy graph, targets TradingView, generates
  Pine, retries silently in a way that re-fires the in-app notification,
  or gates watermark advancement on webhook success is a boundary change —
  require it to reopen this ADR.
