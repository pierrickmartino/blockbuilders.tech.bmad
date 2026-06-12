import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComparePageHeader } from "@/components/backtest/ComparePageHeader";

describe("ComparePageHeader — How Backtests Work link (#642)", () => {
  it("renders the Compare Backtests title and a link to the trust page", () => {
    render(<ComparePageHeader />);

    expect(
      screen.getByRole("heading", { name: /compare backtests/i })
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /how backtests work/i });
    expect(link).toHaveAttribute("href", "/how-backtests-work");
  });
});
