"""Completed-run side-effects, extracted from the backtest worker (ADR-0025).

finalize_run applies the four side-effects that follow a successful backtest:
completion notification, auto-run timestamp, old-style alert evaluation, and
onboarding flag.  It owns its own session.commit() (ADR-0025: finalization owns
its commit and runs after the completion commit in the worker shell).
"""
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.user import User
from app.services.alert_evaluator import evaluate_alerts_for_run

logger = logging.getLogger(__name__)


def finalize_run(run: BacktestRun, session: Session) -> None:
    """Apply the four completed-run side-effects for *run* and commit them.

    Owns its own session.commit() (ADR-0025: finalization owns its commit and
    runs after the completion commit).  Called only from the success path;
    exceptions must be caught by the caller so a side-effect failure never
    re-fails a completed run.
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
    if run.triggered_by == "auto":
        strategy = session.exec(
            select(Strategy).where(Strategy.id == run.strategy_id)
        ).first()
        if strategy:
            strategy.last_auto_run_at = datetime.now(timezone.utc)
            session.add(strategy)
        evaluate_alerts_for_run(run, session)

    # Alert-dispatched run: evaluate pinned-version conditions (stays in jobs.py
    # for this slice; lazy import avoids a circular dependency)
    if run.triggered_by == "alert":
        from app.worker import jobs as _jobs
        _jobs._evaluate_pinned_alert(run, session)

    # Mark user as onboarded on their first completed backtest
    onboarding_user = session.get(User, run.user_id)
    if onboarding_user and not onboarding_user.has_completed_onboarding:
        onboarding_user.has_completed_onboarding = True
        session.add(onboarding_user)

    session.commit()
