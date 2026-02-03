/**
 * Generate a one-line summary for a canvas node in compact mode.
 * Summaries are deterministic, concise (<40 chars ideal), and follow consistent patterns.
 */
export function generateNodeSummary(
  nodeType: string,
  params: Record<string, unknown>,
  label: string
): string {
  // Safely extract common parameters
  const source = params.source ? String(params.source) : "close";
  const period = params.period ? Number(params.period) : undefined;
  const threshold = params.threshold ? Number(params.threshold) : undefined;
  const percent = params.percent ? Number(params.percent) : undefined;
  const trailPct = params.trail_pct !== undefined ? Number(params.trail_pct) : undefined;
  const stopLossPct =
    params.stop_loss_pct !== undefined ? Number(params.stop_loss_pct) : undefined;
  const maxDrawdownPct =
    params.max_drawdown_pct !== undefined ? Number(params.max_drawdown_pct) : undefined;
  const operator = params.operator ? String(params.operator) : undefined;
  const direction = params.direction ? String(params.direction) : undefined;
  const value = params.value ? Number(params.value) : undefined;

  switch (nodeType) {
    // Moving Averages
    case "sma":
      return `SMA (${period || 20}, ${source})`;
    case "ema":
      return `EMA (${period || 24}, ${source})`;

    // Momentum Indicators
    case "rsi":
      return `RSI (${period || 14}, ${source})`;
    case "macd": {
      const fast = params.fast_period ? Number(params.fast_period) : 12;
      const slow = params.slow_period ? Number(params.slow_period) : 26;
      const signal = params.signal_period ? Number(params.signal_period) : 9;
      return `MACD (${fast}/${slow}/${signal}, ${source})`;
    }
    case "stochastic": {
      const k = params.k_period ? Number(params.k_period) : 14;
      const d = params.d_period ? Number(params.d_period) : 3;
      return `Stochastic (${k}, ${d})`;
    }

    // Volatility Indicators
    case "bollinger": {
      const stddev = params.stddev ? Number(params.stddev) : 2;
      return `Bollinger (${period || 20}, ${stddev}, ${source})`;
    }
    case "atr":
      return `ATR (${period || 14})`;

    // Trend Indicators
    case "adx":
      return `ADX (${period || 14})`;
    case "ichimoku":
      return `Ichimoku`;
    case "fibonacci":
      return `Fibonacci`;

    // Volume Indicators
    case "obv":
      return `OBV`;

    // Price & Volume Sources
    case "price":
      return `Price: ${source}`;
    case "volume":
      return `Volume`;
    case "yesterday_close":
      return `Yesterday Close`;
    case "price_variation_pct":
      return `Price Variation %`;

    // Constants & Values
    case "constant":
      return `Constant: ${value || 0}`;

    // Comparison Logic
    case "compare": {
      const op = operator || ">";
      return `Compare: ${op}`;
    }

    // Crossover Logic
    case "crossover":
    case "cross_over": {
      const dirMap: Record<string, string> = {
        crosses_above: "crosses above",
        crosses_below: "crosses below",
        above: "above",
        below: "below",
      };
      const dir = direction ? dirMap[direction] ?? direction.replace("_", " ") : "crosses above";
      return `Crossover: ${dir}`;
    }

    // Boolean Logic
    case "and":
      return `AND`;
    case "or":
      return `OR`;
    case "not":
      return `NOT`;

    // Signal Blocks
    case "entry_signal":
      return `Entry`;
    case "exit_signal":
      return `Exit`;

    // Risk Management
    case "stop_loss":
      return `Stop Loss: ${percent !== undefined ? percent + "%" : stopLossPct !== undefined ? stopLossPct + "%" : threshold !== undefined ? threshold : ""}`;
    case "take_profit": {
      const levels = params.levels as Array<{ percent: number }> | undefined;
      if (levels && levels.length > 0) {
        return `Take Profit: ${levels.length} level${levels.length > 1 ? "s" : ""}`;
      }
      return `Take Profit`;
    }
    case "trailing_stop":
      return `Trailing Stop: ${trailPct !== undefined ? trailPct + "%" : percent !== undefined ? percent + "%" : ""}`;
    case "position_size":
      return `Position: ${percent || 100}%`;
    case "max_drawdown":
      return `Max Drawdown: ${maxDrawdownPct ?? percent ?? 20}%`;

    // Time-based Exit
    case "time_exit": {
      const bars = params.bars ? Number(params.bars) : undefined;
      return `Time Exit: ${bars !== undefined ? bars + " bars" : ""}`;
    }

    // Notes
    case "note": {
      const text = params.text ? String(params.text) : "";
      return text.length > 30 ? text.substring(0, 27) + "..." : text || "Note";
    }

    // Fallback: use label
    default:
      return label;
  }
}
