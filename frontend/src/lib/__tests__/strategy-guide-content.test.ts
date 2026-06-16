import { describe, it, expect } from "vitest";
import { STRATEGY_GUIDE_SECTIONS } from "@/lib/strategy-guide-content";

describe("STRATEGY_GUIDE_SECTIONS", () => {
  it("exports exactly the five core sections", () => {
    const ids = STRATEGY_GUIDE_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "entry-signals",
      "exit-signals",
      "indicators",
      "connections",
      "risk-management",
    ]);
  });

  it("every section has a non-empty title and intro", () => {
    for (const section of STRATEGY_GUIDE_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.intro.length).toBeGreaterThan(0);
    }
  });

  it("every section has at least one item with label and description", () => {
    for (const section of STRATEGY_GUIDE_SECTIONS) {
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });
});
