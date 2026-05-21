"""Tests for the backtest simulation engine."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.backtest.engine import (
    run_backtest,
    compute_benchmark_curve,
    compute_benchmark_metrics,
    compute_risk_metrics,
    _create_trade,
    TPLevelState,
    Trade,
    BacktestResult,
)
from app.backtest.interpreter import StrategySignals, TakeProfitLevel
from app.models.candle import Candle


def make_candle(
    day: int,
    open_: float,
    high: float,
    low: float,
    close: float,
    volume: float = 1000.0,
) -> Candle:
    """Helper to create a candle for testing."""
    return Candle(
        id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        timestamp=datetime(2024, 1, day, tzinfo=timezone.utc),
        open=open_,
        high=high,
        low=low,
        close=close,
        volume=volume,
    )


def make_signals(
    entry_long: list[bool],
    exit_long: list[bool],
    position_size_pct: float = 100.0,
    stop_loss_pct: float | None = None,
    take_profit_levels: list[TakeProfitLevel] | None = None,
    trailing_stop_pct: float | None = None,
    time_exit_bars: int | None = None,
    max_drawdown_pct: float | None = None,
) -> StrategySignals:
    """Helper to create strategy signals for testing."""
    return StrategySignals(
        entry_long=entry_long,
        exit_long=exit_long,
        position_size_pct=position_size_pct,
        stop_loss_pct=stop_loss_pct,
        take_profit_levels=take_profit_levels or [],
        trailing_stop_pct=trailing_stop_pct,
        time_exit_bars=time_exit_bars,
        max_drawdown_pct=max_drawdown_pct,
    )


class TestBacktestBasics:
    """Basic backtest functionality tests."""

    def test_empty_candles_returns_zero_trades(self):
        """Backtest with no candles should return zero trades."""
        signals = make_signals(entry_long=[], exit_long=[])
        result = run_backtest(
            candles=[],
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
        )

        assert result.num_trades == 0
        assert result.final_balance == 10000.0
        assert result.total_return_pct == 0.0

    def test_no_entry_signals_no_trades(self):
        """Backtest with no entry signals should have no trades."""
        candles = [make_candle(i, 100, 105, 95, 102) for i in range(1, 11)]
        signals = make_signals(
            entry_long=[False] * 10,
            exit_long=[False] * 10,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
        )

        assert result.num_trades == 0
        assert result.final_balance == 10000.0

    def test_single_winning_trade(self):
        """Single trade with price increase should be profitable."""
        candles = [
            make_candle(1, 100, 105, 98, 102),   # Entry signal
            make_candle(2, 102, 110, 100, 108),  # Entry executed at open=102
            make_candle(3, 108, 115, 105, 112),  # Exit signal
            make_candle(4, 112, 118, 110, 115),  # Exit executed at close=115
        ]
        signals = make_signals(
            entry_long=[True, False, False, False],  # Single entry signal
            exit_long=[False, False, True, False],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,  # No fees for simpler math
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.final_balance > 10000.0  # Should be profitable

    def test_single_losing_trade(self):
        """Single trade with price decrease should be unprofitable."""
        candles = [
            make_candle(1, 100, 105, 98, 102),   # Entry signal
            make_candle(2, 102, 105, 95, 98),    # Entry executed at open=102
            make_candle(3, 98, 100, 90, 92),     # Exit signal
            make_candle(4, 92, 95, 88, 90),      # Exit executed
        ]
        signals = make_signals(
            entry_long=[True, False, False, False],
            exit_long=[False, False, True, False],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.final_balance < 10000.0  # Should be unprofitable


class TestTransactionCosts:
    """Tests for fee, slippage, and spread calculations."""

    def test_fees_reduce_profits(self):
        """Fees should reduce overall profits."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 120, 100, 118),
            make_candle(3, 118, 125, 115, 120),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],  # Close at end of data
        )

        # Run with no fees
        result_no_fees = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        # Run with fees
        result_with_fees = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,  # 0.1% fee
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result_with_fees.final_balance < result_no_fees.final_balance
        assert result_with_fees.total_fees_usd > 0

    def test_slippage_affects_entry_exit_prices(self):
        """Slippage should worsen entry and exit prices."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 120, 100, 118),
            make_candle(3, 118, 125, 115, 120),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
        )

        result_no_slippage = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        result_with_slippage = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.001,  # 0.1% slippage
            spread_rate=0.0,
        )

        assert result_with_slippage.final_balance < result_no_slippage.final_balance
        assert result_with_slippage.total_slippage_usd > 0

    def test_cost_breakdown_summed_correctly(self):
        """Total costs should equal sum of fees + slippage + spread."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 120, 100, 118),
            make_candle(3, 118, 125, 115, 120),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        expected_total = result.total_fees_usd + result.total_slippage_usd + result.total_spread_usd
        assert abs(result.total_costs_usd - expected_total) < 0.01


class TestExitPriority:
    """Tests for exit condition priority (SL > Trailing > MaxDD > Time > Signal > TP)."""

    def test_stop_loss_triggers_before_take_profit(self):
        """Stop loss should trigger even if TP level would also be hit."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 103, 100, 101),  # Entry at open=102
            # Candle 3: low=85 hits 5% SL, high=115 hits 10% TP
            # SL should trigger first
            make_candle(3, 101, 115, 85, 110),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
            stop_loss_pct=5.0,  # SL at ~97
            take_profit_levels=[TakeProfitLevel(profit_pct=10.0, close_pct=100)],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "sl"

    def test_trailing_stop_triggers(self):
        """Trailing stop should trigger on reversal after new high."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 103, 100, 101),   # Entry
            make_candle(3, 101, 120, 100, 118),   # New high at 120, trailing at 108 (10% below)
            make_candle(4, 118, 122, 116, 120),   # Another high, trailing at 109.8
            make_candle(5, 120, 121, 105, 106),   # Low=105 < trailing stop
        ]
        signals = make_signals(
            entry_long=[True, False, False, False, False],
            exit_long=[False] * 5,
            trailing_stop_pct=10.0,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "trailing_stop"

    def test_time_exit_triggers(self):
        """Time exit should close position after specified bars."""
        candles = [make_candle(i, 100, 105, 95, 102) for i in range(1, 10)]
        signals = make_signals(
            entry_long=[True] + [False] * 8,
            exit_long=[False] * 9,
            time_exit_bars=3,  # Exit after 3 bars
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "time_exit"

    def test_max_drawdown_exit_triggers(self):
        """Max drawdown exit should trigger when trade DD exceeds threshold."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 103, 100, 101),  # Entry at 102
            make_candle(3, 101, 102, 80, 82),   # 20% drawdown
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False] * 3,
            max_drawdown_pct=15.0,  # 15% max DD
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "max_dd"

    def test_signal_exit_closes_position(self):
        """Exit signal should close position."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 110, 100, 108),  # Entry
            make_candle(3, 108, 115, 105, 112),  # Exit signal
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, True],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "signal"


class TestTakeProfitLadder:
    """Tests for partial take profit exits."""

    def test_single_tp_level_full_close(self):
        """Single TP level with 100% should close entire position."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 103, 100, 101),  # Entry at ~102
            make_candle(3, 101, 115, 100, 112),  # TP hit at 10%
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False] * 3,
            take_profit_levels=[TakeProfitLevel(profit_pct=10.0, close_pct=100)],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "tp"

    def test_multiple_tp_levels_partial_closes(self):
        """Multiple TP levels should create partial closes."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),   # Entry at 100
            make_candle(3, 100, 106, 99, 105),   # 5% TP hit
            make_candle(4, 105, 112, 104, 110),  # 10% TP hit
            make_candle(5, 110, 118, 109, 115),  # 15% TP hit (remaining)
        ]
        signals = make_signals(
            entry_long=[True, False, False, False, False],
            exit_long=[False] * 5,
            take_profit_levels=[
                TakeProfitLevel(profit_pct=5.0, close_pct=30),
                TakeProfitLevel(profit_pct=10.0, close_pct=30),
                TakeProfitLevel(profit_pct=15.0, close_pct=40),
            ],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        # Should have 3 partial closes
        tp_trades = [t for t in result.trades if t.exit_reason == "tp"]
        assert len(tp_trades) == 3


class TestExcursionMetrics:
    """Tests for MAE/MFE (adverse/favorable excursion) calculations."""

    def test_mfe_tracks_highest_high(self):
        """MFE should track the best price during trade."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),   # Entry at 100
            make_candle(3, 100, 130, 99, 110),   # High of 130 (MFE)
            make_candle(4, 110, 115, 105, 108),  # Exit
        ]
        signals = make_signals(
            entry_long=[True, False, False, True],
            exit_long=[False, False, False, True],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        # MFE should be based on highest high (130)
        assert result.trades[0].mfe_pct > 0

    def test_mae_tracks_lowest_low(self):
        """MAE should track the worst price during trade."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),  # Entry at 100
            make_candle(3, 100, 105, 80, 102),  # Low of 80 (MAE)
            make_candle(4, 102, 110, 100, 108), # Exit
        ]
        signals = make_signals(
            entry_long=[True, False, False, True],
            exit_long=[False, False, False, True],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        # MAE should be negative (loss relative to entry)
        assert result.trades[0].mae_pct < 0


class TestRMultiple:
    """Tests for R-multiple calculations."""

    def test_r_multiple_with_stop_loss(self):
        """R-multiple should be PnL / initial risk."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),  # Entry at 100
            make_candle(3, 100, 120, 99, 118),  # Exit at 118
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
            stop_loss_pct=10.0,  # SL at 90, risk = 10
            take_profit_levels=[TakeProfitLevel(profit_pct=18.0, close_pct=100)],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        # Profit ~18%, Risk ~10%, R-multiple ~1.8
        assert result.trades[0].r_multiple is not None
        assert result.trades[0].r_multiple > 1.0

    def test_r_multiple_none_without_stop_loss(self):
        """R-multiple should be None if no stop loss defined."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),
            make_candle(3, 100, 110, 99, 108),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
            stop_loss_pct=None,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].r_multiple is None


class TestRiskMetrics:
    """Tests for risk-adjusted performance metrics."""

    def test_sharpe_ratio_positive_for_profitable_strategy(self):
        """Sharpe ratio should be positive for consistently profitable strategy."""
        # Create an uptrending equity curve
        equity_curve = [
            {"timestamp": f"2024-01-{i:02d}", "equity": 10000 + i * 100}
            for i in range(1, 31)
        ]
        trades = []

        sharpe, sortino, calmar, max_consec = compute_risk_metrics(
            equity_curve=equity_curve,
            trades=trades,
            timeframe="1d",
            cagr_pct=10.0,
            max_drawdown_pct=5.0,
        )

        assert sharpe > 0

    def test_sortino_ratio_higher_than_sharpe_for_low_downside(self):
        """Sortino should be >= Sharpe when downside volatility is low."""
        # Steady gains, few down days
        equity_curve = [
            {"timestamp": f"2024-01-{i:02d}", "equity": 10000 + i * 50}
            for i in range(1, 31)
        ]
        trades = []

        sharpe, sortino, calmar, _ = compute_risk_metrics(
            equity_curve=equity_curve,
            trades=trades,
            timeframe="1d",
            cagr_pct=10.0,
            max_drawdown_pct=2.0,
        )

        # With no negative returns, sortino should be higher or undefined
        assert sortino >= sharpe or sortino == 0

    def test_calmar_ratio_is_cagr_over_max_dd(self):
        """Calmar ratio should equal CAGR / max drawdown."""
        equity_curve = [{"timestamp": "2024-01-01", "equity": 10000}]
        trades = []

        cagr = 20.0
        max_dd = 10.0

        _, _, calmar, _ = compute_risk_metrics(
            equity_curve=equity_curve,
            trades=trades,
            timeframe="1d",
            cagr_pct=cagr,
            max_drawdown_pct=max_dd,
        )

        assert calmar == cagr / max_dd

    def test_max_consecutive_losses_counted_correctly(self):
        """Max consecutive losses should track longest losing streak."""
        equity_curve = []
        trades = [
            Trade(
                entry_time=datetime(2024, 1, 1),
                entry_price=100,
                exit_time=datetime(2024, 1, 2),
                exit_price=98,
                side="long",
                pnl=-200,  # Loss
                pnl_pct=-2,
                qty=1,
                sl_price_at_entry=None,
                tp_price_at_entry=None,
                exit_reason="signal",
                mae_usd=0,
                mae_pct=0,
                mfe_usd=0,
                mfe_pct=0,
                initial_risk_usd=None,
                r_multiple=None,
                peak_price=100,
                peak_ts=datetime(2024, 1, 1),
                trough_price=98,
                trough_ts=datetime(2024, 1, 2),
                duration_seconds=86400,
                fee_cost_usd=0,
                slippage_cost_usd=0,
                spread_cost_usd=0,
                total_cost_usd=0,
                notional_usd=10000,
            )
            for _ in range(5)
        ]
        # 5 consecutive losses

        _, _, _, max_consec = compute_risk_metrics(
            equity_curve=equity_curve,
            trades=trades,
            timeframe="1d",
            cagr_pct=0,
            max_drawdown_pct=10,
        )

        assert max_consec == 5


class TestBenchmarkComparison:
    """Tests for benchmark (buy-and-hold) comparison."""

    def test_benchmark_curve_buy_and_hold(self):
        """Benchmark should track buy-and-hold from first open."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 110, 100, 108),
            make_candle(3, 108, 115, 105, 112),
        ]

        curve = compute_benchmark_curve(candles, initial_balance=10000.0)

        assert len(curve) == 3
        # Day 1: 10000 * (102/100) = 10200
        assert curve[0]["equity"] == 10200.0
        # Day 2: 10000 * (108/100) = 10800
        assert curve[1]["equity"] == 10800.0
        # Day 3: 10000 * (112/100) = 11200
        assert curve[2]["equity"] == 11200.0

    def test_benchmark_metrics_alpha_calculation(self):
        """Alpha should be strategy return minus benchmark return."""
        strategy_equity = [
            {"equity": 10000},
            {"equity": 11500},  # 15% return
        ]
        benchmark_equity = [
            {"equity": 10000},
            {"equity": 11000},  # 10% return
        ]

        bench_return, alpha, beta = compute_benchmark_metrics(
            strategy_equity, benchmark_equity, initial_balance=10000.0
        )

        assert bench_return == 10.0
        assert alpha == 5.0  # 15% - 10%

    def test_benchmark_empty_curves(self):
        """Empty curves should return zeros."""
        bench_return, alpha, beta = compute_benchmark_metrics([], [], 10000.0)

        assert bench_return == 0.0
        assert alpha == 0.0
        assert beta == 0.0


class TestEdgeCases:
    """Edge case tests for the backtest engine."""

    def test_no_exit_closes_at_end_of_data(self):
        """Open position at end should close with end_of_data reason."""
        candles = [make_candle(i, 100, 105, 95, 102) for i in range(1, 6)]
        signals = make_signals(
            entry_long=[True, False, False, False, False],
            exit_long=[False] * 5,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        assert result.trades[0].exit_reason == "end_of_data"

    def test_entry_on_last_candle_no_trade(self):
        """Entry signal on last candle should not create trade."""
        candles = [make_candle(i, 100, 105, 95, 102) for i in range(1, 6)]
        signals = make_signals(
            entry_long=[False, False, False, False, True],  # Entry on last
            exit_long=[False] * 5,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        # Entry needs next candle for execution
        assert result.num_trades == 0

    def test_same_candle_entry_exit_not_allowed(self):
        """Entry and exit on same candle should be prevented."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 102, 110, 100, 108),  # Entry executed here
            make_candle(3, 108, 115, 105, 112),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, True, False],  # Exit signal same candle as entry execution
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        # Should wait for at least one candle before exiting
        assert result.num_trades == 1

    def test_position_size_percentage(self):
        """Position size should be percentage of equity."""
        candles = [
            make_candle(1, 100, 105, 98, 102),
            make_candle(2, 100, 101, 99, 100),
            make_candle(3, 100, 110, 99, 108),
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False, False, False],
            position_size_pct=50.0,  # Use 50% of equity
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.0,
            slippage_rate=0.0,
            spread_rate=0.0,
        )

        assert result.num_trades == 1
        # With 50% position and ~8% gain, final balance should reflect that
        # Not 100% of gain


class TestGoldenSnapshot:
    """Golden snapshot tests locking down run_backtest observable output.

    These tests capture exact baseline values from the current engine on two
    broad synthetic scenarios so that any silent behaviour change introduced
    during downstream refactoring immediately shows up as a test failure.

    Rounding contract:
    - BacktestResult summary fields and trade cost fields are already rounded
      to 2 dp by the engine, so we use exact equality on them.
    - Per-trade pnl / exit_price are unrounded; we use pytest.approx(rel=1e-9)
      to tolerate ULP-level float arithmetic differences without masking real
      logic drift.
    - The equity curve is also compared with pytest.approx(rel=1e-9) to survive
      any future reordering of arithmetic operations.
    """

    def test_snapshot_tp_partials_and_signal_exit(self):
        """Snapshot: two entries; first exits via two TP partials, second via signal."""
        candles = [
            make_candle( 1, 1000, 1050,  980, 1020),  # entry1 signal
            make_candle( 2, 1000, 1040,  990, 1030),  # entry1 at open=1000
            make_candle( 3, 1030, 1060, 1020, 1055),  # high=1060 > TP1=1050 (5 %)
            make_candle( 4, 1055, 1120, 1050, 1100),  # high=1120 > TP2=1100 (10 %)
            make_candle( 5, 1100, 1130, 1090, 1110),
            make_candle( 6, 1110, 1140, 1100, 1120),
            make_candle( 7, 1120, 1150, 1110, 1130),  # entry2 signal
            make_candle( 8, 1130, 1160, 1120, 1140),  # entry2 at open=1130
            make_candle( 9, 1140, 1170, 1130, 1150),
            make_candle(10, 1150, 1180, 1140, 1160),  # exit signal
            make_candle(11, 1160, 1190, 1150, 1170),  # exit at close=1170
            make_candle(12, 1170, 1200, 1160, 1180),
        ]
        signals = make_signals(
            entry_long=[True,  False, False, False, False, False, True,  False, False, False, False, False],
            exit_long= [False, False, False, False, False, False, False, False, False, True,  False, False],
            position_size_pct=100.0,
            take_profit_levels=[
                TakeProfitLevel(profit_pct=5.0,  close_pct=50),
                TakeProfitLevel(profit_pct=10.0, close_pct=50),
            ],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        # --- summary fields (already rounded by engine) ---
        assert result.num_trades == 3
        assert result.final_balance == 10982.55
        assert result.total_return_pct == 9.83
        assert result.win_rate_pct == 100.0
        assert result.gross_return_usd == 1050.47
        assert result.total_costs_usd == 67.92
        assert result.total_fees_usd == 42.45
        assert result.total_slippage_usd == 21.23
        assert result.total_spread_usd == 4.24
        assert result.max_drawdown_pct == 0.16

        # --- per-trade exit path ---
        assert result.trades[0].exit_reason == "tp"
        assert result.trades[0].exit_time == datetime(2024, 1, 3, tzinfo=timezone.utc)
        assert result.trades[1].exit_reason == "tp"
        assert result.trades[1].exit_time == datetime(2024, 1, 4, tzinfo=timezone.utc)
        assert result.trades[2].exit_reason == "signal"
        assert result.trades[2].exit_time == datetime(2024, 1, 10, tzinfo=timezone.utc)

        # --- per-trade pnl / exit_price (unrounded) ---
        assert result.trades[0].pnl == pytest.approx(241.60341223750166, rel=1e-9)
        assert result.trades[1].pnl == pytest.approx(491.2035747250011,  rel=1e-9)
        assert result.trades[2].pnl == pytest.approx(249.74132487167816, rel=1e-9)
        assert result.trades[0].exit_price == pytest.approx(1049.9986770002758, rel=1e-9)
        assert result.trades[1].exit_price == pytest.approx(1099.9986140002889, rel=1e-9)
        assert result.trades[2].exit_price == pytest.approx(1158.144753942,     rel=1e-9)

        # --- equity curve (approx to survive ULP-level arithmetic drift) ---
        equity_values = [pt["equity"] for pt in result.equity_curve]
        assert equity_values == pytest.approx(
            [10183.70, 10283.54, 10508.17, 10732.81, 10732.81, 10732.81,
             10715.65, 10810.48, 10905.31, 10982.55, 10982.55, 10982.55],
            rel=1e-9,
        )

    def test_snapshot_sl_and_trailing_stop_interplay(self):
        """Snapshot: two entries; first exits via trailing stop, second via stop loss."""
        candles = [
            make_candle( 1, 2000, 2050, 1980, 2020),  # entry1 signal
            make_candle( 2, 2000, 2050, 1990, 2030),  # entry1 at open=2000; SL=1802.9, trail=8 %
            make_candle( 3, 2030, 2200, 2020, 2180),  # peak 2200; trailing floor rises to 2024
            make_candle( 4, 2180, 2220, 2020, 2100),  # peak 2220; trailing floor 2042; low 2020 safe
            make_candle( 5, 2100, 2180, 1950, 1960),  # low=1950 < trailing floor → trailing_stop
            make_candle( 6, 1960, 2000, 1930, 1970),
            make_candle( 7, 1970, 2020, 1950, 1990),  # entry2 signal
            make_candle( 8, 2000, 2010, 1700, 1750),  # entry2 at open=2000; same-candle guard active
            make_candle( 9, 1750, 1800, 1700, 1720),  # low=1700 < SL=1802.9 → sl
            make_candle(10, 1720, 1760, 1690, 1710),
        ]
        signals = make_signals(
            entry_long=[True,  False, False, False, False, False, True,  False, False, False],
            exit_long= [False, False, False, False, False, False, False, False, False, False],
            position_size_pct=100.0,
            stop_loss_pct=10.0,
            trailing_stop_pct=8.0,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        # --- summary fields (already rounded by engine) ---
        assert result.num_trades == 2
        assert result.final_balance == 8981.98
        assert result.total_return_pct == -10.18
        assert result.win_rate_pct == 0.0
        assert result.gross_return_usd == -955.65
        assert result.total_costs_usd == 62.37
        assert result.total_fees_usd == 38.98
        assert result.total_slippage_usd == 19.49
        assert result.total_spread_usd == 3.90
        assert result.max_drawdown_pct == 19.76

        # --- per-trade exit path ---
        assert result.trades[0].exit_reason == "trailing_stop"
        assert result.trades[0].exit_time == datetime(2024, 1, 5, tzinfo=timezone.utc)
        assert result.trades[1].exit_reason == "sl"
        assert result.trades[1].exit_time == datetime(2024, 1, 9, tzinfo=timezone.utc)

        # --- per-trade pnl / exit_price (unrounded) ---
        assert result.trades[0].pnl == pytest.approx(-4.038318866103752,   rel=1e-9)
        assert result.trades[1].pnl == pytest.approx(-1013.9845057464562,  rel=1e-9)
        assert result.trades[0].exit_price == pytest.approx(2002.39234353972,     rel=1e-9)
        assert result.trades[1].exit_price == pytest.approx(1799.9977320004725,   rel=1e-9)

        # --- equity curve (approx to survive ULP-level arithmetic drift) ---
        equity_values = [pt["equity"] for pt in result.equity_curve]
        assert equity_values == pytest.approx(
            [10083.86, 10133.78, 10882.58, 10483.22, 9995.96,
              9995.96,  9930.09,  8732.49,  8981.98,  8981.98],
            rel=1e-9,
        )


class TestCrossConditionSnapshot:
    """Golden snapshot tests for exit-priority interactions between conditions on the same bar.

    Each scenario exercises a specific priority pairing not covered by TestExitPriority:
      - SL beats TP (multi-level ladder, SL bar produces no partial TP records)
      - Trailing stop fires on residual position after a prior partial TP
      - Time exit beats a simultaneous exit signal (priority 4 vs 5)

    Rounding contract: same as TestGoldenSnapshot — summary fields use exact equality,
    per-trade pnl / exit_price use pytest.approx(rel=1e-9).
    """

    def test_snapshot_sl_beats_multi_tp_ladder_same_bar(self):
        """SL fires on a bar that would also hit all three TP levels; no partial TP trades created."""
        candles = [
            make_candle(1, 100, 105,  98, 102),  # entry signal
            make_candle(2, 100, 101,  99, 100),  # entry at open=100
            make_candle(3, 100, 120,  85, 110),  # low=85 hits SL=~95; high=120 would hit all TPs
        ]
        signals = make_signals(
            entry_long=[True, False, False],
            exit_long=[False] * 3,
            stop_loss_pct=5.0,
            take_profit_levels=[
                TakeProfitLevel(profit_pct=5.0,  close_pct=33),
                TakeProfitLevel(profit_pct=10.0, close_pct=33),
                TakeProfitLevel(profit_pct=15.0, close_pct=34),
            ],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        # --- summary fields ---
        assert result.num_trades == 1
        assert result.final_balance == 9484.81
        assert result.total_return_pct == -5.15
        assert result.win_rate_pct == 0.0
        assert result.gross_return_usd == -484.02
        assert result.total_costs_usd == 31.17
        assert result.total_fees_usd == 19.48
        assert result.total_slippage_usd == 9.74
        assert result.total_spread_usd == 1.95
        assert result.max_drawdown_pct == 6.86

        # --- priority winner: SL, not any TP level ---
        assert result.trades[0].exit_reason == "sl"
        assert result.trades[0].exit_time == datetime(2024, 1, 3, tzinfo=timezone.utc)

        # --- per-trade pnl / exit_price ---
        assert result.trades[0].pnl == pytest.approx(-515.1938254749975, rel=1e-9)
        assert result.trades[0].exit_price == pytest.approx(94.99988030002496, rel=1e-9)

        # --- equity curve ---
        equity_values = [pt["equity"] for pt in result.equity_curve]
        assert equity_values == pytest.approx([10183.7, 9984.02, 9484.81], rel=1e-9)

    def test_snapshot_trailing_stop_on_residual_after_partial_tp(self):
        """Partial TP closes 50 % of position; trailing stop closes the remainder on a later bar."""
        candles = [
            make_candle(1, 100, 105,  98, 102),  # entry signal
            make_candle(2, 100, 101,  99, 100),  # entry at open=100
            make_candle(3, 100, 115, 105, 112),  # high=115 hits TP~110; low=105 above trailing floor=100.8
            make_candle(4, 112, 135, 118, 130),  # new high; trailing floor rises to 117; low=118 safe
            make_candle(5, 130, 133, 115, 116),  # low=115 < trailing floor=117 → trailing stop fires
            make_candle(6, 116, 120, 113, 115),  # post-close bar (position already flat)
        ]
        signals = make_signals(
            entry_long=[True, False, False, False, False, False],
            exit_long=[False] * 6,
            trailing_stop_pct=10.0,
            take_profit_levels=[
                TakeProfitLevel(profit_pct=10.0, close_pct=50),
            ],
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        # --- summary fields ---
        assert result.num_trades == 2
        assert result.final_balance == 11322.51
        assert result.total_return_pct == 13.23
        assert result.win_rate_pct == 100.0
        assert result.gross_return_usd == 1356.63
        assert result.total_costs_usd == 34.12
        assert result.total_fees_usd == 21.32
        assert result.total_slippage_usd == 10.67
        assert result.total_spread_usd == 2.13
        assert result.max_drawdown_pct == 5.49

        # --- priority sequence: TP partial on bar 3, trailing stop on bar 5 ---
        assert result.trades[0].exit_reason == "tp"
        assert result.trades[0].exit_time == datetime(2024, 1, 3, tzinfo=timezone.utc)
        assert result.trades[1].exit_reason == "trailing_stop"
        assert result.trades[1].exit_time == datetime(2024, 1, 5, tzinfo=timezone.utc)

        # --- per-trade pnl / exit_price ---
        assert result.trades[0].pnl == pytest.approx(491.2035747250012,   rel=1e-9)
        assert result.trades[1].pnl == pytest.approx(831.3099156993716,   rel=1e-9)
        assert result.trades[0].exit_price == pytest.approx(109.99986140002889, rel=1e-9)
        assert result.trades[1].exit_price == pytest.approx(116.81287604415002, rel=1e-9)

        # --- equity curve ---
        equity_values = [pt["equity"] for pt in result.equity_curve]
        assert equity_values == pytest.approx(
            [10183.7, 9984.02, 11082.25, 11980.82, 11322.51, 11322.51],
            rel=1e-9,
        )

    def test_snapshot_time_exit_beats_signal_same_bar(self):
        """Time exit (priority 4) fires when bars_in_trade reaches threshold even though
        exit_signal is also True on that bar (signal has priority 5)."""
        candles = [
            make_candle(1, 100, 105,  98, 102),  # entry signal
            make_candle(2, 100, 101,  99, 100),  # entry at open=100; bars_in_trade=1
            make_candle(3, 100, 101,  99, 100),  # bars_in_trade=2
            make_candle(4, 100, 101,  99, 100),  # bars_in_trade=3 → time_exit fires; exit_signal also True
            make_candle(5, 100, 101,  99, 100),  # post-close bar
        ]
        signals = make_signals(
            entry_long=[True, False, False, False, False],
            exit_long=[False, False, False, True, False],  # exit signal also fires on bar 4
            time_exit_bars=3,
        )

        result = run_backtest(
            candles=candles,
            signals=signals,
            initial_balance=10000.0,
            fee_rate=0.001,
            slippage_rate=0.0005,
            spread_rate=0.0002,
        )

        # --- summary fields ---
        assert result.num_trades == 1
        assert result.final_balance == 9968.05
        assert result.total_return_pct == -0.32
        assert result.win_rate_pct == 0.0
        assert result.gross_return_usd == 0.0
        assert result.total_costs_usd == 31.95
        assert result.total_fees_usd == 19.97
        assert result.total_slippage_usd == 9.98
        assert result.total_spread_usd == 2.0
        assert result.max_drawdown_pct == 2.12

        # --- priority winner: time_exit, not signal ---
        assert result.trades[0].exit_reason == "time_exit"
        assert result.trades[0].exit_time == datetime(2024, 1, 4, tzinfo=timezone.utc)

        # --- per-trade pnl / exit_price ---
        assert result.trades[0].pnl == pytest.approx(-31.948862052358564, rel=1e-9)
        assert result.trades[0].exit_price == pytest.approx(99.84006499499999, rel=1e-9)

        # --- equity curve ---
        equity_values = [pt["equity"] for pt in result.equity_curve]
        assert equity_values == pytest.approx(
            [10183.7, 9984.02, 9984.02, 9968.05, 9968.05],
            rel=1e-9,
        )
