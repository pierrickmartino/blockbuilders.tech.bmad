# OpenAI Codex Review — Still-Valid Comments (PR #655 → latest)

**Scope:** OpenAI Codex (`chatgpt-codex-connector[bot]`) comments on closed PRs from
#655 up to the most recent PR, re-evaluated against the current `main`
(`b5f72df`, which already includes the merges of #722 and #723).

**Method:** Each Codex finding was re-read against the current code on `main`. A
comment is listed as **VALID** only if the underlying issue still exists in the
current tree; comments that later PRs already resolved are listed separately at
the end.

> Note: PR #655 itself (`docs(ai): report 2026-06-13`) received **no** Codex
> comments — only a Vercel deployment bot comment. The Codex-reviewed closed PRs
> in range are **#664, #713, #714, #722, #723**.

---

## Summary

| # | PR | Sev | File | Title | Status |
|---|----|-----|------|-------|--------|
| 1 | #664 | P2 | `backend/tests/test_golden_backtest_regression.py` | Use the Bollinger template's 4h cadence | **VALID** |
| 2 | #713 | P2 | `backend/app/api/alerts.py` | Initialize the watermark from the source run | **VALID** |
| 3 | #713 | P2 | `backend/app/worker/jobs.py` | Bind alert evaluation to the run's pinned version | **VALID** |
| 4 | #713 | P2 | `backend/app/worker/jobs.py` | Suppress completion notifications for alert runs | **VALID** |
| 5 | #714 | P1 | `frontend/src/components/backtest/PerformanceAlertPanel.tsx` | Match alerts to the viewed result before editing | **VALID** |
| 6 | #714 | P2 | `backend/app/services/performance_alert_decision.py` | Ignore partial take-profit trades for exit alerts | **VALID** |
| 7 | #722 | P2 | `backend/app/api/alerts.py` | Require a URL when enabling performance webhooks | **VALID** |
| 8 | #723 | P2 | `backend/app/worker/jobs.py` | Bound the added exit webhook fan-out | **VALID** |
| — | #713 | P1 | `backend/app/schemas/alert.py` | Wire the UI before requiring `backtest_run_id` | Resolved |
| — | #713 | P2 | `backend/app/schemas/alert.py` | Reject unsupported performance-alert conditions | Resolved |

**8 of 10** Codex findings are still valid on the latest branch.

---

## Valid comments (still applicable on `main`)

### 1. [#664 · P2] Use the Bollinger template's 4h cadence
- **File:** `backend/tests/test_golden_backtest_regression.py`
- **Source:** [PR #664 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/664#discussion_r3410978052)
- **Original finding:** The Bollinger Breakout seed template's metadata sets
  `timeframe` to `4h`, and cloned strategies inherit it, but the golden fixture
  stamps **daily** candles and runs through the shared 1d `_RUN_CONFIG`. Because
  `run_backtest` annualizes risk metrics by `timeframe` and trade durations come
  from candle timestamps, the golden locks CAGR/Sharpe/durations for a mode users
  do not get by default and would not catch a regression in the 4h
  cadence/annualization path.
- **Validity check on `main`:**
  - Fixture still stamps `timeframe="1d"` and daily timestamps
    (`_bollinger_breakout_candles`, `test_golden_backtest_regression.py:591-592`)
    and still passes the 1d `_RUN_CONFIG` (`:632`, `_RUN_CONFIG["timeframe"] == "1d"` at `:94`).
  - The template is genuinely 4h: `strategy_templates.py:1283` → `"timeframe": "4h"`
    for `"name": "Bollinger Breakout"` (`:1265`).
- **Verdict: VALID.** The golden snapshot still asserts 1d-derived metrics for a
  template that ships as 4h, so the 4h annualization path remains unguarded.

### 2. [#713 · P2] Initialize the watermark from the source run
- **File:** `backend/app/api/alerts.py`
- **Source:** [PR #713 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/713#pullrequestreview-4512588426)
- **Original finding:** Creating a pinned performance alert never copies the source
  run's `date_to` into `last_fired_candle_ts`, so a new alert starts with a null
  watermark. `decide_entry_alert` treats `None` as "no prior evaluation", so any
  historical entry inside the strategy lookback can produce an immediate
  "triggered" notification even though it happened before the user enabled the alert.
- **Validity check on `main`:**
  - `create_alert` builds the `AlertRule` without setting `last_fired_candle_ts`
    (`alerts.py:229-241`), and the re-pin branch explicitly resets it to `None`
    (`alerts.py:216`).
  - `decide_entry_alert` only filters trades when `watermark is not None`
    (`performance_alert_decision.py:74-78`); with a `None` watermark every entry in
    the lookback window fires. `decide_exit_alert` behaves the same (`:122-124`).
- **Verdict: VALID.** Newly created/re-pinned alerts still start with a null
  watermark and can fire on pre-creation trades on their first evaluation run.

### 3. [#713 · P2] Bind alert evaluation to the run's pinned version
- **File:** `backend/app/worker/jobs.py`
- **Source:** [PR #713 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/713#pullrequestreview-4512588426)
- **Original finding:** The post-completion lookup keys only by `strategy_id`, so an
  old alert-triggered run can update whichever active alert exists when it
  finishes. If the user disables/recreates or re-pins the alert while a previous
  run is pending, the old run's trades are evaluated against the new rule and its
  watermark is advanced — causing a false notification or a skipped evaluation for
  the newly pinned version.
- **Validity check on `main`:**
  - `_evaluate_pinned_alert` still selects the rule by
    `strategy_id == run.strategy_id`, `alert_type == PERFORMANCE`, `is_active == True`
    only (`jobs.py:430-436`). There is **no** comparison of
    `run.strategy_version_id` against `rule.strategy_version_id` before firing and
    advancing the watermark (`:563-568`); the pinned version is used only to build
    the webhook payload (`:536`).
- **Verdict: VALID.** A completed alert run is still matched to the rule without
  verifying it targets the rule's currently pinned version.

### 4. [#713 · P2] Suppress completion notifications for alert runs
- **File:** `backend/app/worker/jobs.py`
- **Source:** [PR #713 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/713#pullrequestreview-4512588426)
- **Original finding:** Every run goes through `run_backtest_job`, which
  unconditionally adds a "Backtest completed" notification before the alert
  decision hook. For active alerts that do not fire, the daily dispatcher still
  creates a completion notification every day, turning silent monitoring into
  notification spam.
- **Validity check on `main`:**
  - `run_backtest_job` still creates the `backtest_completed` `Notification`
    unconditionally for every completed run (`jobs.py:328-335`), then runs the
    alert hook afterwards (`:350-351`). There is no `triggered_by == "alert"`
    guard around the completion notification.
- **Verdict: VALID.** Each daily/sub-daily alert-dispatched run still emits a
  generic "Backtest completed" notification regardless of whether the alert fired.

### 5. [#714 · P1] Match alerts to the viewed result before editing
- **File:** `frontend/src/components/backtest/PerformanceAlertPanel.tsx`
- **Source:** [PR #714 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/714#pullrequestreview-4512878389)
- **Original finding:** When a user has a migrated/deactivated performance alert
  (migration 041 keeps those rows) or an active alert pinned to a different
  strategy version, the lookup treats it as the alert for the currently viewed
  result solely because the strategy matches. The save path then PATCHes that old
  row without `backtest_run_id` and preserves its old `is_active`, so users cannot
  recreate a new pinned alert after migration and cannot deliberately re-pin from a
  newer result. The panel needs to distinguish the alert pinned to this run/version
  or fall back to creating/replacing from `backtestRunId`.
- **Validity check on `main`:**
  - The lookup still matches purely on type + strategy, ignoring version and the
    viewed run: `allAlerts?.find((a) => a.alert_type === "performance" && a.strategy_id === strategyId)`
    (`PerformanceAlertPanel.tsx:69-72`). It does not filter by `is_active`, so a
    migrated/deactivated row is still selected.
  - When `existingRule` is found, save always PATCHes it
    (`AlertsApiClient.update(existingRule.id, …)`) with no `backtest_run_id` and
    `is_active: existingRule.is_active` (`:100-108`) — it cannot re-pin from a newer
    result.
- **Verdict: VALID.** The panel still binds to any performance alert for the
  strategy rather than the alert pinned to the viewed run/version, and edits PATCH
  the old row.

### 6. [#714 · P2] Ignore partial take-profit trades for exit alerts
- **File:** `backend/app/services/performance_alert_decision.py`
- **Source:** [PR #714 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/714#pullrequestreview-4512878389)
- **Original finding:** For multi-level take-profit blocks where an earlier level
  closes less than 100% of the position, the engine records a `tp` trade for the
  partial exit while the position remains open. `decide_exit_alert` appends an exit
  event for every non-`end_of_data` trade, so an exit alert can notify the user the
  strategy "exited a position" even though it only scaled out and is still long.
- **Validity check on `main`:**
  - `decide_exit_alert` still fires for **every** trade whose `exit_reason` is not
    `end_of_data` (`performance_alert_decision.py:112-126`); there is no
    full-close vs partial-`tp` distinction.
  - The engine genuinely emits partial `tp` trades with the position still open:
    `PositionManager.apply_partial` records a `Trade` with `exit_reason="tp"`
    and only decrements `self._position_size` (`position_manager.py:321-340`),
    driven by the take-profit ladder (`:319`, `engine.py:109-110`).
- **Verdict: VALID.** A partial scale-out still produces a `tp` trade that
  `decide_exit_alert` reports as a full exit.

### 7. [#722 · P2] Require a URL when enabling performance webhooks
- **File:** `backend/app/api/alerts.py`
- **Source:** [PR #722 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/722#pullrequestreview-4514850864)
- **Original finding:** A PATCH that enables a performance alert webhook without
  also providing a URL persists `notify_webhook=true` even when the rule has no
  `webhook_url`. The firing path requires both fields, so the API reports webhook
  notifications as enabled but no POST can ever be sent. Creation already rejects
  `notify_webhook=true` without `webhook_url`; the update path should enforce the
  same invariant.
- **Validity check on `main`:**
  - `update_alert` (performance branch) sets `notify_webhook` and `webhook_url`
    independently with no cross-field check (`alerts.py:287-291`).
  - Creation does enforce it (`alert.py:47-49`), and the firing path requires both
    (`jobs.py:530` → `if rule.notify_webhook and rule.webhook_url`).
- **Verdict: VALID.** The PATCH path still lets a performance alert end up with
  `notify_webhook=true` and a null `webhook_url`, silently disabling delivery.

### 8. [#723 · P2] Bound the added exit webhook fan-out
- **File:** `backend/app/worker/jobs.py`
- **Source:** [PR #723 review](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/723#discussion_r3427751864)
- **Original finding:** Alert runs are enqueued with `job_timeout=300`, and each
  payload is posted synchronously through `post_webhook`, whose `httpx.Client`
  waits up to 10s per stalled delivery. A 1h catch-up producing ~20 entry/exit
  pairs against a stalling endpoint becomes ~40 serial calls, so the worker can be
  killed before the watermark update is committed — and the same alert re-fires
  instead of advancing, regardless of webhook success. Bound/defer the posts or
  persist the watermark before slow delivery.
- **Validity check on `main`:**
  - Webhook events are still posted synchronously in a serial loop
    (`jobs.py:560-561`) **before** the watermark is advanced (`:564-568`) and
    committed back in `run_backtest_job` (`:359`).
  - `post_webhook` still uses a 10s timeout (`:1234`) and the dispatchers still
    enqueue with `job_timeout=300` (`:689`, `:806`). Entry, exit, and drawdown
    events all fan out (`:543-558`), so the worst-case serial delivery time can
    exceed the job timeout.
- **Verdict: VALID.** Slow webhook deliveries can still exhaust the job timeout
  before the watermark commit, causing re-fires.

---

## Resolved by later changes (no longer valid)

### [#713 · P1] Wire the UI before requiring `backtest_run_id`
- **File:** `backend/app/schemas/alert.py`
- **Original finding:** The new validator rejects any performance-alert creation
  that omits `backtest_run_id`, but the shipped creation surface
  (`frontend/src/hooks/use-strategy-alerts.ts`) only sent `strategy_id`, so saving
  a new performance alert returned a 422.
- **Why resolved:** The validator is still present (`alert.py:38-40`), but the UI
  was wired. `use-strategy-alerts.ts` now sends `backtest_run_id` and guards on its
  presence (`if (!backtestRunId) throw …` then `AlertsApiClient.create({ …, backtest_run_id: backtestRunId })`,
  `:83-96`), and `PerformanceAlertPanel.tsx` passes `backtest_run_id` on create
  (`:88-98`). Creation through the shipped UI no longer 422s.

### [#713 · P2] Reject unsupported performance-alert conditions
- **File:** `backend/app/schemas/alert.py`
- **Original finding:** The schema accepted `threshold_pct`-only or
  `alert_on_exit`-only performance alerts, but at the time the dispatcher only
  selected `alert_on_entry == True` and the run hook only called
  `decide_entry_alert`, so exit/drawdown alerts were never enqueued or evaluated.
- **Why resolved:** Exit and drawdown handling shipped in #714 and #720–#723. The
  dispatchers now enqueue for entry **or** exit **or** drawdown
  (`jobs.py:629-633`, `:744-748`), and `_evaluate_pinned_alert` evaluates all three
  via `decide_entry_alert` / `decide_exit_alert` / `decide_drawdown_alert`
  (`:464-490`). Accepting those conditions is now correct.

---

_Generated by re-evaluating Codex review comments against `main` @ `b5f72df`._
