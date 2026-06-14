"""Full-pipeline golden regression suite (ADR-0018).

Runs the real worker pipeline -- StrategyDefinitionValidate.model_validate ->
validate_strategy -> interpret_strategy -> run_backtest, the same sequence as
app/worker/jobs.py::run_backtest_job -- against the RSI Oversold Bounce seed
template (app/data/strategy_templates.py) with a deterministic synthetic
candle series.

This closes the gap the engine-only goldens (test_backtest_engine.py,
test_backtest_characterization.py) leave open: a regression in the
Interpreter, the Block Catalogue, or the Strategy validator is caught here
even when run_backtest() itself is unchanged.

Rounding contract (matches TestGoldenSnapshot / TestCharacterizationAllPaths):
  - BacktestResult summary fields, cost totals, and equity-curve `equity`
    values are pre-rounded by the engine -> exact equality.
  - Per-trade unrounded floats (pnl, pnl_pct, exit_price, entry_price, qty,
    sl_price_at_entry, tp_price_at_entry) -> pytest.approx(rel=1e-9).

Baseline values were captured by running this suite once against the
unmodified engine/interpreter/catalogue on the main branch. Do not change
these assertions unless the change is intentional -- and even then,
re-capture from main first.
"""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone

import pytest

from app.backtest.engine import BacktestResult, run_backtest
from app.backtest.errors import StrategyInvalidError
from app.backtest.interpreter import interpret_strategy
from app.data.strategy_templates import TEMPLATES
from app.models.candle import Candle
from app.schemas.strategy import StrategyDefinitionValidate
from app.services.strategy_validation import validate_strategy


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------


def run_golden_pipeline(
    definition_json: dict,
    candles: list[Candle],
    run_config: dict,
) -> BacktestResult:
    """Run the full validate -> interpret -> backtest pipeline.

    Mirrors app.worker.jobs.run_backtest_job's sequence:
    StrategyDefinitionValidate.model_validate -> validate_strategy ->
    interpret_strategy -> run_backtest. Raises StrategyInvalidError if the
    definition fails validation -- a golden strategy failing validation is
    itself a regression.
    """
    parsed = StrategyDefinitionValidate.model_validate(definition_json)
    validation_result = validate_strategy(parsed)
    if validation_result.errors:
        first = validation_result.errors[0]
        raise StrategyInvalidError(
            f"Golden strategy failed validation: {first.message}",
            first.user_message,
        )

    signals = interpret_strategy(validation_result.strategy, candles)

    return run_backtest(
        candles=candles,
        signals=signals,
        initial_balance=run_config["initial_balance"],
        fee_rate=run_config["fee_rate"],
        slippage_rate=run_config["slippage_rate"],
        spread_rate=run_config["spread_rate"],
        timeframe=run_config["timeframe"],
    )


# ---------------------------------------------------------------------------
# RSI Oversold Bounce golden fixture
# ---------------------------------------------------------------------------

RSI_OVERSOLD_BOUNCE_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "RSI Oversold Bounce"
)

_RUN_CONFIG = {
    "initial_balance": 10000.0,
    "fee_rate": 0.001,
    "slippage_rate": 0.0005,
    "spread_rate": 0.0002,
    "timeframe": "1d",
}


def _rsi_oversold_bounce_candles() -> list[Candle]:
    """Deterministic candle series shaped for the RSI Oversold Bounce template.

    Phase 1 (days  1-20): steady downtrend drives RSI(14) to 0, firing the
      entry signal (RSI < 30).
    Phase 2 (days 21-30): sharp uptrend reverses RSI above 70, firing the
      exit signal -- trade 0 closes via "signal".
    Phase 3 (days 31-50): downtrend again drives RSI back below 30, firing a
      second entry signal.
    Phase 4 (days 51-53): downtrend continues with no exit signal, so the
      series ends mid-trade, forcing an end_of_data close on trade 1.
    """
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

    for _ in range(20):  # Phase 1: descend 100 -> 80
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(10):  # Phase 2: ascend 80 -> 110
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(20):  # Phase 3: descend 110 -> 90
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(3):  # Phase 4: descend 90 -> 87, ends mid-trade
        close = price - 1.0
        _append(price, close)
        price = close

    return candles


def _rsi_oversold_bounce_result() -> BacktestResult:
    return run_golden_pipeline(
        RSI_OVERSOLD_BOUNCE_TEMPLATE["definition_json"],
        _rsi_oversold_bounce_candles(),
        _RUN_CONFIG,
    )


# ---------------------------------------------------------------------------
# Golden snapshot
# ---------------------------------------------------------------------------


class TestRsiOversoldBounceGolden:
    """Full-pipeline golden snapshot for the RSI Oversold Bounce seed template."""

    def test_trade_count_and_exit_reasons(self):
        result = _rsi_oversold_bounce_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _rsi_oversold_bounce_result()

        assert result.final_balance          == 11615.35
        assert result.total_return_pct       == 16.15
        assert result.cagr_pct               == 186.28
        assert result.max_drawdown_pct       == 7.13
        assert result.win_rate_pct           == 50.0
        assert result.sharpe_ratio           == 4.17
        assert result.sortino_ratio          == 11.44
        assert result.calmar_ratio           == 26.14
        assert result.max_consecutive_losses == 1

    def test_cost_totals(self):
        result = _rsi_oversold_bounce_result()

        assert result.gross_return_usd       == 1688.52
        assert result.gross_return_pct       == 16.89
        assert result.total_fees_usd         == 45.73
        assert result.total_slippage_usd     == 22.86
        assert result.total_spread_usd       == 4.58
        assert result.total_costs_usd        == 73.17
        assert result.cost_pct_gross_return  == 4.33
        assert result.avg_cost_per_trade_usd == 36.59

    def test_equity_curve(self):
        result = _rsi_oversold_bounce_result()

        assert len(result.equity_curve) == 53

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 13),  # days  1-13 — no position yet
            9984.02,   # day 14 — trade 0 opened
            9867.93,   # day 15
            9751.83,   # day 16
            9635.74,   # day 17
            9519.65,   # day 18
            9403.55,   # day 19
            9287.46,   # day 20 — trough of trade 0
            9635.74,   # day 21
            9984.02,   # day 22
            10332.3,   # day 23
            10680.58,  # day 24
            11028.86,  # day 25
            11377.14,  # day 26
            11725.42,  # day 27
            12054.39,  # day 28 — trade 0 closed via signal exit
            *([12054.39] * 21),  # days 29 - Feb 18 — flat, no open position
            12035.12,  # Feb 19
            11901.4,   # Feb 20 — trade 1 opened
            11767.68,  # Feb 21
            11615.35,  # Feb 22 — end_of_data forced close
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _rsi_oversold_bounce_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 15, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 28, tzinfo=timezone.utc)

        # Unrounded float fields — use approx to survive ULP arithmetic drift
        assert t.entry_price == pytest.approx( 86.13765590429998, rel=1e-9)
        assert t.exit_price  == pytest.approx(103.8336675948,     rel=1e-9)
        assert t.pnl         == pytest.approx(2054.3874226343614, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  20.54387422634361, rel=1e-9)
        assert t.qty         == pytest.approx( 116.09324510885375, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        # Excursion metrics (rounded by engine)
        assert t.mae_usd == -770.59
        assert t.mae_pct ==   -7.7059
        assert t.mfe_usd == 2131.74
        assert t.mfe_pct ==   21.3174

        # No risk blocks in this template -> no risk metrics
        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        # Price extremes and timestamps
        assert t.peak_price   == 104.5
        assert t.peak_ts      == datetime(2024, 1, 28, tzinfo=timezone.utc)
        assert t.trough_price ==  79.5
        assert t.trough_ts    == datetime(2024, 1, 20, tzinfo=timezone.utc)

        assert t.duration_seconds == 1123200  # 13 days

        # Cost breakdown (rounded by engine)
        assert t.fee_cost_usd      == 22.06
        assert t.slippage_cost_usd == 11.03
        assert t.spread_cost_usd   ==  2.21
        assert t.total_cost_usd    == 35.29
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _rsi_oversold_bounce_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 20, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 22, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 90.1440585045,      rel=1e-9)
        assert t.exit_price  == pytest.approx( 86.86085654565001,  rel=1e-9)
        assert t.pnl         == pytest.approx(-439.04156364064846, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -3.642172333172783, rel=1e-9)
        assert t.qty         == pytest.approx( 133.72359335288422,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -487.3
        assert t.mae_pct ==   -4.0425
        assert t.mfe_usd ==   47.6
        assert t.mfe_pct ==    0.3949

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 90.5
        assert t.peak_ts      == datetime(2024, 2, 20, tzinfo=timezone.utc)
        assert t.trough_price == 86.5
        assert t.trough_ts    == datetime(2024, 2, 22, tzinfo=timezone.utc)

        assert t.duration_seconds == 172800  # 2 days

        assert t.fee_cost_usd      == 23.67
        assert t.slippage_cost_usd == 11.83
        assert t.spread_cost_usd   ==  2.37
        assert t.total_cost_usd    == 37.87
        assert t.notional_usd      == 12035.12


# ---------------------------------------------------------------------------
# MA Crossover golden fixture
# ---------------------------------------------------------------------------

MA_CROSSOVER_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "MA Crossover"
)


def _ma_crossover_candles() -> list[Candle]:
    """Deterministic candle series shaped for the MA Crossover template.

    Phase 1 (days  1-40): gentle downtrend (300 -> 260) warms up SMA(10) and
      SMA(30) with the fast SMA below the slow SMA.
    Phase 2 (days 41-55): sharp uptrend (260 -> 320) -- the fast SMA rises
      faster than the slow SMA and crosses above it, firing the entry signal
      (crosses_above) -- trade 0 opens.
    Phase 3 (days 56-70): sharp downtrend (320 -> 260) -- the fast SMA falls
      back below the slow SMA, firing the exit signal (crosses_below) --
      trade 0 closes via "signal".
    Phase 4 (days 71-85): sharp uptrend again (260 -> 320) -- the fast SMA
      crosses above the slow SMA a second time, firing a second entry signal
      -- trade 1 opens.
    Phase 5 (days 86-90): gentle uptrend continues with no exit signal, so
      the series ends mid-trade, forcing an end_of_data close on trade 1.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 300.0

    def _append(open_: float, close: float) -> None:
        candles.append(
            Candle(
                asset="ETH/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=len(candles)),
                open=open_,
                high=max(open_, close) + 0.5,
                low=min(open_, close) - 0.5,
                close=close,
                volume=1000.0,
            )
        )

    for _ in range(40):  # Phase 1: descend 300 -> 260
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(15):  # Phase 2: ascend 260 -> 320
        close = price + 4.0
        _append(price, close)
        price = close

    for _ in range(15):  # Phase 3: descend 320 -> 260
        close = price - 4.0
        _append(price, close)
        price = close

    for _ in range(15):  # Phase 4: ascend 260 -> 320
        close = price + 4.0
        _append(price, close)
        price = close

    for _ in range(5):  # Phase 5: ascend 320 -> 322.5, ends mid-trade
        close = price + 0.5
        _append(price, close)
        price = close

    return candles


def _ma_crossover_result() -> BacktestResult:
    return run_golden_pipeline(
        MA_CROSSOVER_TEMPLATE["definition_json"],
        _ma_crossover_candles(),
        _RUN_CONFIG,
    )


# ---------------------------------------------------------------------------
# Golden snapshot
# ---------------------------------------------------------------------------


class TestMaCrossoverGolden:
    """Full-pipeline golden snapshot for the MA Crossover seed template."""

    def test_trade_count_and_exit_reasons(self):
        result = _ma_crossover_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _ma_crossover_result()

        assert result.final_balance          == 9426.44
        assert result.total_return_pct       == -5.74
        assert result.cagr_pct               == -21.53
        assert result.max_drawdown_pct       == 16.52
        assert result.win_rate_pct           == 50.0
        assert result.sharpe_ratio           == -1.84
        assert result.sortino_ratio          == -2.34
        assert result.calmar_ratio           == -1.3
        assert result.max_consecutive_losses == 1

    def test_cost_totals(self):
        result = _ma_crossover_result()

        assert result.gross_return_usd       == -513.2
        assert result.gross_return_pct       == -5.13
        assert result.total_fees_usd         == 37.73
        assert result.total_slippage_usd     == 18.86
        assert result.total_spread_usd       == 3.77
        assert result.total_costs_usd        == 60.36
        assert result.cost_pct_gross_return  is None
        assert result.avg_cost_per_trade_usd == 30.18

    def test_equity_curve(self):
        result = _ma_crossover_result()

        assert len(result.equity_curve) == 90

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 47),  # days  1-47 — no position yet
            9984.02,    # day 48 — trade 0 opened
            10120.79,   # day 49
            10257.55,   # day 50
            10394.32,   # day 51
            10531.09,   # day 52
            10667.86,   # day 53
            10804.62,   # day 54
            10941.39,   # day 55 — peak of trade 0
            10804.62,   # day 56
            10667.86,   # day 57
            10531.09,   # day 58
            10394.32,   # day 59
            10257.55,   # day 60
            10120.79,   # day 61
            9984.02,    # day 62
            9847.25,    # day 63
            9710.48,    # day 64
            9573.72,    # day 65
            9436.95,    # day 66
            9300.18,    # day 67
            9148.76,    # day 68 — trade 0 closed via signal exit
            *([9148.76] * 14),  # days 69-82 — flat, no open position
            9134.14,    # day 83 — trade 1 opened
            9251.24,    # day 84
            9368.35,    # day 85
            9382.99,    # day 86
            9397.62,    # day 87
            9412.26,    # day 88
            9426.9,     # day 89
            9426.44,    # day 90 — end_of_data forced close
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _ma_crossover_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 18, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 8, tzinfo=timezone.utc)

        # Unrounded float fields — use approx to survive ULP arithmetic drift
        assert t.entry_price == pytest.approx(292.4673898145999, rel=1e-9)
        assert t.exit_price  == pytest.approx(267.5713741866,    rel=1e-9)
        assert t.pnl         == pytest.approx(-851.2407364042172, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -8.512407364042172, rel=1e-9)
        assert t.qty         == pytest.approx(  34.19184616219665, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        # Excursion metrics (rounded by engine)
        assert t.mae_usd == -853.68
        assert t.mae_pct ==   -8.5368
        assert t.mfe_usd ==  958.49
        assert t.mfe_pct ==    9.5849

        # No risk blocks in this template -> no risk metrics
        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        # Price extremes and timestamps
        assert t.peak_price   == 320.5
        assert t.peak_ts      == datetime(2024, 2, 24, tzinfo=timezone.utc)
        assert t.trough_price == 267.5
        assert t.trough_ts    == datetime(2024, 3, 8, tzinfo=timezone.utc)

        assert t.duration_seconds == 1641600  # 19 days

        # Cost breakdown (rounded by engine)
        assert t.fee_cost_usd      == 19.15
        assert t.slippage_cost_usd ==  9.57
        assert t.spread_cost_usd   ==  1.91
        assert t.total_cost_usd    == 30.64
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _ma_crossover_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 3, 24, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 30, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(312.4994028156,      rel=1e-9)
        assert t.exit_price  == pytest.approx(321.984209608875,    rel=1e-9)
        assert t.pnl         == pytest.approx(277.6780154827846,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  3.0351439739780344, rel=1e-9)
        assert t.qty         == pytest.approx( 29.27608558981565,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -29.26
        assert t.mae_pct ==  -0.3198
        assert t.mfe_usd == 307.42
        assert t.mfe_pct ==   3.3602

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 323.0
        assert t.peak_ts      == datetime(2024, 3, 30, tzinfo=timezone.utc)
        assert t.trough_price == 311.5
        assert t.trough_ts    == datetime(2024, 3, 24, tzinfo=timezone.utc)

        assert t.duration_seconds == 518400  # 6 days

        assert t.fee_cost_usd      == 18.58
        assert t.slippage_cost_usd ==  9.29
        assert t.spread_cost_usd   ==  1.86
        assert t.total_cost_usd    == 29.72
        assert t.notional_usd      == 9134.14


# ---------------------------------------------------------------------------
# Bollinger Breakout golden fixture
# ---------------------------------------------------------------------------

BOLLINGER_BREAKOUT_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "Bollinger Breakout"
)


def _bollinger_breakout_candles() -> list[Candle]:
    """Deterministic candle series shaped for the Bollinger Breakout template.

    Phase 1 (days  1-25): flat at 100 -- warms up Bollinger(20, 2.0) with zero
      volatility so the bands converge to 100 and neither signal fires.
    Phase 2 (days 26-30): sharp uptrend (100 -> 130) -- close pushes above the
      upper band, firing the entry signal (close > upper) -- trade 0 opens.
    Phase 3 (days 31-37): sharp downtrend (130 -> 88) -- close falls below the
      middle band, firing the exit signal (close < middle) -- trade 0 closes
      via "signal".
    Phase 4 (days 38-47): flat at 88 -- bands narrow again with no open
      position.
    Phase 5 (days 48-52): sharp uptrend (88 -> 118) -- close pushes above the
      upper band a second time, firing a second entry signal -- trade 1 opens.
    Phase 6 (days 53-57): flat at 118 with no exit signal, so the series ends
      mid-trade, forcing an end_of_data close on trade 1.
    """
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

    for _ in range(25):  # Phase 1: flat at 100
        _append(price, price)

    for _ in range(5):  # Phase 2: ascend 100 -> 130
        close = price + 6.0
        _append(price, close)
        price = close

    for _ in range(7):  # Phase 3: descend 130 -> 88
        close = price - 6.0
        _append(price, close)
        price = close

    for _ in range(10):  # Phase 4: flat at 88
        _append(price, price)

    for _ in range(5):  # Phase 5: ascend 88 -> 118
        close = price + 6.0
        _append(price, close)
        price = close

    for _ in range(5):  # Phase 6: flat at 118, ends mid-trade
        _append(price, price)

    return candles


def _bollinger_breakout_result() -> BacktestResult:
    return run_golden_pipeline(
        BOLLINGER_BREAKOUT_TEMPLATE["definition_json"],
        _bollinger_breakout_candles(),
        _RUN_CONFIG,
    )


# ---------------------------------------------------------------------------
# Golden snapshot
# ---------------------------------------------------------------------------


class TestBollingerBreakoutGolden:
    """Full-pipeline golden snapshot for the Bollinger Breakout seed template."""

    def test_trade_count_and_exit_reasons(self):
        result = _bollinger_breakout_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _bollinger_breakout_result()

        assert result.final_balance          == 9936.2
        assert result.total_return_pct       == -0.64
        assert result.cagr_pct               == -4.09
        assert result.max_drawdown_pct       == 18.72
        assert result.win_rate_pct           == 0.0
        assert result.sharpe_ratio           == 0.07
        assert result.sortino_ratio          == 0.11
        assert result.calmar_ratio           == -0.22
        assert result.max_consecutive_losses == 2

    def test_cost_totals(self):
        result = _bollinger_breakout_result()

        assert result.gross_return_usd       == -0.01
        assert result.gross_return_pct       == -0.0
        assert result.total_fees_usd         == 39.87
        assert result.total_slippage_usd     == 19.93
        assert result.total_spread_usd       ==  3.99
        assert result.total_costs_usd        == 63.79
        assert result.cost_pct_gross_return  is None
        assert result.avg_cost_per_trade_usd == 31.89

    def test_equity_curve(self):
        result = _bollinger_breakout_result()

        assert len(result.equity_curve) == 57

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 25),  # days  1-25 — flat warmup, no position yet
            9984.02,    # day 26 — trade 0 opened
            10549.15,   # day 27 — trade 0 entry_time
            11114.29,   # day 28
            11679.42,   # day 29
            12244.55,   # day 30 — peak of trade 0
            11679.42,   # day 31
            11114.29,   # Feb 1
            10549.15,   # Feb 2
            *([9968.05] * 18),  # Feb 3 - Feb 20 — trade 0 closed via signal exit, then flat
            *([9952.12] * 5),   # Feb 21 - Feb 25 — trade 1 opened
            9936.2,     # Feb 26 — end_of_data forced close
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _bollinger_breakout_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 27, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 3, tzinfo=timezone.utc)

        # Unrounded float fields — use approx to survive ULP arithmetic drift
        assert t.entry_price == pytest.approx(106.16966890529999, rel=1e-9)
        assert t.exit_price  == pytest.approx(105.8304688947,     rel=1e-9)
        assert t.pnl         == pytest.approx(-31.94886205235669, rel=1e-9)
        assert t.pnl_pct     == pytest.approx( -0.3194886205235669, rel=1e-9)
        assert t.qty         == pytest.approx( 94.18885923925869, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        # Excursion metrics (rounded by engine)
        assert t.mae_usd == -63.08
        assert t.mae_pct ==   -0.6308
        assert t.mfe_usd == 2291.65
        assert t.mfe_pct ==   22.9165

        # No risk blocks in this template -> no risk metrics
        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        # Price extremes and timestamps
        assert t.peak_price   == 130.5
        assert t.peak_ts      == datetime(2024, 1, 30, tzinfo=timezone.utc)
        assert t.trough_price == 105.5
        assert t.trough_ts    == datetime(2024, 1, 27, tzinfo=timezone.utc)

        assert t.duration_seconds == 604800  # 7 days

        # Cost breakdown (rounded by engine)
        assert t.fee_cost_usd      == 19.97
        assert t.slippage_cost_usd ==  9.98
        assert t.spread_cost_usd   ==  2.0
        assert t.total_cost_usd    == 31.95
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _bollinger_breakout_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 22, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 26, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(118.18887670589999, rel=1e-9)
        assert t.exit_price  == pytest.approx(117.8112766941,     rel=1e-9)
        assert t.pnl         == pytest.approx(-31.84678907371307, rel=1e-9)
        assert t.pnl_pct     == pytest.approx( -0.31948862052357124, rel=1e-9)
        assert t.qty         == pytest.approx( 84.3400108011183,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -58.1
        assert t.mae_pct ==   -0.5829
        assert t.mfe_usd ==   26.24
        assert t.mfe_pct ==    0.2632

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 118.5
        assert t.peak_ts      == datetime(2024, 2, 22, tzinfo=timezone.utc)
        assert t.trough_price == 117.5
        assert t.trough_ts    == datetime(2024, 2, 22, tzinfo=timezone.utc)

        assert t.duration_seconds == 345600  # 4 days

        assert t.fee_cost_usd      == 19.9
        assert t.slippage_cost_usd ==  9.95
        assert t.spread_cost_usd   ==  1.99
        assert t.total_cost_usd    == 31.85
        assert t.notional_usd      == 9952.12


# ---------------------------------------------------------------------------
# mutate_tail / assert_prefix_unchanged helpers
# ---------------------------------------------------------------------------


def mutate_tail(candles: list[Candle], cut_index: int) -> list[Candle]:
    """Return a new candle list with the tail from cut_index trend-reversed.

    Candles before cut_index, plus the candle at cut_index itself, keep their
    original values (as new objects -- immutability per coding-style rules).
    The candle at cut_index is preserved unchanged because it is the anchor
    any in-flight decision "as of cut_index" depends on (e.g. a signal exit
    priced off that candle's close); reversing it too would make the
    look-ahead test's "trades up to the cut are unchanged" assertion
    impossible to satisfy by construction.

    Every candle after cut_index is replaced by a synthetic series, starting
    from the anchor's close, that steps in the opposite direction of the
    original tail's net trend (uptrend tail -> downtrend replacement, or
    vice versa), with the same length and timestamps as the original tail.
    """
    prefix = [c.model_copy() for c in candles[:cut_index]]

    tail = candles[cut_index:]
    if len(tail) < 2:
        return prefix + [c.model_copy() for c in tail]

    anchor = tail[0]
    net_change = tail[-1].close - tail[0].close
    step = abs(net_change) / (len(tail) - 1) if net_change != 0 else 1.0
    direction = -1.0 if net_change >= 0 else 1.0  # reverse the original trend

    mutated_tail = [anchor.model_copy()]
    price = anchor.close
    for candle in tail[1:]:
        new_close = price + direction * step
        new_open = price
        mutated_tail.append(
            Candle(
                asset=candle.asset,
                timeframe=candle.timeframe,
                timestamp=candle.timestamp,
                open=new_open,
                high=max(new_open, new_close) + 0.5,
                low=min(new_open, new_close) - 0.5,
                close=new_close,
                volume=candle.volume,
                source=candle.source,
            )
        )
        price = new_close

    return prefix + mutated_tail


def _assert_optional_approx(golden_value, mutated_value) -> None:
    if golden_value is None:
        assert mutated_value is None
    else:
        assert mutated_value == pytest.approx(golden_value, rel=1e-9)


def assert_prefix_unchanged(
    golden_result: BacktestResult,
    mutated_result: BacktestResult,
    cut_timestamp: datetime,
) -> None:
    """Assert every trade/equity-curve point up to cut_timestamp is unchanged.

    Used by look-ahead tests: mutating candles at or after cut_timestamp must
    not change any trade with entry_time <= cut_timestamp, nor any
    equity-curve point with timestamp <= cut_timestamp.
    """
    golden_trades = [t for t in golden_result.trades if t.entry_time <= cut_timestamp]
    mutated_trades = [t for t in mutated_result.trades if t.entry_time <= cut_timestamp]

    assert len(golden_trades) == len(mutated_trades)

    for golden_trade, mutated_trade in zip(golden_trades, mutated_trades):
        assert golden_trade.exit_reason == mutated_trade.exit_reason
        assert golden_trade.exit_time   == mutated_trade.exit_time
        assert golden_trade.entry_time  == mutated_trade.entry_time

        assert mutated_trade.pnl         == pytest.approx(golden_trade.pnl, rel=1e-9)
        assert mutated_trade.pnl_pct     == pytest.approx(golden_trade.pnl_pct, rel=1e-9)
        assert mutated_trade.exit_price  == pytest.approx(golden_trade.exit_price, rel=1e-9)
        assert mutated_trade.entry_price == pytest.approx(golden_trade.entry_price, rel=1e-9)
        assert mutated_trade.qty         == pytest.approx(golden_trade.qty, rel=1e-9)

        _assert_optional_approx(golden_trade.sl_price_at_entry, mutated_trade.sl_price_at_entry)
        _assert_optional_approx(golden_trade.tp_price_at_entry, mutated_trade.tp_price_at_entry)

    golden_points = {
        point["timestamp"]: point["equity"]
        for point in golden_result.equity_curve
        if datetime.fromisoformat(point["timestamp"]) <= cut_timestamp
    }
    mutated_points = {
        point["timestamp"]: point["equity"]
        for point in mutated_result.equity_curve
        if datetime.fromisoformat(point["timestamp"]) <= cut_timestamp
    }
    assert mutated_points == golden_points


# ---------------------------------------------------------------------------
# mutate_tail / assert_prefix_unchanged unit tests
# ---------------------------------------------------------------------------


def _uptrend_candles(count: int) -> list[Candle]:
    """Small monotonic uptrend series for mutate_tail unit tests."""
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 100.0
    for i in range(count):
        close = price + 1.0
        candles.append(
            Candle(
                asset="BTC/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=i),
                open=price,
                high=close + 0.5,
                low=price - 0.5,
                close=close,
                volume=1000.0,
            )
        )
        price = close
    return candles


class TestMutateTail:
    def test_output_length_and_timestamps_match_input(self):
        candles = _uptrend_candles(10)

        mutated = mutate_tail(candles, cut_index=6)

        assert len(mutated) == len(candles)
        assert [c.timestamp for c in mutated] == [c.timestamp for c in candles]

    def test_candles_before_cut_index_are_unchanged(self):
        candles = _uptrend_candles(10)

        mutated = mutate_tail(candles, cut_index=6)

        assert mutated[:6] == candles[:6]

    def test_candles_from_cut_index_reverse_the_tail_trend(self):
        candles = _uptrend_candles(10)
        cut_index = 6

        mutated = mutate_tail(candles, cut_index)

        original_tail = candles[cut_index:]
        mutated_tail = mutated[cut_index:]

        assert mutated_tail != original_tail

        original_trend = original_tail[-1].close - original_tail[0].close
        mutated_trend = mutated_tail[-1].close - mutated_tail[0].close
        assert original_trend > 0  # sanity: input tail is an uptrend
        assert mutated_trend < 0   # reversed to a downtrend


class TestAssertPrefixUnchanged:
    def test_passes_when_results_are_identical(self):
        golden = _rsi_oversold_bounce_result()
        identical = copy.deepcopy(golden)
        cut_timestamp = golden.trades[0].exit_time

        assert_prefix_unchanged(golden, identical, cut_timestamp)

    def test_raises_when_a_pre_cut_trade_differs(self):
        golden = _rsi_oversold_bounce_result()
        mutated = copy.deepcopy(golden)
        cut_timestamp = golden.trades[0].exit_time
        mutated.trades[0].pnl += 1.0

        with pytest.raises(AssertionError):
            assert_prefix_unchanged(golden, mutated, cut_timestamp)

    def test_raises_when_a_pre_cut_equity_point_differs(self):
        golden = _rsi_oversold_bounce_result()
        mutated = copy.deepcopy(golden)
        cut_timestamp = golden.trades[0].exit_time
        mutated.equity_curve[0]["equity"] += 1.0

        with pytest.raises(AssertionError):
            assert_prefix_unchanged(golden, mutated, cut_timestamp)


# ---------------------------------------------------------------------------
# Look-ahead test
# ---------------------------------------------------------------------------


class TestRsiOversoldBounceLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for RSI Oversold Bounce.

    Replacing every candle from trade 0's exit candle onward with a
    sharply reversed series must not change trade 0, nor any equity-curve
    point up to that candle.
    """

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _rsi_oversold_bounce_candles()
        golden_result = run_golden_pipeline(
            RSI_OVERSOLD_BOUNCE_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            RSI_OVERSOLD_BOUNCE_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


class TestMaCrossoverLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for MA Crossover.

    Replacing every candle from trade 0's exit candle onward with a
    sharply reversed series must not change trade 0, nor any equity-curve
    point up to that candle.
    """

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _ma_crossover_candles()
        golden_result = run_golden_pipeline(
            MA_CROSSOVER_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            MA_CROSSOVER_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


class TestBollingerBreakoutLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for Bollinger Breakout.

    Replacing every candle from trade 0's exit candle onward with a
    sharply reversed series must not change trade 0, nor any equity-curve
    point up to that candle.
    """

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _bollinger_breakout_candles()
        golden_result = run_golden_pipeline(
            BOLLINGER_BREAKOUT_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            BOLLINGER_BREAKOUT_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)
