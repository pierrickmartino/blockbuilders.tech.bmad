import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSharedBacktestView } from "../get-shared-backtest-view";
import type { PublicBacktestView } from "@/types/backtest";

const samplePublicView: PublicBacktestView = {
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
  },
  equity_curve: [{ timestamp: "2025-01-01T00:00:00Z", equity: 10000 }],
  fee_rate: 0.001,
  slippage_rate: 0.0005,
  spread_rate: 0.0002,
};

describe("getSharedBacktestView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed public view on a successful response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(samplePublicView), { status: 200 })
    );

    const result = await getSharedBacktestView("valid-token");

    expect(result).toEqual(samplePublicView);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/backtests/share/valid-token"),
      expect.any(Object)
    );
  });

  it("returns null when the token is unknown or expired (404)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "Share link not found" }), { status: 404 })
    );

    const result = await getSharedBacktestView("expired-token");

    expect(result).toBeNull();
  });

  it("returns null when the request itself fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    const result = await getSharedBacktestView("any-token");

    expect(result).toBeNull();
  });
});
