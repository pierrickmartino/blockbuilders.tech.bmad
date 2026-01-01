// Block categories
export type BlockCategory = "input" | "indicator" | "logic" | "signal" | "risk";

// Block types by category
export type InputBlockType = "price" | "volume" | "constant" | "yesterday_close";
export type IndicatorBlockType = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "atr";
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

export interface SmaParams {
  period: number;
}

export interface EmaParams {
  period: number;
}

export interface RsiParams {
  period: number;
}

export interface MacdParams {
  fast_period: number;
  slow_period: number;
  signal_period: number;
}

export interface BollingerParams {
  period: number;
  stddev: number;
}

export interface AtrParams {
  period: number;
}

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
  // Indicators
  {
    type: "sma",
    category: "indicator",
    label: "SMA",
    description: "Simple Moving Average",
    inputs: ["input"],
    outputs: ["output"],
    defaultParams: { period: 20 },
  },
  {
    type: "ema",
    category: "indicator",
    label: "EMA",
    description: "Exponential Moving Average",
    inputs: ["input"],
    outputs: ["output"],
    defaultParams: { period: 20 },
  },
  {
    type: "rsi",
    category: "indicator",
    label: "RSI",
    description: "Relative Strength Index",
    inputs: ["input"],
    outputs: ["output"],
    defaultParams: { period: 14 },
  },
  {
    type: "macd",
    category: "indicator",
    label: "MACD",
    description: "Moving Average Convergence Divergence",
    inputs: ["input"],
    outputs: ["macd", "signal", "histogram"],
    defaultParams: { fast_period: 12, slow_period: 26, signal_period: 9 },
  },
  {
    type: "bollinger",
    category: "indicator",
    label: "Bollinger Bands",
    description: "Bollinger Bands indicator",
    inputs: ["input"],
    outputs: ["upper", "middle", "lower"],
    defaultParams: { period: 20, stddev: 2 },
  },
  {
    type: "atr",
    category: "indicator",
    label: "ATR",
    description: "Average True Range",
    inputs: ["input"],
    outputs: ["output"],
    defaultParams: { period: 14 },
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
