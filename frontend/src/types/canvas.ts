import { getCatalogueBlock } from "@/generated/blocks";

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
// Catalogue-managed blocks are derived from generated/blocks.ts
function _catalogueEntry(type: string, description: string): BlockMeta {
  const spec = getCatalogueBlock(type)!;
  return {
    type: type as BlockType,
    category: spec.category as BlockCategory,
    label: spec.label,
    description,
    inputs: spec.inputs.map((p) => p.name),
    outputs: spec.outputs.map((p) => p.name),
    defaultParams: Object.fromEntries(spec.params.map((p) => [p.name, p.default])),
  };
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  // Inputs — catalogue-managed
  _catalogueEntry("price", "OHLCV price data"),
  _catalogueEntry("volume", "Trading volume"),
  _catalogueEntry("constant", "Fixed numeric value"),
  _catalogueEntry("yesterday_close", "Previous candle close price"),
  // Indicators — catalogue-managed
  _catalogueEntry("sma", "Simple Moving Average"),
  _catalogueEntry("ema", "Exponential Moving Average"),
  _catalogueEntry("rsi", "Relative Strength Index"),
  _catalogueEntry("macd", "Moving Average Convergence Divergence"),
  _catalogueEntry("bollinger", "Bollinger Bands indicator"),
  _catalogueEntry("atr", "Average True Range (uses High/Low/Close)"),
  _catalogueEntry("stochastic", "Stochastic Oscillator (%K, %D)"),
  _catalogueEntry("adx", "Average Directional Index"),
  _catalogueEntry("ichimoku", "Ichimoku Cloud indicator"),
  _catalogueEntry("obv", "On-Balance Volume"),
  _catalogueEntry("fibonacci", "Fibonacci Retracement Levels"),
  _catalogueEntry("price_variation_pct", "% change from previous close"),
  // Logic — catalogue-managed
  _catalogueEntry("compare", "Compare two values"),
  _catalogueEntry("crossover", "Detect crossover between two series"),
  _catalogueEntry("and", "Logical AND of two signals"),
  _catalogueEntry("or", "Logical OR of two signals"),
  _catalogueEntry("not", "Logical NOT of a signal"),
  // Signals — catalogue-managed
  _catalogueEntry("entry_signal", "Marks when to open a long position"),
  _catalogueEntry("exit_signal", "Marks when to close a position"),
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
