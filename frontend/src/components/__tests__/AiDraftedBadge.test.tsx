/**
 * AI-drafted provenance badge (issue #601, ADR-0012, CONTEXT.md → AI-drafted).
 *
 * A pure projection of `entry_path = nl_wedge`: marks origin, not current
 * authorship, so it must render for `nl_wedge` regardless of any other
 * field and must not render for any other entry path (including `null`).
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AiDraftedBadge } from "../AiDraftedBadge";
import type { StrategyEntryPath } from "@/types/strategy";

describe("AiDraftedBadge", () => {
  it('renders the "AI-drafted" badge when entry_path is nl_wedge', () => {
    render(<AiDraftedBadge entryPath="nl_wedge" />);

    expect(screen.getByText("AI-drafted")).toBeInTheDocument();
  });

  it.each([
    ["wizard"],
    ["blank_canvas"],
    ["template_clone"],
    [null],
    [undefined],
  ] as [StrategyEntryPath | null | undefined][])(
    "renders nothing when entry_path is %s",
    (entryPath) => {
      const { container } = render(<AiDraftedBadge entryPath={entryPath} />);

      expect(container).toBeEmptyDOMElement();
    }
  );
});
