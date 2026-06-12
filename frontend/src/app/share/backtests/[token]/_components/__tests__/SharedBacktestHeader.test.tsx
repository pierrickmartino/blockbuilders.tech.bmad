import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SharedBacktestHeader } from "@/app/share/backtests/[token]/_components/SharedBacktestHeader";

describe("SharedBacktestHeader — How Backtests Work link (#642)", () => {
  it("renders the Shared Backtest Results title and a link to the public trust page", () => {
    render(
      <SharedBacktestHeader
        asset="BTC/USDT"
        timeframe="1d"
        dateFrom="2025-01-01T00:00:00Z"
        dateTo="2026-01-01T00:00:00Z"
      />
    );

    expect(
      screen.getByRole("heading", { name: /shared backtest results/i })
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /how backtests work/i });
    expect(link).toHaveAttribute("href", "/how-backtests-work");
  });
});
