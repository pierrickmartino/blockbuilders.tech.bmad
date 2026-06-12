import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowBacktestsWorkPage from "../page";

describe("HowBacktestsWorkPage — public standalone surface (#640)", () => {
  it("renders a neutral public header linking to the home page instead of the app-only back-to-dashboard control", () => {
    render(<HowBacktestsWorkPage />);

    expect(
      screen.queryByRole("link", { name: /back to dashboard/i })
    ).not.toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: /blockbuilders/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("preserves the methodology content verbatim", () => {
    render(<HowBacktestsWorkPage />);

    expect(
      screen.getByRole("heading", { name: "How Backtests Work" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Important Disclaimer" })
    ).toBeInTheDocument();
  });

  it("has a single audience-agnostic primary CTA that routes a reader toward building a strategy", () => {
    render(<HowBacktestsWorkPage />);

    const ctaLinks = screen.getAllByRole("link", {
      name: /go to strategies/i,
    });

    expect(ctaLinks).toHaveLength(1);
    expect(ctaLinks[0]).toHaveAttribute("href", "/strategies");
  });
});
