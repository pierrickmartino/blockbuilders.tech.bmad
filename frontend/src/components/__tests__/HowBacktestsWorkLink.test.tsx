import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowBacktestsWorkLink } from "../HowBacktestsWorkLink";

describe("HowBacktestsWorkLink", () => {
  it("renders a link to the canonical How Backtests Work trust page", () => {
    render(<HowBacktestsWorkLink />);

    const link = screen.getByRole("link", { name: /how backtests work/i });
    expect(link).toHaveAttribute("href", "/how-backtests-work");
  });
});
