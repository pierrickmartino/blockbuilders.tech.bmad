import { describe, it, expect } from "vitest";
import type { CurriculumResponse } from "@/types/curriculum";
import { buildLlmsTxt } from "../build-llms-txt";

describe("buildLlmsTxt", () => {
  const origin = "https://app.blockbuilders.tech";

  it("starts with the product name as an H1 heading", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/^# Blockbuilders\b/);
  });

  it("states the trust invariants so an assistant cannot misrepresent the product", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/signals-only/i);
    expect(output).toMatch(/never takes custody/i);
    expect(output).toMatch(/never trades/i);
    expect(output).toMatch(/OHLCV/);
    expect(output).toMatch(/no look-ahead/i);
    expect(output).toMatch(/next-candle-open/i);
  });

  it("links the landing page and methodology page as absolute URLs derived from the origin", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/^## Docs$/m);
    expect(output).toContain(`(${origin}/)`);
    expect(output).toContain(`(${origin}/how-backtests-work)`);
  });

  it("excludes auth-gated surfaces and any sign-in CTA", () => {
    const output = buildLlmsTxt(origin);

    expect(output).not.toContain("/metrics-glossary");
    expect(output).not.toContain("/strategy-guide");
    expect(output).not.toContain("/login");
  });

  it("includes a Lessons section with the index link regardless of curriculum", () => {
    const output = buildLlmsTxt(origin, null);

    expect(output).toMatch(/^## Lessons$/m);
    expect(output).toContain(`(${origin}/lessons)`);
  });

  it("includes a module link for each module when curriculum is provided", () => {
    const curriculum: CurriculumResponse = {
      modules: [
        {
          id: "mod-1",
          title: "Module One",
          description: "First module",
          order: 1,
          lessons: [],
        },
      ],
    };
    const output = buildLlmsTxt(origin, curriculum);

    expect(output).toContain(`(${origin}/lessons/mod-1)`);
    expect(output).toContain("Module One");
  });

  it("includes a lesson link for each lesson when curriculum is provided", () => {
    const curriculum: CurriculumResponse = {
      modules: [
        {
          id: "mod-1",
          title: "Module One",
          description: "First module",
          order: 1,
          lessons: [
            {
              id: "lesson-1",
              title: "Lesson One",
              description: "First lesson",
              template_name: "basic",
              template_id: null,
              difficulty: "beginner",
              order: 1,
            },
          ],
        },
      ],
    };
    const output = buildLlmsTxt(origin, curriculum);

    expect(output).toContain(`(${origin}/lessons/mod-1/lesson-1)`);
    expect(output).toContain("Lesson One");
  });

  it("does not include dynamic module or lesson paths when curriculum is null", () => {
    const output = buildLlmsTxt(origin, null);

    const lessonLineCount = output
      .split("\n")
      .filter((line) => line.includes(`${origin}/lessons/`) && line.includes("/lessons/")).length;
    expect(lessonLineCount).toBe(0);
  });
});
