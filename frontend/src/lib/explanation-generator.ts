import type {
  Block,
  Connection,
  StrategyDefinition,
  ExplanationResult,
  RiskBlockType,
  PriceParams,
  ConstantParams,
  SmaParams,
  EmaParams,
  RsiParams,
  MacdParams,
  BollingerParams,
  AtrParams,
  CompareParams,
  CrossoverParams,
  PositionSizeParams,
  TakeProfitParams,
  StopLossParams,
  MaxDrawdownParams,
  TimeExitParams,
  TrailingStopParams,
} from "@/types/canvas";

// Risk blocks that count as exit conditions
const EXIT_RISK_TYPES: RiskBlockType[] = [
  "time_exit",
  "trailing_stop",
  "stop_loss",
  "take_profit",
  "max_drawdown",
];

// Operator mapping for compare blocks
const OPERATOR_MAP: Record<string, string> = {
  ">": "above",
  "<": "below",
  ">=": "at or above",
  "<=": "at or below",
};

/**
 * Generate a plain-English explanation of a strategy from its definition
 */
export function generateExplanation(
  definition: StrategyDefinition
): ExplanationResult {
  // Build lookup maps
  const blocksMap = new Map<string, Block>();
  definition.blocks.forEach((block) => {
    blocksMap.set(block.id, block);
  });

  const incomingConnections = new Map<string, Connection[]>();
  definition.connections.forEach((conn) => {
    const existing = incomingConnections.get(conn.to_port.block_id) || [];
    incomingConnections.set(conn.to_port.block_id, [...existing, conn]);
  });

  // Find entry and exit blocks
  const entryBlocks = definition.blocks.filter(
    (b) => b.type === "entry_signal"
  );
  const exitSignalBlocks = definition.blocks.filter(
    (b) => b.type === "exit_signal"
  );
  const exitRiskBlocks = definition.blocks.filter((b) =>
    EXIT_RISK_TYPES.includes(b.type as RiskBlockType)
  );

  // Check for minimum required blocks
  if (entryBlocks.length === 0 || (exitSignalBlocks.length === 0 && exitRiskBlocks.length === 0)) {
    return {
      status: "fallback",
      entry: "This strategy can't be summarized yet. Add entry/exit blocks.",
      exit: "",
    };
  }

  // Generate entry phrase
  const entryPhrases = entryBlocks.map((block) => {
    const visited = new Set<string>();
    return findInputPhrase(
      block.id,
      "signal",
      incomingConnections,
      blocksMap,
      visited
    );
  });
  const entryPhrase = joinPhrases(entryPhrases, " or ");
  const entrySentence = `This strategy enters long when ${entryPhrase}.`;

  // Generate exit phrase
  const exitPhrases: string[] = [];

  // Add exit signal phrases
  exitSignalBlocks.forEach((block) => {
    const visited = new Set<string>();
    const phrase = findInputPhrase(
      block.id,
      "signal",
      incomingConnections,
      blocksMap,
      visited
    );
    exitPhrases.push(phrase);
  });

  // Add risk block phrases
  exitRiskBlocks.forEach((block) => {
    const phrase = formatRiskBlock(block.type as RiskBlockType, block.params);
    exitPhrases.push(phrase);
  });

  const exitPhrase = joinPhrases(exitPhrases, " or ");
  const exitSentence = `It exits when ${exitPhrase}.`;

  // Generate risk management phrase (position_size only)
  const positionSizeBlock = definition.blocks.find(
    (b) => b.type === "position_size"
  );
  let riskSentence: string | undefined;
  if (positionSizeBlock) {
    const params = positionSizeBlock.params as unknown as PositionSizeParams;
    riskSentence = `Risk management: position size is ${params.value}% of equity.`;
  }

  return {
    status: "valid",
    entry: entrySentence,
    exit: exitSentence,
    risk: riskSentence,
  };
}

/**
 * Find and resolve the phrase for an input port
 */
function findInputPhrase(
  blockId: string,
  portName: string,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const conns = incomingConnections.get(blockId) || [];
  const conn = conns.find((c) => c.to_port.port === portName);

  if (!conn) {
    return "an unspecified condition";
  }

  const sourceBlock = blocksMap.get(conn.from_port.block_id);
  if (!sourceBlock) {
    return "an unspecified condition";
  }

  return resolveBlockPhrase(
    sourceBlock,
    conn.from_port.port,
    incomingConnections,
    blocksMap,
    visited
  );
}

/**
 * Recursively resolve a block into a phrase
 */
function resolveBlockPhrase(
  block: Block,
  portName: string,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  // Prevent infinite loops
  if (visited.has(block.id)) {
    return "recursive condition";
  }
  visited.add(block.id);

  try {
    switch (block.type) {
      // Input blocks
      case "price":
        return formatPriceBlock(block.params as unknown as PriceParams);
      case "volume":
        return "volume";
      case "constant":
        return String((block.params as unknown as ConstantParams).value);
      case "yesterday_close":
        return "yesterday's close";

      // Indicator blocks
      case "sma":
        return formatSmaBlock(block.params as unknown as SmaParams);
      case "ema":
        return formatEmaBlock(block.params as unknown as EmaParams);
      case "rsi":
        return formatRsiBlock(block.params as unknown as RsiParams);
      case "macd":
        return formatMacdBlock(block.params as unknown as MacdParams, portName);
      case "bollinger":
        return formatBollingerBlock(block.params as unknown as BollingerParams, portName);
      case "atr":
        return formatAtrBlock(block.params as unknown as AtrParams);

      // Logic blocks
      case "compare":
        return formatCompareBlock(
          block,
          incomingConnections,
          blocksMap,
          visited
        );
      case "crossover":
        return formatCrossoverBlock(
          block,
          incomingConnections,
          blocksMap,
          visited
        );
      case "and":
        return formatAndBlock(block, incomingConnections, blocksMap, visited);
      case "or":
        return formatOrBlock(block, incomingConnections, blocksMap, visited);
      case "not":
        return formatNotBlock(block, incomingConnections, blocksMap, visited);

      default:
        return "an unspecified condition";
    }
  } finally {
    visited.delete(block.id);
  }
}

/**
 * Format price block
 */
function formatPriceBlock(params: PriceParams): string {
  return params.source === "close" ? "price" : `${params.source} price`;
}

/**
 * Format SMA block
 */
function formatSmaBlock(params: SmaParams): string {
  return `the ${params.period}-day SMA`;
}

/**
 * Format EMA block
 */
function formatEmaBlock(params: EmaParams): string {
  return `the ${params.period}-day EMA`;
}

/**
 * Format RSI block
 */
function formatRsiBlock(params: RsiParams): string {
  return `RSI(${params.period})`;
}

/**
 * Format MACD block (port-aware)
 */
function formatMacdBlock(params: MacdParams, portName: string): string {
  const { fast_period, slow_period, signal_period } = params;
  const base = `${fast_period},${slow_period},${signal_period}`;

  if (portName === "signal") {
    return `MACD signal(${base})`;
  } else if (portName === "histogram") {
    return `MACD histogram(${base})`;
  }
  return `MACD(${base})`;
}

/**
 * Format Bollinger Bands block (port-aware)
 */
function formatBollingerBlock(params: BollingerParams, portName: string): string {
  const { period } = params;

  if (portName === "upper") {
    return `upper Bollinger Band (${period})`;
  } else if (portName === "lower") {
    return `lower Bollinger Band (${period})`;
  } else if (portName === "middle") {
    return `middle Bollinger Band (${period})`;
  }
  return `Bollinger Bands (${period})`;
}

/**
 * Format ATR block
 */
function formatAtrBlock(params: AtrParams): string {
  return `ATR(${params.period})`;
}

/**
 * Format compare block
 */
function formatCompareBlock(
  block: Block,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const params = block.params as unknown as CompareParams;
  const left = findInputPhrase(block.id, "left", incomingConnections, blocksMap, visited);
  const right = findInputPhrase(block.id, "right", incomingConnections, blocksMap, visited);
  const operatorText = OPERATOR_MAP[params.operator] || params.operator;

  return `${left} is ${operatorText} ${right}`;
}

/**
 * Format crossover block
 */
function formatCrossoverBlock(
  block: Block,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const params = block.params as unknown as CrossoverParams;
  const fast = findInputPhrase(block.id, "fast", incomingConnections, blocksMap, visited);
  const slow = findInputPhrase(block.id, "slow", incomingConnections, blocksMap, visited);

  const direction = params.direction === "crosses_above" ? "crosses above" : "crosses below";
  return `${fast} ${direction} ${slow}`;
}

/**
 * Format AND block
 */
function formatAndBlock(
  block: Block,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const a = findInputPhrase(block.id, "a", incomingConnections, blocksMap, visited);
  const b = findInputPhrase(block.id, "b", incomingConnections, blocksMap, visited);

  return `${a} and ${b}`;
}

/**
 * Format OR block
 */
function formatOrBlock(
  block: Block,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const a = findInputPhrase(block.id, "a", incomingConnections, blocksMap, visited);
  const b = findInputPhrase(block.id, "b", incomingConnections, blocksMap, visited);

  return `${a} or ${b}`;
}

/**
 * Format NOT block
 */
function formatNotBlock(
  block: Block,
  incomingConnections: Map<string, Connection[]>,
  blocksMap: Map<string, Block>,
  visited: Set<string>
): string {
  const input = findInputPhrase(block.id, "input", incomingConnections, blocksMap, visited);

  return `not (${input})`;
}

/**
 * Format risk management blocks
 */
function formatRiskBlock(type: RiskBlockType, params: Record<string, unknown>): string {
  switch (type) {
    case "take_profit": {
      const tpParams = params as unknown as TakeProfitParams;
      if (tpParams.levels.length === 1) {
        return `take profit at ${tpParams.levels[0].profit_pct}%`;
      }
      const pcts = tpParams.levels.map((l) => l.profit_pct).join(", ");
      return `take profit in ${tpParams.levels.length}-step ladder at ${pcts}%`;
    }
    case "stop_loss": {
      const slParams = params as unknown as StopLossParams;
      return `a stop loss of ${slParams.stop_loss_pct}% is hit`;
    }
    case "max_drawdown": {
      const mdParams = params as unknown as MaxDrawdownParams;
      return `max drawdown of ${mdParams.max_drawdown_pct}% is reached`;
    }
    case "time_exit": {
      const teParams = params as unknown as TimeExitParams;
      return `after ${teParams.bars} bars in a trade`;
    }
    case "trailing_stop": {
      const tsParams = params as unknown as TrailingStopParams;
      return `a trailing stop of ${tsParams.trail_pct}% is hit`;
    }
    default:
      return "an unspecified exit condition";
  }
}

/**
 * Join multiple phrases with a conjunction
 */
function joinPhrases(phrases: string[], conjunction: string): string {
  if (phrases.length === 0) {
    return "an unspecified condition";
  }
  if (phrases.length === 1) {
    return phrases[0];
  }
  if (phrases.length === 2) {
    return `${phrases[0]} ${conjunction} ${phrases[1]}`;
  }

  // For 3+ phrases, use commas and final conjunction
  const allButLast = phrases.slice(0, -1).join(", ");
  const last = phrases[phrases.length - 1];
  return `${allButLast}, ${conjunction} ${last}`;
}
