import type { EquityCurvePoint } from "@/types/backtest";

export interface SparklineDimensions {
  width: number;
  height: number;
}

const TARGET_POINT_COUNT = 60;

/** Evenly samples down to `targetCount` points, always keeping the first and last. */
function downsample(
  points: EquityCurvePoint[],
  targetCount: number
): EquityCurvePoint[] {
  if (points.length <= targetCount) return points;

  const step = (points.length - 1) / (targetCount - 1);
  return Array.from(
    { length: targetCount },
    (_, index) => points[Math.round(index * step)]
  );
}

/**
 * Builds an SVG path `d` string for the equity curve sparkline used on the
 * Shared backtest OG image (ADR-0019, M2). Pure and I/O-free so the geometry
 * can be unit-tested without rendering an image.
 */
export function buildEquitySparklinePath(
  points: EquityCurvePoint[],
  dimensions: SparklineDimensions
): string {
  if (points.length === 0) return "";

  const { width, height } = dimensions;

  if (points.length === 1) {
    const midY = (height / 2).toFixed(2);
    return `M0.00,${midY} L${width.toFixed(2)},${midY}`;
  }

  const sampled = downsample(points, TARGET_POINT_COUNT);
  const equities = sampled.map((point) => point.equity);
  const minEquity = Math.min(...equities);
  const maxEquity = Math.max(...equities);
  const equityRange = maxEquity - minEquity || 1;
  const stepX = width / (sampled.length - 1);

  return sampled
    .map((point, index) => {
      const x = index * stepX;
      const normalized = (point.equity - minEquity) / equityRange;
      const y = height - normalized * height;
      const command = index === 0 ? "M" : "L";
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
