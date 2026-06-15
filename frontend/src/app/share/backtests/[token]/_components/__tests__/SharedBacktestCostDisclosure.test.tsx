import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SharedBacktestCostDisclosure } from "@/app/share/backtests/[token]/_components/SharedBacktestCostDisclosure";
import type { BacktestSummary } from "@/types/backtest";

const baseSummary: BacktestSummary = {
  initial_balance: 10000,
  final_balance: 11234,
  total_return_pct: 12.34,
  cagr_pct: 12.34,
  max_drawdown_pct: -5.5,
  num_trades: 20,
  win_rate_pct: 55,
  benchmark_return_pct: 8,
  alpha: 1,
  beta: 0.9,
  sharpe_ratio: 1.2,
  sortino_ratio: 1.5,
  calmar_ratio: 2.1,
  max_consecutive_losses: 2,
};

describe("SharedBacktestCostDisclosure", () => {
  it("renders the fee/slippage/spread totals and the rates used", () => {
    render(
      <SharedBacktestCostDisclosure
        summary={{
          ...baseSummary,
          total_fees_usd: 12.5,
          total_slippage_usd: 6.25,
          total_spread_usd: 3.1,
          total_costs_usd: 21.85,
        }}
        feeRate={0.001}
        slippageRate={0.0005}
        spreadRate={0.0002}
      />
    );

    expect(
      screen.getByRole("heading", { name: /cost disclosure/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/12\.50/)).toBeInTheDocument();
    expect(screen.getByText(/6\.25/)).toBeInTheDocument();
    expect(screen.getByText(/3\.10/)).toBeInTheDocument();
    expect(screen.getByText(/21\.85/)).toBeInTheDocument();

    expect(screen.getByText(/0\.10%/)).toBeInTheDocument();
    expect(screen.getByText(/0\.05%/)).toBeInTheDocument();
    expect(screen.getByText(/0\.02%/)).toBeInTheDocument();
  });

  it("renders nothing when cost totals are not available", () => {
    const { container } = render(
      <SharedBacktestCostDisclosure
        summary={baseSummary}
        feeRate={0.001}
        slippageRate={0.0005}
        spreadRate={0.0002}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
