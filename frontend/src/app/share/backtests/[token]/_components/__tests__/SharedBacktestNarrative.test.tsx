import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SharedBacktestNarrative } from "@/app/share/backtests/[token]/_components/SharedBacktestNarrative";

describe("SharedBacktestNarrative", () => {
  it("renders the narrative prose under a heading", () => {
    render(
      <SharedBacktestNarrative narrative="Starting with $10,000, your strategy grew to $11,234, a 12.3% return over 1 trade." />
    );

    expect(
      screen.getByRole("heading", { name: /summary/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your strategy grew to \$11,234/i)
    ).toBeInTheDocument();
  });

  it("renders nothing when there is no narrative", () => {
    const { container: withNull } = render(
      <SharedBacktestNarrative narrative={null} />
    );
    expect(withNull).toBeEmptyDOMElement();

    const { container: withUndefined } = render(
      <SharedBacktestNarrative narrative={undefined} />
    );
    expect(withUndefined).toBeEmptyDOMElement();

    const { container: withEmpty } = render(
      <SharedBacktestNarrative narrative="" />
    );
    expect(withEmpty).toBeEmptyDOMElement();
  });
});
