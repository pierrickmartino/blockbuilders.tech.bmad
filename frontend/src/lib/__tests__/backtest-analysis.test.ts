import { describe, it, expect } from "vitest";
import {
  computeSeasonality,
  computeReturnDistribution,
  computeDurationDistribution,
  computePositionStats,
  computeSkew,
  computeSkewCallout,
  alignEquityCurves,
  getSeasonalityLabels,
  getSeasonalityBucketIndex,
  timeframeToSeconds,
  type PeriodType,
  type DistributionBucket,
} from "@/lib/backtest-analysis";

// ---------------------------------------------------------------------------
// getSeasonalityLabels
// ---------------------------------------------------------------------------

describe("getSeasonalityLabels", () => {
  it("returns 12 month labels for 'month'", () => {
    const labels = getSeasonalityLabels("month");
    expect(labels).toHaveLength(12);
    expect(labels[0]).toBe("Jan");
    expect(labels[11]).toBe("Dec");
  });

  it("returns 4 quarter labels for 'quarter'", () => {
    const labels = getSeasonalityLabels("quarter");
    expect(labels).toEqual(["Q1", "Q2", "Q3", "Q4"]);
  });

  it("returns 7 weekday labels for 'weekday'", () => {
    const labels = getSeasonalityLabels("weekday");
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe("Mon");
    expect(labels[6]).toBe("Sun");
  });
});

// ---------------------------------------------------------------------------
// getSeasonalityBucketIndex
// ---------------------------------------------------------------------------

describe("getSeasonalityBucketIndex", () => {
  it("returns UTC month index (0-based) for 'month'", () => {
    const jan = new Date("2023-01-15T00:00:00Z");
    const dec = new Date("2023-12-01T00:00:00Z");
    expect(getSeasonalityBucketIndex(jan, "month")).toBe(0);
    expect(getSeasonalityBucketIndex(dec, "month")).toBe(11);
  });

  it("returns quarter index (0-3) for 'quarter'", () => {
    expect(getSeasonalityBucketIndex(new Date("2023-01-01T00:00:00Z"), "quarter")).toBe(0);
    expect(getSeasonalityBucketIndex(new Date("2023-04-01T00:00:00Z"), "quarter")).toBe(1);
    expect(getSeasonalityBucketIndex(new Date("2023-07-01T00:00:00Z"), "quarter")).toBe(2);
    expect(getSeasonalityBucketIndex(new Date("2023-10-01T00:00:00Z"), "quarter")).toBe(3);
  });

  it("returns Mon=0, Sun=6 for 'weekday' (ISO-style ordering)", () => {
    // 2023-01-02 is a Monday (getUTCDay() === 1 → (1 + 6) % 7 = 0)
    expect(getSeasonalityBucketIndex(new Date("2023-01-02T00:00:00Z"), "weekday")).toBe(0);
    // 2023-01-08 is a Sunday (getUTCDay() === 0 → (0 + 6) % 7 = 6)
    expect(getSeasonalityBucketIndex(new Date("2023-01-08T00:00:00Z"), "weekday")).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// timeframeToSeconds
// ---------------------------------------------------------------------------

describe("timeframeToSeconds", () => {
  it("converts minutes", () => {
    expect(timeframeToSeconds("1m")).toBe(60);
    expect(timeframeToSeconds("15m")).toBe(900);
  });

  it("converts hours", () => {
    expect(timeframeToSeconds("1h")).toBe(3600);
    expect(timeframeToSeconds("4h")).toBe(14400);
  });

  it("converts days", () => {
    expect(timeframeToSeconds("1d")).toBe(86400);
  });

  it("converts weeks", () => {
    expect(timeframeToSeconds("1w")).toBe(604800);
  });

  it("defaults to 1 day for unrecognised format", () => {
    expect(timeframeToSeconds("foo")).toBe(86400);
    expect(timeframeToSeconds("")).toBe(86400);
  });
});

// ---------------------------------------------------------------------------
// computeSeasonality
// ---------------------------------------------------------------------------

describe("computeSeasonality", () => {
  it("groups trades by year and month and averages pnl_pct", () => {
    const trades = [
      { exit_time: "2023-01-10T00:00:00Z", pnl_pct: 10 },
      { exit_time: "2023-01-20T00:00:00Z", pnl_pct: 20 },
      { exit_time: "2023-03-15T00:00:00Z", pnl_pct: -5 },
    ];
    const result = computeSeasonality(trades, "month");
    expect(result).toHaveLength(1);
    const [row] = result;
    expect(row.year).toBe(2023);
    const janBucket = row.buckets[0]; // Jan = index 0
    expect(janBucket.avgReturn).toBe(15); // (10+20)/2
    expect(janBucket.count).toBe(2);
    const marBucket = row.buckets[2]; // Mar = index 2
    expect(marBucket.avgReturn).toBe(-5);
    expect(marBucket.count).toBe(1);
  });

  it("returns rows sorted by year ascending", () => {
    const trades = [
      { exit_time: "2024-06-01T00:00:00Z", pnl_pct: 5 },
      { exit_time: "2022-06-01T00:00:00Z", pnl_pct: 3 },
      { exit_time: "2023-06-01T00:00:00Z", pnl_pct: 1 },
    ];
    const result = computeSeasonality(trades, "month");
    expect(result.map(r => r.year)).toEqual([2022, 2023, 2024]);
  });

  it("skips trades with unparseable exit_time", () => {
    const trades = [
      { exit_time: "not-a-date", pnl_pct: 999 },
      { exit_time: "2023-06-01T00:00:00Z", pnl_pct: 4 },
    ];
    const result = computeSeasonality(trades, "month");
    expect(result).toHaveLength(1);
    const [row] = result;
    const junBucket = row.buckets[5]; // Jun = index 5
    expect(junBucket.count).toBe(1);
    expect(junBucket.avgReturn).toBe(4);
  });

  it("returns empty array when all trades have unparseable timestamps", () => {
    const trades = [
      { exit_time: "bad", pnl_pct: 1 },
      { exit_time: "also-bad", pnl_pct: 2 },
    ];
    expect(computeSeasonality(trades, "month")).toEqual([]);
  });

  it("empty bucket cells have count 0 and avgReturn 0", () => {
    const trades = [{ exit_time: "2023-06-01T00:00:00Z", pnl_pct: 4 }];
    const result = computeSeasonality(trades, "month");
    const janBucket = result[0].buckets[0];
    expect(janBucket.count).toBe(0);
    expect(janBucket.avgReturn).toBe(0);
  });

  it("groups trades by quarter", () => {
    const trades = [
      { exit_time: "2023-02-01T00:00:00Z", pnl_pct: 2 },
      { exit_time: "2023-05-01T00:00:00Z", pnl_pct: 8 },
    ];
    const result = computeSeasonality(trades, "quarter");
    const [row] = result;
    expect(row.buckets).toHaveLength(4);
    expect(row.buckets[0].avgReturn).toBe(2); // Q1
    expect(row.buckets[1].avgReturn).toBe(8); // Q2
  });

  it("returns empty array for empty trade list", () => {
    expect(computeSeasonality([], "month")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeReturnDistribution
// ---------------------------------------------------------------------------

describe("computeReturnDistribution", () => {
  it("returns 8 buckets", () => {
    expect(computeReturnDistribution([])).toHaveLength(8);
  });

  it("all counts and percentages are 0 for empty trades", () => {
    const result = computeReturnDistribution([]);
    for (const b of result) {
      expect(b.count).toBe(0);
      expect(b.percentage).toBe(0);
    }
  });

  it("places trade with pnl_pct > 20 in first bucket (>20%)", () => {
    const result = computeReturnDistribution([{ pnl_pct: 25 }]);
    expect(result[0].count).toBe(1);
    expect(result[0].label).toBe(">20%");
  });

  it("boundary: pnl_pct exactly 20 goes into 10-20% bucket (not >20%)", () => {
    const result = computeReturnDistribution([{ pnl_pct: 20 }]);
    expect(result[0].count).toBe(0); // >20%
    expect(result[1].count).toBe(1); // 10-20%
  });

  it("boundary: pnl_pct exactly 10 goes into 5-10% bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: 10 }]);
    expect(result[1].count).toBe(0); // 10-20%
    expect(result[2].count).toBe(1); // 5-10%
  });

  it("boundary: pnl_pct exactly 5 goes into 0-5% bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: 5 }]);
    expect(result[2].count).toBe(0); // 5-10%
    expect(result[3].count).toBe(1); // 0-5%
  });

  it("boundary: pnl_pct exactly 0 goes into 0-5% bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: 0 }]);
    expect(result[3].count).toBe(1); // 0-5%
  });

  it("boundary: pnl_pct exactly -5 goes into '0 to -5%' bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: -5 }]);
    expect(result[4].count).toBe(1); // 0 to -5%
  });

  it("boundary: pnl_pct just below -5 goes into '-5 to -10%' bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: -5.001 }]);
    expect(result[4].count).toBe(0); // 0 to -5%
    expect(result[5].count).toBe(1); // -5 to -10%
  });

  it("boundary: pnl_pct exactly -10 goes into '-5 to -10%' bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: -10 }]);
    expect(result[5].count).toBe(1); // -5 to -10%
  });

  it("boundary: pnl_pct exactly -20 goes into '-10 to -20%' bucket", () => {
    const result = computeReturnDistribution([{ pnl_pct: -20 }]);
    expect(result[6].count).toBe(1); // -10 to -20%
  });

  it("places trade with pnl_pct < -20 in last bucket (<-20%)", () => {
    const result = computeReturnDistribution([{ pnl_pct: -25 }]);
    expect(result[7].count).toBe(1);
    expect(result[7].label).toBe("<-20%");
  });

  it("percentages sum to 100 for non-empty trades", () => {
    const trades = [
      { pnl_pct: 25 },
      { pnl_pct: 5 },
      { pnl_pct: -30 },
      { pnl_pct: 0 },
    ];
    const result = computeReturnDistribution(trades);
    const total = result.reduce((sum, b) => sum + b.percentage, 0);
    expect(total).toBeCloseTo(100, 5);
  });
});

// ---------------------------------------------------------------------------
// computeDurationDistribution
// ---------------------------------------------------------------------------

describe("computeDurationDistribution", () => {
  it("returns null when no valid trades exist", () => {
    expect(computeDurationDistribution([])).toBeNull();
  });

  it("returns null when all timestamps are invalid", () => {
    const trades = [
      { entry_time: "bad", exit_time: "also-bad" },
    ];
    expect(computeDurationDistribution(trades)).toBeNull();
  });

  it("returns 7 buckets when at least one trade is valid", () => {
    const trades = [{ entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T01:00:00Z" }];
    const result = computeDurationDistribution(trades);
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(7);
  });

  it("places a 30-minute trade in '<1h' bucket", () => {
    const trades = [{ entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T00:30:00Z" }];
    const result = computeDurationDistribution(trades)!;
    expect(result[0].label).toBe("<1h");
    expect(result[0].count).toBe(1);
  });

  it("boundary: exactly 1h goes into '1–6h' bucket (not '<1h')", () => {
    const trades = [{ entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T01:00:00Z" }];
    const result = computeDurationDistribution(trades)!;
    expect(result[0].count).toBe(0); // <1h
    expect(result[1].count).toBe(1); // 1-6h
  });

  it("boundary: exactly 6h goes into '6–24h' bucket", () => {
    const trades = [{ entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T06:00:00Z" }];
    const result = computeDurationDistribution(trades)!;
    expect(result[1].count).toBe(0); // 1-6h
    expect(result[2].count).toBe(1); // 6-24h
  });

  it("boundary: exactly 14d goes into '>14d' bucket", () => {
    const entry = "2023-01-01T00:00:00Z";
    const exit = "2023-01-15T00:00:00Z"; // exactly 14 days
    const result = computeDurationDistribution([{ entry_time: entry, exit_time: exit }])!;
    expect(result[6].label).toBe(">14d");
    expect(result[6].count).toBe(1);
  });

  it("skips trades with negative hold time", () => {
    const trades = [
      { entry_time: "2023-01-02T00:00:00Z", exit_time: "2023-01-01T00:00:00Z" }, // negative
      { entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T02:00:00Z" }, // valid
    ];
    const result = computeDurationDistribution(trades)!;
    const total = result.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(1);
  });

  it("percentages sum to 100 for non-null result", () => {
    const trades = [
      { entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-01T00:30:00Z" },
      { entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-03T00:00:00Z" },
    ];
    const result = computeDurationDistribution(trades)!;
    const total = result.reduce((sum, b) => sum + b.percentage, 0);
    expect(total).toBeCloseTo(100, 5);
  });
});

// ---------------------------------------------------------------------------
// computePositionStats
// ---------------------------------------------------------------------------

function makeTrade(overrides: Partial<{
  entry_time: string;
  exit_time: string;
  entry_price: number;
  qty: number;
  duration_seconds: number;
  pnl_pct: number;
}>): Parameters<typeof computePositionStats>[0][number] {
  return {
    entry_time: "2023-01-01T00:00:00Z",
    entry_price: 100,
    exit_time: "2023-01-02T00:00:00Z",
    exit_price: 110,
    side: "long",
    pnl: 10,
    pnl_pct: 10,
    qty: 1,
    sl_price_at_entry: null,
    tp_price_at_entry: null,
    exit_reason: "tp",
    mae_usd: 0,
    mae_pct: 0,
    mfe_usd: 10,
    mfe_pct: 10,
    initial_risk_usd: null,
    r_multiple: null,
    peak_price: 110,
    peak_ts: "2023-01-02T00:00:00Z",
    trough_price: 100,
    trough_ts: "2023-01-01T00:00:00Z",
    duration_seconds: 86400,
    ...overrides,
  };
}

describe("computePositionStats", () => {
  it("returns null when fewer than 2 trades are provided", () => {
    expect(computePositionStats([], 3600)).toBeNull();
    expect(computePositionStats([makeTrade({})], 3600)).toBeNull();
  });

  it("computes average hold bars correctly", () => {
    const trades = [
      makeTrade({ duration_seconds: 3600 }),
      makeTrade({ duration_seconds: 7200 }),
    ];
    const result = computePositionStats(trades, 3600)!;
    expect(result.avgHoldSeconds).toBe(5400); // (3600+7200)/2
    expect(result.avgHoldBars).toBe(1.5);
  });

  it("computes min and max hold times", () => {
    const trades = [
      makeTrade({ duration_seconds: 3600 }),
      makeTrade({ duration_seconds: 7200 }),
      makeTrade({ duration_seconds: 1800 }),
    ];
    const result = computePositionStats(trades, 3600)!;
    expect(result.shortestHoldSeconds).toBe(1800);
    expect(result.longestHoldSeconds).toBe(7200);
  });

  it("computes average position size from entry_price * qty", () => {
    const trades = [
      makeTrade({ entry_price: 100, qty: 2 }),
      makeTrade({ entry_price: 200, qty: 1 }),
    ];
    const result = computePositionStats(trades, 86400)!;
    expect(result.avgPositionSize).toBe(200); // (100*2 + 200*1) / 2
  });

  it("flags hasMissingTimestamps when duration_seconds is null", () => {
    const trades = [
      makeTrade({ duration_seconds: undefined as unknown as number }),
      makeTrade({ duration_seconds: 3600 }),
    ];
    // Force null for the first trade
    const t = [
      { ...makeTrade({}), duration_seconds: null as unknown as number },
      makeTrade({ duration_seconds: 3600 }),
    ];
    const result = computePositionStats(t, 3600)!;
    expect(result.hasMissingTimestamps).toBe(true);
  });

  it("flags hasMissingPositionData when entry_price or qty is missing", () => {
    const trades = [
      { ...makeTrade({}), entry_price: 0 },
      makeTrade({}),
    ];
    const result = computePositionStats(trades, 3600)!;
    expect(result.hasMissingPositionData).toBe(true);
  });

  it("does not flag missing data when all trades have complete data", () => {
    const trades = [makeTrade({}), makeTrade({})];
    const result = computePositionStats(trades, 3600)!;
    expect(result.hasMissingTimestamps).toBe(false);
    expect(result.hasMissingPositionData).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeSkew
// ---------------------------------------------------------------------------

describe("computeSkew", () => {
  it("returns 0 when fewer than 3 trades", () => {
    expect(computeSkew([])).toBe(0);
    expect(computeSkew([{ pnl_pct: 1 }])).toBe(0);
    expect(computeSkew([{ pnl_pct: 1 }, { pnl_pct: 2 }])).toBe(0);
  });

  it("returns 0 when all trades have the same pnl_pct (zero variance)", () => {
    const trades = [{ pnl_pct: 5 }, { pnl_pct: 5 }, { pnl_pct: 5 }];
    expect(computeSkew(trades)).toBe(0);
  });

  it("returns a number for a valid distribution", () => {
    const trades = [
      { pnl_pct: 1 }, { pnl_pct: 2 }, { pnl_pct: 3 },
      { pnl_pct: 4 }, { pnl_pct: 100 }, // positive tail → positive skew
    ];
    const result = computeSkew(trades);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });

  it("returns negative skew for a left-tailed distribution", () => {
    const trades = [
      { pnl_pct: -100 }, { pnl_pct: 1 }, { pnl_pct: 2 },
      { pnl_pct: 3 }, { pnl_pct: 4 },
    ];
    expect(computeSkew(trades)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeSkewCallout
// ---------------------------------------------------------------------------

describe("computeSkewCallout", () => {
  function makeBuckets(counts: number[]): DistributionBucket[] {
    const labels = [">20%", "10-20%", "5-10%", "0-5%", "0 to -5%", "-5 to -10%", "-10 to -20%", "<-20%"];
    const total = counts.reduce((a, b) => a + b, 0);
    return labels.map((label, i) => ({
      label,
      count: counts[i],
      percentage: total > 0 ? (counts[i] / total) * 100 : 0,
    }));
  }

  it("returns risk warning when largest win is 0-5% AND largest loss is <-20%", () => {
    // Wins: most in 0-5%; Losses: most in <-20%
    const buckets = makeBuckets([0, 0, 0, 10, 0, 0, 0, 8]);
    expect(computeSkewCallout(buckets)).toContain("Review risk controls");
  });

  it("returns risk warning when largest win is 0-5% AND largest loss is -10 to -20%", () => {
    const buckets = makeBuckets([0, 0, 0, 10, 0, 0, 8, 0]);
    expect(computeSkewCallout(buckets)).toContain("Review risk controls");
  });

  it("returns balanced message when largest win is in a higher bucket", () => {
    const buckets = makeBuckets([5, 0, 0, 0, 0, 0, 0, 0]);
    expect(computeSkewCallout(buckets)).toContain("balanced");
  });

  it("returns balanced message when largest loss is in a smaller bucket", () => {
    // Small wins in 0-5%, but largest loss is only 0 to -5% (not large)
    const buckets = makeBuckets([0, 0, 0, 10, 8, 0, 0, 0]);
    expect(computeSkewCallout(buckets)).toContain("balanced");
  });
});

// ---------------------------------------------------------------------------
// alignEquityCurves
// ---------------------------------------------------------------------------

describe("alignEquityCurves", () => {
  it("returns empty array for empty runs", () => {
    expect(alignEquityCurves([])).toEqual([]);
  });

  it("returns single run's points with run_0 key", () => {
    const runs = [
      {
        equity_curve: [
          { timestamp: "2023-01-01T00:00:00Z", equity: 10000 },
          { timestamp: "2023-01-02T00:00:00Z", equity: 10100 },
        ],
      },
    ];
    const result = alignEquityCurves(runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ timestamp: "2023-01-01T00:00:00Z", run_0: 10000 });
    expect(result[1]).toEqual({ timestamp: "2023-01-02T00:00:00Z", run_0: 10100 });
  });

  it("merges runs on a union timestamp axis, sorted chronologically", () => {
    const runs = [
      {
        equity_curve: [
          { timestamp: "2023-01-01T00:00:00Z", equity: 100 },
          { timestamp: "2023-01-03T00:00:00Z", equity: 110 },
        ],
      },
      {
        equity_curve: [
          { timestamp: "2023-01-02T00:00:00Z", equity: 200 },
          { timestamp: "2023-01-03T00:00:00Z", equity: 210 },
        ],
      },
    ];
    const result = alignEquityCurves(runs);
    expect(result).toHaveLength(3); // union of 3 unique timestamps
    const ts = result.map(p => p.timestamp);
    expect(ts).toEqual([
      "2023-01-01T00:00:00Z",
      "2023-01-02T00:00:00Z",
      "2023-01-03T00:00:00Z",
    ]);
  });

  it("fills missing timestamps with null for runs that lack data at that point", () => {
    const runs = [
      {
        equity_curve: [
          { timestamp: "2023-01-01T00:00:00Z", equity: 100 },
          { timestamp: "2023-01-03T00:00:00Z", equity: 110 },
        ],
      },
      {
        equity_curve: [
          { timestamp: "2023-01-02T00:00:00Z", equity: 200 },
          { timestamp: "2023-01-03T00:00:00Z", equity: 210 },
        ],
      },
    ];
    const result = alignEquityCurves(runs);
    // At 2023-01-01, run_0 has data, run_1 does not
    expect(result[0].run_0).toBe(100);
    expect(result[0].run_1).toBeNull();
    // At 2023-01-02, run_0 does not have data, run_1 does
    expect(result[1].run_0).toBeNull();
    expect(result[1].run_1).toBe(200);
    // At 2023-01-03, both have data
    expect(result[2].run_0).toBe(110);
    expect(result[2].run_1).toBe(210);
  });

  it("handles runs with entirely different non-overlapping timestamps", () => {
    const runs = [
      { equity_curve: [{ timestamp: "2023-01-01T00:00:00Z", equity: 100 }] },
      { equity_curve: [{ timestamp: "2023-01-02T00:00:00Z", equity: 200 }] },
    ];
    const result = alignEquityCurves(runs);
    expect(result).toHaveLength(2);
    expect(result[0].run_0).toBe(100);
    expect(result[0].run_1).toBeNull();
    expect(result[1].run_0).toBeNull();
    expect(result[1].run_1).toBe(200);
  });

  it("deduplicates duplicate timestamps within a single run", () => {
    const runs = [
      {
        equity_curve: [
          { timestamp: "2023-01-01T00:00:00Z", equity: 100 },
          { timestamp: "2023-01-01T00:00:00Z", equity: 105 }, // duplicate ts, second wins
        ],
      },
    ];
    const result = alignEquityCurves(runs);
    expect(result).toHaveLength(1);
    // The map overwrites with the last value for duplicate timestamps
    expect(result[0].run_0).toBe(105);
  });
});
