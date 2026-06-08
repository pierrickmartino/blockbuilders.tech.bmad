import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackBacktestStarted } from "../backtest-tracking";
import { trackEvent } from "@/lib/analytics";
import type { StrategyEntryPath } from "@/types/strategy";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockTrackEvent = vi.mocked(trackEvent);

describe("trackBacktestStarted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [null, "unknown", "unknown"],
    ["wizard", "wizard", "manual"],
    ["blank_canvas", "blank_canvas", "manual"],
    ["template_clone", "template_clone", "manual"],
    ["nl_wedge", "nl_wedge", "nl"],
  ] as const)(
    "resolves the persisted entry_path %s into the cohort { entry_path: %s, authoring_mode: %s } the backtest_started payload carries",
    (persistedEntryPath, expectedEntryPath, expectedAuthoringMode) => {
      trackBacktestStarted({
        strategyId: "strat-1",
        entryPath: persistedEntryPath,
        runId: "run-1",
        dateFrom: "2025-01-01",
        dateTo: "2026-01-01",
        userId: "user-1",
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "backtest_started",
        {
          strategy_id: "strat-1",
          run_id: "run-1",
          date_from: "2025-01-01",
          date_to: "2026-01-01",
          entry_path: expectedEntryPath,
          authoring_mode: expectedAuthoringMode,
        },
        "user-1"
      );
    }
  );

  it("maps an unrecognised persisted entry_path to the unknown cohort instead of passing it through", () => {
    trackBacktestStarted({
      strategyId: "strat-1",
      entryPath: "not-a-real-path" as unknown as StrategyEntryPath,
      runId: "run-1",
      dateFrom: "2025-01-01",
      dateTo: "2026-01-01",
      userId: "user-1",
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "backtest_started",
      expect.objectContaining({ entry_path: "unknown", authoring_mode: "unknown" }),
      "user-1"
    );
  });
});
