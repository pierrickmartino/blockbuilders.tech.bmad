import type { Meta, StoryObj } from "@storybook/react";
import { DrawdownSection } from "./DrawdownSection";
import type { BacktestSummary } from "@/types/backtest";

const summary: BacktestSummary = {
  initial_balance: 10000,
  final_balance: 11500,
  total_return_pct: 15,
  cagr_pct: 12,
  max_drawdown_pct: -8.4,
  num_trades: 30,
  win_rate_pct: 58,
  benchmark_return_pct: 10,
  alpha: 5,
  beta: 0.9,
  sharpe_ratio: 1.3,
  sortino_ratio: 1.6,
  calmar_ratio: 1.4,
  max_consecutive_losses: 3,
};

const drawdownData = Array.from({ length: 30 }, (_, i) => {
  const timestamp = `2024-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`;
  const value = -Math.abs(Math.sin(i / 3) * 8);
  return {
    timestamp,
    drawdown: value,
    isMaxDrawdown: i === 15,
  };
});

const meta = {
  title: "Backtest/DrawdownSection",
  component: DrawdownSection,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    summary,
    timezone: "utc",
    tickConfig: {},
    onRetry: () => {},
  },
} satisfies Meta<typeof DrawdownSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { drawdownData, isLoading: false, error: null },
};

export const Loading: Story = {
  args: { drawdownData: [], isLoading: true, error: null },
};

export const ErrorState: Story = {
  args: { drawdownData: [], isLoading: false, error: "Failed to load drawdown data" },
};

export const Empty: Story = {
  args: { drawdownData: [], isLoading: false, error: null },
};

export const Dark: Story = {
  args: { drawdownData, isLoading: false, error: null },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};
