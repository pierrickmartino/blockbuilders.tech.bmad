import type { Meta, StoryObj } from "@storybook/react";
import { TransactionCostAnalysis } from "./TransactionCostAnalysis";
import type { BacktestSummary } from "@/types/backtest";

const baseSummary: BacktestSummary = {
  initial_balance: 10000,
  final_balance: 10843,
  total_return_pct: 8.43,
  cagr_pct: 16.8,
  max_drawdown_pct: -4.2,
  num_trades: 24,
  win_rate_pct: 62.5,
  benchmark_return_pct: 5.2,
  alpha: 3.23,
  beta: 0.72,
  sharpe_ratio: 1.12,
  sortino_ratio: 1.48,
  calmar_ratio: 2.01,
  max_consecutive_losses: 3,
  gross_return_usd: 1020,
  gross_return_pct: 10.2,
  total_fees_usd: 72,
  total_slippage_usd: 53,
  total_spread_usd: 52,
  total_costs_usd: 177,
  avg_cost_per_trade_usd: 7.38,
  cost_pct_gross_return: 17.35,
};

const meta = {
  title: "Components/TransactionCostAnalysis",
  component: TransactionCostAnalysis,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Breaks down the fees, slippage, and spread costs for a backtest run, and shows how they affect gross vs net return. Renders a 'not available' placeholder for older backtests that lack cost data.",
      },
    },
  },
} satisfies Meta<typeof TransactionCostAnalysis>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCostData: Story = {
  args: { summary: baseSummary },
};

export const NoCostData: Story = {
  args: {
    summary: {
      ...baseSummary,
      total_costs_usd: undefined,
      total_fees_usd: undefined,
      total_slippage_usd: undefined,
      total_spread_usd: undefined,
      avg_cost_per_trade_usd: undefined,
      cost_pct_gross_return: undefined,
    },
  },
};
