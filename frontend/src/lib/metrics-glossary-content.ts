export interface MetricGlossaryEntry {
  id: string;
  name: string;
  definition: string;
  formula: string;
  interpretation: string;
  ranges: {
    good: string;
    acceptable?: string;
    poor: string;
    caveat: string;
  };
  example: string;
  keywords?: string[];
}

export const METRICS_GLOSSARY: MetricGlossaryEntry[] = [
  {
    id: "total-return",
    name: "Total Return %",
    definition:
      "Total Return measures the overall percentage gain or loss of your portfolio from the initial $10,000 starting balance to the final balance after all trades are closed. It shows the raw profitability of the strategy over the entire backtest period without annualizing or adjusting for time.",
    formula: "((Final Balance - Initial Balance) / Initial Balance) × 100",
    interpretation:
      "Higher is better. Positive returns mean the strategy made money; negative returns mean it lost money. This metric gives you the bottom-line result but doesn't account for how long it took to achieve.",
    ranges: {
      good: "30% or higher",
      acceptable: "10–30%",
      poor: "Below 0% (losses)",
      caveat:
        "Always compare against the benchmark return and consider the timeframe. A 50% return over 5 years is very different from 50% over 3 months in terms of risk and sustainability.",
    },
    example:
      "Strategy A: 45% total return over 2 years means if you started with $10,000, you ended with $14,500.",
    keywords: ["profit", "gain", "loss", "overall", "return"],
  },
  {
    id: "cagr",
    name: "CAGR %",
    definition:
      "Compound Annual Growth Rate (CAGR) annualizes your returns, smoothing out volatility and allowing fair comparison across different timeframes. It answers the question: 'If the strategy compounded at a constant rate each year, what would that rate be?'",
    formula:
      "((Ending Value / Beginning Value) ^ (1 / Number of Years)) - 1",
    interpretation:
      "Shows the average yearly return if gains compounded smoothly. Higher CAGR is better. It makes it easier to compare strategies of different lengths and assess long-term performance.",
    ranges: {
      good: "Greater than 10% annually",
      acceptable: "0–10% annually",
      poor: "Below 0% (negative growth)",
      caveat:
        "Be cautious of short-term strategies with high CAGR. A 1-month strategy with 10% return annualizes to an unrealistic 3,700% but may carry extreme risk. Context matters—longer backtests provide more reliable CAGR estimates.",
    },
    example:
      "Strategy A: 18% CAGR means if you invested $10,000, it would grow to approximately $11,800 in 1 year, $13,924 in 2 years, assuming smooth compounding (actual results will vary with market conditions).",
    keywords: ["annual", "compound", "yearly", "growth", "annualized"],
  },
  {
    id: "max-drawdown",
    name: "Max Drawdown %",
    definition:
      "Max Drawdown measures the largest peak-to-trough decline in portfolio value during the backtest period. It shows the worst-case loss an investor would have experienced from a high point to a subsequent low point before recovering.",
    formula:
      "(Peak Portfolio Value - Trough Portfolio Value) / Peak Portfolio Value × 100",
    interpretation:
      "Lower is better. This metric reveals the maximum pain point—the biggest loss you would have endured. Essential for understanding risk tolerance and portfolio resilience during market downturns.",
    ranges: {
      good: "Less than 20%",
      acceptable: "20–40%",
      poor: "Greater than 40%",
      caveat:
        "Max drawdown depends heavily on market conditions and strategy type. Aggressive strategies may see higher drawdowns. Always consider whether you could stomach the maximum loss psychologically and financially.",
    },
    example:
      "Strategy A: 12% max drawdown, 18% CAGR, Sharpe 1.2 → steady growth with moderate risk. Strategy B: 35% max drawdown, 25% CAGR → higher returns but significantly more risk and stress.",
    keywords: ["risk", "drawdown", "loss", "decline", "volatility"],
  },
  {
    id: "win-rate",
    name: "Win Rate %",
    definition:
      "Win Rate shows the percentage of trades that were profitable (closed with a gain) out of all completed trades. It's a simple measure of how often the strategy gets it right.",
    formula: "(Number of Winning Trades / Total Trades) × 100",
    interpretation:
      "Higher is generally better, but quality matters more than quantity. A strategy with a 40% win rate can still be highly profitable if the winning trades are much larger than the losing ones. Conversely, a 70% win rate with small wins and large losses can be unprofitable.",
    ranges: {
      good: "Greater than 55%",
      acceptable: "45–55%",
      poor: "Below 45%",
      caveat:
        "Win rate alone is misleading without considering average win/loss size and risk-reward ratio. Some of the best trend-following strategies have low win rates (30–40%) but exceptional risk-reward profiles.",
    },
    example:
      "Strategy A: 60% win rate with 100 trades means 60 trades were profitable and 40 were losses. If wins averaged +2% and losses averaged -1%, the strategy is still very profitable despite 40% of trades losing.",
    keywords: ["wins", "profitable", "accuracy", "success", "trades"],
  },
  {
    id: "trades",
    name: "Number of Trades",
    definition:
      "Number of Trades counts the total completed trade cycles (entry and exit) executed during the backtest period. It reflects the strategy's activity level and provides context for statistical confidence.",
    formula: "Count of all completed trades (entry + exit)",
    interpretation:
      "More trades generally provide greater statistical confidence in performance metrics. However, very high trade counts may indicate overtrading and excessive transaction costs. Very low trade counts may not be statistically significant.",
    ranges: {
      good: "30 or more (statistically meaningful)",
      acceptable: "10–30 (limited sample)",
      poor: "Fewer than 10 (insufficient data)",
      caveat:
        "The ideal number of trades depends on strategy type and timeframe. Long-term swing strategies may only produce 10–20 trades per year, which is acceptable. High-frequency strategies need hundreds of trades for validation. Always consider transaction costs.",
    },
    example:
      "Strategy A: 120 trades over 2 years → provides strong statistical confidence in win rate and other metrics. Strategy B: 8 trades over 2 years → results may be due to luck or small sample size; interpret with caution.",
    keywords: ["count", "activity", "frequency", "sample", "volume"],
  },
  {
    id: "benchmark-return",
    name: "Benchmark Return %",
    definition:
      "Benchmark Return shows what you would have earned by simply buying the asset at the start of the backtest period and holding it until the end (buy-and-hold strategy). It provides a performance baseline to judge whether your strategy adds value.",
    formula: "((Asset Price at End - Asset Price at Start) / Asset Price at Start) × 100",
    interpretation:
      "Your strategy's total return should ideally exceed the benchmark return to justify the complexity and risk of active trading. If your strategy underperforms the benchmark, you might be better off with passive buy-and-hold.",
    ranges: {
      good: "Your strategy significantly beats benchmark (positive alpha)",
      acceptable: "Your strategy roughly matches benchmark",
      poor: "Your strategy underperforms benchmark (negative alpha)",
      caveat:
        "Market conditions matter. In strong bull markets, buy-and-hold often wins. In sideways or volatile markets, active strategies may shine. Always compare risk-adjusted returns (Sharpe ratio), not just raw returns.",
    },
    example:
      "Benchmark Return: 40% over 2 years (BTC buy-and-hold). Strategy Return: 55% over 2 years → strategy adds 15% value (positive alpha). Worth the effort if risk is comparable or lower.",
    keywords: [
      "baseline",
      "buy-and-hold",
      "passive",
      "comparison",
      "market",
    ],
  },
  {
    id: "alpha",
    name: "Alpha",
    definition:
      "Alpha measures the excess return your strategy generates compared to the benchmark (buy-and-hold). Positive alpha means your strategy outperformed; negative alpha means it underperformed. It answers: 'Did my active strategy add value beyond passive holding?'",
    formula: "Strategy Total Return % - Benchmark Return %",
    interpretation:
      "Positive alpha is the goal—it shows your strategy is worth the effort. Higher alpha is better. Zero alpha means you matched the market. Negative alpha means you would have been better off with passive buy-and-hold.",
    ranges: {
      good: "Positive alpha (outperformance)",
      acceptable: "Alpha near zero (matches benchmark)",
      poor: "Negative alpha (underperformance)",
      caveat:
        "Alpha alone doesn't account for risk. A strategy with +10% alpha but twice the volatility (drawdown) may not be better. Always consider risk-adjusted metrics like Sharpe ratio alongside alpha.",
    },
    example:
      "Strategy A: 55% total return, benchmark 40% → Alpha = +15% (strong outperformance, strategy adds real value). Strategy B: 35% return, benchmark 40% → Alpha = -5% (underperformance, stick with buy-and-hold).",
    keywords: ["outperformance", "excess", "value-add", "active"],
  },
  {
    id: "beta",
    name: "Beta",
    definition:
      "Beta measures how much your strategy's returns move in relation to the benchmark (market). A beta of 1.0 means your strategy moves in lockstep with the market. Beta below 1.0 indicates lower volatility; above 1.0 indicates higher volatility.",
    formula:
      "Covariance(Strategy Returns, Benchmark Returns) / Variance(Benchmark Returns)",
    interpretation:
      "Beta shows your strategy's sensitivity to market movements. Lower beta (e.g., 0.5) means less volatile—your strategy is more stable and independent. Higher beta (e.g., 1.5) means more volatile—your strategy amplifies market swings.",
    ranges: {
      good: "0.5–1.0 (moderate correlation, lower volatility)",
      acceptable: "1.0–1.5 (market-like or slightly higher volatility)",
      poor: "Greater than 2.0 (excessive volatility)",
      caveat:
        "Beta is context-dependent. High beta isn't inherently bad if returns justify the volatility. Low beta with strong alpha is ideal—less risk, more reward. Beta assumes correlation is stable, which may not hold in all market conditions.",
    },
    example:
      "Strategy A: Beta 0.7 → if market moves 10%, strategy moves ~7% (less volatile, smoother ride). Strategy B: Beta 1.8 → if market moves 10%, strategy swings ~18% (higher risk, higher potential reward).",
    keywords: ["volatility", "correlation", "market", "risk", "sensitivity"],
  },
  {
    id: "sharpe-ratio",
    name: "Sharpe Ratio",
    definition:
      "Sharpe Ratio is a risk-adjusted performance metric that measures excess return per unit of risk (volatility). It answers: 'How much return am I getting for each unit of risk I'm taking?' Higher Sharpe means better risk-adjusted returns.",
    formula:
      "(Strategy Return - Risk-Free Rate) / Standard Deviation of Returns",
    interpretation:
      "Sharpe Ratio helps compare strategies with different risk profiles. A higher Sharpe is always better—it means you're earning more return for the same level of risk. It's one of the most widely used metrics in finance for evaluating performance.",
    ranges: {
      good: "Greater than 1.0",
      acceptable: "0.5–1.0",
      poor: "Below 0.5",
      caveat:
        "Sharpe Ratio assumes returns are normally distributed, which is often not true for crypto (fat tails, skewness). It also doesn't distinguish between upside and downside volatility. Use it alongside other metrics like max drawdown for a complete picture.",
    },
    example:
      "Strategy A: 20% return, 15% volatility → Sharpe ≈ 1.33 (good risk-adjusted returns). Strategy B: 30% return, 35% volatility → Sharpe ≈ 0.86 (higher absolute return but worse risk-adjusted performance).",
    keywords: [
      "risk-adjusted",
      "volatility",
      "efficiency",
      "return-per-risk",
    ],
  },
];
