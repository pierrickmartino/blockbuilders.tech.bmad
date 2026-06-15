"""Template-based narrative summary for completed backtests."""

from typing import Optional

from app.schemas.backtest import BacktestSummary

ALPHA_ON_PAR_THRESHOLD = 0.05

ZERO_TRADE_MESSAGE = (
    "Your strategy didn't trigger any entry signals during this period. "
    "This could mean your conditions are too strict, or the market didn't "
    "match your criteria. Try adjusting your thresholds or testing a "
    "different date range."
)

FALLBACK_MESSAGE = (
    "We couldn't generate a summary for this backtest. "
    "Check the metrics above for detailed results."
)


def _fmt_usd(value: float) -> str:
    return f"${value:,.0f}"


def _fmt_pct(value: float) -> str:
    return f"{abs(value):.1f}"


def _felt_dollar_clause(summary: BacktestSummary) -> Optional[str]:
    """Return the felt-dollar vs-buy-and-hold clause, or None if it must not be shown.

    Returns None when alpha is within the on-par band (|alpha| <= 0.05), which
    also covers the absent-benchmark sentinel (benchmark_return_pct == 0,
    alpha == 0) — closing the dollar-lie risk with no new schema field.
    """
    if abs(summary.alpha) <= ALPHA_ON_PAR_THRESHOLD:
        return None

    felt_delta_usd = summary.final_balance - summary.initial_balance * (
        1 + summary.benchmark_return_pct / 100
    )
    amount = _fmt_usd(abs(felt_delta_usd))
    strategy_up = summary.final_balance >= summary.initial_balance

    if strategy_up:
        if felt_delta_usd > 0:
            return f"made you {amount} more than simply holding"
        return f"cost you {amount} versus simply holding"

    if felt_delta_usd > 0:
        return f"saved you {amount} — it lost less than holding would have"
    return f"cost you {amount} more than simply holding"


def _append_felt_dollar_clause(sentence: str, summary: BacktestSummary) -> str:
    """Append the felt-dollar clause to `sentence`, or return it unchanged."""
    felt_clause = _felt_dollar_clause(summary)
    if not felt_clause:
        return sentence
    return f"{sentence} This {felt_clause}."


def generate_narrative(summary: BacktestSummary) -> str:
    """Return a plain-English paragraph summarising backtest results.

    Never raises — returns FALLBACK_MESSAGE on any error.
    """
    try:
        if summary.num_trades == 0:
            return ZERO_TRADE_MESSAGE

        initial = summary.initial_balance
        final = summary.final_balance
        ret = summary.total_return_pct
        dd = summary.max_drawdown_pct
        trades = summary.num_trades
        alpha = summary.alpha

        # Sentence 1: outcome
        if ret >= 0:
            outcome = (
                f"Starting with {_fmt_usd(initial)}, your strategy grew to "
                f"{_fmt_usd(final)}, a {_fmt_pct(ret)}% return over {trades} trades."
            )
        else:
            outcome = (
                f"Starting with {_fmt_usd(initial)}, your strategy ended at "
                f"{_fmt_usd(final)}, a {_fmt_pct(ret)}% loss over {trades} trades."
            )

        # Sentence 2: max drawdown (experiential)
        if dd > 0:
            drawdown_text = (
                f"At its worst, your portfolio was down {_fmt_pct(dd)}% from its "
                f"peak equity, its maximum drawdown."
            )
        else:
            drawdown_text = (
                "Your portfolio never experienced a significant drawdown."
            )

        # Sentence 3: buy-and-hold comparison
        pp = abs(alpha)
        if alpha > ALPHA_ON_PAR_THRESHOLD:
            comparison = (
                f"Compared to simply buying and holding, your strategy "
                f"outperformed by {pp:.1f} percentage points."
            )
            comparison = _append_felt_dollar_clause(comparison, summary)
        elif alpha < -ALPHA_ON_PAR_THRESHOLD:
            comparison = (
                f"Compared to simply buying and holding, your strategy "
                f"underperformed by {pp:.1f} percentage points."
            )
            comparison = _append_felt_dollar_clause(comparison, summary)
        else:
            comparison = (
                "Your strategy performed on par with a simple buy-and-hold approach."
            )

        return f"{outcome} {drawdown_text} {comparison}"

    except Exception:
        return FALLBACK_MESSAGE
