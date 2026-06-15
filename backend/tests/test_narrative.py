"""Tests for backtest narrative summary generation."""

from unittest.mock import patch

from app.backtest.narrative import (
    FALLBACK_MESSAGE,
    ZERO_TRADE_MESSAGE,
    _felt_dollar_clause,
    generate_narrative,
)
from app.schemas.backtest import BacktestSummary


def make_summary(**overrides) -> BacktestSummary:
    """Factory for BacktestSummary with sensible defaults."""
    defaults = dict(
        initial_balance=10_000.0,
        final_balance=11_500.0,
        total_return_pct=15.0,
        cagr_pct=12.0,
        max_drawdown_pct=8.0,
        num_trades=25,
        win_rate_pct=60.0,
        benchmark_return_pct=10.0,
        alpha=5.0,
        beta=0.9,
        sharpe_ratio=1.2,
        sortino_ratio=1.5,
        calmar_ratio=1.8,
        max_consecutive_losses=3,
    )
    defaults.update(overrides)
    return BacktestSummary(**defaults)


class TestNarrativeZeroTrades:
    def test_zero_trades_exact_message(self):
        summary = make_summary(num_trades=0)
        result = generate_narrative(summary)
        assert result == ZERO_TRADE_MESSAGE

    def test_zero_trades_exact_punctuation(self):
        """PRD requires character-for-character match."""
        expected = (
            "Your strategy didn't trigger any entry signals during this "
            "period. This could mean your conditions are too strict, or the "
            "market didn't match your criteria. Try adjusting your thresholds "
            "or testing a different date range."
        )
        summary = make_summary(num_trades=0)
        assert generate_narrative(summary) == expected


class TestNarrativePositiveReturn:
    def test_contains_all_data_points(self):
        summary = make_summary(
            initial_balance=10_000,
            final_balance=11_500,
            total_return_pct=15.0,
            max_drawdown_pct=12.0,
            num_trades=25,
            benchmark_return_pct=10.0,
            alpha=5.0,
        )
        result = generate_narrative(summary)

        # Data point 1: start and end balance
        assert "$10,000" in result
        assert "$11,500" in result

        # Data point 2: return percentage
        assert "15.0%" in result

        # Data point 3: trade count
        assert "25 trades" in result

        # Data point 4: max drawdown from peak equity
        assert "12.0% from its peak equity" in result

        # Data point 5: buy-and-hold comparison
        assert "outperformed" in result
        assert "5.0 percentage points" in result

    def test_positive_return_uses_grew(self):
        summary = make_summary(total_return_pct=10.0)
        result = generate_narrative(summary)
        assert "grew" in result


class TestNarrativeNegativeReturn:
    def test_negative_return_uses_loss_language(self):
        summary = make_summary(
            final_balance=8_500,
            total_return_pct=-15.0,
            alpha=-5.0,
            benchmark_return_pct=-10.0,
        )
        result = generate_narrative(summary)
        assert "loss" in result
        assert "underperformed" in result

    def test_down_lost_less_than_hold_includes_saved_you_clause(self):
        """Strategy lost money but less than holding would have."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=9_000,
            total_return_pct=-10.0,
            benchmark_return_pct=-30.0,
            alpha=20.0,
        )
        result = generate_narrative(summary)
        assert "saved you $2,000 — it lost less than holding would have" in result

    def test_down_lost_more_than_hold_includes_cost_you_more_clause(self):
        """Strategy lost money and more than holding would have."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=9_000,
            total_return_pct=-10.0,
            benchmark_return_pct=5.0,
            alpha=-15.0,
        )
        result = generate_narrative(summary)
        assert "cost you $1,500 more than simply holding" in result

    def test_negative_return_contains_data_points(self):
        summary = make_summary(
            initial_balance=10_000,
            final_balance=8_500,
            total_return_pct=-15.0,
            max_drawdown_pct=20.0,
            num_trades=30,
            alpha=-5.0,
        )
        result = generate_narrative(summary)
        assert "$10,000" in result
        assert "$8,500" in result
        assert "15.0%" in result
        assert "30 trades" in result
        assert "20.0% from its peak equity" in result


class TestDrawdownCalculation:
    def test_prd_example_26pct(self):
        """Drawdown is expressed as a percentage from peak equity."""
        summary = make_summary(
            initial_balance=10_000,
            max_drawdown_pct=26.0,
        )
        result = generate_narrative(summary)
        assert "26.0% from its peak equity" in result

    def test_zero_drawdown(self):
        """Zero drawdown should not produce odd text."""
        summary = make_summary(max_drawdown_pct=0.0)
        result = generate_narrative(summary)
        assert "never experienced a significant drawdown" in result


class TestBenchmarkComparison:
    def test_outperformed(self):
        summary = make_summary(alpha=5.0)
        result = generate_narrative(summary)
        assert "outperformed" in result

    def test_underperformed(self):
        summary = make_summary(alpha=-3.0)
        result = generate_narrative(summary)
        assert "underperformed" in result

    def test_matched_benchmark(self):
        """Alpha near zero should use 'on par' language."""
        summary = make_summary(alpha=0.0)
        result = generate_narrative(summary)
        assert "on par" in result

    def test_outperformed_includes_felt_dollar_clause(self):
        summary = make_summary(
            initial_balance=10_000,
            final_balance=11_500,
            total_return_pct=15.0,
            benchmark_return_pct=10.0,
            alpha=5.0,
        )
        result = generate_narrative(summary)
        assert "made you $500 more than simply holding" in result

    def test_underperformed_includes_felt_dollar_clause(self):
        summary = make_summary(
            initial_balance=10_000,
            final_balance=10_500,
            total_return_pct=5.0,
            benchmark_return_pct=20.0,
            alpha=-15.0,
        )
        result = generate_narrative(summary)
        assert "cost you $1,500 versus simply holding" in result

    def test_on_par_does_not_include_felt_dollar_clause(self):
        summary = make_summary(alpha=0.0)
        result = generate_narrative(summary)
        assert "simply holding" not in result

    def test_absent_benchmark_sentinel_does_not_include_felt_dollar_clause(self):
        """A missing benchmark collapses to (0, 0, 0) and must land on-par."""
        summary = make_summary(benchmark_return_pct=0.0, alpha=0.0)
        result = generate_narrative(summary)
        assert "on par" in result
        assert "simply holding" not in result


class TestFeltDollarClause:
    def test_up_strategy_outperformed_made_you_more(self):
        """Strategy gained, and beat the hold: 'made you $X more'."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=11_500,
            total_return_pct=15.0,
            benchmark_return_pct=10.0,
            alpha=5.0,
        )
        clause = _felt_dollar_clause(summary)
        assert clause == "made you $500 more than simply holding"

    def test_up_strategy_underperformed_cost_you(self):
        """Strategy gained, but the hold gained more: 'cost you $X'."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=10_500,
            total_return_pct=5.0,
            benchmark_return_pct=20.0,
            alpha=-15.0,
        )
        clause = _felt_dollar_clause(summary)
        assert clause == "cost you $1,500 versus simply holding"

    def test_down_strategy_lost_less_than_hold_saved_you(self):
        """Strategy lost money, but less than holding would have: 'saved you $X'."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=9_000,
            total_return_pct=-10.0,
            benchmark_return_pct=-30.0,
            alpha=20.0,
        )
        clause = _felt_dollar_clause(summary)
        assert clause == "saved you $2,000 — it lost less than holding would have"

    def test_down_strategy_lost_more_than_hold_cost_you_more(self):
        """Strategy lost money, and more than holding would have: 'cost you $X more'."""
        summary = make_summary(
            initial_balance=10_000,
            final_balance=9_000,
            total_return_pct=-10.0,
            benchmark_return_pct=5.0,
            alpha=-15.0,
        )
        clause = _felt_dollar_clause(summary)
        assert clause == "cost you $1,500 more than simply holding"

    def test_on_par_band_returns_none(self):
        """Alpha within the on-par band must not produce a dollar clause."""
        summary = make_summary(alpha=0.05)
        assert _felt_dollar_clause(summary) is None

    def test_absent_benchmark_sentinel_returns_none(self):
        """A missing benchmark collapses to (0, 0, 0) and must not print a figure."""
        summary = make_summary(benchmark_return_pct=0.0, alpha=0.0)
        assert _felt_dollar_clause(summary) is None


class TestFallback:
    def test_fallback_on_exception(self):
        """If narrative generation throws, return fallback."""
        with patch(
            "app.backtest.narrative._fmt_usd",
            side_effect=RuntimeError("boom"),
        ):
            summary = make_summary()
            result = generate_narrative(summary)
            assert result == FALLBACK_MESSAGE
