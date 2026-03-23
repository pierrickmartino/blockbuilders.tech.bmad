import type { Meta, StoryObj } from "@storybook/react";
import TradeExplanation from "./TradeExplanation";

const meta = {
  title: "Components/TradeExplanation",
  component: TradeExplanation,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Displays the human-readable logic behind a single trade's entry and exit in the backtest trade drawer. Shows entry conditions in green and exit reason in an exit summary label. Renders a warning if explanation data is unavailable.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-6 max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TradeExplanation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithEntryAndExit: Story = {
  args: {
    entry: {
      summary: "RSI crossed below 30 (oversold)",
      conditions: ["RSI(14) < 30", "Price > SMA(200)"],
    },
    exit: {
      reason_type: "tp",
      summary: "Exit: take_profit",
      details: { tp_price: 43250.5 },
    },
  },
};

export const SignalExit: Story = {
  args: {
    entry: {
      summary: "EMA(12) crossed above EMA(26)",
      conditions: ["EMA(12) crossover EMA(26)"],
    },
    exit: {
      reason_type: "signal",
      summary: "Exit: signal",
      details: {},
    },
  },
};

export const StopLossExit: Story = {
  args: {
    entry: {
      summary: "MACD histogram turned positive",
      conditions: ["MACD histogram > 0", "RSI(14) > 50"],
    },
    exit: {
      reason_type: "sl",
      summary: "Exit: stop_loss",
      details: { sl_price: 41800.0 },
    },
  },
};

export const EndOfDataExit: Story = {
  args: {
    entry: {
      summary: "RSI < 30",
      conditions: ["RSI(14) < 30"],
    },
    exit: {
      reason_type: "end_of_data",
      summary: "Exit: end_of_data",
      details: {},
    },
  },
};

export const Partial: Story = {
  args: {
    partial: true,
  },
};

export const NoExplanation: Story = {
  args: {},
};
