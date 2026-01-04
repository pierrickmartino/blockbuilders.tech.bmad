"""Alert evaluation service for performance alerts."""
import logging
from datetime import datetime, timezone
from typing import Any

import resend
from sqlmodel import Session, select

from app.core.config import settings
from app.models.alert_rule import AlertRule
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.backtest.storage import get_s3_client, download_json

logger = logging.getLogger(__name__)


def evaluate_alerts_for_run(run: BacktestRun, session: Session) -> None:
    """
    Evaluate alert conditions for a completed backtest run.

    Only processes alerts if:
    - Run is triggered by 'auto' (scheduled re-backtest)
    - An active alert rule exists for the strategy
    - Conditions haven't already been checked for this run
    """
    # Query active alert rule for this strategy
    rule = session.exec(
        select(AlertRule)
        .where(
            AlertRule.strategy_id == run.strategy_id,
            AlertRule.is_active == True  # noqa: E712
        )
        .with_for_update()  # Prevent race conditions
    ).first()

    if not rule:
        return  # No alert rule configured

    # Check if we already processed this run
    if rule.last_triggered_run_id == run.id:
        logger.debug(f"Alert rule {rule.id} already processed for run {run.id}")
        return

    # Fetch strategy for notification context
    strategy = session.exec(
        select(Strategy).where(Strategy.id == run.strategy_id)
    ).first()
    if not strategy:
        logger.error(f"Strategy {run.strategy_id} not found for alert evaluation")
        return

    # Evaluate conditions
    reasons = []

    # 1. Check drawdown threshold
    if rule.threshold_pct is not None and run.max_drawdown is not None:
        if run.max_drawdown >= rule.threshold_pct:
            reasons.append(f"drawdown {run.max_drawdown:.1f}% ≥ {rule.threshold_pct}%")

    # 2. Check entry/exit signals (fetch trades from S3)
    trades = []
    if run.trades_key and (rule.alert_on_entry or rule.alert_on_exit):
        try:
            trades = download_json(run.trades_key)
        except Exception as e:
            logger.warning(f"Failed to fetch trades from S3 for alert eval: {e}")

    # Entry alert: check if trades list is non-empty
    if rule.alert_on_entry and len(trades) > 0:
        reasons.append("entry signal")

    # Exit alert: check if any trade has exit_time
    if rule.alert_on_exit and any(t.get("exit_time") is not None for t in trades):
        reasons.append("exit signal")

    # If no conditions triggered, return early
    if not reasons:
        return

    # Create in-app notification
    reasons_text = ", ".join(reasons)
    notification = Notification(
        user_id=run.user_id,
        type="performance_alert",
        title="Performance alert triggered",
        body=f'"{strategy.name}" triggered alert: {reasons_text}',
        link_url=f"/strategies/{run.strategy_id}/backtest?run={run.id}",
    )
    session.add(notification)

    # Send email if enabled
    if rule.notify_email and settings.resend_api_key:
        try:
            # Get user email
            from app.models.user import User
            user = session.exec(select(User).where(User.id == run.user_id)).first()
            if user and user.email:
                strategy_url = f"{settings.frontend_url}/strategies/{run.strategy_id}/backtest?run={run.id}"
                html_body = f"""
                <p>Your strategy <strong>{strategy.name}</strong> triggered a performance alert:</p>
                <ul>
                    {"".join(f"<li>{reason}</li>" for reason in reasons)}
                </ul>
                <p><a href="{strategy_url}">View backtest results</a></p>
                """

                resend.api_key = settings.resend_api_key
                resend.Emails.send({
                    "from": "Blockbuilders <noreply@blockbuilders.tech>",
                    "to": [user.email],
                    "subject": f"Performance alert triggered - {strategy.name}",
                    "html": html_body,
                })
                logger.info(f"Alert email sent to {user.email} for run {run.id}")
        except Exception as e:
            # Don't fail the alert if email fails
            logger.error(f"Failed to send alert email: {e}")

    # Update alert rule metadata
    rule.last_triggered_run_id = run.id
    rule.last_triggered_at = datetime.now(timezone.utc)
    session.add(rule)

    logger.info(f"Alert triggered for strategy {strategy.name}: {reasons_text}")
