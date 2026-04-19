import type { Meta, StoryObj } from "@storybook/react";
import { KPIStrip } from "./KPIStrip";
import type { BacktestSummary, TradeDetail } from "@/types/backtest";

const summary: BacktestSummary = {
  initial_balance: 10000,
  final_balance: 12450,
  total_return_pct: 24.5,
  cagr_pct: 18.2,
  max_drawdown_pct: -12.3,
  num_trades: 42,
  win_rate_pct: 61.9,
  benchmark_return_pct: 18.1,
  alpha: 6.4,
  beta: 0.9,
  sharpe_ratio: 1.42,
  sortino_ratio: 1.78,
  calmar_ratio: 1.99,
  max_consecutive_losses: 3,
};

const trades: TradeDetail[] = [
  {
    entry_time: "2024-01-10T00:00:00Z",
    exit_time: "2024-06-20T00:00:00Z",
  } as TradeDetail,
];

const meta = {
  title: "Backtest/KPIStrip",
  component: KPIStrip,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KPIStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    summary,
    trades,
    positionStats: { avgHoldSeconds: 3 * 86400 },
  },
};

export const NegativeReturn: Story = {
  args: {
    summary: { ...summary, total_return_pct: -8.2, benchmark_return_pct: 18.1 },
    trades,
    positionStats: { avgHoldSeconds: 86400 },
  },
};

export const Empty: Story = {
  args: {
    summary: { ...summary, num_trades: 0, win_rate_pct: 0 },
    trades: [],
    positionStats: null,
  },
};

export const Dark: Story = {
  args: {
    summary,
    trades,
    positionStats: { avgHoldSeconds: 3 * 86400 },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};
