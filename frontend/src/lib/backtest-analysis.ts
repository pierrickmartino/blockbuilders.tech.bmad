import { EquityCurvePoint, TradeDetail } from "@/types/backtest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PeriodType = "month" | "quarter" | "weekday";

export interface SeasonalityBucket {
  label: string;
  avgReturn: number;
  count: number;
}

export interface SeasonalityYearRow {
  year: number;
  buckets: SeasonalityBucket[];
}

export interface DistributionBucket {
  label: string;
  count: number;
  percentage: number; // 0–100
}

export interface PositionStats {
  avgHoldSeconds: number;
  avgHoldBars: number;
  longestHoldSeconds: number;
  longestHoldBars: number;
  shortestHoldSeconds: number;
  shortestHoldBars: number;
  avgPositionSize: number;
  hasMissingTimestamps: boolean;
  hasMissingPositionData: boolean;
}

export interface AlignedEquityCurvePoint {
  timestamp: string;
  [key: string]: string | number | null;
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getSeasonalityLabels(periodType: PeriodType): string[] {
  if (periodType === "month") return MONTH_LABELS;
  if (periodType === "quarter") return QUARTER_LABELS;
  return WEEKDAY_LABELS;
}

export function getSeasonalityBucketIndex(date: Date, periodType: PeriodType): number {
  if (periodType === "month") return date.getUTCMonth();
  if (periodType === "quarter") return Math.floor(date.getUTCMonth() / 3);
  return (date.getUTCDay() + 6) % 7;
}

// ---------------------------------------------------------------------------
// timeframeToSeconds
// ---------------------------------------------------------------------------

export function timeframeToSeconds(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhdw])$/);
  if (!match) return 86400;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    case "w": return value * 604800;
    default: return 86400;
  }
}

// ---------------------------------------------------------------------------
// computeSeasonality
// ---------------------------------------------------------------------------

export function computeSeasonality(
  trades: Array<{ exit_time: string; pnl_pct: number }>,
  periodType: PeriodType
): SeasonalityYearRow[] {
  const bucketsByYear = new Map<number, Map<number, { sum: number; count: number }>>();
  const labels = getSeasonalityLabels(periodType);
  const numBuckets = labels.length;

  for (const trade of trades) {
    const date = new Date(trade.exit_time);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getUTCFullYear();
    const bucket = getSeasonalityBucketIndex(date, periodType);
    const yearBuckets = bucketsByYear.get(year) ?? new Map<number, { sum: number; count: number }>();
    const current = yearBuckets.get(bucket) ?? { sum: 0, count: 0 };

    yearBuckets.set(bucket, { sum: current.sum + trade.pnl_pct, count: current.count + 1 });
    bucketsByYear.set(year, yearBuckets);
  }

  return Array.from(bucketsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, buckets]) => ({
      year,
      buckets: Array.from({ length: numBuckets }, (_, index) => {
        const data = buckets.get(index);
        return {
          label: labels[index],
          avgReturn: data ? data.sum / data.count : 0,
          count: data?.count ?? 0,
        };
      }),
    }));
}

// ---------------------------------------------------------------------------
// computeReturnDistribution
// ---------------------------------------------------------------------------

export function computeReturnDistribution(
  trades: Array<{ pnl_pct: number }>
): DistributionBucket[] {
  const buckets = [
    { label: ">20%", count: 0 },
    { label: "10-20%", count: 0 },
    { label: "5-10%", count: 0 },
    { label: "0-5%", count: 0 },
    { label: "0 to -5%", count: 0 },
    { label: "-5 to -10%", count: 0 },
    { label: "-10 to -20%", count: 0 },
    { label: "<-20%", count: 0 },
  ];

  for (const trade of trades) {
    const pnl = trade.pnl_pct;
    if (pnl > 20) {
      buckets[0].count++;
    } else if (pnl > 10) {
      buckets[1].count++;
    } else if (pnl > 5) {
      buckets[2].count++;
    } else if (pnl >= 0) {
      buckets[3].count++;
    } else if (pnl >= -5) {
      buckets[4].count++;
    } else if (pnl >= -10) {
      buckets[5].count++;
    } else if (pnl >= -20) {
      buckets[6].count++;
    } else {
      buckets[7].count++;
    }
  }

  const total = trades.length;
  return buckets.map(b => ({
    label: b.label,
    count: b.count,
    percentage: total > 0 ? (b.count / total) * 100 : 0,
  }));
}

// ---------------------------------------------------------------------------
// computeDurationDistribution
// ---------------------------------------------------------------------------

export function computeDurationDistribution(
  trades: Array<{ entry_time: string; exit_time: string }>
): DistributionBucket[] | null {
  const buckets = [
    { label: "<1h",   minSec: 0,       maxSec: 3600,    count: 0 },
    { label: "1–6h",  minSec: 3600,    maxSec: 21600,   count: 0 },
    { label: "6–24h", minSec: 21600,   maxSec: 86400,   count: 0 },
    { label: "1–3d",  minSec: 86400,   maxSec: 259200,  count: 0 },
    { label: "3–7d",  minSec: 259200,  maxSec: 604800,  count: 0 },
    { label: "7–14d", minSec: 604800,  maxSec: 1209600, count: 0 },
    { label: ">14d",  minSec: 1209600, maxSec: Infinity, count: 0 },
  ];

  let validCount = 0;

  for (const trade of trades) {
    try {
      const entryMs = new Date(trade.entry_time).getTime();
      const exitMs = new Date(trade.exit_time).getTime();

      if (isNaN(entryMs) || isNaN(exitMs)) continue;
      const holdSeconds = (exitMs - entryMs) / 1000;
      if (holdSeconds < 0) continue;

      for (const bucket of buckets) {
        if (holdSeconds >= bucket.minSec && holdSeconds < bucket.maxSec) {
          bucket.count++;
          validCount++;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (validCount === 0) return null;

  return buckets.map(b => ({
    label: b.label,
    count: b.count,
    percentage: (b.count / validCount) * 100,
  }));
}

// ---------------------------------------------------------------------------
// computePositionStats
// ---------------------------------------------------------------------------

export function computePositionStats(
  trades: TradeDetail[],
  timeframeSeconds: number
): PositionStats | null {
  if (trades.length < 2) return null;

  let totalDuration = 0;
  let minDuration = Infinity;
  let maxDuration = -Infinity;
  let totalPositionSize = 0;
  let validDurationCount = 0;
  let validPositionCount = 0;
  let hasMissingTimestamps = false;
  let hasMissingPositionData = false;

  for (const trade of trades) {
    if (trade.duration_seconds != null && trade.duration_seconds >= 0) {
      totalDuration += trade.duration_seconds;
      minDuration = Math.min(minDuration, trade.duration_seconds);
      maxDuration = Math.max(maxDuration, trade.duration_seconds);
      validDurationCount++;
    } else {
      hasMissingTimestamps = true;
    }

    if (
      trade.entry_price != null &&
      trade.qty != null &&
      trade.entry_price > 0 &&
      trade.qty > 0
    ) {
      totalPositionSize += trade.entry_price * trade.qty;
      validPositionCount++;
    } else {
      hasMissingPositionData = true;
    }
  }

  const avgHoldSeconds = validDurationCount > 0 ? totalDuration / validDurationCount : 0;

  return {
    avgHoldSeconds,
    avgHoldBars: avgHoldSeconds / timeframeSeconds,
    longestHoldSeconds: maxDuration !== -Infinity ? maxDuration : 0,
    longestHoldBars: (maxDuration !== -Infinity ? maxDuration : 0) / timeframeSeconds,
    shortestHoldSeconds: minDuration !== Infinity ? minDuration : 0,
    shortestHoldBars: (minDuration !== Infinity ? minDuration : 0) / timeframeSeconds,
    avgPositionSize: validPositionCount > 0 ? totalPositionSize / validPositionCount : 0,
    hasMissingTimestamps,
    hasMissingPositionData,
  };
}

// ---------------------------------------------------------------------------
// computeSkew  (Fisher–Pearson coefficient of skewness)
// ---------------------------------------------------------------------------

export function computeSkew(trades: Array<{ pnl_pct: number }>): number {
  const n = trades.length;
  if (n < 3) return 0;
  const values = trades.map(t => t.pnl_pct);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  const sum = values.reduce((a, b) => a + ((b - mean) / std) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

// ---------------------------------------------------------------------------
// computeSkewCallout
// ---------------------------------------------------------------------------

export function computeSkewCallout(returnBuckets: DistributionBucket[]): string {
  const winBuckets = returnBuckets.slice(0, 4);
  const lossBuckets = returnBuckets.slice(4, 8);

  const largestWinBucket = winBuckets.reduce((max, b) =>
    b.count > max.count ? b : max, winBuckets[0]
  );
  const largestLossBucket = lossBuckets.reduce((max, b) =>
    b.count > max.count ? b : max, lossBuckets[0]
  );

  const isSmallWinBucket = largestWinBucket.label === "0-5%";
  const isLargeLossBucket = ["<-20%", "-10 to -20%"].includes(largestLossBucket.label);

  if (isSmallWinBucket && isLargeLossBucket) {
    return "Distribution skews to small wins and larger losses. Review risk controls.";
  }

  return "Distribution looks balanced across buckets.";
}

// ---------------------------------------------------------------------------
// alignEquityCurves
// ---------------------------------------------------------------------------

export function alignEquityCurves(
  runs: Array<{ equity_curve: EquityCurvePoint[] }>
): AlignedEquityCurvePoint[] {
  if (runs.length === 0) return [];

  const timestampSet = new Set<string>();
  runs.forEach(run => {
    run.equity_curve.forEach(point => {
      timestampSet.add(point.timestamp);
    });
  });

  const allTimestamps = Array.from(timestampSet).sort();

  const runMaps = runs.map(run => {
    const map = new Map<string, number>();
    run.equity_curve.forEach(point => {
      map.set(point.timestamp, point.equity);
    });
    return map;
  });

  return allTimestamps.map(timestamp => {
    const point: AlignedEquityCurvePoint = { timestamp };
    runs.forEach((_, idx) => {
      point[`run_${idx}`] = runMaps[idx].get(timestamp) ?? null;
    });
    return point;
  });
}
