import { renderHook, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useResultViewedTracking } from "../useResultViewedTracking";
import { trackEvent } from "@/lib/analytics";
import type { StrategyEntryPath } from "@/types/strategy";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockTrackEvent = vi.mocked(trackEvent);

describe("useResultViewedTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires results_viewed once when the run is completed", () => {
    renderHook(() =>
      useResultViewedTracking({
        runId: "run-fires-once",
        status: "completed",
        strategyId: "strat-1",
        entryPath: null,
      })
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "results_viewed",
      expect.objectContaining({ run_id: "run-fires-once" }),
      undefined
    );
  });

  it.each(["pending", "running", "failed"] as const)(
    "does not fire results_viewed when status is %s",
    (status) => {
      renderHook(() =>
        useResultViewedTracking({
          runId: `run-${status}`,
          status,
          strategyId: "strat-1",
          entryPath: null,
        })
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    }
  );

  it.each([
    [null, "unknown", "unknown"],
    ["wizard", "wizard", "manual"],
    ["blank_canvas", "blank_canvas", "manual"],
    ["template_clone", "template_clone", "manual"],
    ["nl_wedge", "nl_wedge", "nl"],
  ] as const)(
    "resolves the persisted entry_path %s into the cohort { entry_path: %s, authoring_mode: %s } the payload carries",
    (persistedEntryPath, expectedEntryPath, expectedAuthoringMode) => {
      renderHook(() =>
        useResultViewedTracking({
          runId: `run-payload-${expectedEntryPath}`,
          status: "completed",
          strategyId: "strat-payload",
          entryPath: persistedEntryPath,
          userId: "user-1",
        })
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "results_viewed",
        {
          strategy_id: "strat-payload",
          run_id: `run-payload-${expectedEntryPath}`,
          entry_path: expectedEntryPath,
          authoring_mode: expectedAuthoringMode,
        },
        "user-1"
      );
    }
  );

  it("maps an unrecognised persisted entry_path to the unknown cohort instead of passing it through", () => {
    renderHook(() =>
      useResultViewedTracking({
        runId: "run-payload-garbage",
        status: "completed",
        strategyId: "strat-payload",
        entryPath: "not-a-real-path" as unknown as StrategyEntryPath,
        userId: "user-1",
      })
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "results_viewed",
      {
        strategy_id: "strat-payload",
        run_id: "run-payload-garbage",
        entry_path: "unknown",
        authoring_mode: "unknown",
      },
      "user-1"
    );
  });

  it("does not emit a duplicate event on re-render, remount, or a changed entry_path for the same runId", () => {
    const props: {
      runId: string;
      status: "completed";
      strategyId: string;
      entryPath: StrategyEntryPath | null;
    } = {
      runId: "run-dedup",
      status: "completed",
      strategyId: "strat-1",
      entryPath: null,
    };

    const { rerender, unmount } = renderHook(
      (overrides: Partial<typeof props> = {}) =>
        useResultViewedTracking({ ...props, ...overrides }),
      { initialProps: {} }
    );

    // Re-render with the same runId (e.g. unrelated state change)
    rerender({ entryPath: null });

    // Cross-entry-path navigation to the same run: the persisted entry_path
    // now resolves to a different cohort, but the run is already tracked —
    // the enlarged payload must not affect the once-per-run_id dedup key.
    rerender({ entryPath: "wizard" });

    // Remount: unmount the host component, then mount it again
    unmount();
    cleanup();
    renderHook(() => useResultViewedTracking({ ...props, entryPath: "blank_canvas" }));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
