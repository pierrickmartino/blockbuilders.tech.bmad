import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WhatYouLearnedCard } from "../WhatYouLearnedCard";

describe("WhatYouLearnedCard — felt-dollar buy-and-hold delta (#668)", () => {
  it("renders the felt-dollar amount colored text-success when the strategy beat the hold", () => {
    render(
      <WhatYouLearnedCard
        strategyReturnPct={15.0}
        benchmarkReturnPct={10.0}
        initialBalance={10_000}
        asset="BTC/USDT"
        dateRange="Jan 2024 – Jun 2024"
      />
    );

    const amount = screen.getByText("$500");
    expect(amount).toHaveClass("text-success");
    expect(screen.getByText(/made you/)).toBeInTheDocument();
    expect(screen.getByText(/more than simply holding/)).toBeInTheDocument();
  });

  it("renders the felt-dollar amount colored text-destructive when the strategy lagged the hold", () => {
    render(
      <WhatYouLearnedCard
        strategyReturnPct={5.0}
        benchmarkReturnPct={20.0}
        initialBalance={10_000}
        asset="BTC/USDT"
        dateRange="Jan 2024 – Jun 2024"
      />
    );

    const amount = screen.getByText("$1,500");
    expect(amount).toHaveClass("text-destructive");
    expect(screen.getByText(/cost you/)).toBeInTheDocument();
    expect(screen.getByText(/versus simply holding/)).toBeInTheDocument();
  });

  it("shows no dollar figure when the delta is within the small band", () => {
    render(
      <WhatYouLearnedCard
        strategyReturnPct={10.0}
        benchmarkReturnPct={10.5}
        initialBalance={10_000}
        asset="BTC/USDT"
        dateRange="Jan 2024 – Jun 2024"
      />
    );

    expect(
      screen.getByText(/performed roughly the same as buy-and-hold/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });
});
