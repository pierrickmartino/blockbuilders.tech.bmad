import { BlockType } from "@/types/canvas";

export interface ParamConfig {
  key: string;
  label: string;
  type: "number" | "select";
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
  // Inspector Panel enhancements
  presets?: number[];        // Period preset values [14, 20, 50, 200]
  quickSwap?: boolean;       // Source quick-swap UI (close/prev_close)
}

export function getParamConfigs(blockType: BlockType): ParamConfig[] {
  switch (blockType) {
    case "price":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
            { value: "prev_close", label: "Previous Close" },
          ],
        },
      ];
    case "constant":
      return [
        {
          key: "value",
          label: "Value",
          type: "number",
          defaultValue: 0,
          min: -1000000,
          max: 1000000,
          step: 0.01,
          help: "Fixed numeric value (-1M to 1M)",
        },
      ];
    case "sma":
    case "ema":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          quickSwap: true,  // Enable quick-swap UI
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
            { value: "prev_close", label: "Previous Close" },
          ],
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 20,
          min: 1,
          max: 500,
          presets: [14, 20, 50, 200],  // Period presets
          help: "Number of candles (1-500)",
        },
      ];
    case "rsi":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          quickSwap: true,  // Enable quick-swap UI
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
            { value: "prev_close", label: "Previous Close" },
          ],
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 14,
          min: 2,
          max: 100,
          presets: [14, 20, 50, 200],  // Period presets
          help: "RSI period (2-100)",
        },
      ];
    case "macd":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          quickSwap: true,  // Enable quick-swap UI
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
            { value: "prev_close", label: "Previous Close" },
          ],
        },
        {
          key: "fast_period",
          label: "Fast Period",
          type: "number",
          defaultValue: 12,
          min: 1,
          max: 50,
        },
        {
          key: "slow_period",
          label: "Slow Period",
          type: "number",
          defaultValue: 26,
          min: 1,
          max: 200,
        },
        {
          key: "signal_period",
          label: "Signal Period",
          type: "number",
          defaultValue: 9,
          min: 1,
          max: 50,
        },
      ];
    case "bollinger":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          quickSwap: true,  // Enable quick-swap UI
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
            { value: "prev_close", label: "Previous Close" },
          ],
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 20,
          min: 1,
          max: 500,
          presets: [14, 20, 50, 200],  // Period presets
        },
        {
          key: "stddev",
          label: "Std Dev",
          type: "number",
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
      ];
    case "atr":
      // ATR uses high/low/close internally - no source selection needed
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 14,
          min: 1,
          max: 500,
          help: "Uses High/Low/Close for True Range",
        },
      ];
    case "stochastic":
      return [
        {
          key: "k_period",
          label: "%K Period",
          type: "number",
          defaultValue: 14,
          min: 1,
          max: 100,
          help: "Fast stochastic period (1-100)",
        },
        {
          key: "d_period",
          label: "%D Period",
          type: "number",
          defaultValue: 3,
          min: 1,
          max: 50,
          help: "Slow stochastic period (1-50)",
        },
        {
          key: "smooth",
          label: "Smoothing",
          type: "number",
          defaultValue: 3,
          min: 1,
          max: 20,
          help: "Smoothing period for %K (1-20)",
        },
      ];
    case "adx":
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 14,
          min: 1,
          max: 100,
          help: "ADX calculation period (1-100)",
        },
      ];
    case "ichimoku":
      return [
        {
          key: "conversion",
          label: "Conversion Period",
          type: "number",
          defaultValue: 9,
          min: 1,
          max: 100,
        },
        {
          key: "base",
          label: "Base Period",
          type: "number",
          defaultValue: 26,
          min: 1,
          max: 200,
        },
        {
          key: "span_b",
          label: "Span B Period",
          type: "number",
          defaultValue: 52,
          min: 1,
          max: 200,
        },
        {
          key: "displacement",
          label: "Displacement",
          type: "number",
          defaultValue: 26,
          min: 1,
          max: 100,
          help: "Forward displacement for cloud spans",
        },
      ];
    case "obv":
      return [];
    case "fibonacci":
      return [
        {
          key: "lookback",
          label: "Lookback Period",
          type: "number",
          defaultValue: 50,
          min: 10,
          max: 500,
          help: "Period to find high/low range (10-500)",
        },
      ];
    case "price_variation_pct":
      return [];
    case "compare":
      return [
        {
          key: "operator",
          label: "Operator",
          type: "select",
          defaultValue: ">",
          options: [
            { value: ">", label: "> (Greater than)" },
            { value: "<", label: "< (Less than)" },
            { value: ">=", label: ">= (Greater or equal)" },
            { value: "<=", label: "<= (Less or equal)" },
          ],
        },
      ];
    case "crossover":
      return [
        {
          key: "direction",
          label: "Direction",
          type: "select",
          defaultValue: "crosses_above",
          options: [
            { value: "crosses_above", label: "Crosses Above" },
            { value: "crosses_below", label: "Crosses Below" },
          ],
        },
      ];
    case "position_size":
      return [
        {
          key: "value",
          label: "Position Size (%)",
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 100,
          help: "% of equity per trade",
        },
      ];
    case "take_profit":
      // Handled by custom renderTakeProfitLevels
      return [];
    case "stop_loss":
      return [
        {
          key: "stop_loss_pct",
          label: "Stop Loss (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when loss reaches this %",
        },
      ];
    case "yesterday_close":
      // No params - zero config
      return [];
    case "max_drawdown":
      return [
        {
          key: "max_drawdown_pct",
          label: "Max Drawdown (%)",
          type: "number",
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when equity drawdown exceeds this %",
        },
      ];
    case "time_exit":
      return [
        {
          key: "bars",
          label: "Bars in Trade",
          type: "number",
          defaultValue: 10,
          min: 1,
          max: 1000,
          step: 1,
          help: "Exit after N bars in position",
        },
      ];
    case "trailing_stop":
      return [
        {
          key: "trail_pct",
          label: "Trail (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when price drops by % from highest close",
        },
      ];
    default:
      return [];
  }
}
