import type { Meta, StoryObj } from "@storybook/react";
import { NarrativeCard } from "./NarrativeCard";

const meta = {
  title: "Components/NarrativeCard",
  component: NarrativeCard,
  tags: ["autodocs"],
} satisfies Meta<typeof NarrativeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    narrative:
      "Your RSI-based strategy performed well in trending markets, capturing 12 profitable trades over 6 months. The strategy showed strong entries during oversold conditions but occasionally held positions too long during consolidation phases.",
    strategyId: "demo-strategy-1",
    isZeroTradeRun: false,
  },
};

export const ZeroTradeRun: Story = {
  args: {
    narrative:
      "Your strategy did not trigger any trades during this period. The entry conditions may be too strict for the selected date range. Consider widening your RSI thresholds or trying a longer backtest window.",
    strategyId: "demo-strategy-2",
    isZeroTradeRun: true,
  },
};
