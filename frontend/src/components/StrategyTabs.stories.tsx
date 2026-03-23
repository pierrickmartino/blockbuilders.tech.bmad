import type { Meta, StoryObj } from "@storybook/react";
import { StrategyTabs } from "./StrategyTabs";

const meta = {
  title: "Components/StrategyTabs",
  component: StrategyTabs,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Two-tab navigation bar shown in the strategy editor header, switching between the canvas ('Build') and backtest results ('Backtest') views for a given strategy.",
      },
    },
  },
  args: {
    strategyId: "strategy-abc-123",
  },
} satisfies Meta<typeof StrategyTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BuildActive: Story = {
  args: { activeTab: "build" },
};

export const BacktestActive: Story = {
  args: { activeTab: "backtest" },
};
