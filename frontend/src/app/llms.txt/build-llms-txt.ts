import type { CurriculumResponse } from "@/types/curriculum";

export function buildLlmsTxt(
  origin: string,
  curriculum: CurriculumResponse | null = null,
): string {
  const literacyLines: string[] = [
    `- [Lessons](${origin}/lessons): Browse all public learning modules and lessons.`,
  ];

  if (curriculum) {
    for (const mod of curriculum.modules) {
      literacyLines.push(
        `- [Module: ${mod.title}](${origin}/lessons/${mod.id}): ${mod.description}`,
      );
      for (const lesson of mod.lessons) {
        literacyLines.push(
          `- [Lesson: ${lesson.title}](${origin}/lessons/${mod.id}/${lesson.id}): ${lesson.description}`,
        );
      }
    }
  }

  return `# Blockbuilders

> Blockbuilders is a no-code crypto strategy lab: build trading ideas visually on a canvas and backtest them against real historical data.

Blockbuilders is signals-only. It never takes custody of funds and never trades on a user's behalf — it produces signals and simulated results only. Backtests use OHLCV candle data, evaluate completed candles with no look-ahead, and simulate fills at the next-candle-open.

## Docs

- [Blockbuilders](${origin}/): No-code visual strategy builder and backtester for crypto trading ideas.
- [How Backtests Work](${origin}/how-backtests-work): The methodology behind every backtest — next-candle-open execution, OHLCV-only data, no look-ahead, and the default cost assumptions.

## Lessons

${literacyLines.join("\n")}
`;
}
