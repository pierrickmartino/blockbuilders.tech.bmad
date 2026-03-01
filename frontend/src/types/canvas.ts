// Block categories
export type BlockCategory = "input" | "indicator" | "logic" | "signal" | "risk";

// Block types by category
export type InputBlockType = "price" | "volume" | "constant" | "yesterday_close" | "price_variation_pct";
export type IndicatorBlockType = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "atr" | "stochastic" | "adx" | "ichimoku" | "obv" | "fibonacci";
export const ESSENTIAL_INDICATORS: readonly IndicatorBlockType[] = ["sma", "ema", "rsi", "bollinger", "macd"];

/** Plain-English labels for essential indicators (Essentials mode only). */
export const PLAIN_LABEL_MAP: Partial<Record<IndicatorBlockType, string>> = {
  sma: "Moving Average",
  ema: "Exponential Moving Average",
  rsi: "Momentum Indicator",
  bollinger: "Volatility Bands",
  macd: "Trend & Momentum",
};
export type LogicBlockType = "compare" | "crossover" | "and" | "or" | "not";
export type SignalBlockType = "entry_signal" | "exit_signal";
export type RiskBlockType = "position_size" | "take_profit" | "stop_loss" | "max_drawdown" | "time_exit" | "trailing_stop";

export type BlockType =
  | InputBlockType
  | IndicatorBlockType
  | LogicBlockType
  | SignalBlockType
  | RiskBlockType
  | "note";

// Parameter types for each block
export interface PriceParams {
  source: "open" | "high" | "low" | "close";
}

export type VolumeParams = Record<string, never>;

export interface ConstantParams {
  value: number;
}

// Price source type for indicators
export type PriceSource = "open" | "high" | "low" | "close" | "prev_close";

export interface SmaParams {
  source: PriceSource;
  period: number;
}

export interface EmaParams {
  source: PriceSource;
  period: number;
}

export interface RsiParams {
  source: PriceSource;
  period: number;
}

export interface MacdParams {
  source: PriceSource;
  fast_period: number;
  slow_period: number;
  signal_period: number;
}

export interface BollingerParams {
  source: PriceSource;
  period: number;
  stddev: number;
}

export interface AtrParams {
  period: number;
  // ATR uses high/low/close internally, no source selection needed
}

export interface StochasticParams {
  k_period: number;
  d_period: number;
  smooth: number;
}

export interface AdxParams {
  period: number;
}

export interface IchimokuParams {
  conversion: number;
  base: number;
  span_b: number;
  displacement: number;
}

export type ObvParams = Record<string, never>;

export interface FibonacciParams {
  lookback: number;
}

export type PriceVariationPctParams = Record<string, never>;

export interface CompareParams {
  operator: ">" | "<" | ">=" | "<=";
}

export interface CrossoverParams {
  direction: "crosses_above" | "crosses_below";
}

export type AndParams = Record<string, never>;
export type OrParams = Record<string, never>;
export type NotParams = Record<string, never>;

export type EntrySignalParams = Record<string, never>;
export type ExitSignalParams = Record<string, never>;

export interface PositionSizeParams {
  type: "percentage_of_equity";
  value: number;
}

export interface TakeProfitLevel {
  profit_pct: number;
  close_pct: number;
}

export interface TakeProfitParams {
  levels: TakeProfitLevel[];
}

export interface StopLossParams {
  stop_loss_pct: number;
}

export type YesterdayCloseParams = Record<string, never>;

export interface MaxDrawdownParams {
  max_drawdown_pct: number;
}

export interface TimeExitParams {
  bars: number;
}

export interface TrailingStopParams {
  trail_pct: number;
}

// Union of all param types
export type BlockParams =
  | PriceParams
  | VolumeParams
  | ConstantParams
  | SmaParams
  | EmaParams
  | RsiParams
  | MacdParams
  | BollingerParams
  | AtrParams
  | StochasticParams
  | AdxParams
  | IchimokuParams
  | ObvParams
  | FibonacciParams
  | PriceVariationPctParams
  | CompareParams
  | CrossoverParams
  | AndParams
  | OrParams
  | NotParams
  | EntrySignalParams
  | ExitSignalParams
  | PositionSizeParams
  | TakeProfitParams
  | StopLossParams
  | YesterdayCloseParams
  | MaxDrawdownParams
  | TimeExitParams
  | TrailingStopParams;

// Block definition (stored in JSON)
export interface Block {
  id: string;
  type: BlockType;
  label: string;
  position: { x: number; y: number };
  params: Record<string, unknown>;
}

// Connection definition (stored in JSON)
export interface Connection {
  from_port: { block_id: string; port: string };
  to_port: { block_id: string; port: string };
}

// Note definition (stored in metadata)
export interface Note {
  id: string;
  text: string;
  position: { x: number; y: number };
  attached_block_id?: string;
  offset?: { x: number; y: number };
}

// Full strategy definition (stored in strategy_versions.definition_json)
export interface StrategyDefinition {
  blocks: Block[];
  connections: Connection[];
  meta: { version: number };
  metadata?: {
    notes?: Note[];
  };
}

// Validation types
export interface ValidationError {
  block_id?: string;
  code: string;
  message: string;
  user_message?: string;
  help_link?: string;
}

export interface ValidationResponse {
  status: "valid" | "invalid";
  errors: ValidationError[];
}

// Block metadata for palette and registration
export interface BlockMeta {
  type: BlockType;
  category: BlockCategory;
  label: string;
  description: string;
  inputs: string[];
  outputs: string[];
  defaultParams: Record<string, unknown>;
}

// Block registry with all available blocks
export const BLOCK_REGISTRY: BlockMeta[] = [
  // Inputs
  {
    type: "price",
    category: "input",
    label: "Price",
    description: "OHLCV price data",
    inputs: [],
    outputs: ["output"],
    defaultParams: { source: "close" },
  },
  {
    type: "volume",
    category: "input",
    label: "Volume",
    description: "Trading volume",
    inputs: [],
    outputs: ["output"],
    defaultParams: {},
  },
  {
    type: "constant",
    category: "input",
    label: "Constant",
    description: "Fixed numeric value",
    inputs: [],
    outputs: ["output"],
    defaultParams: { value: 0 },
  },
  {
    type: "yesterday_close",
    category: "input",
    label: "Yesterday Close",
    description: "Previous candle close price",
    inputs: [],
    outputs: ["output"],
    defaultParams: {},
  },
  {
    type: "price_variation_pct",
    category: "input",
    label: "Price Variation %",
    description: "% change from previous close",
    inputs: [],
    outputs: ["output"],
    defaultParams: {},
  },
  // Indicators
  {
    type: "sma",
    category: "indicator",
    label: "SMA",
    description: "Simple Moving Average",
    inputs: [],
    outputs: ["output"],
    defaultParams: { source: "close", period: 20 },
  },
  {
    type: "ema",
    category: "indicator",
    label: "EMA",
    description: "Exponential Moving Average",
    inputs: [],
    outputs: ["output"],
    defaultParams: { source: "close", period: 20 },
  },
  {
    type: "rsi",
    category: "indicator",
    label: "RSI",
    description: "Relative Strength Index",
    inputs: [],
    outputs: ["output"],
    defaultParams: { source: "close", period: 14 },
  },
  {
    type: "macd",
    category: "indicator",
    label: "MACD",
    description: "Moving Average Convergence Divergence",
    inputs: [],
    outputs: ["macd", "signal", "histogram"],
    defaultParams: { source: "close", fast_period: 12, slow_period: 26, signal_period: 9 },
  },
  {
    type: "bollinger",
    category: "indicator",
    label: "Bollinger Bands",
    description: "Bollinger Bands indicator",
    inputs: [],
    outputs: ["upper", "middle", "lower"],
    defaultParams: { source: "close", period: 20, stddev: 2 },
  },
  {
    type: "atr",
    category: "indicator",
    label: "ATR",
    description: "Average True Range (uses High/Low/Close)",
    inputs: [],
    outputs: ["output"],
    defaultParams: { period: 14 },
  },
  {
    type: "stochastic",
    category: "indicator",
    label: "Stochastic",
    description: "Stochastic Oscillator (%K, %D)",
    inputs: [],
    outputs: ["k", "d"],
    defaultParams: { k_period: 14, d_period: 3, smooth: 3 },
  },
  {
    type: "adx",
    category: "indicator",
    label: "ADX",
    description: "Average Directional Index",
    inputs: [],
    outputs: ["adx", "plus_di", "minus_di"],
    defaultParams: { period: 14 },
  },
  {
    type: "ichimoku",
    category: "indicator",
    label: "Ichimoku Cloud",
    description: "Ichimoku Cloud indicator",
    inputs: [],
    outputs: ["conversion", "base", "span_a", "span_b"],
    defaultParams: { conversion: 9, base: 26, span_b: 52, displacement: 26 },
  },
  {
    type: "obv",
    category: "indicator",
    label: "OBV",
    description: "On-Balance Volume",
    inputs: [],
    outputs: ["output"],
    defaultParams: {},
  },
  {
    type: "fibonacci",
    category: "indicator",
    label: "Fibonacci",
    description: "Fibonacci Retracement Levels",
    inputs: [],
    outputs: ["level_236", "level_382", "level_5", "level_618", "level_786"],
    defaultParams: { lookback: 50 },
  },
  // Logic
  {
    type: "compare",
    category: "logic",
    label: "Compare",
    description: "Compare two values",
    inputs: ["left", "right"],
    outputs: ["output"],
    defaultParams: { operator: ">" },
  },
  {
    type: "crossover",
    category: "logic",
    label: "Crossover",
    description: "Detect crossover between two series",
    inputs: ["fast", "slow"],
    outputs: ["output"],
    defaultParams: { direction: "crosses_above" },
  },
  {
    type: "and",
    category: "logic",
    label: "AND",
    description: "Logical AND of two signals",
    inputs: ["a", "b"],
    outputs: ["output"],
    defaultParams: {},
  },
  {
    type: "or",
    category: "logic",
    label: "OR",
    description: "Logical OR of two signals",
    inputs: ["a", "b"],
    outputs: ["output"],
    defaultParams: {},
  },
  {
    type: "not",
    category: "logic",
    label: "NOT",
    description: "Logical NOT of a signal",
    inputs: ["input"],
    outputs: ["output"],
    defaultParams: {},
  },
  // Signals
  {
    type: "entry_signal",
    category: "signal",
    label: "Entry Signal",
    description: "Marks when to open a long position",
    inputs: ["signal"],
    outputs: [],
    defaultParams: {},
  },
  {
    type: "exit_signal",
    category: "signal",
    label: "Exit Signal",
    description: "Marks when to close a position",
    inputs: ["signal"],
    outputs: [],
    defaultParams: {},
  },
  // Risk
  {
    type: "position_size",
    category: "risk",
    label: "Position Size",
    description: "Fixed position size as % of equity",
    inputs: [],
    outputs: [],
    defaultParams: { type: "percentage_of_equity", value: 5 },
  },
  {
    type: "take_profit",
    category: "risk",
    label: "Take Profit",
    description: "Exit when profit reaches target % (supports 1-3 ladder levels)",
    inputs: [],
    outputs: [],
    defaultParams: { levels: [{ profit_pct: 10, close_pct: 100 }] },
  },
  {
    type: "stop_loss",
    category: "risk",
    label: "Stop Loss",
    description: "Exit when loss reaches threshold %",
    inputs: [],
    outputs: [],
    defaultParams: { stop_loss_pct: 5 },
  },
  {
    type: "max_drawdown",
    category: "risk",
    label: "Max Drawdown",
    description: "Exit when equity drawdown exceeds threshold %",
    inputs: [],
    outputs: [],
    defaultParams: { max_drawdown_pct: 10 },
  },
  {
    type: "time_exit",
    category: "risk",
    label: "Time Exit",
    description: "Exit after N bars in position",
    inputs: [],
    outputs: [],
    defaultParams: { bars: 10 },
  },
  {
    type: "trailing_stop",
    category: "risk",
    label: "Trailing Stop",
    description: "Exit when price drops by % from highest close",
    inputs: [],
    outputs: [],
    defaultParams: { trail_pct: 5 },
  },
];

// Helper to get block meta by type
export function getBlockMeta(type: BlockType): BlockMeta | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}

// Helper to get blocks by category
export function getBlocksByCategory(category: BlockCategory): BlockMeta[] {
  return BLOCK_REGISTRY.filter((b) => b.category === category);
}

// Strategy explanation result
export interface ExplanationResult {
  status: "valid" | "fallback";
  entry: string;
  exit: string;
  risk?: string;
}
