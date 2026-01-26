export interface TooltipContent {
  short: string;
  long?: string;
  category: "block" | "metric" | "param";
}

export const TOOLTIP_CONTENT: Record<string, TooltipContent> = {
  // Input Blocks
  "block-price": {
    short: "Provides OHLC price data from candles. Select open, high, low, or close.",
    long: "The Price block outputs price data from historical candles. Choose which price point (open/high/low/close) to use in your strategy logic.",
    category: "block",
  },
  "block-volume": {
    short: "Trading volume for each candle.",
    long: "Volume represents the total amount of the asset traded during each time period (candle).",
    category: "block",
  },
  "block-constant": {
    short: "Fixed numeric value between -1M and 1M.",
    long: "Use the Constant block to provide a fixed number in your strategy logic for comparisons or calculations.",
    category: "block",
  },
  "block-yesterday_close": {
    short: "Close price of the previous candle.",
    long: "Yesterday Close provides the closing price from the previous time period, useful for comparing current price to recent history.",
    category: "block",
  },

  // Indicator Blocks
  "block-sma": {
    short: "Simple Moving Average: calculates average price over N periods.",
    long: "SMA smooths price data by calculating the arithmetic average over a specified number of candles. Useful for identifying trends and support/resistance levels.",
    category: "block",
  },
  "block-ema": {
    short: "Exponential Moving Average: weighted average giving more importance to recent prices.",
    long: "EMA is similar to SMA but gives more weight to recent price data, making it more responsive to new information. Popular for trend-following strategies.",
    category: "block",
  },
  "block-rsi": {
    short: "Relative Strength Index: momentum oscillator measuring overbought/oversold conditions (0-100).",
    long: "RSI measures the speed and magnitude of price changes. Values above 70 typically indicate overbought conditions, while values below 30 suggest oversold conditions.",
    category: "block",
  },
  "block-macd": {
    short: "MACD: trend-following momentum indicator with three outputs (MACD line, signal line, histogram).",
    long: "MACD shows the relationship between two moving averages. The MACD line, signal line, and histogram help identify trend changes and momentum shifts.",
    category: "block",
  },
  "block-bollinger": {
    short: "Bollinger Bands: volatility bands around a moving average (upper, middle, lower).",
    long: "Bollinger Bands consist of a moving average (middle) with upper and lower bands based on standard deviation. Helps identify volatility and potential breakouts.",
    category: "block",
  },
  "block-atr": {
    short: "Average True Range: measures market volatility over N periods.",
    long: "ATR calculates the average range between high and low prices over a period. Higher ATR indicates higher volatility, useful for position sizing and stop placement.",
    category: "block",
  },

  // Logic Blocks
  "block-compare": {
    short: "Compare two values using operators (>, <, >=, <=).",
    long: "The Compare block evaluates two numeric inputs using a comparison operator. Outputs true/false signal based on whether the condition is met.",
    category: "block",
  },
  "block-crossover": {
    short: "Detect when one value crosses above or below another.",
    long: "Crossover detects when the first input crosses the second input, either from below (crosses above) or from above (crosses below). Common for moving average strategies.",
    category: "block",
  },
  "block-and": {
    short: "Logical AND: outputs true only when both inputs are true.",
    long: "The AND block combines two boolean signals. It outputs true only when both input signals are true simultaneously.",
    category: "block",
  },
  "block-or": {
    short: "Logical OR: outputs true when at least one input is true.",
    long: "The OR block combines two boolean signals. It outputs true when either input signal is true (or both are true).",
    category: "block",
  },
  "block-not": {
    short: "Logical NOT: inverts a boolean signal (true becomes false, false becomes true).",
    long: "The NOT block inverts a boolean signal. Use it to reverse a condition or create exit signals from entry conditions.",
    category: "block",
  },

  // Signal Blocks
  "block-entry_signal": {
    short: "Marks when to open a long position when the input signal is true.",
    long: "The Entry Signal block defines when your strategy should enter a trade. When the input condition becomes true, the strategy opens a long position.",
    category: "block",
  },
  "block-exit_signal": {
    short: "Marks when to close an open position when the input signal is true.",
    long: "The Exit Signal block defines when your strategy should close a trade. When the input condition becomes true, any open position is closed.",
    category: "block",
  },

  // Risk Blocks
  "block-position_size": {
    short: "Fixed position size as percentage of equity (1-100%).",
    long: "Position Size determines how much of your equity to allocate per trade. For example, 10% means each trade uses 10% of your current portfolio value.",
    category: "block",
  },
  "block-take_profit": {
    short: "Exit when profit target is reached. Supports up to 3 ladder levels.",
    long: "Take Profit closes your position (fully or partially) when it reaches specified profit percentages. Use laddered exits to lock in gains incrementally.",
    category: "block",
  },
  "block-stop_loss": {
    short: "Exit when loss reaches threshold percentage from entry price.",
    long: "Stop Loss protects against large losses by closing the position when the price moves against you by a specified percentage.",
    category: "block",
  },
  "block-max_drawdown": {
    short: "Exit when equity drawdown from peak exceeds threshold percentage.",
    long: "Max Drawdown closes positions when your portfolio value falls by a certain percentage from its highest point, helping limit overall risk.",
    category: "block",
  },
  "block-time_exit": {
    short: "Exit after N bars (candles) in position, regardless of profit/loss.",
    long: "Time Exit automatically closes a position after it has been open for a specified number of candles, useful for avoiding overnight or weekend risk.",
    category: "block",
  },
  "block-trailing_stop": {
    short: "Exit when price drops by specified percentage from the highest close since entry.",
    long: "Trailing Stop follows the price higher and triggers an exit if the price falls by a set percentage from the peak. Helps lock in profits while letting winners run.",
    category: "block",
  },

  // Metrics
  "metric-final-balance": {
    short: "Total portfolio value at the end of the backtest period.",
    long: "Final Balance shows your ending portfolio value in USDT after all trades are closed. Starting balance is $10,000.",
    category: "metric",
  },
  "metric-total-return": {
    short: "Percentage gain/loss from initial balance to final balance.",
    long: "Total Return = ((Final Balance - Initial Balance) / Initial Balance) × 100. Shows overall profitability of the strategy.",
    category: "metric",
  },
  "metric-max-drawdown": {
    short: "Largest peak-to-trough decline in portfolio value during the backtest.",
    long: "Max Drawdown measures the worst loss from a peak. Lower is better. Helps assess risk and resilience during downturns.",
    category: "metric",
  },
  "metric-cagr": {
    short: "Compound Annual Growth Rate: annualized return over the backtest period.",
    long: "CAGR normalizes returns to a yearly percentage, allowing comparison across different time periods. Shows what the strategy would return per year if compounded.",
    category: "metric",
  },
  "metric-trades": {
    short: "Total number of trades executed during the backtest.",
    long: "Number of Trades shows how many complete trade cycles (entry and exit) were executed. More trades may provide more statistical confidence.",
    category: "metric",
  },
  "metric-win-rate": {
    short: "Percentage of trades that were profitable.",
    long: "Win Rate = (Winning Trades / Total Trades) × 100. Higher is generally better, but quality matters more than quantity—a few big wins can beat many small wins.",
    category: "metric",
  },
  "metric-benchmark-return": {
    short: "Buy-and-hold return for the same period (comparison baseline).",
    long: "Benchmark Return shows what you would have earned by simply buying and holding the asset. Your strategy should ideally beat this to justify active trading.",
    category: "metric",
  },
  "metric-alpha": {
    short: "Excess return versus benchmark. Positive alpha means outperformance.",
    long: "Alpha measures returns above the benchmark (buy-and-hold). Positive alpha means your strategy adds value beyond passively holding the asset.",
    category: "metric",
  },
  "metric-beta": {
    short: "Correlation to benchmark movement (1.0 = same volatility, <1 = less volatile, >1 = more volatile).",
    long: "Beta measures how much your strategy moves with the market. 1.0 = same as buy-and-hold, <1 = less volatile, >1 = more volatile. Lower beta may indicate better risk-adjusted returns.",
    category: "metric",
  },
  "metric-cost_pct_gross_return": {
    short: "Percentage of gross profit consumed by transaction costs.",
    long: "Cost % of Gross Return shows what portion of your pre-cost profit went to fees, slippage, and spread. N/A when gross return is zero or negative. Lower is better—high cost ratios can eliminate profitability.",
    category: "metric",
  },

  // Parameters
  "param-period": {
    short: "Number of candles to use in calculation.",
    category: "param",
  },
  "param-source": {
    short: "Which OHLC price point to use (open, high, low, close).",
    category: "param",
  },
  "param-operator": {
    short: "Comparison operator to apply (>, <, >=, <=).",
    category: "param",
  },
  "param-direction": {
    short: "Crossover direction to detect (crosses above or crosses below).",
    category: "param",
  },
  "param-value": {
    short: "Fixed numeric value for the constant block.",
    category: "param",
  },
  "param-pct_equity": {
    short: "Percentage of current equity to allocate per trade (1-100%).",
    category: "param",
  },
  "param-stop_pct": {
    short: "Percentage loss from entry price that triggers stop loss exit.",
    category: "param",
  },
  "param-trailing_pct": {
    short: "Percentage drop from peak price that triggers trailing stop exit.",
    category: "param",
  },
  "param-max_dd_pct": {
    short: "Maximum drawdown percentage from equity peak that triggers exit.",
    category: "param",
  },
  "param-bars": {
    short: "Number of candles after which to automatically exit the position.",
    category: "param",
  },
  "param-fast_period": {
    short: "Period for the fast EMA in MACD calculation.",
    category: "param",
  },
  "param-slow_period": {
    short: "Period for the slow EMA in MACD calculation.",
    category: "param",
  },
  "param-signal_period": {
    short: "Period for the signal line (EMA of MACD) in MACD calculation.",
    category: "param",
  },
  "param-stddev": {
    short: "Number of standard deviations for Bollinger Bands width.",
    category: "param",
  },
};

export function getTooltip(id: string): TooltipContent | undefined {
  return TOOLTIP_CONTENT[id];
}

export function blockToGlossaryId(blockType: string): string {
  return `block-${blockType}`;
}

export function metricToGlossaryId(metricKey: string): string {
  return `metric-${metricKey}`;
}

export function paramToGlossaryId(paramKey: string): string {
  return `param-${paramKey}`;
}
