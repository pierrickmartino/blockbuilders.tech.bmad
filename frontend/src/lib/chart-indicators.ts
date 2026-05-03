import { BLOCK_REGISTRY } from "@/types/canvas";
import type { ChartIndicatorOption } from "@/types/chart";

// Maps the canvas indicator block type → backend chart-data indicator key.
// Most are 1:1; `fibonacci` is shortened to `fib` server-side.
const KEY_MAP: Record<string, string> = {
  sma: "sma",
  ema: "ema",
  rsi: "rsi",
  macd: "macd",
  bollinger: "bollinger",
  atr: "atr",
  stochastic: "stochastic",
  adx: "adx",
  ichimoku: "ichimoku",
  obv: "obv",
  fibonacci: "fib",
};

const OSCILLATOR_KEYS = new Set(["rsi", "atr", "macd", "stochastic", "adx", "obv"]);

const PERIOD_PARAM_BY_KEY: Record<string, string> = {
  sma: "period",
  ema: "period",
  rsi: "period",
  atr: "period",
  bollinger: "period",
  stochastic: "k_period",
  adx: "period",
  fibonacci: "lookback",
};

/**
 * Build the indicator catalog for the chart side panel from the canvas
 * indicator registry — keeps the selector aligned with strategy blocks (TC-04).
 */
export function buildChartIndicatorCatalog(): ChartIndicatorOption[] {
  return BLOCK_REGISTRY.filter((b) => b.category === "indicator").map((b) => {
    const periodParam = PERIOD_PARAM_BY_KEY[b.type];
    const defaultPeriod = periodParam
      ? (b.defaultParams[periodParam] as number | undefined)
      : undefined;
    return {
      key: KEY_MAP[b.type] ?? b.type,
      label: b.label,
      defaultPeriod,
      pane: OSCILLATOR_KEYS.has(KEY_MAP[b.type] ?? b.type) ? "oscillator" : "price",
    };
  });
}

/** Build the `indicators` query string from the user's selection. */
export function serializeIndicators(
  selection: ReadonlyArray<{ key: string; period?: number }>,
): string {
  return selection
    .map((s) => (s.period != null ? `${s.key}:${s.period}` : s.key))
    .join(",");
}
