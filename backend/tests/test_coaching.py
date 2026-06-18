"""Unit tests for Tweak coaching pure-logic modules.

No DB, no storage, no external services — synthetic inputs only.
"""
from datetime import datetime

import pytest

from app.backtest.coaching import diff_strategy_versions
from app.backtest.types import RiskParams, ValidatedStrategy


def make_strategy(**risk_overrides) -> ValidatedStrategy:
    """Factory for ValidatedStrategy with a minimal RSI-signal graph."""
    base_risk = dict(
        position_size_pct=100.0,
        stop_loss_pct=None,
        take_profit_levels=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    base_risk.update(risk_overrides)
    return ValidatedStrategy(
        blocks=({"id": "b1", "type": "rsi_oversold"},),
        connections=({"from": "b1", "to": "entry"},),
        risk_params=RiskParams(**base_risk),
    )


# ---------------------------------------------------------------------------
# Strategy diff
# ---------------------------------------------------------------------------


class TestStrategyDiff:
    def test_stop_loss_change_produces_causal_tier(self):
        va = make_strategy(stop_loss_pct=5.0)
        vb = make_strategy(stop_loss_pct=3.0)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"

    def test_stop_loss_change_classified_as_risk_block(self):
        va = make_strategy(stop_loss_pct=5.0)
        vb = make_strategy(stop_loss_pct=3.0)

        result = diff_strategy_versions(va, vb)

        assert len(result.param_changes) == 1
        assert result.param_changes[0].classification == "risk-block"

    def test_stop_loss_change_captures_old_and_new_values(self):
        va = make_strategy(stop_loss_pct=5.0)
        vb = make_strategy(stop_loss_pct=3.0)

        result = diff_strategy_versions(va, vb)

        change = result.param_changes[0]
        assert change.param == "stop_loss"
        assert change.old_value == 5.0
        assert change.new_value == 3.0

    def test_no_param_change_produces_no_diff_tier(self):
        va = make_strategy(stop_loss_pct=5.0)
        vb = make_strategy(stop_loss_pct=5.0)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "no-diff"
        assert len(result.param_changes) == 0

    def test_stop_loss_added_from_none_is_risk_block(self):
        va = make_strategy(stop_loss_pct=None)
        vb = make_strategy(stop_loss_pct=3.0)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"
        assert result.param_changes[0].classification == "risk-block"


# ---------------------------------------------------------------------------
# Trade matcher
# ---------------------------------------------------------------------------


from app.backtest.coaching import match_trades
from app.backtest.position_manager import Trade


def make_trade(entry_ts: datetime, exit_ts: datetime, pnl: float = 100.0, exit_reason: str = "signal") -> Trade:
    """Factory for a minimal Trade with the required fields."""
    return Trade(
        entry_time=entry_ts,
        entry_price=100.0,
        exit_time=exit_ts,
        exit_price=101.0,
        side="long",
        pnl=pnl,
        pnl_pct=pnl / 100.0,
        qty=1.0,
        sl_price_at_entry=None,
        tp_price_at_entry=None,
        exit_reason=exit_reason,
        mae_usd=0.0,
        mae_pct=0.0,
        mfe_usd=1.0,
        mfe_pct=1.0,
        initial_risk_usd=None,
        r_multiple=None,
        peak_price=101.0,
        peak_ts=exit_ts,
        trough_price=99.0,
        trough_ts=entry_ts,
        duration_seconds=3600,
        fee_cost_usd=0.0,
        slippage_cost_usd=0.0,
        spread_cost_usd=0.0,
        total_cost_usd=0.0,
        notional_usd=100.0,
    )


T1 = datetime(2024, 1, 1, 9, 0)
T2 = datetime(2024, 1, 2, 9, 0)
T3 = datetime(2024, 1, 3, 9, 0)
T1_EXIT = datetime(2024, 1, 1, 17, 0)
T2_EXIT = datetime(2024, 1, 2, 17, 0)
T3_EXIT = datetime(2024, 1, 3, 17, 0)


class TestTradeMatcher:
    def test_identical_entry_times_all_matched(self):
        trades_a = [make_trade(T1, T1_EXIT), make_trade(T2, T2_EXIT)]
        trades_b = [make_trade(T1, T1_EXIT), make_trade(T2, T2_EXIT)]

        result = match_trades(trades_a, trades_b)

        assert len(result.matched) == 2
        assert len(result.a_only) == 0
        assert len(result.b_only) == 0

    def test_a_only_trade_stays_in_a_only(self):
        trades_a = [make_trade(T1, T1_EXIT), make_trade(T3, T3_EXIT)]
        trades_b = [make_trade(T1, T1_EXIT)]

        result = match_trades(trades_a, trades_b)

        assert len(result.matched) == 1
        assert len(result.a_only) == 1
        assert result.a_only[0].entry_time == T3
        assert len(result.b_only) == 0

    def test_b_only_trade_stays_in_b_only(self):
        trades_a = [make_trade(T1, T1_EXIT)]
        trades_b = [make_trade(T1, T1_EXIT), make_trade(T3, T3_EXIT)]

        result = match_trades(trades_a, trades_b)

        assert len(result.matched) == 1
        assert len(result.a_only) == 0
        assert len(result.b_only) == 1
        assert result.b_only[0].entry_time == T3

    def test_empty_inputs_produce_empty_match(self):
        result = match_trades([], [])

        assert len(result.matched) == 0
        assert len(result.a_only) == 0
        assert len(result.b_only) == 0

    def test_matched_pairs_preserve_both_trades(self):
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0)
        trade_b = make_trade(T1, T2_EXIT, pnl=-50.0)

        result = match_trades([trade_a], [trade_b])

        assert len(result.matched) == 1
        assert result.matched[0].trade_a.pnl == 200.0
        assert result.matched[0].trade_b.pnl == -50.0


# ---------------------------------------------------------------------------
# Coaching builder
# ---------------------------------------------------------------------------


from app.backtest.coaching import build_coaching, StrategyDiff, ParamChange, TradeMatchResult, MatchedTrade


def make_causal_sl_diff(old_sl: float = 5.0, new_sl: float = 3.0) -> StrategyDiff:
    return StrategyDiff(
        param_changes=(
            ParamChange(param="stop_loss", old_value=old_sl, new_value=new_sl, classification="risk-block"),
        ),
        tier="causal",
    )


def make_match_result(matched=(), a_only=(), b_only=()) -> TradeMatchResult:
    return TradeMatchResult(matched=tuple(matched), a_only=tuple(a_only), b_only=tuple(b_only))


class TestCoachingBuilder:
    def test_stop_tightened_insight_type_when_sl_exits_earlier(self):
        """Tighter SL (3%) causes B trade to hit SL; A trade ran to signal."""
        trade_a = make_trade(T1, T1_EXIT, pnl=150.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=-30.0, exit_reason="sl")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_sl_diff(5.0, 3.0), make_match_result([matched]), 15.0, 9.0)

        assert result.insights[0].insight_type == "stop_tightened"

    def test_stop_loosened_insight_type_when_sl_no_longer_triggers(self):
        """Looser SL (8%) means B trade stays open past where A hit SL."""
        trade_a = make_trade(T1, T1_EXIT, pnl=-30.0, exit_reason="sl")
        trade_b = make_trade(T1, T2_EXIT, pnl=150.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_sl_diff(3.0, 8.0), make_match_result([matched]), 9.0, 15.0)

        assert result.insights[0].insight_type == "stop_loosened"

    def test_observed_not_speculated_no_would_have(self):
        """The invariant: no 'would have' phrasing anywhere in coaching output."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=-20.0, exit_reason="sl")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_sl_diff(), make_match_result([matched]), 10.0, 5.0)

        full_text = result.headline + " ".join(
            i.insight_type + i.exit_reason_a + i.exit_reason_b for i in result.insights
        )
        assert "would have" not in full_text.lower()

    def test_net_delta_reconciles_with_summary_returns(self):
        """net_delta_pct must equal ret_pct_b - ret_pct_a (reconciliation invariant)."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0)
        trade_b = make_trade(T1, T1_EXIT, pnl=50.0)
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        ret_a, ret_b = 10.0, 5.0
        result = build_coaching(make_causal_sl_diff(), make_match_result([matched]), ret_a, ret_b)

        assert result.net_delta_pct == pytest.approx(ret_b - ret_a)

    def test_insights_carry_actual_exit_reasons(self):
        """Coaching must report the counterpart run's actual outcome, not imagined."""
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="tp")
        trade_b = make_trade(T1, T1_EXIT, pnl=-30.0, exit_reason="sl")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_sl_diff(), make_match_result([matched]), 20.0, 5.0)

        insight = result.insights[0]
        assert insight.exit_reason_a == "tp"
        assert insight.exit_reason_b == "sl"


# ---------------------------------------------------------------------------
# Comparability resolver
# ---------------------------------------------------------------------------


from uuid import UUID
from app.backtest.coaching import resolve_comparability, RunInfo

STRATEGY_ID = UUID("00000000-0000-0000-0000-000000000001")
VERSION_A = UUID("00000000-0000-0000-0000-000000000010")
VERSION_B = UUID("00000000-0000-0000-0000-000000000011")
DATE_FROM = datetime(2024, 1, 1)
DATE_TO = datetime(2024, 6, 1)


def make_run_info(**overrides) -> RunInfo:
    defaults = dict(
        strategy_id=STRATEGY_ID,
        strategy_version_id=VERSION_A,
        asset="BTC/USDT",
        timeframe="1h",
        fee_rate=0.001,
        slippage_rate=0.0005,
        spread_rate=0.0,
        date_from=DATE_FROM,
        date_to=DATE_TO,
    )
    defaults.update(overrides)
    return RunInfo(**defaults)


class TestComparabilityResolver:
    def test_aligned_eligible_pair_recognized(self):
        run_a = make_run_info(strategy_version_id=VERSION_A)
        run_b = make_run_info(strategy_version_id=VERSION_B)

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is True
        assert result.reason == "aligned_eligible"

    def test_different_strategy_id_ineligible(self):
        other_strategy = UUID("00000000-0000-0000-0000-000000000002")
        run_a = make_run_info(strategy_version_id=VERSION_A)
        run_b = make_run_info(strategy_id=other_strategy, strategy_version_id=VERSION_B)

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False
        assert "strategy" in result.reason

    def test_different_asset_ineligible(self):
        run_a = make_run_info(strategy_version_id=VERSION_A, asset="BTC/USDT")
        run_b = make_run_info(strategy_version_id=VERSION_B, asset="ETH/USDT")

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False

    def test_different_timeframe_ineligible(self):
        run_a = make_run_info(strategy_version_id=VERSION_A, timeframe="1h")
        run_b = make_run_info(strategy_version_id=VERSION_B, timeframe="4h")

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False

    def test_same_version_id_ineligible(self):
        run_a = make_run_info(strategy_version_id=VERSION_A)
        run_b = make_run_info(strategy_version_id=VERSION_A)

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False
        assert "version" in result.reason

    def test_different_window_ineligible(self):
        run_a = make_run_info(strategy_version_id=VERSION_A, date_to=datetime(2024, 6, 1))
        run_b = make_run_info(strategy_version_id=VERSION_B, date_to=datetime(2024, 9, 1))

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False
        assert "window" in result.reason
