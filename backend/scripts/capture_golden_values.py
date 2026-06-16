"""One-off script to capture golden values for templates 4-12.

Run from the backend directory:
    python scripts/capture_golden_values.py

Prints test-assertion code for all new templates.
"""
from __future__ import annotations
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, timezone
from app.data.strategy_templates import TEMPLATES
from app.models.candle import Candle
from app.backtest.engine import BacktestResult, run_backtest
from app.backtest.interpreter import interpret_strategy
from app.schemas.strategy import StrategyDefinitionValidate
from app.services.strategy_validation import validate_strategy
from app.backtest.errors import StrategyInvalidError


_RUN_CONFIG = {
    "initial_balance": 10000.0,
    "fee_rate": 0.001,
    "slippage_rate": 0.0005,
    "spread_rate": 0.0002,
    "timeframe": "1d",
}


def get_template(name: str) -> dict:
    return next(t for t in TEMPLATES if t["name"] == name)


def run_pipeline(definition_json: dict, candles: list[Candle]) -> BacktestResult:
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
        initial_balance=_RUN_CONFIG["initial_balance"],
        fee_rate=_RUN_CONFIG["fee_rate"],
        slippage_rate=_RUN_CONFIG["slippage_rate"],
        spread_rate=_RUN_CONFIG["spread_rate"],
        timeframe=_RUN_CONFIG["timeframe"],
    )


def make_candles(asset: str, timeframe: str, start_price: float, phases: list[tuple[int,float]], start_date=None) -> list[Candle]:
    """Build candles from (num_days, delta) phases."""
    start = start_date or datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = start_price

    def _append(open_: float, close: float) -> None:
        candles.append(Candle(
            asset=asset,
            timeframe=timeframe,
            timestamp=start + timedelta(days=len(candles)),
            open=open_,
            high=max(open_, close) + 0.5,
            low=min(open_, close) - 0.5,
            close=close,
            volume=1000.0,
        ))

    for num_days, delta in phases:
        for _ in range(num_days):
            close = price + delta
            _append(price, close)
            price = close

    return candles


def print_result(name: str, result: BacktestResult, candles: list[Candle]) -> None:
    print(f"\n{'='*70}")
    print(f"# Template: {name}")
    print(f"# Candle count: {len(candles)}")
    print(f"# Trades: {result.num_trades}")
    for i, t in enumerate(result.trades):
        print(f"#   trade[{i}]: {t.exit_reason} entry={t.entry_time.date()} exit={t.exit_time.date()}")
    print(f"{'='*70}")

    # Summary
    print(f"result.num_trades == {result.num_trades}")
    print(f"result.trades[0].exit_reason == 'signal'")
    print(f"result.trades[1].exit_reason == 'end_of_data'")
    print()
    print(f"result.final_balance          == {result.final_balance}")
    print(f"result.total_return_pct       == {result.total_return_pct}")
    print(f"result.cagr_pct               == {result.cagr_pct}")
    print(f"result.max_drawdown_pct       == {result.max_drawdown_pct}")
    print(f"result.win_rate_pct           == {result.win_rate_pct}")
    print(f"result.sharpe_ratio           == {result.sharpe_ratio}")
    print(f"result.sortino_ratio          == {result.sortino_ratio}")
    print(f"result.calmar_ratio           == {result.calmar_ratio}")
    print(f"result.max_consecutive_losses == {result.max_consecutive_losses}")
    print()
    print(f"result.gross_return_usd       == {result.gross_return_usd}")
    print(f"result.gross_return_pct       == {result.gross_return_pct}")
    print(f"result.total_fees_usd         == {result.total_fees_usd}")
    print(f"result.total_slippage_usd     == {result.total_slippage_usd}")
    print(f"result.total_spread_usd       == {result.total_spread_usd}")
    print(f"result.total_costs_usd        == {result.total_costs_usd}")
    print(f"result.cost_pct_gross_return  == {result.cost_pct_gross_return}")
    print(f"result.avg_cost_per_trade_usd == {result.avg_cost_per_trade_usd}")
    print()
    print(f"len(result.equity_curve) == {len(result.equity_curve)}")
    equities = [pt["equity"] for pt in result.equity_curve]
    print(f"equities == {equities}")
    print()

    # Per-trade fields
    for i, t in enumerate(result.trades):
        print(f"# trade[{i}]")
        print(f"t.exit_reason  == '{t.exit_reason}'")
        print(f"t.side         == '{t.side}'")
        print(f"t.entry_time   == datetime({t.entry_time.year}, {t.entry_time.month}, {t.entry_time.day}, tzinfo=timezone.utc)")
        print(f"t.exit_time    == datetime({t.exit_time.year}, {t.exit_time.month}, {t.exit_time.day}, tzinfo=timezone.utc)")
        print(f"t.entry_price  == pytest.approx({repr(t.entry_price)}, rel=1e-9)")
        print(f"t.exit_price   == pytest.approx({repr(t.exit_price)}, rel=1e-9)")
        print(f"t.pnl          == pytest.approx({repr(t.pnl)}, rel=1e-9)")
        print(f"t.pnl_pct      == pytest.approx({repr(t.pnl_pct)}, rel=1e-9)")
        print(f"t.qty          == pytest.approx({repr(t.qty)}, rel=1e-9)")
        print(f"t.mae_usd == {t.mae_usd}")
        print(f"t.mae_pct == {t.mae_pct}")
        print(f"t.mfe_usd == {t.mfe_usd}")
        print(f"t.mfe_pct == {t.mfe_pct}")
        print(f"t.peak_price   == {t.peak_price}")
        print(f"t.peak_ts      == datetime({t.peak_ts.year}, {t.peak_ts.month}, {t.peak_ts.day}, tzinfo=timezone.utc)")
        print(f"t.trough_price == {t.trough_price}")
        print(f"t.trough_ts    == datetime({t.trough_ts.year}, {t.trough_ts.month}, {t.trough_ts.day}, tzinfo=timezone.utc)")
        print(f"t.duration_seconds == {t.duration_seconds}")
        print(f"t.fee_cost_usd      == {t.fee_cost_usd}")
        print(f"t.slippage_cost_usd == {t.slippage_cost_usd}")
        print(f"t.spread_cost_usd   == {t.spread_cost_usd}")
        print(f"t.total_cost_usd    == {t.total_cost_usd}")
        print(f"t.notional_usd      == {t.notional_usd}")
        print()


# ============================================================
# Template 4: EMA Trend Following (BTC/USDT 1d)
# ema-fast(9) crosses above ema-slow(21) → entry; crosses below → exit
# Need: warmup for 21 EMA (≥21 bars), then down so fast<slow, then up so fast>slow
# Phases: (35,-1): 35→0, (25,+2): up, (25,-2): down, (25,+2): up, (5,+1): end
# ============================================================
def ema_trend_candles():
    return make_candles("BTC/USDT", "1d", 200.0, [
        (35, -1),   # Phase 1: 200 -> 165, warm up EMAs, fast < slow
        (25, +2),   # Phase 2: 165 -> 215, fast crosses above slow, entry fires
        (25, -2),   # Phase 3: 215 -> 165, fast crosses below slow, exit fires (trade 0 closed via signal)
        (25, +2),   # Phase 4: 165 -> 215, fast crosses above slow again, entry fires (trade 1 opens)
        (5,  +1),   # Phase 5: 215 -> 220, ends mid-trade → end_of_data
    ])


# ============================================================
# Template 5: MACD Histogram Cross (ETH/USDT 4h)
# MACD(12,26,9).histogram > 0 → entry; < 0 → exit
# Need: 26+ bar warmup, then hist crosses 0 up, crosses 0 down, crosses 0 up again
# ============================================================
def macd_histogram_candles():
    return make_candles("ETH/USDT", "4h", 1500.0, [
        (45, -1),   # Phase 1: 1500 -> 1455, warmup, hist<0
        (25, +3),   # Phase 2: 1455 -> 1530, hist crosses 0 from below, entry fires
        (25, -3),   # Phase 3: 1530 -> 1455, hist crosses 0 from above, exit fires (trade 0)
        (25, +3),   # Phase 4: 1455 -> 1530, hist crosses 0 again, entry fires (trade 1)
        (5,  +1),   # Phase 5: ends mid-trade → end_of_data
    ])


# ============================================================
# Template 6: Stochastic Oversold Bounce (BTC/USDT 4h)
# stoch.%K < 20 → entry; %K > 80 → exit
# Stochastic uses a 14-period lookback
# ============================================================
def stochastic_oversold_candles():
    return make_candles("BTC/USDT", "4h", 100.0, [
        (30, -1),   # Phase 1: 100 -> 70, %K drops to ~0 (oversold), entry fires
        (15, +3),   # Phase 2: 70 -> 115, %K rises to ~100 (overbought), exit fires (trade 0)
        (25, -1),   # Phase 3: 115 -> 90, %K drops again (oversold), entry fires (trade 1)
        (5,  0),    # Phase 4: ends mid-trade → end_of_data
    ])


# ============================================================
# Template 7: ADX Directional Filter (BTC/USDT 1d)
# adx.plus_di > adx.minus_di → entry; minus_di > plus_di → exit
# ============================================================
def adx_directional_candles():
    return make_candles("BTC/USDT", "1d", 80.0, [
        (35, -1),   # Phase 1: 80 -> 45, minus_di > plus_di (downtrend)
        (30, +1),   # Phase 2: 45 -> 75, plus_di > minus_di (uptrend), entry fires
        (30, -1),   # Phase 3: 75 -> 45, minus_di > plus_di again, exit fires (trade 0)
        (30, +1),   # Phase 4: 45 -> 75, plus_di > minus_di, entry fires (trade 1)
        (5,  +1),   # Phase 5: ends mid-trade → end_of_data
    ])


# ============================================================
# Template 8: Price Variation Momentum (ETH/USDT 1d)
# price_variation_pct > 1.5 → entry; < -1.0 → exit
# price_variation_pct = (close - prev_close) / prev_close * 100
# We need single-bar jumps: one day > 1.5%, one day < -1.0%
# ============================================================
def price_variation_candles():
    """Build candles with explicit per-day price changes.

    Warmup bars (5): small moves, no signal.
    Bar 5: +2.0% → entry signal fires, trade 0 enters at open of bar 6.
    Bar 6: +0.5% → entry bar, no exit signal.
    Bar 7: -2.0% → exit signal fires (< -1.0%), trade 0 exits at open of bar 8.
    Bar 8: +0.5% → just exited, no re-entry (<1.5%).
    Bar 9: +2.0% → entry signal fires, trade 1 enters at open of bar 10.
    Bars 10-14: +0.3% each → no exit signal, series ends → end_of_data closes trade 1.
    """
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 1000.0

    def _append(open_: float, close: float) -> None:
        candles.append(Candle(
            asset="ETH/USDT",
            timeframe="1d",
            timestamp=start + timedelta(days=len(candles)),
            open=open_,
            high=max(open_, close) + 0.5,
            low=min(open_, close) - 0.5,
            close=close,
            volume=1000.0,
        ))

    pcts = [
        -0.5, -0.3, -0.4, -0.2, -0.3,   # warmup: no signal
        +2.0,                              # bar 5: entry signal fires
        +0.5,                              # bar 6: entry bar, no exit
        -2.0,                              # bar 7: exit signal fires
        +0.5,                              # bar 8: no re-entry yet
        +2.0,                              # bar 9: second entry signal fires
        +0.3, +0.3, +0.3, +0.3, +0.3,    # bars 10-14: in position → end_of_data
    ]

    for pct in pcts:
        close = price * (1 + pct / 100)
        _append(price, close)
        price = close

    return candles


# ============================================================
# Template 9: Stochastic + RSI Double Oversold (BTC/USDT 1d)
# stoch.%K < 20 AND rsi < 40 → entry; rsi > 60 → exit
# ============================================================
def stoch_rsi_double_candles():
    return make_candles("BTC/USDT", "1d", 100.0, [
        (25, -1),   # Phase 1: 100 -> 75, both RSI and %K drop (oversold), AND fires → entry
        (15, +3),   # Phase 2: 75 -> 120, RSI rises above 60 → exit fires (trade 0)
        (20, -1),   # Phase 3: 120 -> 100, both drop again, AND fires → entry (trade 1)
        (5,  0),    # Phase 4: ends mid-trade → end_of_data
    ])


# ============================================================
# Template 10: Bollinger + RSI Reversal (BTC/USDT 4h)
# price < boll.lower AND rsi < 35 → entry; price > boll.middle → exit
# Bollinger: period=20, std=2. RSI: period=14.
# ============================================================
def bollinger_rsi_candles():
    """Build candles that push price below lower Bollinger band AND RSI < 35.

    Phase 1 (20 candles): flat at 1000 to establish Bollinger middle/bands and RSI neutral.
    Phase 2 (10 candles): sharp drop -15/day: 1000→850. Pushes price below lower band
      AND RSI deeply oversold → AND block fires → entry signal.
    Phase 3 (12 candles): sharp rise +20/day: 850→1090. Price rises above middle band
      (SMA) → exit signal fires → trade 0 closes.
    Phase 4 (15 candles): sharp drop -15/day: 1090→865. Sustained fall drives RSI < 35
      AND price below lower band again → second entry fires.
    Phase 5 (5 candles): flat at 865. No exit (price stays below middle band) → end_of_data.
    """
    return make_candles("BTC/USDT", "4h", 1000.0, [
        (20,   0),   # Phase 1: flat at 1000, establish tight bands
        (10, -15),   # Phase 2: 1000 -> 850, below lower band AND RSI < 35 → entry
        (10, +25),   # Phase 3: 850 -> 1100, above middle band → exit (trade 0)
        (20,   0),   # Phase 4: flat at 1100, bands tighten, RSI resets to neutral
        (10, -15),   # Phase 5: 1100 -> 950, below lower band AND RSI < 35 → entry (trade 1)
        (5,    0),   # Phase 6: flat at 950, ends mid-trade → end_of_data
    ])


# ============================================================
# Template 11: EMA + RSI Confirmation (ETH/USDT 1d)
# ema(9) crosses above ema(21) AND rsi < 60 → entry; rsi > 70 → exit
# ============================================================
def ema_rsi_confirm_candles():
    return make_candles("ETH/USDT", "1d", 300.0, [
        (35, -1),   # Phase 1: 300 -> 265, warm up EMAs, fast < slow, RSI low
        (20, +1),   # Phase 2: 265 -> 285, gentle rise: fast still < slow
        (15, +3),   # Phase 3: 285 -> 330, fast crosses above slow, RSI still < 60 → AND fires → entry
        (25, -3),   # Phase 4: 330 -> 255, fast crosses below slow (not the exit condition), RSI rises due to previous rise then drops
        (20, +1),   # Phase 5: 255 -> 275, mild rise, RSI potentially rises toward exit? No - need RSI>70
        (3,  +1),   # Phase 6: final 3 days → end_of_data for trade 1
    ])


# ============================================================
# Template 12: MACD + ADX Dual Filter (BTC/USDT 1d)
# macd.histogram > 0 AND adx.adx > 25 → entry; macd.histogram < 0 → exit
# ============================================================
def macd_adx_candles():
    return make_candles("BTC/USDT", "1d", 1000.0, [
        (50, -1),   # Phase 1: 1000 -> 950, warmup: hist<0, adx building
        (30, +2),   # Phase 2: 950 -> 1010, hist>0, adx>25 (strong trend), AND fires → entry
        (30, -2),   # Phase 3: 1010 -> 950, hist<0, exit fires (trade 0)
        (25, +2),   # Phase 4: 950 -> 1000, hist>0, adx>25, AND fires → entry (trade 1)
        (5,  +1),   # Phase 5: ends mid-trade → end_of_data
    ])


def main():
    templates_and_candles = [
        ("EMA Trend Following",              ema_trend_candles()),
        ("MACD Histogram Cross",             macd_histogram_candles()),
        ("Stochastic Oversold Bounce",       stochastic_oversold_candles()),
        ("ADX Directional Filter",           adx_directional_candles()),
        ("Price Variation Momentum",         price_variation_candles()),
        ("Stochastic + RSI Double Oversold", stoch_rsi_double_candles()),
        ("Bollinger + RSI Reversal",         bollinger_rsi_candles()),
        ("EMA + RSI Confirmation",           ema_rsi_confirm_candles()),
        ("MACD + ADX Dual Filter",           macd_adx_candles()),
    ]

    for name, candles in templates_and_candles:
        print(f"\n>>> Running: {name} ({len(candles)} candles)")
        tmpl = get_template(name)
        try:
            result = run_pipeline(tmpl["definition_json"], candles)
            print(f"    Trades: {result.num_trades}")
            for i, t in enumerate(result.trades):
                print(f"    trade[{i}]: {t.exit_reason} (entry={t.entry_time.date()}, exit={t.exit_time.date()})")
            print_result(name, result, candles)
        except Exception as e:
            print(f"    ERROR: {e}")


if __name__ == "__main__":
    main()
