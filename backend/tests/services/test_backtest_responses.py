"""Pure unit tests for backtest response builders — no DB, no session fixtures."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.backtest.narrative import generate_narrative
from app.models.backtest_run import BacktestRun
from app.schemas.backtest import (
    CandleResponse,
    DataQualityMetrics,
    EntryExplanation,
    EquityCurvePoint,
    ExitExplanation,
    IndicatorSeries,
)
from app.services.backtest_responses import (
    build_list_item,
    build_public_view,
    build_status_response,
    build_trade_detail_response,
)


def _completed_run(**kwargs) -> BacktestRun:
    defaults = dict(
        user_id=uuid4(),
        strategy_id=uuid4(),
        strategy_version_id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 3, 31, tzinfo=timezone.utc),
        status="completed",
        initial_balance=10000.0,
        total_return=15.0,
        cagr=12.0,
        max_drawdown=5.0,
        num_trades=10,
        win_rate=60.0,
        benchmark_return=8.0,
        alpha=0.5,
        beta=1.1,
        sharpe_ratio=1.5,
        sortino_ratio=2.0,
        calmar_ratio=1.2,
        max_consecutive_losses=3,
    )
    defaults.update(kwargs)
    return BacktestRun(**defaults)


def _pending_run(**kwargs) -> BacktestRun:
    defaults = dict(
        user_id=uuid4(),
        strategy_id=uuid4(),
        strategy_version_id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 3, 31, tzinfo=timezone.utc),
        status="pending",
        initial_balance=10000.0,
    )
    defaults.update(kwargs)
    return BacktestRun(**defaults)


# --- build_status_response ---


class TestBuildStatusResponse:
    def test_completed_run_has_summary(self):
        run = _completed_run()
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative=None)
        assert response.summary is not None
        assert response.summary.total_return_pct == 15.0
        assert response.summary.initial_balance == 10000.0
        assert response.summary.final_balance == pytest.approx(11500.0)

    def test_pending_run_has_no_summary(self):
        run = _pending_run()
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative=None)
        assert response.summary is None

    def test_completed_run_with_null_total_return_has_no_summary(self):
        run = _completed_run(total_return=None)
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative=None)
        assert response.summary is None

    def test_passes_narrative_through(self):
        run = _completed_run()
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative="Strong performance")
        assert response.narrative == "Strong performance"

    def test_passes_data_quality_through(self):
        run = _completed_run()
        dq = DataQualityMetrics(
            asset="BTC/USDT",
            timeframe="1d",
            date_from=run.date_from,
            date_to=run.date_to,
            gap_percent=0.5,
            outlier_count=2,
            volume_consistency=98.0,
            has_issues=False,
            issues_description="Data quality OK",
        )
        response = build_status_response(run, strategy_version_number=1, data_quality=dq, narrative=None)
        assert response.data_quality is dq

    def test_maps_run_fields(self):
        run = _completed_run(status="failed", error_message="oops", total_return=None)
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative=None)
        assert response.run_id == run.id
        assert response.strategy_id == run.strategy_id
        assert response.status == "failed"
        assert response.asset == "BTC/USDT"
        assert response.error_message == "oops"

    def test_exposes_strategy_version_number(self):
        run = _completed_run()
        response = build_status_response(run, strategy_version_number=3, data_quality=None, narrative=None)
        assert response.strategy_version_number == 3

    def test_exposes_strategy_version_id(self):
        run = _completed_run()
        response = build_status_response(run, strategy_version_number=1, data_quality=None, narrative=None)
        assert response.strategy_version_id == run.strategy_version_id


# --- build_list_item ---

_NOW = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)


class TestBuildListItem:
    def test_no_started_at_gives_no_elapsed(self):
        run = _completed_run(started_at=None)
        item = build_list_item(run, _NOW)
        assert item.elapsed_seconds is None

    def test_running_elapsed_is_from_start_to_now(self):
        started = datetime(2024, 6, 1, 11, 0, 0, tzinfo=timezone.utc)
        run = _pending_run(status="running", started_at=started)
        item = build_list_item(run, _NOW)
        assert item.elapsed_seconds == 3600.0

    def test_completed_elapsed_is_updated_minus_started(self):
        started = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        updated = datetime(2024, 6, 1, 10, 5, 30, tzinfo=timezone.utc)
        run = _completed_run(started_at=started, updated_at=updated)
        item = build_list_item(run, _NOW)
        assert item.elapsed_seconds == 330.0

    def test_failed_elapsed_is_updated_minus_started(self):
        started = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        updated = datetime(2024, 6, 1, 10, 1, 0, tzinfo=timezone.utc)
        run = _completed_run(status="failed", started_at=started, updated_at=updated)
        item = build_list_item(run, _NOW)
        assert item.elapsed_seconds == 60.0

    def test_pending_gives_no_elapsed(self):
        run = _pending_run(started_at=None)
        item = build_list_item(run, _NOW)
        assert item.elapsed_seconds is None

    def test_maps_run_fields(self):
        run = _completed_run()
        item = build_list_item(run, _NOW)
        assert item.run_id == run.id
        assert item.strategy_id == run.strategy_id
        assert item.asset == "BTC/USDT"
        assert item.total_return == 15.0


# --- build_trade_detail_response ---


def _make_candles(n: int = 10) -> list[CandleResponse]:
    base = datetime(2024, 1, 10, tzinfo=timezone.utc)
    return [
        CandleResponse(
            timestamp=base + timedelta(days=i),
            open=100.0,
            high=105.0,
            low=99.0,
            close=103.0,
        )
        for i in range(n)
    ]


def _minimal_trade_raw() -> dict:
    base = datetime(2024, 1, 10, tzinfo=timezone.utc)
    return {
        "entry_time": base.isoformat(),
        "exit_time": (base + timedelta(days=5)).isoformat(),
        "entry_price": 100.0,
        "exit_price": 110.0,
        "side": "long",
        "pnl": 100.0,
        "pnl_pct": 10.0,
        "qty": 1.0,
        "exit_reason": "tp",
        "mae_usd": 50.0,
        "mae_pct": 0.5,
        "mfe_usd": 150.0,
        "mfe_pct": 1.5,
        "peak_price": 112.0,
        "peak_ts": (base + timedelta(days=4)).isoformat(),
        "trough_price": 98.0,
        "trough_ts": (base + timedelta(days=1)).isoformat(),
        "duration_seconds": 432000,
    }


class TestBuildTradeDetailResponse:
    def test_no_explanation(self):
        run = _completed_run()
        response = build_trade_detail_response(
            run, _minimal_trade_raw(), _make_candles(), explanation=None, partial=False
        )
        assert response.entry_explanation is None
        assert response.exit_explanation is None
        assert response.indicator_series is None
        assert response.explanation_partial is False
        assert response.asset == "BTC/USDT"
        assert response.timeframe == "1d"
        assert len(response.candles) == 10

    def test_partial_true_when_explanation_failed(self):
        run = _completed_run()
        response = build_trade_detail_response(
            run, _minimal_trade_raw(), _make_candles(), explanation=None, partial=True
        )
        assert response.explanation_partial is True
        assert response.entry_explanation is None

    def test_full_explanation_populated(self):
        run = _completed_run()
        entry_exp = EntryExplanation(summary="Buy signal", conditions=["RSI < 30"])
        exit_exp = ExitExplanation(summary="Take profit", reason_type="tp")
        indicators: list[IndicatorSeries] = []
        response = build_trade_detail_response(
            run,
            _minimal_trade_raw(),
            _make_candles(),
            explanation=(entry_exp, exit_exp, indicators),
            partial=False,
        )
        assert response.entry_explanation == entry_exp
        assert response.exit_explanation == exit_exp
        assert response.indicator_series == indicators
        assert response.explanation_partial is False

    def test_trade_fields_parsed_from_raw(self):
        run = _completed_run()
        response = build_trade_detail_response(
            run, _minimal_trade_raw(), _make_candles(), explanation=None
        )
        assert response.trade.pnl == 100.0
        assert response.trade.side == "long"
        assert response.trade.entry_price == 100.0
        assert response.trade.exit_price == 110.0


# --- build_public_view ---


class TestBuildPublicView:
    def test_with_equity_curve(self):
        run = _completed_run()
        equity = [
            EquityCurvePoint(
                timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), equity=10000.0
            )
        ]
        view = build_public_view(run, equity_curve=equity)
        assert view.asset == "BTC/USDT"
        assert view.timeframe == "1d"
        assert view.summary is not None
        assert view.summary.total_return_pct == 15.0
        assert view.equity_curve == equity

    def test_empty_equity_curve(self):
        run = _completed_run()
        view = build_public_view(run, equity_curve=[])
        assert view.equity_curve == []
        assert view.summary is not None

    def test_summary_uses_correct_final_balance(self):
        run = _completed_run(total_return=20.0, initial_balance=5000.0)
        view = build_public_view(run, equity_curve=[])
        assert view.summary.total_return_pct == 20.0
        assert view.summary.final_balance == pytest.approx(6000.0)

    def test_includes_narrative_for_completed_run(self):
        run = _completed_run()
        view = build_public_view(run, equity_curve=[])
        assert view.narrative
        assert "10 trades" in view.narrative

    def test_narrative_matches_generate_narrative_output(self):
        run = _completed_run()
        view = build_public_view(run, equity_curve=[])
        assert view.narrative == generate_narrative(view.summary)
