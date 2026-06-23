"""Tests for the Backtest pipeline — the pure assembly that turns a validated
strategy + candles into a RunOutcome, with no I/O.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.backtest.errors import BacktestError
from app.backtest.pipeline import BacktestParams, RunOutcome, run_pipeline
from app.data.strategy_templates import TEMPLATES
from app.models.candle import Candle
from app.schemas.strategy import StrategyDefinitionValidate
from app.services.strategy_validation import validate_strategy


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RSI_OVERSOLD_BOUNCE_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "RSI Oversold Bounce"
)

_DEFAULT_PARAMS = BacktestParams(
    initial_balance=10000.0,
    fee_rate=0.001,
    slippage_rate=0.0005,
    spread_rate=0.0002,
    timeframe="1d",
)


def _rsi_strategy() -> ValidatedStrategy:
    parsed = StrategyDefinitionValidate.model_validate(
        RSI_OVERSOLD_BOUNCE_TEMPLATE["definition_json"]
    )
    result = validate_strategy(parsed)
    assert not result.errors, f"Template strategy has validation errors: {result.errors}"
    return result.strategy


def _rsi_candles() -> list[Candle]:
    """Deterministic candle series for RSI Oversold Bounce (copied from golden suite)."""
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 100.0

    def _append(open_: float, close: float) -> None:
        candles.append(
            Candle(
                asset="BTC/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=len(candles)),
                open=open_,
                high=max(open_, close) + 0.5,
                low=min(open_, close) - 0.5,
                close=close,
                volume=1000.0,
            )
        )

    for _ in range(20):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(10):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(20):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(3):
        close = price - 1.0
        _append(price, close)
        price = close

    return candles


# ---------------------------------------------------------------------------
# Cycle 1 — Tracer bullet: pipeline returns a RunOutcome
# ---------------------------------------------------------------------------


class TestPipelineReturnsOutcome:
    def test_pipeline_returns_run_outcome_instance(self):
        """Pipeline returns a RunOutcome for a valid strategy and candles."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert isinstance(outcome, RunOutcome)

    def test_outcome_is_immutable(self):
        """RunOutcome is a frozen dataclass — cannot be mutated."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        with pytest.raises((AttributeError, TypeError)):
            outcome.num_trades = 999  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Cycle 2 — Result metrics carried on the outcome
# ---------------------------------------------------------------------------


class TestOutcomeResultMetrics:
    def test_num_trades_matches_engine_output(self):
        """Outcome num_trades equals what the engine produces."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.num_trades == 2

    def test_summary_metrics_match_golden(self):
        """Outcome summary metrics are identical to the golden regression values."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.final_balance == 11615.35
        assert outcome.total_return_pct == 16.15
        assert outcome.max_drawdown_pct == 7.13
        assert outcome.win_rate_pct == 50.0
        assert outcome.sharpe_ratio == 4.17
        assert outcome.sortino_ratio == 11.44
        assert outcome.calmar_ratio == 26.14
        assert outcome.max_consecutive_losses == 1

    def test_cost_metrics_match_golden(self):
        """Outcome cost totals are identical to the golden regression values."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.gross_return_usd == 1688.52
        assert outcome.total_fees_usd == 45.73
        assert outcome.total_slippage_usd == 22.86
        assert outcome.total_spread_usd == 4.58
        assert outcome.total_costs_usd == 73.17


# ---------------------------------------------------------------------------
# Cycle 3 — Benchmark metrics carried on the outcome
# ---------------------------------------------------------------------------


class TestOutcomeBenchmarkMetrics:
    def test_benchmark_metrics_are_present(self):
        """Outcome carries benchmark_return_pct, alpha, and beta."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert hasattr(outcome, "benchmark_return_pct")
        assert hasattr(outcome, "alpha")
        assert hasattr(outcome, "beta")

    def test_benchmark_return_is_float(self):
        """Benchmark return is a numeric value, not None."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert isinstance(outcome.benchmark_return_pct, float)

    def test_alpha_equals_strategy_minus_benchmark_return(self):
        """Alpha = strategy total_return_pct - benchmark_return_pct."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.alpha == pytest.approx(
            outcome.total_return_pct - outcome.benchmark_return_pct, abs=0.01
        )


# ---------------------------------------------------------------------------
# Cycle 4 — Artifact payloads carried on the outcome
# ---------------------------------------------------------------------------


class TestOutcomeArtifactPayloads:
    def test_equity_curve_payload_is_a_list(self):
        """equity_curve_payload is a non-empty list of dicts."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert isinstance(outcome.equity_curve_payload, list)
        assert len(outcome.equity_curve_payload) == len(candles)
        assert "equity" in outcome.equity_curve_payload[0]
        assert "timestamp" in outcome.equity_curve_payload[0]

    def test_benchmark_curve_payload_has_same_length_as_equity_curve(self):
        """benchmark_curve_payload has one point per candle."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert isinstance(outcome.benchmark_curve_payload, list)
        assert len(outcome.benchmark_curve_payload) == len(candles)

    def test_trades_payload_is_serialized_list_of_dicts(self):
        """trades_payload is a list of dicts (wire format from dump_trades)."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert isinstance(outcome.trades_payload, list)
        assert len(outcome.trades_payload) == outcome.num_trades
        assert "entry_time" in outcome.trades_payload[0]
        assert "exit_reason" in outcome.trades_payload[0]
        assert "pnl" in outcome.trades_payload[0]

    def test_equity_curve_payload_matches_golden_values(self):
        """equity_curve_payload carries the exact golden equity values."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        equities = [pt["equity"] for pt in outcome.equity_curve_payload]
        assert equities[:13] == [10000.0] * 13
        assert equities[-1] == 11615.35


# ---------------------------------------------------------------------------
# Cycle 5 — Empty-candles guard raises BacktestError
# ---------------------------------------------------------------------------


class TestPipelineEmptyCandlesGuard:
    def test_empty_candles_raises_backtest_error(self):
        """Pipeline raises BacktestError when candle list is empty."""
        strategy = _rsi_strategy()

        with pytest.raises(BacktestError):
            run_pipeline(strategy, [], _DEFAULT_PARAMS)

    def test_empty_candles_error_message_mentions_price_data(self):
        """The user-facing message mentions price data or date range."""
        strategy = _rsi_strategy()

        with pytest.raises(BacktestError) as exc_info:
            run_pipeline(strategy, [], _DEFAULT_PARAMS)

        assert "price data" in exc_info.value.user_message.lower() or \
               "date range" in exc_info.value.user_message.lower()


# ---------------------------------------------------------------------------
# Cycle 6 — used_backup_data flag
# ---------------------------------------------------------------------------


class TestOutcomeUsedBackupData:
    def test_used_backup_data_false_for_rsi_strategy_with_standard_candles(self):
        """Golden candles use default source (cryptocompare) → flag is False."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.used_backup_data is False

    def test_used_backup_data_true_when_any_candle_has_non_cryptocompare_source(self):
        """used_backup_data is True when at least one candle has a non-cryptocompare source."""
        strategy = _rsi_strategy()
        candles = _rsi_candles()
        # Replace the last candle with one from a backup source
        last = candles[-1]
        candles[-1] = Candle(
            asset=last.asset,
            timeframe=last.timeframe,
            timestamp=last.timestamp,
            open=last.open,
            high=last.high,
            low=last.low,
            close=last.close,
            volume=last.volume,
            source="binance",
        )

        outcome = run_pipeline(strategy, candles, _DEFAULT_PARAMS)

        assert outcome.used_backup_data is True
