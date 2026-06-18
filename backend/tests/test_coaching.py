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

    def test_take_profit_change_produces_causal_tier(self):
        va = make_strategy(take_profit_levels=[0.10])
        vb = make_strategy(take_profit_levels=[0.05])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"

    def test_trailing_stop_change_produces_causal_tier(self):
        va = make_strategy(trailing_stop_pct=5.0)
        vb = make_strategy(trailing_stop_pct=3.0)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"

    def test_time_exit_change_produces_causal_tier(self):
        va = make_strategy(time_exit_bars=20)
        vb = make_strategy(time_exit_bars=10)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"

    def test_multiple_exit_timing_changes_still_causal(self):
        va = make_strategy(stop_loss_pct=5.0, take_profit_levels=[0.10])
        vb = make_strategy(stop_loss_pct=3.0, take_profit_levels=[0.05])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"
        assert len(result.param_changes) == 2


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

    def test_a_only_b_only_after_exit_timing_desync(self):
        """B exits T1 later, tying up capital so T2 entry only happens in A."""
        trade1_a = make_trade(T1, T1_EXIT)         # A exits T1 quickly
        trade2_a = make_trade(T2, T2_EXIT)         # A enters T2 with freed capital
        trade1_b = make_trade(T1, T2_EXIT)         # B holds T1 until T2 — no capital for T2

        result = match_trades([trade1_a, trade2_a], [trade1_b])

        assert len(result.matched) == 1
        assert result.matched[0].entry_time == T1
        assert len(result.a_only) == 1
        assert result.a_only[0].entry_time == T2
        assert len(result.b_only) == 0


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

    def test_take_profit_tightened_insight_type(self):
        """Tighter TP in B causes B trade to bank sooner; A trade ran to signal."""
        trade_a = make_trade(T1, T2_EXIT, pnl=500.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="tp")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(ParamChange(param="take_profit", old_value=[0.10], new_value=[0.05], classification="risk-block"),),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 50.0, 10.0)

        assert result.insights[0].insight_type == "take_profit_tightened"

    def test_take_profit_loosened_insight_type(self):
        """Looser TP in B means A banked at TP; B ran further to signal."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="tp")
        trade_b = make_trade(T1, T2_EXIT, pnl=500.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(ParamChange(param="take_profit", old_value=[0.05], new_value=[0.10], classification="risk-block"),),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 10.0, 50.0)

        assert result.insights[0].insight_type == "take_profit_loosened"

    def test_trailing_stop_tightened_insight_type(self):
        """Trailing stop added in B fires; A ran to signal."""
        trade_a = make_trade(T1, T2_EXIT, pnl=200.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=80.0, exit_reason="trailing_stop")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(ParamChange(param="trailing_stop", old_value=None, new_value=3.0, classification="risk-block"),),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 20.0, 8.0)

        assert result.insights[0].insight_type == "trailing_stop_tightened"

    def test_time_exit_shortened_insight_type(self):
        """Fewer bars in B triggers time exit; A ran to signal."""
        trade_a = make_trade(T1, T3_EXIT, pnl=300.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=50.0, exit_reason="time_exit")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(ParamChange(param="time_exit", old_value=None, new_value=5, classification="risk-block"),),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 30.0, 5.0)

        assert result.insights[0].insight_type == "time_exit_shortened"

    def test_multi_knob_routes_via_exit_reason_to_correct_knob(self):
        """Both sl and tp changed — route to take_profit because B's exit_reason is tp."""
        trade_a = make_trade(T1, T2_EXIT, pnl=500.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=80.0, exit_reason="tp")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(
                ParamChange(param="stop_loss", old_value=5.0, new_value=3.0, classification="risk-block"),
                ParamChange(param="take_profit", old_value=[0.10], new_value=[0.05], classification="risk-block"),
            ),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 50.0, 8.0)

        assert result.insights[0].insight_type == "take_profit_tightened"

    def test_a_only_count_in_coaching_result(self):
        """A-only trades from the matcher appear as a_only_count in the result."""
        trade_a_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_sl_diff(),
            make_match_result(a_only=[trade_a_only]),
            10.0,
            5.0,
        )

        assert result.a_only_count == 1

    def test_b_only_count_in_coaching_result(self):
        """B-only trades from the matcher appear as b_only_count in the result."""
        trade_b_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_sl_diff(),
            make_match_result(b_only=[trade_b_only]),
            10.0,
            5.0,
        )

        assert result.b_only_count == 1


# ---------------------------------------------------------------------------
# position_size coaching
# ---------------------------------------------------------------------------


def make_causal_position_size_diff(old_pct: float = 100.0, new_pct: float = 50.0) -> StrategyDiff:
    return StrategyDiff(
        param_changes=(
            ParamChange(param="position_size", old_value=old_pct, new_value=new_pct, classification="risk-block"),
        ),
        tier="causal",
    )


class TestPositionSizeCoaching:
    def test_position_size_only_diff_headline_is_mechanical_scaling(self):
        """Halving position size: same trades, same timing, P&L scaled ~0.5x."""
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_position_size_diff(100.0, 50.0), make_match_result([matched]), 20.0, 10.0)

        assert "same trades" in result.headline.lower()
        assert "same timing" in result.headline.lower()

    def test_position_size_headline_includes_scale_factor(self):
        """Doubling position size: scale factor ~2.0x appears in headline."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_position_size_diff(50.0, 100.0), make_match_result([matched]), 10.0, 20.0)

        assert "2.0x" in result.headline

    def test_position_size_only_all_insights_are_neutral(self):
        """Position size doesn't change exit timing; all matched insights are neutral."""
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_causal_position_size_diff(100.0, 50.0), make_match_result([matched]), 20.0, 10.0)

        assert all(i.insight_type == "neutral" for i in result.insights)

    def test_position_size_net_delta_reconciles(self):
        """Reconciliation invariant holds for position_size diff."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0)
        trade_b = make_trade(T1, T1_EXIT, pnl=50.0)
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        ret_a, ret_b = 10.0, 5.0
        result = build_coaching(make_causal_position_size_diff(), make_match_result([matched]), ret_a, ret_b)

        assert result.net_delta_pct == pytest.approx(ret_b - ret_a)


# ---------------------------------------------------------------------------
# max_drawdown coaching
# ---------------------------------------------------------------------------


def make_causal_max_drawdown_diff(old_pct: float = 20.0, new_pct: float = 10.0) -> StrategyDiff:
    return StrategyDiff(
        param_changes=(
            ParamChange(param="max_drawdown", old_value=old_pct, new_value=new_pct, classification="risk-block"),
        ),
        tier="causal",
    )


class TestMaxDrawdownCoaching:
    def test_max_drawdown_tightened_headline_mentions_skipped_entries(self):
        """Tighter cap kills B's trading; A-only trades are entries B skipped."""
        trade_a_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_max_drawdown_diff(old_pct=20.0, new_pct=10.0),
            make_match_result(a_only=[trade_a_only]),
            10.0,
            5.0,
        )

        assert "skip" in result.headline.lower() or "halt" in result.headline.lower()

    def test_max_drawdown_tightened_headline_includes_halt_date(self):
        """The headline includes the first date where B's kill-switch fired (T2 = 2024-01-02)."""
        trade_a_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_max_drawdown_diff(old_pct=20.0, new_pct=10.0),
            make_match_result(a_only=[trade_a_only]),
            10.0,
            5.0,
        )

        assert "2024-01-02" in result.headline

    def test_max_drawdown_loosened_headline_mentions_allowed_entries(self):
        """Looser cap unlocks B's entries; B-only trades are entries now allowed."""
        trade_b_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_max_drawdown_diff(old_pct=10.0, new_pct=20.0),
            make_match_result(b_only=[trade_b_only]),
            5.0,
            10.0,
        )

        assert "allow" in result.headline.lower() or "unlock" in result.headline.lower()

    def test_max_drawdown_loosened_headline_includes_first_allowed_date(self):
        """The headline includes the first entry date now allowed (T2 = 2024-01-02)."""
        trade_b_only = make_trade(T2, T2_EXIT, pnl=100.0)

        result = build_coaching(
            make_causal_max_drawdown_diff(old_pct=10.0, new_pct=20.0),
            make_match_result(b_only=[trade_b_only]),
            5.0,
            10.0,
        )

        assert "2024-01-02" in result.headline

    def test_max_drawdown_net_delta_reconciles(self):
        """Reconciliation invariant holds for max_drawdown diff."""
        trade_a_only = make_trade(T2, T2_EXIT, pnl=100.0)

        ret_a, ret_b = 10.0, 5.0
        result = build_coaching(
            make_causal_max_drawdown_diff(20.0, 10.0),
            make_match_result(a_only=[trade_a_only]),
            ret_a,
            ret_b,
        )

        assert result.net_delta_pct == pytest.approx(ret_b - ret_a)


# ---------------------------------------------------------------------------
# position_size × max_drawdown interaction
# ---------------------------------------------------------------------------


class TestPositionSizeMaxDrawdownInteraction:
    def test_interaction_headline_mentions_both_knobs(self):
        """Both position_size and max_drawdown changed — both must appear in headline."""
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        trade_a_only = make_trade(T2, T2_EXIT, pnl=50.0)
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(
                ParamChange(param="position_size", old_value=100.0, new_value=50.0, classification="risk-block"),
                ParamChange(param="max_drawdown", old_value=20.0, new_value=10.0, classification="risk-block"),
            ),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched], a_only=[trade_a_only]), 20.0, 5.0)

        headline_lower = result.headline.lower()
        assert "scal" in headline_lower or "position" in headline_lower
        assert "drawdown" in headline_lower or "kill" in headline_lower

    def test_interaction_headline_has_no_contradictory_claim(self):
        """No 'would have' in headline for position_size × max_drawdown diff."""
        trade_a = make_trade(T1, T1_EXIT, pnl=200.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)
        diff = StrategyDiff(
            param_changes=(
                ParamChange(param="position_size", old_value=100.0, new_value=50.0, classification="risk-block"),
                ParamChange(param="max_drawdown", old_value=20.0, new_value=10.0, classification="risk-block"),
            ),
            tier="causal",
        )

        result = build_coaching(diff, make_match_result([matched]), 20.0, 5.0)

        assert "would have" not in result.headline.lower()


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

    def test_differing_window_eligible_with_needs_rerun(self):
        """Shifted windows with sufficient overlap: eligible=True, needs_rerun=True, intersection set."""
        run_a = make_run_info(
            strategy_version_id=VERSION_A,
            date_from=datetime(2024, 1, 1),
            date_to=datetime(2024, 6, 1),
        )
        run_b = make_run_info(
            strategy_version_id=VERSION_B,
            date_from=datetime(2024, 3, 1),
            date_to=datetime(2024, 9, 1),
        )

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is True
        assert result.needs_rerun is True
        assert result.intersection_from == datetime(2024, 3, 1)
        assert result.intersection_to == datetime(2024, 6, 1)

    def test_containment_case_intersection_is_inner_window(self):
        """Outer window contains inner window: intersection equals the inner window."""
        run_a = make_run_info(
            strategy_version_id=VERSION_A,
            date_from=datetime(2024, 1, 1),
            date_to=datetime(2024, 12, 31),
        )
        run_b = make_run_info(
            strategy_version_id=VERSION_B,
            date_from=datetime(2024, 3, 1),
            date_to=datetime(2024, 9, 1),
        )

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is True
        assert result.needs_rerun is True
        assert result.intersection_from == datetime(2024, 3, 1)
        assert result.intersection_to == datetime(2024, 9, 1)

    def test_aligned_windows_has_no_rerun(self):
        """Identical windows: needs_rerun=False — no re-run needed."""
        run_a = make_run_info(strategy_version_id=VERSION_A)
        run_b = make_run_info(strategy_version_id=VERSION_B)

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is True
        assert result.needs_rerun is False

    def test_no_overlap_window_is_ineligible(self):
        """Completely non-overlapping windows: ineligible."""
        run_a = make_run_info(
            strategy_version_id=VERSION_A,
            date_from=datetime(2024, 1, 1),
            date_to=datetime(2024, 3, 1),
        )
        run_b = make_run_info(
            strategy_version_id=VERSION_B,
            date_from=datetime(2024, 9, 1),
            date_to=datetime(2024, 12, 1),
        )

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False
        assert "overlap" in result.reason

    def test_insufficient_overlap_candles_is_ineligible(self):
        """Overlap exists but is below MIN_OVERLAP_CANDLES for the timeframe."""
        run_a = make_run_info(
            strategy_version_id=VERSION_A,
            timeframe="1d",
            date_from=datetime(2024, 1, 1),
            date_to=datetime(2024, 1, 5),
        )
        run_b = make_run_info(
            strategy_version_id=VERSION_B,
            timeframe="1d",
            date_from=datetime(2024, 1, 4),
            date_to=datetime(2024, 6, 1),
        )

        result = resolve_comparability(run_a, run_b)

        assert result.eligible is False
        assert "overlap" in result.reason


# ---------------------------------------------------------------------------
# Strategy diff — structural tier (Tier 2)
# ---------------------------------------------------------------------------


def make_strategy_with_blocks(blocks, connections=None, **risk_overrides) -> ValidatedStrategy:
    """Factory for ValidatedStrategy with custom blocks and connections."""
    base_risk = dict(
        position_size_pct=100.0,
        stop_loss_pct=None,
        take_profit_levels=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    base_risk.update(risk_overrides)
    if connections is None:
        connections = ({"from": "b1", "to": "entry"},)
    return ValidatedStrategy(
        blocks=tuple(blocks),
        connections=tuple(connections),
        risk_params=RiskParams(**base_risk),
    )


class TestStrategyDiffStructural:
    def test_block_added_produces_descriptive_tier(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}])
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "macd_cross"}])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_block_removed_produces_descriptive_tier(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "macd_cross"}])
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_block_params_changed_produces_descriptive_tier(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold", "params": {"period": 14}}])
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold", "params": {"period": 21}}])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_connection_added_produces_descriptive_tier(self):
        va = make_strategy_with_blocks(
            [{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "volume_filter"}],
            connections=[{"from": "b1", "to": "entry"}],
        )
        vb = make_strategy_with_blocks(
            [{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "volume_filter"}],
            connections=[{"from": "b1", "to": "entry"}, {"from": "b2", "to": "filter"}],
        )

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_connection_removed_produces_descriptive_tier(self):
        va = make_strategy_with_blocks(
            [{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "volume_filter"}],
            connections=[{"from": "b1", "to": "entry"}, {"from": "b2", "to": "filter"}],
        )
        vb = make_strategy_with_blocks(
            [{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "volume_filter"}],
            connections=[{"from": "b1", "to": "entry"}],
        )

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_structural_change_overrides_risk_param_change(self):
        """Structural + risk-param edit together → descriptive, not causal."""
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}], stop_loss_pct=5.0)
        vb = make_strategy_with_blocks(
            [{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "macd_cross"}],
            stop_loss_pct=3.0,
        )

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"

    def test_block_added_captured_in_structural_changes(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}])
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "macd_cross"}])

        result = diff_strategy_versions(va, vb)

        change_types = [sc.change_type for sc in result.structural_changes]
        assert "block_added" in change_types

    def test_block_removed_captured_in_structural_changes(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}, {"id": "b2", "type": "macd_cross"}])
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}])

        result = diff_strategy_versions(va, vb)

        change_types = [sc.change_type for sc in result.structural_changes]
        assert "block_removed" in change_types

    def test_delete_and_readd_reads_as_remove_plus_add(self):
        """A block removed and a new block added reads as remove+add → descriptive."""
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}])
        vb = make_strategy_with_blocks([{"id": "b2", "type": "macd_cross"}])

        result = diff_strategy_versions(va, vb)

        assert result.tier == "descriptive"
        change_types = {sc.change_type for sc in result.structural_changes}
        assert "block_removed" in change_types
        assert "block_added" in change_types

    def test_risk_param_only_change_has_empty_structural_changes(self):
        va = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}], stop_loss_pct=5.0)
        vb = make_strategy_with_blocks([{"id": "b1", "type": "rsi_oversold"}], stop_loss_pct=3.0)

        result = diff_strategy_versions(va, vb)

        assert result.tier == "causal"
        assert len(result.structural_changes) == 0


# ---------------------------------------------------------------------------
# Coaching builder — descriptive tier (Tier 2)
# ---------------------------------------------------------------------------


def make_descriptive_diff() -> StrategyDiff:
    """A descriptive-tier diff with a single structural block change."""
    from app.backtest.coaching import StructuralChange

    return StrategyDiff(
        param_changes=(),
        structural_changes=(StructuralChange(change_type="block_added", block_id="b2", block_type="macd_cross"),),
        tier="descriptive",
    )


class TestDescriptiveCoaching:
    def test_descriptive_diff_yields_descriptive_tier_in_result(self):
        result = build_coaching(make_descriptive_diff(), make_match_result(), 10.0, 5.0)

        assert result.tier == "descriptive"

    def test_descriptive_produces_no_per_trade_insights(self):
        """Descriptive tier never emits per-trade pairing — no exit_reason routing."""
        trade_a = make_trade(T1, T1_EXIT, pnl=100.0, exit_reason="signal")
        trade_b = make_trade(T1, T1_EXIT, pnl=50.0, exit_reason="sl")
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_descriptive_diff(), make_match_result([matched]), 10.0, 5.0)

        assert result.insights == ()

    def test_descriptive_headline_contains_no_attribution_disclaimer(self):
        """Headline must carry an explicit no-attribution disclaimer."""
        result = build_coaching(make_descriptive_diff(), make_match_result(), 10.0, 5.0)

        headline_lower = result.headline.lower()
        assert "can't isolate" in headline_lower or "attribution" in headline_lower or "can't" in headline_lower

    def test_descriptive_headline_contains_set_level_facts(self):
        """Headline must state trade counts for both runs (set-level facts)."""
        trade_a = make_trade(T1, T1_EXIT)
        trade_b = make_trade(T1, T1_EXIT)
        extra_a = make_trade(T2, T2_EXIT)
        matched = MatchedTrade(entry_time=T1, trade_a=trade_a, trade_b=trade_b)

        result = build_coaching(make_descriptive_diff(), make_match_result([matched], a_only=[extra_a]), 12.0, 8.0)

        # n_a=2 (1 matched + 1 a_only), n_b=1 (1 matched)
        assert "2" in result.headline and "1" in result.headline

    def test_descriptive_net_delta_reconciles(self):
        """Reconciliation invariant holds for descriptive tier."""
        ret_a, ret_b = 15.0, 9.0
        result = build_coaching(make_descriptive_diff(), make_match_result(), ret_a, ret_b)

        assert result.net_delta_pct == pytest.approx(ret_b - ret_a)

    def test_descriptive_no_would_have_phrasing(self):
        """Observed-not-speculated: no counterfactual phrasing in descriptive output."""
        result = build_coaching(make_descriptive_diff(), make_match_result(), 10.0, 5.0)

        assert "would have" not in result.headline.lower()

    def test_zero_trades_in_b_headline_surfaces_clearly(self):
        """Stricter entry that stops firing: B has 0 trades, A has N → surfaced in headline."""
        trades_a = [make_trade(T1, T1_EXIT), make_trade(T2, T2_EXIT), make_trade(T3, T3_EXIT)]

        result = build_coaching(
            make_descriptive_diff(),
            make_match_result(a_only=trades_a),
            9.0,
            0.0,
        )

        headline_lower = result.headline.lower()
        assert "0" in headline_lower and "3" in headline_lower

    def test_zero_trades_headline_is_not_a_causal_claim(self):
        """Zero-trade headline must not imply causation (no 'would have')."""
        trades_a = [make_trade(T1, T1_EXIT)]

        result = build_coaching(
            make_descriptive_diff(),
            make_match_result(a_only=trades_a),
            5.0,
            0.0,
        )

        assert "would have" not in result.headline.lower()

    def test_descriptive_with_change_list_from_structural_changes(self):
        """Headline includes the change list derived from structural_changes."""
        from app.backtest.coaching import StructuralChange

        diff = StrategyDiff(
            param_changes=(),
            structural_changes=(StructuralChange(change_type="block_removed", block_id="b1", block_type="rsi_oversold"),),
            tier="descriptive",
        )

        result = build_coaching(diff, make_match_result(), 10.0, 5.0)

        assert "rsi_oversold" in result.headline or "removed" in result.headline
