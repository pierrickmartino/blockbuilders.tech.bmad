"""Alert evaluation service for performance alerts.

Alerts are evaluated only for scheduled re-backtests (triggered_by='auto').
Entry/exit signals and drawdown alerts are checked FOR TODAY only:
- Entry alert: triggers if a trade was entered on the last day of the backtest
- Exit alert: triggers if a trade was exited on the last day of the backtest
- Drawdown alert: triggers if the CURRENT drawdown (at backtest end) exceeds threshold
"""
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


def _parse_timestamp(ts: Any) -> datetime | None:
    """Parse a timestamp string or datetime to datetime object."""
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts
    try:
        # Handle ISO format strings
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _is_same_date(dt1: datetime | None, dt2: datetime | None) -> bool:
    """Check if two datetimes are on the same calendar date."""
    if dt1 is None or dt2 is None:
        return False
    return dt1.date() == dt2.date()


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

    # Evaluate conditions - all alerts check FOR TODAY (the last day of the backtest)
    reasons = []
    last_backtest_date = run.date_to  # The end date represents "today" for scheduled runs

    # 1. Check drawdown threshold FOR TODAY (current drawdown, not historical max)
    if rule.threshold_pct is not None and run.equity_curve_key:
        try:
            equity_curve = download_json(run.equity_curve_key)
            if equity_curve:
                # Calculate current drawdown from peak to last equity value
                peak_equity = max(pt.get("equity", 0) for pt in equity_curve)
                last_equity = equity_curve[-1].get("equity", peak_equity)
                if peak_equity > 0:
                    current_drawdown = ((peak_equity - last_equity) / peak_equity) * 100
                    if current_drawdown >= rule.threshold_pct:
                        reasons.append(
                            f"current drawdown {current_drawdown:.1f}% ≥ {rule.threshold_pct}%"
                        )
        except Exception as e:
            logger.warning(f"Failed to fetch equity curve for drawdown eval: {e}")

    # 2. Check entry/exit signals FOR TODAY (fetch trades from S3)
    trades = []
    if run.trades_key and (rule.alert_on_entry or rule.alert_on_exit):
        try:
            trades = download_json(run.trades_key)
        except Exception as e:
            logger.warning(f"Failed to fetch trades from S3 for alert eval: {e}")

    # Entry alert: check if any trade was entered TODAY (on the last day of backtest)
    if rule.alert_on_entry:
        for t in trades:
            entry_time = _parse_timestamp(t.get("entry_time"))
            if _is_same_date(entry_time, last_backtest_date):
                reasons.append("entry signal today")
                break

    # Exit alert: check if any trade was exited TODAY (on the last day of backtest)
    if rule.alert_on_exit:
        for t in trades:
            exit_time = _parse_timestamp(t.get("exit_time"))
            if _is_same_date(exit_time, last_backtest_date):
                reasons.append("exit signal today")
                break

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
