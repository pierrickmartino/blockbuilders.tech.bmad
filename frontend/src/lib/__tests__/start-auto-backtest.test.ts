import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startAutoBacktest } from "../start-auto-backtest";
import { BacktestsApiClient } from "@/lib/api/backtests-client";
import { trackEvent } from "@/lib/analytics";
import type { BacktestCreateResponse } from "@/types/backtest";

vi.mock("@/lib/api/backtests-client", () => ({
  BacktestsApiClient: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockCreate = vi.mocked(BacktestsApiClient.create);
const mockTrackEvent = vi.mocked(trackEvent);

describe("startAutoBacktest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueues a backtest over the 1-year window (yearAgo → now) for the strategy", async () => {
    mockCreate.mockResolvedValue({ run_id: "run-123", status: "pending" } as BacktestCreateResponse);

    await startAutoBacktest({ strategyId: "strategy-1", entryPath: "nl_wedge", userId: "user-1" });

    expect(mockCreate).toHaveBeenCalledWith({
      strategy_id: "strategy-1",
      date_from: "2025-06-11T12:00:00.000Z",
      date_to: "2026-06-11T12:00:00.000Z",
    });
  });

  it("returns the runId from the create response", async () => {
    mockCreate.mockResolvedValue({ run_id: "run-123", status: "pending" } as BacktestCreateResponse);

    const result = await startAutoBacktest({ strategyId: "strategy-1", entryPath: "nl_wedge", userId: "user-1" });

    expect(result).toEqual({ runId: "run-123" });
  });

  it("fires auto_backtest_started with the nl_wedge source and the resolved nl_wedge cohort", async () => {
    mockCreate.mockResolvedValue({ run_id: "run-123", status: "pending" } as BacktestCreateResponse);

    await startAutoBacktest({ strategyId: "strategy-1", entryPath: "nl_wedge", userId: "user-1" });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "auto_backtest_started",
      {
        strategy_id: "strategy-1",
        run_id: "run-123",
        source: "nl_wedge",
        entry_path: "nl_wedge",
        authoring_mode: "nl",
      },
      "user-1"
    );
  });
});
