export interface StrategyGuideItem {
  label: string;
  description: string;
}

export interface StrategyGuideSection {
  id: string;
  title: string;
  intro: string;
  items: StrategyGuideItem[];
  footer?: string;
}

export const STRATEGY_GUIDE_SECTIONS: StrategyGuideSection[] = [
  {
    id: "entry-signals",
    title: "Entry Signals",
    intro:
      "Entry Signals define when to open a position in your strategy. Every strategy must have at least one Entry Signal block.",
    items: [
      {
        label: "Required",
        description: "Every strategy needs at least one Entry Signal block",
      },
      {
        label: "Must be connected",
        description:
          "Connect indicators or logic blocks to your Entry Signal to define the entry condition",
      },
      {
        label: "How it works",
        description:
          "The strategy opens a position when the Entry Signal condition becomes true",
      },
      {
        label: "Example",
        description:
          "Connect an RSI indicator with a Compare block to enter when RSI crosses below 30",
      },
    ],
  },
  {
    id: "exit-signals",
    title: "Exit Signals & Exit Conditions",
    intro:
      "Exit conditions define when to close an open position. Every strategy must have at least one exit condition.",
    items: [
      {
        label: "Exit Signal block",
        description:
          "A custom exit condition based on indicators and logic (e.g., RSI crosses above 70)",
      },
      {
        label: "Risk Management blocks",
        description:
          "Stop Loss, Take Profit, Max Drawdown, Time Exit, or Trailing Stop",
      },
    ],
    footer:
      "You can combine multiple exit conditions. The position closes when the first condition triggers.",
  },
  {
    id: "indicators",
    title: "Indicators",
    intro: "Indicators analyze price data to generate signals for your strategy.",
    items: [
      {
        label: "SMA / EMA",
        description: "Moving averages with configurable period (1-500)",
      },
      {
        label: "RSI",
        description:
          "Relative Strength Index with configurable period (2-100)",
      },
      {
        label: "MACD",
        description:
          "Moving Average Convergence Divergence with fast, slow, and signal periods",
      },
      {
        label: "Bollinger Bands",
        description:
          "Price envelopes with configurable period and standard deviation",
      },
      {
        label: "ATR",
        description: "Average True Range with configurable period",
      },
    ],
    footer:
      "Each indicator has parameter ranges to ensure valid calculations. If you see an error about parameter ranges, adjust the value to fit within the allowed range.",
  },
  {
    id: "connections",
    title: "Block Connections",
    intro:
      "Connections link blocks together to build your strategy logic.",
    items: [
      {
        label: "How to connect",
        description:
          "Drag from an output port (right side of a block) to an input port (left side of another block)",
      },
      {
        label: "Signal blocks must be connected",
        description:
          "Entry Signal and Exit Signal blocks must have inputs to work properly",
      },
      {
        label: "Valid connections",
        description:
          "All connections must reference blocks that exist in your strategy",
      },
      {
        label: "Example flow",
        description: "Price → SMA → Compare → Entry Signal",
      },
    ],
  },
  {
    id: "risk-management",
    title: "Risk Management",
    intro:
      "Risk management blocks control position sizing and exit conditions to protect your capital.",
    items: [
      {
        label: "Position Size",
        description:
          "Set what percentage of your equity to use per trade (1-100%)",
      },
      {
        label: "Stop Loss",
        description:
          "Exit when loss reaches a percentage threshold (0.1-100%)",
      },
      {
        label: "Take Profit",
        description:
          "Exit when profit reaches target levels (supports 1-3 ladder levels)",
      },
      {
        label: "Max Drawdown",
        description:
          "Exit when equity drawdown exceeds threshold (0.1-100%)",
      },
      {
        label: "Time Exit",
        description:
          "Exit after a specific number of bars (minimum 1 bar)",
      },
      {
        label: "Trailing Stop",
        description:
          "Exit when price drops by a percentage from the highest close (0-100%)",
      },
    ],
    footer:
      "One per type: You can only have one of each risk management block (e.g., one Stop Loss, one Take Profit). Take Profit ladder: When using multiple levels, profit targets must be in ascending order, and total close percentage cannot exceed 100%.",
  },
];
