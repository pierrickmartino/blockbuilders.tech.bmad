import type { StrategyDefinition, Block, Connection } from "@/types/canvas";

export interface WizardAnswers {
  signalType: "ma_crossover" | "rsi_reversion";
  maType?: "sma" | "ema";
  maFastPeriod?: number;
  maSlowPeriod?: number;
  rsiPeriod?: number;
  exitRule: "opposite_signal" | "rsi_neutral";
  useStopLoss: boolean;
  stopLossPercent?: number;
  useTakeProfit: boolean;
  takeProfitPercent?: number;
}

export function generateTemplate(answers: WizardAnswers): StrategyDefinition {
  if (answers.signalType === "ma_crossover") {
    return generateMACrossoverTemplate(answers);
  } else {
    return generateRSIReversionTemplate(answers);
  }
}

function generateMACrossoverTemplate(
  answers: WizardAnswers
): StrategyDefinition {
  const maType = answers.maType || "sma";
  const fastPeriod = answers.maFastPeriod || 10;
  const slowPeriod = answers.maSlowPeriod || 30;

  const blocks: Block[] = [
    {
      id: "price-1",
      type: "price",
      label: "Close Price",
      position: { x: 100, y: 200 },
      params: { source: "close" },
    },
    {
      id: `${maType}-fast`,
      type: maType,
      label: `Fast ${maType.toUpperCase()} (${fastPeriod})`,
      position: { x: 300, y: 100 },
      params: { period: fastPeriod },
    },
    {
      id: `${maType}-slow`,
      type: maType,
      label: `Slow ${maType.toUpperCase()} (${slowPeriod})`,
      position: { x: 300, y: 300 },
      params: { period: slowPeriod },
    },
    {
      id: "crossover-entry",
      type: "crossover",
      label: "Entry Crossover",
      position: { x: 500, y: 100 },
      params: { direction: "crosses_above" },
    },
    {
      id: "entry-1",
      type: "entry_signal",
      label: "Entry Signal",
      position: { x: 700, y: 100 },
      params: {},
    },
    {
      id: "crossover-exit",
      type: "crossover",
      label: "Exit Crossover",
      position: { x: 500, y: 300 },
      params: { direction: "crosses_below" },
    },
    {
      id: "exit-1",
      type: "exit_signal",
      label: "Exit Signal",
      position: { x: 700, y: 300 },
      params: {},
    },
  ];

  const connections: Connection[] = [
    // Price to both MAs
    {
      from_port: { block_id: "price-1", port: "output" },
      to_port: { block_id: `${maType}-fast`, port: "input" },
    },
    {
      from_port: { block_id: "price-1", port: "output" },
      to_port: { block_id: `${maType}-slow`, port: "input" },
    },
    // MAs to entry crossover
    {
      from_port: { block_id: `${maType}-fast`, port: "output" },
      to_port: { block_id: "crossover-entry", port: "fast" },
    },
    {
      from_port: { block_id: `${maType}-slow`, port: "output" },
      to_port: { block_id: "crossover-entry", port: "slow" },
    },
    // Entry crossover to signal
    {
      from_port: { block_id: "crossover-entry", port: "output" },
      to_port: { block_id: "entry-1", port: "signal" },
    },
    // MAs to exit crossover
    {
      from_port: { block_id: `${maType}-fast`, port: "output" },
      to_port: { block_id: "crossover-exit", port: "fast" },
    },
    {
      from_port: { block_id: `${maType}-slow`, port: "output" },
      to_port: { block_id: "crossover-exit", port: "slow" },
    },
    // Exit crossover to signal
    {
      from_port: { block_id: "crossover-exit", port: "output" },
      to_port: { block_id: "exit-1", port: "signal" },
    },
  ];

  addRiskControls(blocks, answers);

  return {
    blocks,
    connections,
    meta: { version: 1 },
  };
}

function generateRSIReversionTemplate(
  answers: WizardAnswers
): StrategyDefinition {
  const rsiPeriod = answers.rsiPeriod || 14;
  const exitThreshold = answers.exitRule === "rsi_neutral" ? 50 : 70;

  const blocks: Block[] = [
    {
      id: "price-1",
      type: "price",
      label: "Close Price",
      position: { x: 100, y: 200 },
      params: { source: "close" },
    },
    {
      id: "rsi-1",
      type: "rsi",
      label: `RSI (${rsiPeriod})`,
      position: { x: 300, y: 200 },
      params: { period: rsiPeriod },
    },
    // Entry: RSI < 30
    {
      id: "constant-entry",
      type: "constant",
      label: "30",
      position: { x: 300, y: 100 },
      params: { value: 30 },
    },
    {
      id: "compare-entry",
      type: "compare",
      label: "RSI < 30",
      position: { x: 500, y: 100 },
      params: { operator: "<" },
    },
    {
      id: "entry-1",
      type: "entry_signal",
      label: "Entry Signal",
      position: { x: 700, y: 100 },
      params: {},
    },
    // Exit: RSI > threshold
    {
      id: "constant-exit",
      type: "constant",
      label: `${exitThreshold}`,
      position: { x: 300, y: 300 },
      params: { value: exitThreshold },
    },
    {
      id: "compare-exit",
      type: "compare",
      label: `RSI > ${exitThreshold}`,
      position: { x: 500, y: 300 },
      params: { operator: ">" },
    },
    {
      id: "exit-1",
      type: "exit_signal",
      label: "Exit Signal",
      position: { x: 700, y: 300 },
      params: {},
    },
  ];

  const connections: Connection[] = [
    // Price to RSI
    {
      from_port: { block_id: "price-1", port: "output" },
      to_port: { block_id: "rsi-1", port: "input" },
    },
    // Entry: RSI < 30
    {
      from_port: { block_id: "rsi-1", port: "output" },
      to_port: { block_id: "compare-entry", port: "left" },
    },
    {
      from_port: { block_id: "constant-entry", port: "output" },
      to_port: { block_id: "compare-entry", port: "right" },
    },
    {
      from_port: { block_id: "compare-entry", port: "output" },
      to_port: { block_id: "entry-1", port: "signal" },
    },
    // Exit: RSI > threshold
    {
      from_port: { block_id: "rsi-1", port: "output" },
      to_port: { block_id: "compare-exit", port: "left" },
    },
    {
      from_port: { block_id: "constant-exit", port: "output" },
      to_port: { block_id: "compare-exit", port: "right" },
    },
    {
      from_port: { block_id: "compare-exit", port: "output" },
      to_port: { block_id: "exit-1", port: "signal" },
    },
  ];

  addRiskControls(blocks, answers);

  return {
    blocks,
    connections,
    meta: { version: 1 },
  };
}

function addRiskControls(blocks: Block[], answers: WizardAnswers) {
  let yOffset = 450;

  if (answers.useStopLoss) {
    blocks.push({
      id: "stop-loss-1",
      type: "stop_loss",
      label: `Stop Loss (${answers.stopLossPercent || 5}%)`,
      position: { x: 100, y: yOffset },
      params: { stop_loss_pct: answers.stopLossPercent || 5 },
    });
    yOffset += 80;
  }

  if (answers.useTakeProfit) {
    blocks.push({
      id: "take-profit-1",
      type: "take_profit",
      label: `Take Profit (${answers.takeProfitPercent || 10}%)`,
      position: { x: 100, y: yOffset },
      params: {
        levels: [
          {
            profit_pct: answers.takeProfitPercent || 10,
            close_pct: 100,
          },
        ],
      },
    });
  }
}
