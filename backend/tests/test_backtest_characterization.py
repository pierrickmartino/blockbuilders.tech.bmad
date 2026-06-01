"""Characterization snapshot gate for the PositionManager refactor.

This test captures the full BacktestResult from the current engine on an
"all-paths" strategy that exercises every exit type in a single run:

  Trade 0 — partial TP (take-profit ladder, 50 % close)
  Trade 1 — trailing stop on the residual 50 %
  Trade 2 — signal exit
  Trade 3 — stop-loss
  Trade 4 — end-of-data forced close

Any change to the refactored PositionManager that alters output must be
deliberate.  Reproduce these values bit-for-bit.

Rounding contract (matches TestGoldenSnapshot in test_backtest_engine.py):
  - BacktestResult summary fields are pre-rounded by the engine → exact equality.
  - Per-trade pnl / exit_price are unrounded floats → pytest.approx(rel=1e-9).
  - Equity curve values are pre-rounded by the engine → exact equality.
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.backtest.engine import BacktestResult, Trade, run_backtest
from app.backtest.interpreter import StrategySignals, TakeProfitLevel
from app.models.candle import Candle


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _candle(day: int, open_: float, high: float, low: float, close: float) -> Candle:
    return Candle(
        id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        timestamp=datetime(2024, 1, day, tzinfo=timezone.utc),
        open=open_,
        high=high,
        low=low,
        close=close,
        volume=1000.0,
    )


def _all_paths_result() -> BacktestResult:
    """Run the all-paths scenario and return the result."""
    candles = [
        # day 1:  entry signal for Trade 0+1 (TP partial + trailing stop)
        _candle( 1,  990, 1010,  985, 1000),
        # day 2:  Trade 0/1 entry executes at open=1000
        _candle( 2, 1000, 1020,  985, 1010),
        # day 3:  TP1 fires — high=1060 ≥ tp_price≈1051.68 — closes 50 %
        _candle( 3, 1010, 1060, 1005, 1050),
        # day 4:  holds; highest_close→1180, trailing floor→1085.6
        _candle( 4, 1050, 1200, 1100, 1180),
        # day 5:  trailing stop fires on residual — low=1085 ≤ floor=1085.6
        _candle( 5, 1180, 1210, 1085, 1170),
        # day 6:  flat; entry signal for Trade 2 (signal exit)
        _candle( 6, 1170, 1180, 1160, 1170),
        # day 7:  Trade 2 entry executes at open=1170
        _candle( 7, 1170, 1180, 1160, 1175),
        # day 8:  holds
        _candle( 8, 1175, 1190, 1170, 1185),
        # day 9:  holds
        _candle( 9, 1185, 1200, 1180, 1195),
        # day 10: exit_signal fires → signal exit; ALSO entry signal for Trade 3
        _candle(10, 1195, 1210, 1190, 1200),
        # day 11: Trade 3 entry executes at open=900 (gap down)
        _candle(11,  900,  910,  895,  905),
        # day 12: SL fires — low=800 ≤ sl≈811.30; ALSO entry signal for Trade 4
        _candle(12,  905,  910,  800,  850),
        # day 13: Trade 4 entry executes at open=900
        _candle(13,  900,  910,  895,  905),
        # day 14: holds; no exit condition fires
        _candle(14,  905,  910,  900,  907),
        # day 15: final candle → end_of_data close
        _candle(15,  907,  915,  902,  910),
    ]

    signals = StrategySignals(
        #                    d1     d2     d3     d4     d5     d6     d7     d8     d9    d10    d11    d12    d13    d14    d15
        entry_long=[True,  False, False, False, False, True,  False, False, False, True,  False, True,  False, False, False],
        exit_long= [False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False],
        position_size_pct=100.0,
        stop_loss_pct=10.0,
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        trailing_stop_pct=8.0,
        time_exit_bars=None,
        max_drawdown_pct=None,
    )

    return run_backtest(
        candles=candles,
        signals=signals,
        initial_balance=10000.0,
        fee_rate=0.001,
        slippage_rate=0.0005,
        spread_rate=0.0002,
        timeframe="1d",
    )


# ---------------------------------------------------------------------------
# Characterization snapshot
# ---------------------------------------------------------------------------


class TestCharacterizationAllPaths:
    """End-to-end characterization test locking down all exit paths.

    This is the regression gate for PRD #499 (PositionManager refactor).
    Baseline was captured from the unmodified engine on the main branch.
    Do not change these assertions unless the engine semantics change
    intentionally — and even then, re-capture from main first.
    """

    def test_all_paths_num_trades_and_exit_reasons(self):
        """All five exit paths fire and produce the expected trade count."""
        result = _all_paths_result()

        assert result.num_trades == 5

        assert result.trades[0].exit_reason == "tp"
        assert result.trades[1].exit_reason == "trailing_stop"
        assert result.trades[2].exit_reason == "signal"
        assert result.trades[3].exit_reason == "sl"
        assert result.trades[4].exit_reason == "end_of_data"

    def test_all_paths_exit_timestamps(self):
        """Each trade closes on the expected candle."""
        result = _all_paths_result()

        assert result.trades[0].exit_time == datetime(2024, 1,  3, tzinfo=timezone.utc)
        assert result.trades[1].exit_time == datetime(2024, 1,  5, tzinfo=timezone.utc)
        assert result.trades[2].exit_time == datetime(2024, 1, 10, tzinfo=timezone.utc)
        assert result.trades[3].exit_time == datetime(2024, 1, 12, tzinfo=timezone.utc)
        assert result.trades[4].exit_time == datetime(2024, 1, 15, tzinfo=timezone.utc)

    def test_all_paths_summary_metrics(self):
        """All summary metrics match the captured baseline exactly."""
        result = _all_paths_result()

        assert result.final_balance          == 9862.88
        assert result.total_return_pct       == -1.37
        assert result.cagr_pct               == -30.25
        assert result.max_drawdown_pct       == 36.35
        assert result.win_rate_pct           == 80.0
        assert result.sharpe_ratio           == 1.0
        assert result.sortino_ratio          == 1.55
        assert result.calmar_ratio           == -0.83
        assert result.max_consecutive_losses == 1

    def test_all_paths_cost_totals(self):
        """Transaction cost totals match the captured baseline exactly."""
        result = _all_paths_result()

        assert result.gross_return_usd       == -5.11
        assert result.gross_return_pct       == -0.05
        assert result.total_fees_usd         == 82.51
        assert result.total_slippage_usd     == 41.26
        assert result.total_spread_usd       == 8.24
        assert result.total_costs_usd        == 132.01
        assert result.cost_pct_gross_return  is None   # gross return negative → undefined
        assert result.avg_cost_per_trade_usd == 26.4

    def test_all_paths_equity_curve_length_and_values(self):
        """Equity curve has one point per candle with exact baseline values."""
        result = _all_paths_result()

        assert len(result.equity_curve) == 15

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
             9984.02,  # day  1 — Trade 0/1 opened, mark-to-market at close=1000
            10083.86,  # day  2 — in position, close=1010
            10483.21,  # day  3 — TP partial fired, residual marked to close=1050
            11132.17,  # day  4 — residual holds, close=1180
            10652.26,  # day  5 — trailing stop fired, flat
            10635.24,  # day  6 — Trade 2 opened (look-ahead), mark at close=1170
            10680.69,  # day  7 — Trade 2 holds, close=1175
            10771.59,  # day  8 — Trade 2 holds, close=1185
            10862.49,  # day  9 — Trade 2 holds, close=1195
            14497.45,  # day 10 — Trade 2 signal exit + Trade 3 opened (look-ahead to open=900,
                       #          then marked at close=1200 → large unrealized spike)
            10933.49,  # day 11 — Trade 3 holds, close=905
             9227.34,  # day 12 — SL fired + Trade 4 opened (marked at close=850)
             9824.41,  # day 13 — Trade 4 holds, close=905
             9846.12,  # day 14 — Trade 4 holds, close=907
             9862.88,  # day 15 — end_of_data, replaced with final realized equity
        ]

    def test_all_paths_trade0_tp_partial_full_fields(self):
        """Trade 0 (TP partial) — every field matches the captured baseline."""
        result = _all_paths_result()
        t = result.trades[0]

        assert t.exit_reason  == "tp"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1,  2, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1,  3, tzinfo=timezone.utc)

        # Unrounded float fields — use approx to survive ULP arithmetic drift
        assert t.entry_price == pytest.approx(1001.6006500499999, rel=1e-9)
        assert t.exit_price  == pytest.approx(1049.9986770002758, rel=1e-9)
        assert t.pnl         == pytest.approx(241.60341223750166, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  4.832068244750032, rel=1e-9)
        assert t.qty         == pytest.approx(  4.99200953968071,  rel=1e-9)

        assert t.sl_price_at_entry == pytest.approx(901.4405850449999,  rel=1e-9)
        assert t.tp_price_at_entry == pytest.approx(1051.6806825525,    rel=1e-9)

        # Excursion metrics (rounded by engine)
        assert t.mae_usd ==  -82.87
        assert t.mae_pct ==   -1.6574
        assert t.mfe_usd ==  291.53
        assert t.mfe_pct ==    5.8306

        # Risk metrics (rounded by engine)
        assert t.initial_risk_usd == 500.0
        assert t.r_multiple       ==   0.48

        # Price extremes and timestamps
        assert t.peak_price == 1060
        assert t.peak_ts    == datetime(2024, 1, 3, tzinfo=timezone.utc)
        assert t.trough_price == 985
        assert t.trough_ts    == datetime(2024, 1, 2, tzinfo=timezone.utc)

        assert t.duration_seconds == 86400  # 1 day

        # Cost breakdown (rounded by engine)
        assert t.fee_cost_usd      ==  10.24
        assert t.slippage_cost_usd ==   5.12
        assert t.spread_cost_usd   ==   1.02
        assert t.total_cost_usd    ==  16.39
        assert t.notional_usd      == 4992.01

    def test_all_paths_trade1_trailing_stop_full_fields(self):
        """Trade 1 (trailing stop on residual) — every field matches the captured baseline."""
        result = _all_paths_result()
        t = result.trades[1]

        assert t.exit_reason  == "trailing_stop"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1,  2, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1,  5, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1001.6006500499999,  rel=1e-9)
        assert t.exit_price  == pytest.approx(1083.8637455857204,  rel=1e-9)
        assert t.pnl         == pytest.approx( 410.6581576779823,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   8.213163153559645, rel=1e-9)
        assert t.qty         == pytest.approx(   4.99200953968071,  rel=1e-9)

        assert t.sl_price_at_entry == pytest.approx(901.4405850449999, rel=1e-9)
        assert t.tp_price_at_entry == pytest.approx(1051.6806825525,   rel=1e-9)

        assert t.mae_usd ==  -82.87
        assert t.mae_pct ==   -1.6574
        assert t.mfe_usd == 1040.33
        assert t.mfe_pct ==   20.8066

        assert t.initial_risk_usd == 500.0
        assert t.r_multiple       ==   0.82

        assert t.peak_price   == 1210
        assert t.peak_ts      == datetime(2024, 1, 5, tzinfo=timezone.utc)
        assert t.trough_price ==  985
        assert t.trough_ts    == datetime(2024, 1, 2, tzinfo=timezone.utc)

        assert t.duration_seconds == 259200  # 3 days

        assert t.fee_cost_usd      ==  10.41
        assert t.slippage_cost_usd ==   5.21
        assert t.spread_cost_usd   ==   1.04
        assert t.total_cost_usd    ==  16.66
        assert t.notional_usd      == 4992.01

    def test_all_paths_trade2_signal_exit_full_fields(self):
        """Trade 2 (signal exit) — every field matches the captured baseline."""
        result = _all_paths_result()
        t = result.trades[2]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1,  7, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 10, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1171.8727605585,    rel=1e-9)
        assert t.exit_price  == pytest.approx(1198.0807799400002, rel=1e-9)
        assert t.pnl         == pytest.approx( 238.22951354215596, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   2.236421927668136, rel=1e-9)
        assert t.qty         == pytest.approx(   9.089947243793558, rel=1e-9)

        assert t.sl_price_at_entry == pytest.approx(1054.68548450265,   rel=1e-9)
        assert t.tp_price_at_entry == pytest.approx(1230.466398586425,  rel=1e-9)

        assert t.mae_usd == -107.92
        assert t.mae_pct ==   -1.0131
        assert t.mfe_usd ==  346.57
        assert t.mfe_pct ==    3.2535

        assert t.initial_risk_usd == 1065.23
        assert t.r_multiple       ==    0.22

        assert t.peak_price   == 1210
        assert t.peak_ts      == datetime(2024, 1, 10, tzinfo=timezone.utc)
        assert t.trough_price == 1160
        assert t.trough_ts    == datetime(2024, 1,  7, tzinfo=timezone.utc)

        assert t.duration_seconds == 259200  # 3 days

        assert t.fee_cost_usd      ==  21.54
        assert t.slippage_cost_usd ==  10.77
        assert t.spread_cost_usd   ==   2.15
        assert t.total_cost_usd    ==  34.47
        assert t.notional_usd      == 10635.24

    def test_all_paths_trade3_stop_loss_full_fields(self):
        """Trade 3 (stop-loss) — every field matches the captured baseline."""
        result = _all_paths_result()
        t = result.trades[3]

        assert t.exit_reason  == "sl"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 11, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 12, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 901.4405850449998,  rel=1e-9)
        assert t.exit_price  == pytest.approx( 809.9989794002125,  rel=1e-9)
        assert t.pnl         == pytest.approx(-1104.7250450587303, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -10.143941504499992, rel=1e-9)
        assert t.qty         == pytest.approx(   12.081207862317392, rel=1e-9)

        assert t.sl_price_at_entry == pytest.approx(811.2965265404998, rel=1e-9)
        assert t.tp_price_at_entry == pytest.approx(946.5126142972498, rel=1e-9)

        assert t.mae_usd == -1225.52
        assert t.mae_pct ==   -11.2532
        assert t.mfe_usd ==   103.41
        assert t.mfe_pct ==     0.9495

        assert t.initial_risk_usd == 1089.05
        assert t.r_multiple       ==   -1.01

        assert t.peak_price   == 910
        assert t.peak_ts      == datetime(2024, 1, 11, tzinfo=timezone.utc)
        assert t.trough_price == 800
        assert t.trough_ts    == datetime(2024, 1, 12, tzinfo=timezone.utc)

        assert t.duration_seconds == 86400  # 1 day

        assert t.fee_cost_usd      ==  20.67
        assert t.slippage_cost_usd ==  10.34
        assert t.spread_cost_usd   ==   2.07
        assert t.total_cost_usd    ==  33.08
        assert t.notional_usd      == 10873.09

    def test_all_paths_trade4_end_of_data_full_fields(self):
        """Trade 4 (end-of-data) — every field matches the captured baseline."""
        result = _all_paths_result()
        t = result.trades[4]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 13, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 15, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(901.4405850449998,  rel=1e-9)
        assert t.exit_price  == pytest.approx(908.5445914545,     rel=1e-9)
        assert t.pnl         == pytest.approx( 77.11894251486949, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  0.7880726170261806, rel=1e-9)
        assert t.qty         == pytest.approx( 10.85569720372686, rel=1e-9)

        assert t.sl_price_at_entry == pytest.approx(811.2965265404998, rel=1e-9)
        assert t.tp_price_at_entry == pytest.approx(946.5126142972498, rel=1e-9)

        assert t.mae_usd ==  -69.92
        assert t.mae_pct ==   -0.7145
        assert t.mfe_usd ==  147.2
        assert t.mfe_pct ==    1.5042

        assert t.initial_risk_usd == 978.58
        assert t.r_multiple       ==   0.08

        assert t.peak_price   == 915
        assert t.peak_ts      == datetime(2024, 1, 15, tzinfo=timezone.utc)
        assert t.trough_price == 895
        assert t.trough_ts    == datetime(2024, 1, 13, tzinfo=timezone.utc)

        assert t.duration_seconds == 172800  # 2 days

        assert t.fee_cost_usd      ==  19.65
        assert t.slippage_cost_usd ==   9.82
        assert t.spread_cost_usd   ==   1.96
        assert t.total_cost_usd    ==  31.44
        assert t.notional_usd      == 9770.13
