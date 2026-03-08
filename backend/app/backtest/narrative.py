"""Template-based narrative summary for completed backtests."""

from app.schemas.backtest import BacktestSummary

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
        if alpha > 0.05:
            comparison = (
                f"Compared to simply buying and holding, your strategy "
                f"outperformed by {pp:.1f} percentage points."
            )
        elif alpha < -0.05:
            comparison = (
                f"Compared to simply buying and holding, your strategy "
                f"underperformed by {pp:.1f} percentage points."
            )
        else:
            comparison = (
                "Your strategy performed on par with a simple buy-and-hold approach."
            )

        return f"{outcome} {drawdown_text} {comparison}"

    except Exception:
        return FALLBACK_MESSAGE
