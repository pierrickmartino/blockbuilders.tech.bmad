import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DraftReviewBanner } from "../DraftReviewBanner";

describe("DraftReviewBanner", () => {
  it('renders the "AI draft — under review" message when visible', () => {
    render(<DraftReviewBanner visible />);

    expect(screen.getByText("AI draft — under review")).toBeInTheDocument();
  });

  it("renders nothing when not visible", () => {
    const { container } = render(<DraftReviewBanner visible={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
