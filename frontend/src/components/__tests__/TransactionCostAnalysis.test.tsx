import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TransactionCostAnalysis } from "../TransactionCostAnalysis";
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

describe("TransactionCostAnalysis — How Backtests Work link (#642)", () => {
  it("links to the canonical How Backtests Work trust page when cost data is available", () => {
    render(<TransactionCostAnalysis summary={baseSummary} />);

    const link = screen.getByRole("link", { name: /how backtests work/i });
    expect(link).toHaveAttribute("href", "/how-backtests-work");
  });

  it("links to the trust page even when cost data is unavailable", () => {
    render(
      <TransactionCostAnalysis
        summary={{ ...baseSummary, total_costs_usd: undefined }}
      />
    );

    const link = screen.getByRole("link", { name: /how backtests work/i });
    expect(link).toHaveAttribute("href", "/how-backtests-work");
  });
});
