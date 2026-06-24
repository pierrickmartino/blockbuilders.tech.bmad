"""Completed-run side-effects, extracted from the backtest worker (ADR-0025).

finalize_run applies the four side-effects that follow a successful backtest:
completion notification, auto-run timestamp, old-style alert evaluation, and
onboarding flag.  It owns its own session.commit() (ADR-0025: finalization owns
its commit and runs after the completion commit in the worker shell).

For alert-dispatched runs, _evaluate_pinned_alert assembles a DeliveryIntent
and stages all database mutations (notification + watermark) without committing.
finalize_run commits everything once, then delivers best-effort via
_deliver_intent so the watermark is always durable before any network I/O.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any

import resend
from sqlmodel import Session, select

from app.core.config import settings
from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.user import User
from app.services.alert_evaluator import evaluate_alerts_for_run
from app.services.delivery_intent import DeliveryIntent, EmailMessage, WebhookPost
from app.services.performance_alert_decision import (
    decide_entry_alert,
    decide_exit_alert,
    decide_drawdown_alert,
    format_exit_reason,
)
from app.services.webhook_payload import build_drawdown_payload, build_entry_payload, build_exit_payload

logger = logging.getLogger(__name__)

# Bounded webhook fan-out constants (relocated from worker/jobs.py per ADR-0025).
MAX_ALERT_WEBHOOK_EVENTS = 20
ALERT_WEBHOOK_TIME_BUDGET_SECONDS = 60.0


def _as_utc_datetime(value: datetime | None) -> datetime | None:
    """Normalise database datetimes to UTC-aware values before comparison."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)



# ── Bounded webhook fan-out ───────────────────────────────────────────────────

def _post_webhooks_bounded(url: str, payloads: list[dict]) -> None:
    """Post webhook payloads serially under a count + wall-clock budget.

    post_webhook is fire-and-forget (swallows failures); here we additionally
    cap the number of posts and stop once the time budget is exhausted so a
    catch-up burst against a slow endpoint cannot run away with the worker.
    """
    import app.worker.jobs as _jobs_module  # lazy — jobs imports run_finalization

    capped = payloads[:MAX_ALERT_WEBHOOK_EVENTS]
    dropped = len(payloads) - len(capped)
    deadline = time.monotonic() + ALERT_WEBHOOK_TIME_BUDGET_SECONDS

    delivered = 0
    for payload in capped:
        if time.monotonic() >= deadline:
            dropped += len(capped) - delivered
            break
        _jobs_module.post_webhook(url, payload)
        delivered += 1

    if dropped > 0:
        logger.warning(
            "alert_webhook_fanout_truncated",
            extra={"delivered": delivered, "dropped": dropped},
        )


# ── Pinned-alert evaluator ────────────────────────────────────────────────────

def _evaluate_pinned_alert(run: BacktestRun, session: Session) -> DeliveryIntent | None:
    """Post-completion hook for triggered_by='alert' runs.

    Evaluates entry, exit, and drawdown crossing conditions against the alert's
    pinned version.  Stages the notification and watermark advance via
    session.add() but does NOT commit — finalize_run owns the single commit so
    the watermark is always committed before any delivery attempt.

    Returns None if the evaluator skipped (version mismatch, missing rule).
    Returns a DeliveryIntent (possibly with no email/webhooks) otherwise.
    """
    from app.backtest.storage import download_json as _download_json

    rule = session.exec(
        select(AlertRule).where(
            AlertRule.strategy_id == run.strategy_id,
            AlertRule.alert_type == AlertType.PERFORMANCE,
            AlertRule.is_active == True,  # noqa: E712
        )
    ).first()
    if not rule or rule.strategy_version_id is None:
        return None

    # Only evaluate runs that target the rule's currently pinned version. An
    # old alert-triggered run that completes after the user re-pinned (or
    # disabled/recreated) the alert must not fire against the new rule or
    # advance its watermark — that would cause a false notification or skip the
    # newly pinned version's first evaluation.
    if run.strategy_version_id != rule.strategy_version_id:
        logger.info(
            "pinned_alert_version_mismatch",
            extra={
                "rule_id": str(rule.id),
                "run_version_id": str(run.strategy_version_id),
                "rule_version_id": str(rule.strategy_version_id),
            },
        )
        return None

    # Snapshot watermark and drawdown state before any mutation
    watermark = _as_utc_datetime(rule.last_fired_candle_ts)
    last_drawdown_pct = rule.last_drawdown_pct

    trades: list[dict] = []
    if run.trades_key and (rule.alert_on_entry or rule.alert_on_exit):
        try:
            trades = _download_json(run.trades_key) or []
        except Exception as exc:
            logger.warning("alert_trades_fetch_failed", extra={"error": str(exc)})

    equity_curve: list[dict] = []
    if run.equity_curve_key and rule.threshold_pct is not None:
        try:
            equity_curve = _download_json(run.equity_curve_key) or []
        except Exception as exc:
            logger.warning("alert_equity_fetch_failed", extra={"error": str(exc)})

    reasons: list[str] = []
    fired_entry_events: list[Any] = []
    fired_exit_events: list[Any] = []
    drawdown_fired = False

    if rule.alert_on_entry:
        entry_result = decide_entry_alert(trades, watermark, run.date_to, run.timeframe)
        if entry_result.fired_events:
            fired_entry_events = entry_result.fired_events
            reasons.append(
                f"entered a position on {entry_result.fired_events[0].entry_time.date()}"
            )

    if rule.alert_on_exit:
        exit_result = decide_exit_alert(trades, watermark, run.date_to, run.timeframe)
        if exit_result.fired_events:
            fired_exit_events = exit_result.fired_events
            ev = exit_result.fired_events[0]
            reason_label = format_exit_reason(ev.exit_reason)
            reasons.append(f"exited a position on {ev.exit_time.date()} ({reason_label})")

    new_drawdown_pct = last_drawdown_pct
    if rule.threshold_pct is not None:
        dd_result = decide_drawdown_alert(equity_curve, rule.threshold_pct, last_drawdown_pct)
        new_drawdown_pct = dd_result.current_drawdown_pct
        if dd_result.fired:
            drawdown_fired = True
            reasons.append(
                f"drawdown {dd_result.current_drawdown_pct:.1f}% crossed threshold"
                f" {rule.threshold_pct}%"
            )

    # Assemble delivery intent — assembled here, executed only after the commit below.
    email_message: EmailMessage | None = None
    webhook_post: WebhookPost | None = None

    if reasons:
        strategy = session.exec(
            select(Strategy).where(Strategy.id == run.strategy_id)
        ).first()
        strategy_name = strategy.name if strategy else str(run.strategy_id)
        reasons_text = "; ".join(reasons)

        notification = Notification(
            user_id=run.user_id,
            type="performance_alert",
            title="Performance alert triggered",
            body=f'"{strategy_name}" {reasons_text}.',
            link_url=f"/strategies/{run.strategy_id}/backtest?run={run.id}",
        )
        session.add(notification)

        if rule.notify_email and settings.resend_api_key:
            user = session.get(User, run.user_id)
            if user and user.email:
                strategy_url = (
                    f"{settings.frontend_url}/strategies/{run.strategy_id}"
                    f"/backtest?run={run.id}"
                )
                email_message = EmailMessage(
                    from_="Blockbuilders <noreply@blockbuilders.tech>",
                    to=[user.email],
                    subject=f"Performance alert triggered — {strategy_name}",
                    html=(
                        f"<p>Your strategy <strong>{strategy_name}</strong>:</p>"
                        f"<ul>{''.join(f'<li>{r}</li>' for r in reasons)}</ul>"
                        f'<p><a href="{strategy_url}">View backtest results</a></p>'
                    ),
                )

        if rule.notify_webhook and rule.webhook_url:
            result_url = (
                f"{settings.frontend_url}/strategies/{run.strategy_id}/backtest?run={run.id}"
            )
            _common = dict(
                strategy_name=strategy_name,
                strategy_version_id=str(rule.strategy_version_id),
                asset=run.asset or "",
                timeframe=run.timeframe or "",
                result_url=result_url,
            )
            # Collect (candle_ts, payload) for all fired events, sort chronologically
            webhook_events: list[tuple[datetime, dict]] = []
            for ev in fired_entry_events:
                webhook_events.append((
                    ev.entry_time,
                    build_entry_payload(candle_ts=ev.entry_time, **_common),
                ))
            for ev in fired_exit_events:
                webhook_events.append((
                    ev.exit_time,
                    build_exit_payload(candle_ts=ev.exit_time, exit_reason=ev.exit_reason, **_common),
                ))
            if drawdown_fired:
                run_date_to_utc = _as_utc_datetime(run.date_to) or datetime.now(timezone.utc)
                webhook_events.append((
                    run_date_to_utc,
                    build_drawdown_payload(candle_ts=run_date_to_utc, drawdown_pct=new_drawdown_pct, **_common),
                ))
            webhook_events.sort(key=lambda t: t[0])
            webhook_post = WebhookPost(
                url=rule.webhook_url,
                payloads=[payload for _, payload in webhook_events],
            )

    # Stage watermark advance and drawdown state — no commit here; finalize_run
    # commits everything once before any delivery so the watermark is always
    # durable before a network call (ADR-0021 ordering guarantee).
    new_watermark = _as_utc_datetime(run.date_to)
    rule.last_fired_candle_ts = new_watermark
    rule.last_drawdown_pct = new_drawdown_pct
    rule.updated_at = datetime.now(timezone.utc)
    session.add(rule)

    logger.info(
        "pinned_alert_evaluated",
        extra={
            "rule_id": str(rule.id),
            "fired_count": len(reasons),
            "new_watermark": str(new_watermark.date()) if new_watermark else None,
        },
    )

    return DeliveryIntent(email=email_message, webhooks=webhook_post)


# ── Delivery ──────────────────────────────────────────────────────────────────

def _deliver_intent(intent: DeliveryIntent) -> None:
    """Best-effort delivery of email and webhooks from a DeliveryIntent.

    Called only after finalize_run commits the watermark, so any delivery
    failure cannot cause the alert to re-fire.
    """
    if intent.email is not None:
        try:
            resend.api_key = settings.resend_api_key
            resend.Emails.send({
                "from": intent.email.from_,
                "to": intent.email.to,
                "subject": intent.email.subject,
                "html": intent.email.html,
            })
        except Exception as exc:
            logger.error("alert_email_failed", extra={"error": str(exc)})

    if intent.webhooks is not None:
        _post_webhooks_bounded(intent.webhooks.url, intent.webhooks.payloads)


# ── Main entry point ──────────────────────────────────────────────────────────

def finalize_run(run: BacktestRun, session: Session) -> None:
    """Apply the four completed-run side-effects for *run* and commit them.

    Owns its own session.commit() (ADR-0025: finalization owns its commit and
    runs after the completion commit).  Called only from the success path;
    exceptions must be caught by the caller so a side-effect failure never
    re-fails a completed run.

    For alert-dispatched runs, _evaluate_pinned_alert stages DB mutations and
    returns a DeliveryIntent.  finalize_run commits once, then delivers so the
    watermark is always durable before any network I/O (ADR-0021).
    """
    # Completion notification — silent for alert-dispatched and comparison runs
    if run.triggered_by not in ("alert", "comparison"):
        notification = Notification(
            user_id=run.user_id,
            type="backtest_completed",
            title="Backtest completed",
            body=f"{run.asset}/{run.timeframe} backtest finished.",
            link_url=f"/strategies/{run.strategy_id}/backtest?run={run.id}",
        )
        session.add(notification)

    # Auto-run: touch strategy timestamp and evaluate old-style (un-pinned) alerts
    auto_intent: DeliveryIntent | None = None
    if run.triggered_by == "auto":
        strategy = session.exec(
            select(Strategy).where(Strategy.id == run.strategy_id)
        ).first()
        if strategy:
            strategy.last_auto_run_at = datetime.now(timezone.utc)
            session.add(strategy)
        auto_intent = evaluate_alerts_for_run(run, session)

    # Alert-dispatched run: evaluate pinned-version conditions and collect intent
    intent: DeliveryIntent | None = None
    if run.triggered_by == "alert":
        intent = _evaluate_pinned_alert(run, session)

    # Mark user as onboarded on their first completed backtest
    onboarding_user = session.get(User, run.user_id)
    if onboarding_user and not onboarding_user.has_completed_onboarding:
        onboarding_user.has_completed_onboarding = True
        session.add(onboarding_user)

    # Single commit for all staged DB writes (notification, watermark, onboarding)
    session.commit()

    # Best-effort delivery after the commit — watermark is durable before network I/O
    if auto_intent is not None:
        _deliver_intent(auto_intent)
    if intent is not None:
        _deliver_intent(intent)
