import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SharedBacktestEquityCurve } from "@/app/share/backtests/[token]/_components/SharedBacktestEquityCurve";

describe("SharedBacktestEquityCurve", () => {
  it("renders the equity curve as a labeled chart region", () => {
    render(
      <SharedBacktestEquityCurve
        equityCurve={[
          { timestamp: "2025-01-01T00:00:00Z", equity: 10000 },
          { timestamp: "2025-06-01T00:00:00Z", equity: 11234 },
        ]}
      />
    );

    expect(screen.getByRole("img", { name: /equity curve/i })).toBeInTheDocument();
  });
});
