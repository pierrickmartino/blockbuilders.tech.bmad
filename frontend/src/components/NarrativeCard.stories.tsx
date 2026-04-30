import type { Meta, StoryObj } from "@storybook/react";
import { NarrativeCard } from "./NarrativeCard";

const meta = {
  title: "Components/NarrativeCard",
  component: NarrativeCard,
  tags: ["autodocs"],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
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

export const Loading: Story = {
  args: {
    narrative: "",
    strategyId: "demo-strategy-3",
    isZeroTradeRun: false,
    isLoading: true,
  },
};

export const ZeroTradeRunLoading: Story = {
  args: {
    narrative: "",
    strategyId: "demo-strategy-4",
    isZeroTradeRun: true,
    isLoading: true,
  },
};

export const EmptyNarrative: Story = {
  args: {
    narrative: "",
    strategyId: "demo-strategy-5",
    isZeroTradeRun: false,
    isLoading: false,
  },
};

export const Dark: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export const DarkZeroTradeRun: Story = {
  args: {
    ...ZeroTradeRun.args,
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  args: {
    ...ZeroTradeRun.args,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
