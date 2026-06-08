import { renderHook, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useResultViewedTracking } from "../useResultViewedTracking";
import { trackEvent } from "@/lib/analytics";

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
        entryPath: "unknown",
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
          entryPath: "unknown",
        })
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    }
  );

  it.each(["unknown", "wizard", "nl_wedge", "blank_canvas", "template_clone"] as const)(
    "sends the standardized payload with entry_path %s",
    (entryPath) => {
      renderHook(() =>
        useResultViewedTracking({
          runId: `run-payload-${entryPath}`,
          status: "completed",
          strategyId: "strat-payload",
          entryPath,
          userId: "user-1",
        })
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "results_viewed",
        {
          strategy_id: "strat-payload",
          run_id: `run-payload-${entryPath}`,
          entry_path: entryPath,
        },
        "user-1"
      );
    }
  );

  it("does not emit a duplicate event on re-render or remount for the same runId", () => {
    const props = {
      runId: "run-dedup",
      status: "completed" as const,
      strategyId: "strat-1",
      entryPath: "unknown" as const,
    };

    const { rerender, unmount } = renderHook(
      (overrides: Partial<typeof props> = {}) =>
        useResultViewedTracking({ ...props, ...overrides }),
      { initialProps: {} }
    );

    // Re-render with the same runId (e.g. unrelated state change)
    rerender({ entryPath: "unknown" });
    rerender({ entryPath: "unknown" });

    // Remount: unmount the host component, then mount it again
    unmount();
    cleanup();
    renderHook(() => useResultViewedTracking(props));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
