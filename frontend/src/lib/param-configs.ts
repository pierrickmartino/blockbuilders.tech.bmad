import { getCatalogueBlock } from "@/generated/blocks";
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
  advanced?: boolean;        // Hidden under "Advanced" disclosure by default
}

export function getParamConfigs(blockType: BlockType): ParamConfig[] {
  switch (blockType) {
    case "price": {
      const spec = getCatalogueBlock("price")!;
      const sourceParam = spec.params.find((p) => p.name === "source")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") })),
        },
      ];
    }
    case "constant": {
      const spec = getCatalogueBlock("constant")!;
      const valueParam = spec.params.find((p) => p.name === "value")!;
      return [
        {
          key: "value",
          label: "Value",
          type: "number",
          defaultValue: valueParam.default as number,
          min: valueParam.min,
          max: valueParam.max,
          step: 0.01,
          help: `Fixed numeric value (${valueParam.min} to ${valueParam.max})`,
        },
      ];
    }
    case "sma": {
      const smaSpec = getCatalogueBlock("sma")!;
      const periodParam = smaSpec.params.find((p) => p.name === "period")!;
      const sourceParam = smaSpec.params.find((p) => p.name === "source")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          quickSwap: true,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          presets: [14, 20, 50, 200],
          help: `Number of candles (${periodParam.min}-${periodParam.max})`,
        },
      ];
    }
    case "ema": {
      const spec = getCatalogueBlock("ema")!;
      const periodParam = spec.params.find((p) => p.name === "period")!;
      const sourceParam = spec.params.find((p) => p.name === "source")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          quickSwap: true,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") })),
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          presets: [14, 20, 50, 200],
          help: `Number of candles (${periodParam.min}-${periodParam.max})`,
        },
      ];
    }
    case "rsi": {
      const spec = getCatalogueBlock("rsi")!;
      const periodParam = spec.params.find((p) => p.name === "period")!;
      const sourceParam = spec.params.find((p) => p.name === "source")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          quickSwap: true,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") })),
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          presets: [14, 20, 50],
          help: `RSI period (${periodParam.min}-${periodParam.max})`,
        },
      ];
    }
    case "macd": {
      const spec = getCatalogueBlock("macd")!;
      const sourceParam = spec.params.find((p) => p.name === "source")!;
      const fastParam = spec.params.find((p) => p.name === "fast_period")!;
      const slowParam = spec.params.find((p) => p.name === "slow_period")!;
      const signalParam = spec.params.find((p) => p.name === "signal_period")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          quickSwap: true,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") })),
        },
        {
          key: "fast_period",
          label: "Fast Period",
          type: "number",
          defaultValue: fastParam.default as number,
          min: fastParam.min,
          max: fastParam.max,
        },
        {
          key: "slow_period",
          label: "Slow Period",
          type: "number",
          defaultValue: slowParam.default as number,
          min: slowParam.min,
          max: slowParam.max,
        },
        {
          key: "signal_period",
          label: "Signal Period",
          type: "number",
          defaultValue: signalParam.default as number,
          min: signalParam.min,
          max: signalParam.max,
          advanced: true,
        },
      ];
    }
    case "bollinger": {
      const spec = getCatalogueBlock("bollinger")!;
      const sourceParam = spec.params.find((p) => p.name === "source")!;
      const periodParam = spec.params.find((p) => p.name === "period")!;
      const stddevParam = spec.params.find((p) => p.name === "stddev")!;
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: sourceParam.default as string,
          quickSwap: true,
          options: (sourceParam.options ?? []).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") })),
        },
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          presets: [14, 20, 50, 200],
        },
        {
          key: "stddev",
          label: "Std Dev",
          type: "number",
          defaultValue: stddevParam.default as number,
          min: stddevParam.min,
          max: stddevParam.max,
          step: 0.5,
          advanced: true,
        },
      ];
    }
    case "atr": {
      const spec = getCatalogueBlock("atr")!;
      const periodParam = spec.params.find((p) => p.name === "period")!;
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          help: "Uses High/Low/Close for True Range",
        },
      ];
    }
    case "stochastic": {
      const spec = getCatalogueBlock("stochastic")!;
      const kParam = spec.params.find((p) => p.name === "k_period")!;
      const dParam = spec.params.find((p) => p.name === "d_period")!;
      const smoothParam = spec.params.find((p) => p.name === "smooth")!;
      return [
        {
          key: "k_period",
          label: "%K Period",
          type: "number",
          defaultValue: kParam.default as number,
          min: kParam.min,
          max: kParam.max,
          help: `Fast stochastic period (${kParam.min}-${kParam.max})`,
        },
        {
          key: "d_period",
          label: "%D Period",
          type: "number",
          defaultValue: dParam.default as number,
          min: dParam.min,
          max: dParam.max,
          help: `Slow stochastic period (${dParam.min}-${dParam.max})`,
        },
        {
          key: "smooth",
          label: "Smoothing",
          type: "number",
          defaultValue: smoothParam.default as number,
          min: smoothParam.min,
          max: smoothParam.max,
          help: `Smoothing period for %K (${smoothParam.min}-${smoothParam.max})`,
          advanced: true,
        },
      ];
    }
    case "adx": {
      const spec = getCatalogueBlock("adx")!;
      const periodParam = spec.params.find((p) => p.name === "period")!;
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: periodParam.default as number,
          min: periodParam.min,
          max: periodParam.max,
          help: `ADX calculation period (${periodParam.min}-${periodParam.max})`,
        },
      ];
    }
    case "ichimoku": {
      const spec = getCatalogueBlock("ichimoku")!;
      const p = (name: string) => spec.params.find((param) => param.name === name)!;
      return [
        { key: "conversion", label: "Conversion Period", type: "number", defaultValue: p("conversion").default as number, min: p("conversion").min, max: p("conversion").max },
        { key: "base", label: "Base Period", type: "number", defaultValue: p("base").default as number, min: p("base").min, max: p("base").max },
        { key: "span_b", label: "Span B Period", type: "number", defaultValue: p("span_b").default as number, min: p("span_b").min, max: p("span_b").max, advanced: true },
        { key: "displacement", label: "Displacement", type: "number", defaultValue: p("displacement").default as number, min: p("displacement").min, max: p("displacement").max, help: "Forward displacement for cloud spans", advanced: true },
      ];
    }
    case "obv":
      return [];
    case "fibonacci": {
      const spec = getCatalogueBlock("fibonacci")!;
      const lookbackParam = spec.params.find((p) => p.name === "lookback")!;
      return [
        {
          key: "lookback",
          label: "Lookback Period",
          type: "number",
          defaultValue: lookbackParam.default as number,
          min: lookbackParam.min,
          max: lookbackParam.max,
          help: `Period to find high/low range (${lookbackParam.min}-${lookbackParam.max})`,
        },
      ];
    }
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
