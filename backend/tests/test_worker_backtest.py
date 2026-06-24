"""Worker integration tests for backtest validation failure paths."""
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session

from app.backtest.pipeline import RunOutcome
from app.backtest.types import RiskParams, ValidatedStrategy, ValidationResult
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.worker import jobs


def _stub_outcome() -> RunOutcome:
    return RunOutcome(
        final_balance=10500.0,
        total_return_pct=5.0,
        cagr_pct=60.0,
        max_drawdown_pct=2.0,
        num_trades=3,
        win_rate_pct=66.7,
        sharpe_ratio=1.5,
        sortino_ratio=2.0,
        calmar_ratio=30.0,
        max_consecutive_losses=1,
        gross_return_usd=500.0,
        gross_return_pct=5.0,
        total_fees_usd=10.0,
        total_slippage_usd=5.0,
        total_spread_usd=3.0,
        total_costs_usd=18.0,
        cost_pct_gross_return=3.6,
        avg_cost_per_trade_usd=6.0,
        benchmark_return_pct=3.0,
        alpha=2.0,
        beta=0.8,
        used_backup_data=False,
        equity_curve_payload=[],
        benchmark_curve_payload=[],
        trades_payload=[],
    )


def _patch_success_path(monkeypatch, *, fail_finalize: bool = False) -> None:
    stub_validation = ValidationResult(
        errors=(),
        strategy=ValidatedStrategy(blocks=(), connections=(), risk_params=RiskParams()),
    )
    monkeypatch.setattr(jobs, "validate_strategy", lambda parsed: stub_validation)
    monkeypatch.setattr(jobs, "fetch_candles", lambda *a, **kw: [])
    monkeypatch.setattr(jobs, "run_pipeline", lambda strategy, candles, params: _stub_outcome())
    monkeypatch.setattr(jobs, "upload_json", lambda key, payload: None)
    monkeypatch.setattr(jobs, "track_backend_event", lambda *a, **kw: None)
    monkeypatch.setattr(jobs, "flush_backend_events", lambda *a, **kw: None)

    if fail_finalize:
        def _boom(run, session):
            raise RuntimeError("injected finalization failure")
        monkeypatch.setattr(jobs, "finalize_run", _boom)


def _create_pending_run(engine, user, definition_json: dict) -> BacktestRun:
    with Session(engine) as s:
        strategy = Strategy(
            id=uuid4(),
            user_id=user.id,
            name="Test Strategy",
            asset="BTC/USDT",
            timeframe="1d",
            auto_update_enabled=False,
            auto_update_lookback_days=30,
        )
        s.add(strategy)
        s.flush()

        version = StrategyVersion(
            id=uuid4(),
            strategy_id=strategy.id,
            version_number=1,
            definition_json=definition_json,
        )
        s.add(version)
        s.flush()

        run = BacktestRun(
            id=uuid4(),
            user_id=user.id,
            strategy_id=strategy.id,
            strategy_version_id=version.id,
            status="pending",
            asset="BTC/USDT",
            timeframe="1d",
            date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
            date_to=datetime(2024, 1, 31, tzinfo=timezone.utc),
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.001,
        )
        s.add(run)
        s.commit()
        s.refresh(run)
        return run


def test_run_backtest_job_fails_on_malformed_definition(engine, test_user, monkeypatch):
    """Malformed stored definition (not parseable as StrategyDefinitionValidate) → failed with 'malformed' message."""
    run = _create_pending_run(engine, test_user, {"completely": "wrong"})

    monkeypatch.setattr(jobs, "engine", engine)

    jobs.run_backtest_job(str(run.id))

    with Session(engine) as s:
        updated = s.get(BacktestRun, run.id)

    assert updated.status == "failed"
    assert updated.error_message is not None
    assert "malformed" in updated.error_message.lower()


def test_run_backtest_job_fails_on_invalid_definition(engine, test_user, monkeypatch):
    """Parseable but invalid definition (missing entry signal) → failed with first error message."""
    invalid_definition = {
        "blocks": [
            {
                "id": "sl-1",
                "type": "stop_loss",
                "label": "Stop Loss",
                "params": {"stop_loss_pct": 5.0},
                "position": {"x": 0, "y": 0},
            }
        ],
        "connections": [],
    }
    run = _create_pending_run(engine, test_user, invalid_definition)

    monkeypatch.setattr(jobs, "engine", engine)

    jobs.run_backtest_job(str(run.id))

    with Session(engine) as s:
        updated = s.get(BacktestRun, run.id)

    assert updated.status == "failed"
    assert updated.error_message is not None
    assert len(updated.error_message) > 0


def test_run_backtest_job_invalid_definition_includes_error_count(engine, test_user, monkeypatch):
    """Multiple validation errors → error message includes '(+N more issues)' suffix."""
    empty_definition = {"blocks": [], "connections": []}
    run = _create_pending_run(engine, test_user, empty_definition)

    monkeypatch.setattr(jobs, "engine", engine)

    jobs.run_backtest_job(str(run.id))

    with Session(engine) as s:
        updated = s.get(BacktestRun, run.id)

    assert updated.status == "failed"
    assert updated.error_message is not None
    assert "more issues" in updated.error_message


def test_run_backtest_job_completion_survives_finalization_error(engine, test_user, monkeypatch):
    """Finalization error is swallowed — run stays completed with metrics and artifact keys intact."""
    run = _create_pending_run(engine, test_user, {"blocks": [], "connections": []})

    monkeypatch.setattr(jobs, "engine", engine)
    _patch_success_path(monkeypatch, fail_finalize=True)

    jobs.run_backtest_job(str(run.id))

    with Session(engine) as s:
        updated = s.get(BacktestRun, run.id)

    assert updated.status == "completed"
    assert updated.total_return == 5.0
    assert updated.equity_curve_key is not None
    assert updated.trades_key is not None
