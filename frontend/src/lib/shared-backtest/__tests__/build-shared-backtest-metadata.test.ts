import { describe, it, expect } from "vitest";
import { buildSharedBacktestMetadata } from "../build-shared-backtest-metadata";
import type { PublicBacktestView } from "@/types/backtest";

/** Narrows `Metadata["twitter"]` to the summary_large_image shape used by this builder. */
function twitterCard(metadata: ReturnType<typeof buildSharedBacktestMetadata>) {
  return metadata.twitter as
    | { card?: string; title?: string; description?: string }
    | null
    | undefined;
}

function makeView(overrides: Partial<PublicBacktestView["summary"]> = {}): PublicBacktestView {
  return {
    asset: "BTC/USDT",
    timeframe: "1d",
    date_from: "2025-01-01T00:00:00Z",
    date_to: "2026-01-01T00:00:00Z",
    summary: {
      initial_balance: 10000,
      final_balance: 11234,
      total_return_pct: 12.34,
      cagr_pct: 12.34,
      max_drawdown_pct: -5.5,
      num_trades: 20,
      win_rate_pct: 55,
      benchmark_return_pct: 8,
      alpha: 1,
      beta: 0.9,
      sharpe_ratio: 1.2,
      sortino_ratio: 1.5,
      calmar_ratio: 2.1,
      max_consecutive_losses: 2,
      ...overrides,
    },
    equity_curve: [{ timestamp: "2025-01-01T00:00:00Z", equity: 10000 }],
  };
}

describe("buildSharedBacktestMetadata", () => {
  it("returns a noindex not-found metadata when the public view is null", () => {
    const metadata = buildSharedBacktestMetadata(null, "missing-token");

    expect(metadata.title).toMatch(/not found/i);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("frames a positive return as a gain in title, description, and OG/Twitter tags", () => {
    const view = makeView({ total_return_pct: 12.34 });

    const metadata = buildSharedBacktestMetadata(view, "abc123");

    expect(metadata.title).toContain("BTC/USDT");
    expect(metadata.title).toMatch(/gained 12\.34%/i);
    expect(metadata.description).toContain("BTC/USDT");
    expect(metadata.description).toMatch(/gained 12\.34%/i);

    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.description).toBe(metadata.description);

    expect(twitterCard(metadata)?.card).toBe("summary_large_image");
    expect(twitterCard(metadata)?.title).toBe(metadata.title);
    expect(twitterCard(metadata)?.description).toBe(metadata.description);
  });

  it("frames a negative return honestly as a loss rather than hiding it", () => {
    const view = makeView({ total_return_pct: -8.5 });

    const metadata = buildSharedBacktestMetadata(view, "abc123");

    expect(metadata.title).toMatch(/lost 8\.50%/i);
    expect(metadata.title).not.toMatch(/gained/i);
    expect(metadata.description).toMatch(/lost 8\.50%/i);
    expect(twitterCard(metadata)?.card).toBe("summary_large_image");
  });
});
