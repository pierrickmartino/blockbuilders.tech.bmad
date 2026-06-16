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


# ---------------------------------------------------------------------------
# EMA Trend Following golden fixture
# ---------------------------------------------------------------------------

EMA_TREND_FOLLOWING_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "EMA Trend Following"
)


def _ema_trend_following_candles() -> list[Candle]:
    """Deterministic candle series shaped for the EMA Trend Following template.

    Phase 1 (days  1-35): downtrend 200->165 warms up EMA(9) and EMA(21)
      with fast EMA below slow EMA.
    Phase 2 (days 36-60): uptrend 165->215 — fast EMA crosses above slow EMA,
      firing the entry signal — trade 0 opens.
    Phase 3 (days 61-85): downtrend 215->165 — fast EMA crosses back below
      slow EMA, firing the exit signal — trade 0 closes via "signal".
    Phase 4 (days 86-110): uptrend 165->215 — fast EMA crosses above slow EMA
      again — trade 1 opens.
    Phase 5 (days 111-115): mild uptrend 215->220, ends mid-trade → end_of_data.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 200.0

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

    for _ in range(35):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price + 2.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price - 2.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price + 2.0
        _append(price, close)
        price = close

    for _ in range(5):
        close = price + 1.0
        _append(price, close)
        price = close

    return candles


def _ema_trend_following_result() -> BacktestResult:
    return run_golden_pipeline(
        EMA_TREND_FOLLOWING_TEMPLATE["definition_json"],
        _ema_trend_following_candles(),
        _RUN_CONFIG,
    )


class TestEmaTrendFollowingGolden:
    """Full-pipeline golden snapshot for the EMA Trend Following template."""

    def test_trade_count_and_exit_reasons(self):
        result = _ema_trend_following_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _ema_trend_following_result()

        assert result.final_balance          == 12464.66
        assert result.total_return_pct       == 24.65
        assert result.cagr_pct               == 102.56
        assert result.max_drawdown_pct       == 10.52
        assert result.win_rate_pct           == 100.0
        assert result.sharpe_ratio           == 6.36
        assert result.sortino_ratio          == 12.06
        assert result.calmar_ratio           == 9.75
        assert result.max_consecutive_losses == 0

    def test_cost_totals(self):
        result = _ema_trend_following_result()

        assert result.gross_return_usd       == 2534.62
        assert result.gross_return_pct       == 25.35
        assert result.total_fees_usd         == 43.73
        assert result.total_slippage_usd     == 21.86
        assert result.total_spread_usd       == 4.37
        assert result.total_costs_usd        == 69.96
        assert result.cost_pct_gross_return  == 2.76
        assert result.avg_cost_per_trade_usd == 34.98

    def test_equity_curve(self):
        result = _ema_trend_following_result()

        assert len(result.equity_curve) == 115

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 42),
            9984.02, 10094.34, 10204.66, 10314.98, 10425.3, 10535.62, 10645.94,
            10756.26, 10866.58, 10976.9, 11087.23, 11197.55, 11307.87, 11418.19,
            11528.51, 11638.83, 11749.15, 11859.47, 11749.15, 11638.83, 11528.51,
            11418.19, 11307.87, 11197.55, 11087.23, 10976.9, 10866.58, 10756.26,
            10628.92,
            *([10628.92] * 24),
            10611.93, 10725.43, 10838.92, 10952.42, 11065.92, 11179.41, 11292.91,
            11406.41, 11519.9, 11633.4, 11746.9, 11860.39, 11973.89, 12087.39,
            12200.88, 12257.63, 12314.38, 12371.13, 12427.88, 12464.66,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _ema_trend_following_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 13, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 11, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(181.28971765904998, rel=1e-9)
        assert t.exit_price  == pytest.approx(192.69132544035,    rel=1e-9)
        assert t.pnl         == pytest.approx(628.9164067618508,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  6.289164067618508, rel=1e-9)
        assert t.qty         == pytest.approx( 55.160326405311714, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -43.56
        assert t.mae_pct ==  -0.4356
        assert t.mfe_usd == 1887.05
        assert t.mfe_pct ==  18.8705

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 215.5
        assert t.peak_ts      == datetime(2024, 2, 29, tzinfo=timezone.utc)
        assert t.trough_price == 180.5
        assert t.trough_ts    == datetime(2024, 2, 13, tzinfo=timezone.utc)

        assert t.duration_seconds == 2332800

        assert t.fee_cost_usd      == 20.63
        assert t.slippage_cost_usd == 10.31
        assert t.spread_cost_usd   ==  2.06
        assert t.total_cost_usd    == 33.01
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _ema_trend_following_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 4, 6, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 4, 24, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(187.29932155934995,  rel=1e-9)
        assert t.exit_price  == pytest.approx(219.64814298900004,  rel=1e-9)
        assert t.pnl         == pytest.approx(1835.7403324820164,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  17.2711898582076,  rel=1e-9)
        assert t.qty         == pytest.approx(  56.74829101499891, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -45.36
        assert t.mae_pct ==  -0.4268
        assert t.mfe_usd == 1884.08
        assert t.mfe_pct ==  17.726

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 220.5
        assert t.peak_ts      == datetime(2024, 4, 24, tzinfo=timezone.utc)
        assert t.trough_price == 186.5
        assert t.trough_ts    == datetime(2024, 4, 6, tzinfo=timezone.utc)

        assert t.duration_seconds == 1555200

        assert t.fee_cost_usd      == 23.1
        assert t.slippage_cost_usd == 11.55
        assert t.spread_cost_usd   ==  2.31
        assert t.total_cost_usd    == 36.95
        assert t.notional_usd      == 10611.93


class TestEmaTrendFollowingLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for EMA Trend Following."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _ema_trend_following_candles()
        golden_result = run_golden_pipeline(
            EMA_TREND_FOLLOWING_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            EMA_TREND_FOLLOWING_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# MACD Histogram Cross golden fixture
# ---------------------------------------------------------------------------

MACD_HISTOGRAM_CROSS_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "MACD Histogram Cross"
)


def _macd_histogram_cross_candles() -> list[Candle]:
    """Deterministic candle series shaped for the MACD Histogram Cross template.

    Phase 1 (days  1-45): downtrend 1500->1455 warms up MACD(12,26,9) with
      histogram < 0.
    Phase 2 (days 46-70): uptrend 1455->1530 — histogram crosses 0 from below
      (positive momentum) — trade 0 opens.
    Phase 3 (days 71-95): downtrend 1530->1455 — histogram crosses 0 from above
      — trade 0 closes via "signal".
    Phase 4 (days 96-120): uptrend 1455->1530 — histogram crosses 0 again —
      trade 1 opens.
    Phase 5 (days 121-125): mild uptrend 1530->1535, ends mid-trade → end_of_data.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 1500.0

    def _append(open_: float, close: float) -> None:
        candles.append(
            Candle(
                asset="ETH/USDT",
                timeframe="4h",
                timestamp=start + timedelta(days=len(candles)),
                open=open_,
                high=max(open_, close) + 0.5,
                low=min(open_, close) - 0.5,
                close=close,
                volume=1000.0,
            )
        )

    for _ in range(45):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price - 3.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(5):
        close = price + 1.0
        _append(price, close)
        price = close

    return candles


def _macd_histogram_cross_result() -> BacktestResult:
    return run_golden_pipeline(
        MACD_HISTOGRAM_CROSS_TEMPLATE["definition_json"],
        _macd_histogram_cross_candles(),
        _RUN_CONFIG,
    )


class TestMacdHistogramCrossGolden:
    """Full-pipeline golden snapshot for the MACD Histogram Cross template."""

    def test_trade_count_and_exit_reasons(self):
        result = _macd_histogram_cross_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _macd_histogram_cross_result()

        assert result.final_balance          == 10750.92
        assert result.total_return_pct       == 7.51
        assert result.cagr_pct               == 23.77
        assert result.max_drawdown_pct       == 1.1
        assert result.win_rate_pct           == 100.0
        assert result.sharpe_ratio           == 9.39
        assert result.sortino_ratio          == 21.03
        assert result.calmar_ratio           == 21.59
        assert result.max_consecutive_losses == 0

    def test_cost_totals(self):
        result = _macd_histogram_cross_result()

        assert result.gross_return_usd       == 817.17
        assert result.gross_return_pct       == 8.17
        assert result.total_fees_usd         == 41.41
        assert result.total_slippage_usd     == 20.7
        assert result.total_spread_usd       == 4.14
        assert result.total_costs_usd        == 66.25
        assert result.cost_pct_gross_return  == 8.11
        assert result.avg_cost_per_trade_usd == 33.12

    def test_equity_curve(self):
        result = _macd_histogram_cross_result()

        assert len(result.equity_curve) == 125

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 34),
            9984.02, 9977.2, 9970.39, 9963.57, 9956.76, 9949.94, 9943.13,
            9936.31, 9929.5, 9922.68, 9915.87, 9936.31, 9956.76, 9977.2,
            9997.65, 10018.09, 10038.54, 10058.98, 10079.43, 10099.87, 10120.32,
            10140.76, 10161.21, 10181.65, 10202.1, 10222.55, 10242.99, 10263.44,
            10283.88, 10304.33, 10324.77, 10345.22, 10365.66, 10386.11, 10406.55,
            10427.0, 10406.55, 10386.11, 10365.66,
            10328.67,
            *([10328.67] * 25),
            10312.16, 10333.21, 10354.25, 10375.3, 10396.34, 10417.39, 10438.44,
            10459.48, 10480.53, 10501.57, 10522.62, 10543.66, 10564.71, 10585.75,
            10606.8, 10627.84, 10648.89, 10669.93, 10690.98, 10712.02, 10733.07,
            10740.08, 10747.1, 10754.11, 10761.13, 10750.92,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _macd_histogram_cross_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 5, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 14, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1467.3449523232496, rel=1e-9)
        assert t.exit_price  == pytest.approx(1515.5721866241,    rel=1e-9)
        assert t.pnl         == pytest.approx( 328.6700528358522, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   3.2867005283585216, rel=1e-9)
        assert t.qty         == pytest.approx(   6.815030088301312, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -87.54
        assert t.mae_pct ==  -0.8754
        assert t.mfe_usd == 430.4
        assert t.mfe_pct ==   4.304

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 1530.5
        assert t.peak_ts      == datetime(2024, 3, 10, tzinfo=timezone.utc)
        assert t.trough_price == 1454.5
        assert t.trough_ts    == datetime(2024, 2, 14, tzinfo=timezone.utc)

        assert t.duration_seconds == 3283200

        assert t.fee_cost_usd      == 20.33
        assert t.slippage_cost_usd == 10.16
        assert t.spread_cost_usd   ==  2.03
        assert t.total_cost_usd    == 32.53
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _macd_histogram_cross_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 4, 10, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 5, 4, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1472.3529555734997,  rel=1e-9)
        assert t.exit_price  == pytest.approx(1532.5449976732502,  rel=1e-9)
        assert t.pnl         == pytest.approx( 422.2518386649803,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   4.088153039113166, rel=1e-9)
        assert t.qty         == pytest.approx(   7.0150774742817745, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -20.01
        assert t.mae_pct ==  -0.1938
        assert t.mfe_usd == 442.98
        assert t.mfe_pct ==   4.2889

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 1535.5
        assert t.peak_ts      == datetime(2024, 5, 4, tzinfo=timezone.utc)
        assert t.trough_price == 1469.5
        assert t.trough_ts    == datetime(2024, 4, 10, tzinfo=timezone.utc)

        assert t.duration_seconds == 2073600

        assert t.fee_cost_usd      == 21.08
        assert t.slippage_cost_usd == 10.54
        assert t.spread_cost_usd   ==  2.11
        assert t.total_cost_usd    == 33.73
        assert t.notional_usd      == 10312.16


class TestMacdHistogramCrossLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for MACD Histogram Cross."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _macd_histogram_cross_candles()
        golden_result = run_golden_pipeline(
            MACD_HISTOGRAM_CROSS_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            MACD_HISTOGRAM_CROSS_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# Stochastic Oversold Bounce golden fixture
# ---------------------------------------------------------------------------

STOCHASTIC_OVERSOLD_BOUNCE_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "Stochastic Oversold Bounce"
)


def _stochastic_oversold_bounce_candles() -> list[Candle]:
    """Deterministic candle series shaped for the Stochastic Oversold Bounce template.

    Phase 1 (days  1-30): downtrend 100->70 drives %K to ~0 (oversold) — trade 0 opens.
    Phase 2 (days 31-45): sharp uptrend 70->115 drives %K to ~100 (overbought) — trade 0
      closes via "signal".
    Phase 3 (days 46-70): downtrend 115->90 drives %K back below 20 — trade 1 opens.
    Phase 4 (days 71-75): flat at 90 ends mid-trade → end_of_data.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 100.0

    def _append(open_: float, close: float) -> None:
        candles.append(
            Candle(
                asset="BTC/USDT",
                timeframe="4h",
                timestamp=start + timedelta(days=len(candles)),
                open=open_,
                high=max(open_, close) + 0.5,
                low=min(open_, close) - 0.5,
                close=close,
                volume=1000.0,
            )
        )

    for _ in range(30):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(15):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(5):
        _append(price, price)

    return candles


def _stochastic_oversold_bounce_result() -> BacktestResult:
    return run_golden_pipeline(
        STOCHASTIC_OVERSOLD_BOUNCE_TEMPLATE["definition_json"],
        _stochastic_oversold_bounce_candles(),
        _RUN_CONFIG,
    )


class TestStochasticOversoldBounceGolden:
    """Full-pipeline golden snapshot for the Stochastic Oversold Bounce template."""

    def test_trade_count_and_exit_reasons(self):
        result = _stochastic_oversold_bounce_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _stochastic_oversold_bounce_result()

        assert result.final_balance          == 8785.48
        assert result.total_return_pct       == -12.15
        assert result.cagr_pct               == -47.22
        assert result.max_drawdown_pct       == 16.8
        assert result.win_rate_pct           == 50.0
        assert result.sharpe_ratio           == -2.59
        assert result.sortino_ratio          == -4.49
        assert result.calmar_ratio           == -2.81
        assert result.max_consecutive_losses == 1

    def test_cost_totals(self):
        result = _stochastic_oversold_bounce_result()

        assert result.gross_return_usd       == -1152.18
        assert result.gross_return_pct       == -11.52
        assert result.total_fees_usd         == 38.96
        assert result.total_slippage_usd     == 19.48
        assert result.total_spread_usd       == 3.9
        assert result.total_costs_usd        == 62.34
        assert result.cost_pct_gross_return  is None
        assert result.avg_cost_per_trade_usd == 31.17

    def test_equity_curve(self):
        result = _stochastic_oversold_bounce_result()

        assert len(result.equity_curve) == 75

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 15),
            9984.02, 9865.16, 9746.3, 9627.45, 9508.59, 9389.73, 9270.87,
            9152.02, 9033.16, 8914.3, 8795.45, 8676.59, 8557.73, 8438.87,
            8320.02, 8676.59, 9033.16, 9389.73, 9746.3,
            10086.72,
            *([10086.72] * 21),
            10070.6, 9972.83, 9875.05, 9777.28, 9679.51, 9581.73, 9483.96,
            9386.19, 9288.42, 9190.64, 9092.87, 8995.1, 8897.33, 8799.55,
            *([8799.55] * 4),
            8785.48,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _stochastic_oversold_bounce_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 17, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 4, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 84.1344546042,       rel=1e-9)
        assert t.exit_price  == pytest.approx( 84.86405524575001,   rel=1e-9)
        assert t.pnl         == pytest.approx( 86.71841339940006,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  0.8671841339940006, rel=1e-9)
        assert t.qty         == pytest.approx(118.85736999239785,   rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -1739.41
        assert t.mae_pct ==   -17.3941
        assert t.mfe_usd ==   162.31
        assert t.mfe_pct ==     1.6231

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 85.5
        assert t.peak_ts      == datetime(2024, 2, 4, tzinfo=timezone.utc)
        assert t.trough_price == 69.5
        assert t.trough_ts    == datetime(2024, 1, 30, tzinfo=timezone.utc)

        assert t.duration_seconds == 1555200

        assert t.fee_cost_usd      == 20.09
        assert t.slippage_cost_usd == 10.04
        assert t.spread_cost_usd   ==  2.01
        assert t.total_cost_usd    == 32.14
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _stochastic_oversold_bounce_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 27, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 15, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 103.16486695514998,   rel=1e-9)
        assert t.exit_price  == pytest.approx(  89.8560584955,       rel=1e-9)
        assert t.pnl         == pytest.approx(-1301.2395335004676,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -12.900524037350689, rel=1e-9)
        assert t.qty         == pytest.approx(   97.7728049393454,   rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -1336.05
        assert t.mae_pct ==   -13.2457
        assert t.mfe_usd ==    32.77
        assert t.mfe_pct ==     0.3249

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 103.5
        assert t.peak_ts      == datetime(2024, 2, 27, tzinfo=timezone.utc)
        assert t.trough_price == 89.5
        assert t.trough_ts    == datetime(2024, 3, 10, tzinfo=timezone.utc)

        assert t.duration_seconds == 1468800

        assert t.fee_cost_usd      == 18.87
        assert t.slippage_cost_usd ==  9.44
        assert t.spread_cost_usd   ==  1.89
        assert t.total_cost_usd    == 30.19
        assert t.notional_usd      == 10070.6


class TestStochasticOversoldBounceLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for Stochastic Oversold Bounce."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _stochastic_oversold_bounce_candles()
        golden_result = run_golden_pipeline(
            STOCHASTIC_OVERSOLD_BOUNCE_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            STOCHASTIC_OVERSOLD_BOUNCE_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# ADX Directional Filter golden fixture
# ---------------------------------------------------------------------------

ADX_DIRECTIONAL_FILTER_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "ADX Directional Filter"
)


def _adx_directional_filter_candles() -> list[Candle]:
    """Deterministic candle series shaped for the ADX Directional Filter template.

    Phase 1 (days  1-35): downtrend 80->45 establishes -DI dominance.
    Phase 2 (days 36-65): uptrend 45->75 — +DI crosses above -DI — trade 0 opens.
    Phase 3 (days 66-95): downtrend 75->45 — -DI crosses above +DI — trade 0 closes
      via "signal".
    Phase 4 (days 96-125): uptrend 45->75 — +DI crosses above -DI again — trade 1 opens.
    Phase 5 (days 126-130): mild uptrend 75->80, ends mid-trade → end_of_data.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 80.0

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

    for _ in range(35):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(30):
        close = price + 1.0
        _append(price, close)
        price = close

    for _ in range(30):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(30):
        close = price + 1.0
        _append(price, close)
        price = close

    for _ in range(5):
        close = price + 1.0
        _append(price, close)
        price = close

    return candles


def _adx_directional_filter_result() -> BacktestResult:
    return run_golden_pipeline(
        ADX_DIRECTIONAL_FILTER_TEMPLATE["definition_json"],
        _adx_directional_filter_candles(),
        _RUN_CONFIG,
    )


class TestAdxDirectionalFilterGolden:
    """Full-pipeline golden snapshot for the ADX Directional Filter template."""

    def test_trade_count_and_exit_reasons(self):
        result = _adx_directional_filter_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _adx_directional_filter_result()

        assert result.final_balance          == 17664.36
        assert result.total_return_pct       == 76.64
        assert result.cagr_pct               == 400.76
        assert result.max_drawdown_pct       == 12.28
        assert result.win_rate_pct           == 100.0
        assert result.sharpe_ratio           == 9.55
        assert result.sortino_ratio          == 22.53
        assert result.calmar_ratio           == 32.63
        assert result.max_consecutive_losses == 0

    def test_cost_totals(self):
        result = _adx_directional_filter_result()

        assert result.gross_return_usd       == 7746.92
        assert result.gross_return_pct       == 77.47
        assert result.total_fees_usd         == 51.6
        assert result.total_slippage_usd     == 25.8
        assert result.total_spread_usd       == 5.16
        assert result.total_costs_usd        == 82.56
        assert result.cost_pct_gross_return  == 1.07
        assert result.avg_cost_per_trade_usd == 41.28

    def test_equity_curve(self):
        result = _adx_directional_filter_result()

        assert len(result.equity_curve) == 130

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 44),
            9984.02, 10165.55, 10347.07, 10528.6, 10710.13, 10891.66, 11073.18,
            11254.71, 11436.24, 11617.77, 11799.3, 11980.82, 12162.35, 12343.88,
            12525.41, 12706.93, 12888.46, 13069.99, 13251.52, 13433.04, 13614.57,
            13433.04, 13251.52, 13069.99, 12888.46, 12706.93, 12525.41, 12343.88,
            12162.35,
            11961.66,
            *([11961.66] * 29),
            11942.55, 12163.7, 12384.86, 12606.02, 12827.18, 13048.34, 13269.5,
            13490.65, 13711.81, 13932.97, 14154.13, 14375.29, 14596.44, 14817.6,
            15038.76, 15259.92, 15481.08, 15702.24, 15923.39, 16144.55, 16365.71,
            16586.87, 16808.03, 17029.19, 17250.34, 17471.5, 17664.36,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _adx_directional_filter_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 15, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 14, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 55.08803575274999,  rel=1e-9)
        assert t.exit_price  == pytest.approx( 65.8944428967,      rel=1e-9)
        assert t.pnl         == pytest.approx(1961.6613655371725,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  19.616613655371722, rel=1e-9)
        assert t.qty         == pytest.approx( 181.52761962475313, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -106.74
        assert t.mae_pct ==   -1.0674
        assert t.mfe_usd == 3705.34
        assert t.mfe_pct ==   37.0534

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 75.5
        assert t.peak_ts      == datetime(2024, 3, 5, tzinfo=timezone.utc)
        assert t.trough_price == 54.5
        assert t.trough_ts    == datetime(2024, 2, 15, tzinfo=timezone.utc)

        assert t.duration_seconds == 2419200

        assert t.fee_cost_usd      == 21.96
        assert t.slippage_cost_usd == 10.98
        assert t.spread_cost_usd   ==  2.2
        assert t.total_cost_usd    == 35.14
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _adx_directional_filter_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 4, 14, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 5, 9, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 54.08643510269999,  rel=1e-9)
        assert t.exit_price  == pytest.approx( 79.87205199600001,  rel=1e-9)
        assert t.pnl         == pytest.approx(5702.70192134982,    rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  47.67483167329844, rel=1e-9)
        assert t.qty         == pytest.approx( 221.1582505451547,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -129.69
        assert t.mae_pct ==   -1.0843
        assert t.mfe_usd == 5841.58
        assert t.mfe_pct ==   48.8358

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 80.5
        assert t.peak_ts      == datetime(2024, 5, 9, tzinfo=timezone.utc)
        assert t.trough_price == 53.5
        assert t.trough_ts    == datetime(2024, 4, 14, tzinfo=timezone.utc)

        assert t.duration_seconds == 2160000

        assert t.fee_cost_usd      == 29.64
        assert t.slippage_cost_usd == 14.82
        assert t.spread_cost_usd   ==  2.96
        assert t.total_cost_usd    == 47.42
        assert t.notional_usd      == 11942.55


class TestAdxDirectionalFilterLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for ADX Directional Filter."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _adx_directional_filter_candles()
        golden_result = run_golden_pipeline(
            ADX_DIRECTIONAL_FILTER_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            ADX_DIRECTIONAL_FILTER_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# Price Variation Momentum golden fixture
# ---------------------------------------------------------------------------

PRICE_VARIATION_MOMENTUM_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "Price Variation Momentum"
)


def _price_variation_momentum_candles() -> list[Candle]:
    """Deterministic candle series shaped for the Price Variation Momentum template.

    5 warmup bars with small negative changes (no signal).
    Bar 5: +2.0% → entry signal fires, trade 0 enters at open of bar 6.
    Bar 6: +0.5% → entry bar, variation too small to exit.
    Bar 7: -2.0% → exit signal fires (< -1.0%), trade 0 exits at open of bar 8.
    Bar 8: +0.5% → just exited, variation too small for re-entry.
    Bar 9: +2.0% → second entry signal fires, trade 1 enters at open of bar 10.
    Bars 10-14: +0.3% each → no exit signal, series ends → end_of_data closes trade 1.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 1000.0

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

    for pct in [-0.5, -0.3, -0.4, -0.2, -0.3, +2.0, +0.5, -2.0, +0.5, +2.0,
                +0.3, +0.3, +0.3, +0.3, +0.3]:
        close = price * (1 + pct / 100)
        _append(price, close)
        price = close

    return candles


def _price_variation_momentum_result() -> BacktestResult:
    return run_golden_pipeline(
        PRICE_VARIATION_MOMENTUM_TEMPLATE["definition_json"],
        _price_variation_momentum_candles(),
        _RUN_CONFIG,
    )


class TestPriceVariationMomentumGolden:
    """Full-pipeline golden snapshot for the Price Variation Momentum template."""

    def test_trade_count_and_exit_reasons(self):
        result = _price_variation_momentum_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _price_variation_momentum_result()

        assert result.final_balance          == 9933.84
        assert result.total_return_pct       == -0.66
        assert result.cagr_pct               == -15.9
        assert result.max_drawdown_pct       == 2.31
        assert result.win_rate_pct           == 50.0
        assert result.sharpe_ratio           == -1.41
        assert result.sortino_ratio          == -1.5
        assert result.calmar_ratio           == -6.87
        assert result.max_consecutive_losses == 1

    def test_cost_totals(self):
        result = _price_variation_momentum_result()

        assert result.gross_return_usd       == -2.84
        assert result.gross_return_pct       == -0.03
        assert result.total_fees_usd         == 39.57
        assert result.total_slippage_usd     == 19.79
        assert result.total_spread_usd       == 3.96
        assert result.total_costs_usd        == 63.32
        assert result.cost_pct_gross_return  is None
        assert result.avg_cost_per_trade_usd == 31.66

    def test_equity_curve(self):
        result = _price_variation_momentum_result()

        assert len(result.equity_curve) == 15

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            10000.0, 10000.0, 10000.0, 10000.0, 10000.0,
            9984.02, 10033.94, 9817.53, 9817.53,
            9801.84, 9831.25, 9860.74, 9890.33, 9920.0, 9933.84,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _price_variation_momentum_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 7, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 8, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1004.3799779250926, rel=1e-9)
        assert t.exit_price  == pytest.approx( 986.0534146061536, rel=1e-9)
        assert t.pnl         == pytest.approx(-182.46643423536824, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -1.8246643423536824, rel=1e-9)
        assert t.qty         == pytest.approx(   9.95639122621559, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -171.72
        assert t.mae_pct ==   -1.7172
        assert t.mfe_usd ==   38.92
        assert t.mfe_pct ==    0.3892

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == pytest.approx(1008.2887606845389, rel=1e-9)
        assert t.peak_ts      == datetime(2024, 1, 7, tzinfo=timezone.utc)
        assert t.trough_price == pytest.approx( 987.1329854708481, rel=1e-9)
        assert t.trough_ts    == datetime(2024, 1, 8, tzinfo=timezone.utc)

        assert t.duration_seconds == 86400

        assert t.fee_cost_usd      == 19.82
        assert t.slippage_cost_usd ==  9.91
        assert t.spread_cost_usd   ==  1.98
        assert t.total_cost_usd    == 31.71
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _price_variation_momentum_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 11, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 15, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1014.0431076489098, rel=1e-9)
        assert t.exit_price  == pytest.approx(1026.056651270964,  rel=1e-9)
        assert t.pnl         == pytest.approx( 116.31001371011807, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   1.1847172503255847, rel=1e-9)
        assert t.qty         == pytest.approx(   9.681574177380769, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -20.53
        assert t.mae_pct ==  -0.2091
        assert t.mfe_usd == 137.06
        assert t.mfe_pct ==   1.3961

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == pytest.approx(1028.200303803237,   rel=1e-9)
        assert t.peak_ts      == datetime(2024, 1, 15, tzinfo=timezone.utc)
        assert t.trough_price == pytest.approx(1011.9225734061663,  rel=1e-9)
        assert t.trough_ts    == datetime(2024, 1, 11, tzinfo=timezone.utc)

        assert t.duration_seconds == 345600

        assert t.fee_cost_usd      == 19.75
        assert t.slippage_cost_usd ==  9.88
        assert t.spread_cost_usd   ==  1.98
        assert t.total_cost_usd    == 31.6
        assert t.notional_usd      == 9801.84


class TestPriceVariationMomentumLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for Price Variation Momentum."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _price_variation_momentum_candles()
        golden_result = run_golden_pipeline(
            PRICE_VARIATION_MOMENTUM_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            PRICE_VARIATION_MOMENTUM_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# Stochastic + RSI Double Oversold golden fixture
# ---------------------------------------------------------------------------

STOCH_RSI_DOUBLE_OVERSOLD_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "Stochastic + RSI Double Oversold"
)


def _stoch_rsi_double_oversold_candles() -> list[Candle]:
    """Deterministic candle series shaped for the Stochastic + RSI Double Oversold template.

    Phase 1 (days  1-25): downtrend 100->75 drives both %K and RSI into oversold
      territory simultaneously — AND block fires — trade 0 opens.
    Phase 2 (days 26-40): sharp uptrend 75->120 drives RSI above 60 — exit fires —
      trade 0 closes via "signal".
    Phase 3 (days 41-60): downtrend 120->100 drives both indicators oversold again —
      AND fires — trade 1 opens.
    Phase 4 (days 61-65): flat at 100 ends mid-trade → end_of_data.
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

    for _ in range(25):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(15):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(20):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(5):
        _append(price, price)

    return candles


def _stoch_rsi_double_oversold_result() -> BacktestResult:
    return run_golden_pipeline(
        STOCH_RSI_DOUBLE_OVERSOLD_TEMPLATE["definition_json"],
        _stoch_rsi_double_oversold_candles(),
        _RUN_CONFIG,
    )


class TestStochRsiDoubleOversoldGolden:
    """Full-pipeline golden snapshot for the Stochastic + RSI Double Oversold template."""

    def test_trade_count_and_exit_reasons(self):
        result = _stoch_rsi_double_oversold_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _stoch_rsi_double_oversold_result()

        assert result.final_balance          == 10785.1
        assert result.total_return_pct       == 7.85
        assert result.cagr_pct               == 53.93
        assert result.max_drawdown_pct       == 10.86
        assert result.win_rate_pct           == 50.0
        assert result.sharpe_ratio           == 1.97
        assert result.sortino_ratio          == 4.77
        assert result.calmar_ratio           == 4.97
        assert result.max_consecutive_losses == 1

    def test_cost_totals(self):
        result = _stoch_rsi_double_oversold_result()

        assert result.gross_return_usd       == 853.67
        assert result.gross_return_pct       == 8.54
        assert result.total_fees_usd         == 42.86
        assert result.total_slippage_usd     == 21.43
        assert result.total_spread_usd       == 4.28
        assert result.total_costs_usd        == 68.57
        assert result.cost_pct_gross_return  == 8.03
        assert result.avg_cost_per_trade_usd == 34.28

    def test_equity_curve(self):
        result = _stoch_rsi_double_oversold_result()

        assert len(result.equity_curve) == 65

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 15),
            9984.02, 9865.16, 9746.3, 9627.45, 9508.59, 9389.73, 9270.87,
            9152.02, 9033.16, 8914.3, 9270.87, 9627.45, 9984.02, 10340.59,
            10697.16,
            11036.06,
            *([11036.06] * 26),
            11018.42, 10910.4, 10802.37,
            *([10802.37] * 4),
            10785.1,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _stoch_rsi_double_oversold_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 17, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 1, 31, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 84.1344546042,       rel=1e-9)
        assert t.exit_price  == pytest.approx( 92.85126044535001,   rel=1e-9)
        assert t.pnl         == pytest.approx(1036.056617013461,    rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  10.360566170134609, rel=1e-9)
        assert t.qty         == pytest.approx( 118.85736999239785,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -1145.13
        assert t.mae_pct ==   -11.4513
        assert t.mfe_usd ==  1113.16
        assert t.mfe_pct ==    11.1316

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 93.5
        assert t.peak_ts      == datetime(2024, 1, 31, tzinfo=timezone.utc)
        assert t.trough_price == 74.5
        assert t.trough_ts    == datetime(2024, 1, 25, tzinfo=timezone.utc)

        assert t.duration_seconds == 1209600

        assert t.fee_cost_usd      == 21.04
        assert t.slippage_cost_usd == 10.52
        assert t.spread_cost_usd   ==  2.1
        assert t.total_cost_usd    == 33.66
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _stoch_rsi_double_oversold_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 28, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 5, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 102.16326630509998,  rel=1e-9)
        assert t.exit_price  == pytest.approx(  99.84006499499999,  rel=1e-9)
        assert t.pnl         == pytest.approx(-250.96086018251583,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -2.2740084514937005, rel=1e-9)
        assert t.qty         == pytest.approx( 108.02372531879926,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -287.7
        assert t.mae_pct ==   -2.6069
        assert t.mfe_usd ==   36.38
        assert t.mfe_pct ==    0.3296

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 102.5
        assert t.peak_ts      == datetime(2024, 2, 28, tzinfo=timezone.utc)
        assert t.trough_price == 99.5
        assert t.trough_ts    == datetime(2024, 2, 29, tzinfo=timezone.utc)

        assert t.duration_seconds == 518400

        assert t.fee_cost_usd      == 21.82
        assert t.slippage_cost_usd == 10.91
        assert t.spread_cost_usd   ==  2.18
        assert t.total_cost_usd    == 34.91
        assert t.notional_usd      == 11018.42


class TestStochRsiDoubleOversoldLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for Stochastic + RSI Double Oversold."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _stoch_rsi_double_oversold_candles()
        golden_result = run_golden_pipeline(
            STOCH_RSI_DOUBLE_OVERSOLD_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            STOCH_RSI_DOUBLE_OVERSOLD_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# Bollinger + RSI Reversal golden fixture
# ---------------------------------------------------------------------------

BOLLINGER_RSI_REVERSAL_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "Bollinger + RSI Reversal"
)


def _bollinger_rsi_reversal_candles() -> list[Candle]:
    """Deterministic candle series shaped for the Bollinger + RSI Reversal template.

    Phase 1 (days  1-20): flat at 1000 establishes tight Bollinger bands and
      neutral RSI.
    Phase 2 (days 21-30): sharp drop -15/day (1000->850). Price breaks below
      lower Bollinger band AND RSI drops below 35 → AND block fires → trade 0 opens.
    Phase 3 (days 31-40): sharp rise +25/day (850->1100). Price crosses above
      middle band (SMA) → exit fires → trade 0 closes via "signal".
    Phase 4 (days 41-60): flat at 1100. Bands tighten back, RSI resets to neutral.
    Phase 5 (days 61-70): sharp drop -15/day (1100->950). Price breaks below lower
      band AND RSI < 35 again → trade 1 opens.
    Phase 6 (days 71-75): flat at 950. No exit signal → end_of_data closes trade 1.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 1000.0

    def _append(open_: float, close: float) -> None:
        candles.append(
            Candle(
                asset="BTC/USDT",
                timeframe="4h",
                timestamp=start + timedelta(days=len(candles)),
                open=open_,
                high=max(open_, close) + 0.5,
                low=min(open_, close) - 0.5,
                close=close,
                volume=1000.0,
            )
        )

    for _ in range(20):
        _append(price, price)

    for _ in range(10):
        close = price - 15.0
        _append(price, close)
        price = close

    for _ in range(10):
        close = price + 25.0
        _append(price, close)
        price = close

    for _ in range(20):
        _append(price, price)

    for _ in range(10):
        close = price - 15.0
        _append(price, close)
        price = close

    for _ in range(5):
        _append(price, price)

    return candles


def _bollinger_rsi_reversal_result() -> BacktestResult:
    return run_golden_pipeline(
        BOLLINGER_RSI_REVERSAL_TEMPLATE["definition_json"],
        _bollinger_rsi_reversal_candles(),
        _RUN_CONFIG,
    )


class TestBollingerRsiReversalGolden:
    """Full-pipeline golden snapshot for the Bollinger + RSI Reversal template."""

    def test_trade_count_and_exit_reasons(self):
        result = _bollinger_rsi_reversal_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _bollinger_rsi_reversal_result()

        assert result.final_balance          == 8753.83
        assert result.total_return_pct       == -12.46
        assert result.cagr_pct               == -48.16
        assert result.max_drawdown_pct       == 13.84
        assert result.win_rate_pct           == 0.0
        assert result.sharpe_ratio           == -3.55
        assert result.sortino_ratio          == -4.72
        assert result.calmar_ratio           == -3.48
        assert result.max_consecutive_losses == 2

    def test_cost_totals(self):
        result = _bollinger_rsi_reversal_result()

        assert result.gross_return_usd       == -1185.4
        assert result.gross_return_pct       == -11.85
        assert result.total_fees_usd         == 37.98
        assert result.total_slippage_usd     == 18.99
        assert result.total_spread_usd       == 3.8
        assert result.total_costs_usd        == 60.77
        assert result.cost_pct_gross_return  is None
        assert result.avg_cost_per_trade_usd == 30.39

    def test_equity_curve(self):
        result = _bollinger_rsi_reversal_result()

        assert len(result.equity_curve) == 75

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 20),
            9984.02, 9831.98, 9679.94, 9527.9, 9375.86, 9223.81, 9071.77,
            8919.73, 8767.69, 8615.65, 8869.05, 9122.45, 9375.86,
            9613.86,
            *([9613.86] * 29),
            9598.49, 9460.05, 9321.61, 9183.17, 9044.73, 8906.29, 8767.85,
            *([8767.85] * 4),
            8753.83,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _bollinger_rsi_reversal_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 1, 22, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 3, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 986.5766402992498,   rel=1e-9)
        assert t.exit_price  == pytest.approx( 948.4806174525002,   rel=1e-9)
        assert t.pnl         == pytest.approx(-386.14357253780406,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -3.86143572537804,  rel=1e-9)
        assert t.qty         == pytest.approx(  10.136059979047129, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -1389.42
        assert t.mae_pct ==   -13.8942
        assert t.mfe_usd ==   -10.91
        assert t.mfe_pct ==    -0.1091

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 985.5
        assert t.peak_ts      == datetime(2024, 1, 22, tzinfo=timezone.utc)
        assert t.trough_price == 849.5
        assert t.trough_ts    == datetime(2024, 1, 30, tzinfo=timezone.utc)

        assert t.duration_seconds == 1036800

        assert t.fee_cost_usd      == 19.61
        assert t.slippage_cost_usd ==  9.81
        assert t.spread_cost_usd   ==  1.96
        assert t.total_cost_usd    == 31.38
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _bollinger_rsi_reversal_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 3, 5, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 15, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(1041.6646760519998,   rel=1e-9)
        assert t.exit_price  == pytest.approx( 948.4806174525002,   rel=1e-9)
        assert t.pnl         == pytest.approx(-860.0254777758178,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  -8.945686720670547, rel=1e-9)
        assert t.qty         == pytest.approx(   9.229319807502309, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -850.62
        assert t.mae_pct ==   -8.8478
        assert t.mfe_usd ==   -10.75
        assert t.mfe_pct ==    -0.1118

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 1040.5
        assert t.peak_ts      == datetime(2024, 3, 5, tzinfo=timezone.utc)
        assert t.trough_price == 949.5
        assert t.trough_ts    == datetime(2024, 3, 10, tzinfo=timezone.utc)

        assert t.duration_seconds == 864000

        assert t.fee_cost_usd      == 18.37
        assert t.slippage_cost_usd ==  9.18
        assert t.spread_cost_usd   ==  1.84
        assert t.total_cost_usd    == 29.39
        assert t.notional_usd      == 9598.49


class TestBollingerRsiReversalLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for Bollinger + RSI Reversal."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _bollinger_rsi_reversal_candles()
        golden_result = run_golden_pipeline(
            BOLLINGER_RSI_REVERSAL_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            BOLLINGER_RSI_REVERSAL_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# EMA + RSI Confirmation golden fixture
# ---------------------------------------------------------------------------

EMA_RSI_CONFIRMATION_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "EMA + RSI Confirmation"
)


def _ema_rsi_confirmation_candles() -> list[Candle]:
    """Deterministic candle series shaped for the EMA + RSI Confirmation template.

    Phase 1 (days  1-35): downtrend 300->265 warms up EMAs, fast < slow, RSI low.
    Phase 2 (days 36-55): gentle uptrend 265->285, fast EMA still below slow EMA.
    Phase 3 (days 56-70): sharper uptrend 285->330. Fast EMA crosses above slow
      EMA, RSI still < 60 → AND block fires → trade 0 opens.
    Phase 4 (days 71-95): downtrend 330->255. Fast EMA crosses below slow EMA.
      RSI rises briefly above 70 → exit fires → trade 0 closes via "signal".
    Phase 5 (days 96-115): mild uptrend 255->275. Fast EMA crosses above slow
      again with RSI < 60 → trade 1 opens.
    Phase 6 (days 116-118): final 3 bars ends mid-trade → end_of_data.
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

    for _ in range(35):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(20):
        close = price + 1.0
        _append(price, close)
        price = close

    for _ in range(15):
        close = price + 3.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price - 3.0
        _append(price, close)
        price = close

    for _ in range(20):
        close = price + 1.0
        _append(price, close)
        price = close

    for _ in range(3):
        close = price + 1.0
        _append(price, close)
        price = close

    return candles


def _ema_rsi_confirmation_result() -> BacktestResult:
    return run_golden_pipeline(
        EMA_RSI_CONFIRMATION_TEMPLATE["definition_json"],
        _ema_rsi_confirmation_candles(),
        _RUN_CONFIG,
    )


class TestEmaRsiConfirmationGolden:
    """Full-pipeline golden snapshot for the EMA + RSI Confirmation template."""

    def test_trade_count_and_exit_reasons(self):
        result = _ema_rsi_confirmation_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _ema_rsi_confirmation_result()

        assert result.final_balance          == 10263.23
        assert result.total_return_pct       == 2.63
        assert result.cagr_pct               == 8.45
        assert result.max_drawdown_pct       == 0.16
        assert result.win_rate_pct           == 100.0
        assert result.sharpe_ratio           == 4.64
        assert result.sortino_ratio          == 20.35
        assert result.calmar_ratio           == 52.87
        assert result.max_consecutive_losses == 0

    def test_cost_totals(self):
        result = _ema_rsi_confirmation_result()

        assert result.gross_return_usd       == 328.12
        assert result.gross_return_pct       == 3.28
        assert result.total_fees_usd         == 40.56
        assert result.total_slippage_usd     == 20.28
        assert result.total_spread_usd       == 4.05
        assert result.total_costs_usd        == 64.89
        assert result.cost_pct_gross_return  == 19.78
        assert result.avg_cost_per_trade_usd == 32.45

    def test_equity_curve(self):
        result = _ema_rsi_confirmation_result()

        assert len(result.equity_curve) == 118

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 46),
            9984.02, 10020.06, 10056.11, 10092.15, 10128.19,
            10147.98,
            *([10147.98] * 61),
            10131.76, 10168.74, 10205.72, 10242.69, 10263.23,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _ema_rsi_confirmation_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 17, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 2, 21, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(277.44338006384993,  rel=1e-9)
        assert t.exit_price  == pytest.approx(281.5489832859,      rel=1e-9)
        assert t.pnl         == pytest.approx(147.9798588492269,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  1.479798588492269, rel=1e-9)
        assert t.qty         == pytest.approx( 36.04339017820008,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -34.0
        assert t.mae_pct ==  -0.34
        assert t.mfe_usd == 182.26
        assert t.mfe_pct ==   1.8226

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 282.5
        assert t.peak_ts      == datetime(2024, 2, 21, tzinfo=timezone.utc)
        assert t.trough_price == 276.5
        assert t.trough_ts    == datetime(2024, 2, 17, tzinfo=timezone.utc)

        assert t.duration_seconds == 345600

        assert t.fee_cost_usd      == 20.15
        assert t.slippage_cost_usd == 10.07
        assert t.spread_cost_usd   ==  2.01
        assert t.total_cost_usd    == 32.24
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _ema_rsi_confirmation_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 4, 24, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 4, 27, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx(274.4385781137,      rel=1e-9)
        assert t.exit_price  == pytest.approx(277.5553806861,      rel=1e-9)
        assert t.pnl         == pytest.approx(115.25074188229152,  rel=1e-9)
        assert t.pnl_pct     == pytest.approx(  1.135701326622074, rel=1e-9)
        assert t.qty         == pytest.approx( 36.97723522909711,  rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -34.71
        assert t.mae_pct ==  -0.342
        assert t.mfe_usd == 150.18
        assert t.mfe_pct ==   1.4799

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 278.5
        assert t.peak_ts      == datetime(2024, 4, 27, tzinfo=timezone.utc)
        assert t.trough_price == 273.5
        assert t.trough_ts    == datetime(2024, 4, 24, tzinfo=timezone.utc)

        assert t.duration_seconds == 259200

        assert t.fee_cost_usd      == 20.41
        assert t.slippage_cost_usd == 10.21
        assert t.spread_cost_usd   ==  2.04
        assert t.total_cost_usd    == 32.66
        assert t.notional_usd      == 10131.76


class TestEmaRsiConfirmationLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for EMA + RSI Confirmation."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _ema_rsi_confirmation_candles()
        golden_result = run_golden_pipeline(
            EMA_RSI_CONFIRMATION_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            EMA_RSI_CONFIRMATION_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)


# ---------------------------------------------------------------------------
# MACD + ADX Dual Filter golden fixture
# ---------------------------------------------------------------------------

MACD_ADX_DUAL_FILTER_TEMPLATE = next(
    t for t in TEMPLATES if t["name"] == "MACD + ADX Dual Filter"
)


def _macd_adx_dual_filter_candles() -> list[Candle]:
    """Deterministic candle series shaped for the MACD + ADX Dual Filter template.

    Phase 1 (days  1-50): downtrend 1000->950 warms up MACD(12,26,9) with
      histogram < 0 and builds ADX.
    Phase 2 (days 51-80): uptrend 950->1010. MACD histogram crosses above 0
      AND ADX > 25 (strong directional trend) → AND block fires → trade 0 opens.
    Phase 3 (days 81-110): downtrend 1010->950. MACD histogram crosses below 0
      → exit fires → trade 0 closes via "signal".
    Phase 4 (days 111-135): uptrend 950->1000. Histogram crosses above 0 AND
      ADX > 25 → trade 1 opens.
    Phase 5 (days 136-140): mild uptrend 1000->1005, ends mid-trade → end_of_data.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 1000.0

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

    for _ in range(50):
        close = price - 1.0
        _append(price, close)
        price = close

    for _ in range(30):
        close = price + 2.0
        _append(price, close)
        price = close

    for _ in range(30):
        close = price - 2.0
        _append(price, close)
        price = close

    for _ in range(25):
        close = price + 2.0
        _append(price, close)
        price = close

    for _ in range(5):
        close = price + 1.0
        _append(price, close)
        price = close

    return candles


def _macd_adx_dual_filter_result() -> BacktestResult:
    return run_golden_pipeline(
        MACD_ADX_DUAL_FILTER_TEMPLATE["definition_json"],
        _macd_adx_dual_filter_candles(),
        _RUN_CONFIG,
    )


class TestMacdAdxDualFilterGolden:
    """Full-pipeline golden snapshot for the MACD + ADX Dual Filter template."""

    def test_trade_count_and_exit_reasons(self):
        result = _macd_adx_dual_filter_result()

        assert result.num_trades == 2
        assert result.trades[0].exit_reason == "signal"
        assert result.trades[1].exit_reason == "end_of_data"

    def test_summary_metrics(self):
        result = _macd_adx_dual_filter_result()

        assert result.final_balance          == 10823.34
        assert result.total_return_pct       == 8.23
        assert result.cagr_pct               == 23.11
        assert result.max_drawdown_pct       == 1.71
        assert result.win_rate_pct           == 100.0
        assert result.sharpe_ratio           == 8.69
        assert result.sortino_ratio          == 18.84
        assert result.calmar_ratio           == 13.5
        assert result.max_consecutive_losses == 0

    def test_cost_totals(self):
        result = _macd_adx_dual_filter_result()

        assert result.gross_return_usd       == 889.79
        assert result.gross_return_pct       == 8.9
        assert result.total_fees_usd         == 41.52
        assert result.total_slippage_usd     == 20.77
        assert result.total_spread_usd       == 4.16
        assert result.total_costs_usd        == 66.45
        assert result.cost_pct_gross_return  == 7.47
        assert result.avg_cost_per_trade_usd == 33.23

    def test_equity_curve(self):
        result = _macd_adx_dual_filter_result()

        assert len(result.equity_curve) == 140

        equities = [pt["equity"] for pt in result.equity_curve]
        assert equities == [
            *([10000.0] * 34),
            9984.02, 9973.67, 9963.33, 9952.98, 9942.63, 9932.29, 9921.94,
            9911.6, 9901.25, 9890.9, 9880.56, 9870.21, 9859.87, 9849.52,
            9839.17, 9828.83, 9849.52, 9870.21, 9890.9, 9911.6, 9932.29,
            9952.98, 9973.67, 9994.37, 10015.06, 10035.75, 10056.44, 10077.13,
            10097.83, 10118.52, 10139.21, 10159.9, 10180.6, 10201.29, 10221.98,
            10242.67, 10263.36, 10284.06, 10304.75, 10325.44, 10346.13, 10366.83,
            10387.52, 10408.21, 10428.9, 10449.6, 10428.9, 10408.21, 10387.52,
            10350.25,
            *([10350.25] * 29),
            10333.71, 10355.28, 10376.85, 10398.43, 10420.0, 10441.57, 10463.15,
            10484.72, 10506.29, 10527.87, 10549.44, 10571.01, 10592.59, 10614.16,
            10635.73, 10657.31, 10678.88, 10700.45, 10722.03, 10743.6, 10765.18,
            10786.75, 10797.54, 10808.32, 10819.11, 10829.9, 10823.34,
        ]

    def test_trade0_signal_exit_full_fields(self):
        result = _macd_adx_dual_filter_result()
        t = result.trades[0]

        assert t.exit_reason  == "signal"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 2, 5, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 3, 24, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 966.5446272982498,  rel=1e-9)
        assert t.exit_price  == pytest.approx(1000.3974512499001,  rel=1e-9)
        assert t.pnl         == pytest.approx( 350.245844791233,   rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   3.50245844791233, rel=1e-9)
        assert t.qty         == pytest.approx(  10.346133760996292, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -176.35
        assert t.mae_pct ==   -1.7635
        assert t.mfe_usd == 454.77
        assert t.mfe_pct ==   4.5477

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 1010.5
        assert t.peak_ts      == datetime(2024, 3, 20, tzinfo=timezone.utc)
        assert t.trough_price == 949.5
        assert t.trough_ts    == datetime(2024, 2, 19, tzinfo=timezone.utc)

        assert t.duration_seconds == 4147200

        assert t.fee_cost_usd      == 20.35
        assert t.slippage_cost_usd == 10.18
        assert t.spread_cost_usd   ==  2.04
        assert t.total_cost_usd    == 32.56
        assert t.notional_usd      == 9984.02

    def test_trade1_end_of_data_full_fields(self):
        result = _macd_adx_dual_filter_result()
        t = result.trades[1]

        assert t.exit_reason  == "end_of_data"
        assert t.side         == "long"
        assert t.entry_time   == datetime(2024, 4, 24, tzinfo=timezone.utc)
        assert t.exit_time    == datetime(2024, 5, 19, tzinfo=timezone.utc)

        assert t.entry_price == pytest.approx( 959.5334227478999,  rel=1e-9)
        assert t.exit_price  == pytest.approx(1003.3926531997502,  rel=1e-9)
        assert t.pnl         == pytest.approx( 473.09849451619647, rel=1e-9)
        assert t.pnl_pct     == pytest.approx(   4.570891374085416, rel=1e-9)
        assert t.qty         == pytest.approx(  10.786748642012205, rel=1e-9)

        assert t.sl_price_at_entry is None
        assert t.tp_price_at_entry is None

        assert t.mae_usd == -21.93
        assert t.mae_pct ==  -0.2119
        assert t.mfe_usd == 495.83
        assert t.mfe_pct ==   4.7905

        assert t.initial_risk_usd is None
        assert t.r_multiple       is None

        assert t.peak_price   == 1005.5
        assert t.peak_ts      == datetime(2024, 5, 19, tzinfo=timezone.utc)
        assert t.trough_price == 957.5
        assert t.trough_ts    == datetime(2024, 4, 24, tzinfo=timezone.utc)

        assert t.duration_seconds == 2160000

        assert t.fee_cost_usd      == 21.17
        assert t.slippage_cost_usd == 10.59
        assert t.spread_cost_usd   ==  2.12
        assert t.total_cost_usd    == 33.88
        assert t.notional_usd      == 10333.71


class TestMacdAdxDualFilterLookAhead:
    """Proves the no-look-ahead guarantee (ADR-0017) for MACD + ADX Dual Filter."""

    def test_prefix_unchanged_after_tail_mutation(self):
        candles = _macd_adx_dual_filter_candles()
        golden_result = run_golden_pipeline(
            MACD_ADX_DUAL_FILTER_TEMPLATE["definition_json"], candles, _RUN_CONFIG
        )

        cut_timestamp = golden_result.trades[0].exit_time
        cut_index = next(i for i, c in enumerate(candles) if c.timestamp == cut_timestamp)

        mutated_candles = mutate_tail(candles, cut_index)
        mutated_result = run_golden_pipeline(
            MACD_ADX_DUAL_FILTER_TEMPLATE["definition_json"], mutated_candles, _RUN_CONFIG
        )

        assert_prefix_unchanged(golden_result, mutated_result, cut_timestamp)
