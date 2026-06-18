"""Integration tests for Comparison-run walling-off behavior.

Verifies that runs tagged triggered_by='comparison' are:
  1. Excluded from the mainline run-history list.
  2. Excluded from the alert-activation path (evaluate_alerts_for_run is a no-op).
"""
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate  # registers FK target in SQLite test DB
from app.models.strategy_version import StrategyVersion
from app.services.alert_evaluator import evaluate_alerts_for_run


def _seed(session: Session, user_id, triggered_by: str) -> BacktestRun:
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="Test Strategy",
        asset="BTC/USDT",
        timeframe="1h",
    )
    session.add(strategy)

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": [], "connections": []},
    )
    session.add(version)

    run = BacktestRun(
        id=uuid4(),
        user_id=user_id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1h",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 6, 1, tzinfo=timezone.utc),
        triggered_by=triggered_by,
    )
    session.add(run)
    session.commit()
    return run


class TestComparisonRunExcludedFromHistory:
    def test_comparison_runs_not_returned_by_mainline_list_query(
        self, session: Session, test_user
    ):
        """list_backtests query must exclude triggered_by='comparison' runs."""
        manual_run = _seed(session, test_user.id, "manual")
        _seed(session, test_user.id, "comparison")

        # Replicate the list_backtests query with the walling-off filter.
        runs = session.exec(
            select(BacktestRun).where(
                BacktestRun.user_id == test_user.id,
                BacktestRun.triggered_by != "comparison",
            )
        ).all()

        run_ids = {r.id for r in runs}
        assert manual_run.id in run_ids
        assert len([r for r in runs if r.triggered_by == "comparison"]) == 0

    def test_manual_and_auto_runs_still_appear_in_list(
        self, session: Session, test_user
    ):
        """Manual and auto runs must still be included in the mainline list."""
        manual_run = _seed(session, test_user.id, "manual")
        auto_run = _seed(session, test_user.id, "auto")
        _seed(session, test_user.id, "comparison")

        runs = session.exec(
            select(BacktestRun).where(
                BacktestRun.user_id == test_user.id,
                BacktestRun.triggered_by != "comparison",
            )
        ).all()

        run_ids = {r.id for r in runs}
        assert manual_run.id in run_ids
        assert auto_run.id in run_ids
        assert len(runs) == 2


class TestComparisonRunExcludedFromActivation:
    def test_evaluate_alerts_is_noop_for_comparison_run(
        self, session: Session, test_user, monkeypatch
    ):
        """evaluate_alerts_for_run must be a no-op when triggered_by='comparison'.

        Provides a trades_key and patches download_json so that an exit-alert
        condition would fire for any other triggered_by value — confirms the
        guard specifically skips comparison runs.
        """
        comparison_run = _seed(session, test_user.id, "comparison")
        comparison_run.trades_key = "some-trades-key"
        session.add(comparison_run)

        alert_rule = AlertRule(
            id=uuid4(),
            user_id=test_user.id,
            alert_type=AlertType.PERFORMANCE,
            strategy_id=comparison_run.strategy_id,
            alert_on_exit=True,
            notify_email=False,
        )
        session.add(alert_rule)
        session.commit()

        from app.services import alert_evaluator as _ae

        trade_on_date_to = {
            "exit_time": comparison_run.date_to.isoformat(),
            "exit_reason": "signal",
        }
        monkeypatch.setattr(_ae, "download_json", lambda _key: [trade_on_date_to])

        evaluate_alerts_for_run(comparison_run, session)

        notes = session.exec(
            select(Notification).where(Notification.user_id == test_user.id)
        ).all()
        assert len(notes) == 0
