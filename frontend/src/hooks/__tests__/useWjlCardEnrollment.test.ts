import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWjlCardEnrollment } from "../useWjlCardEnrollment";
import { useResultViewedTracking } from "../useResultViewedTracking";
import { getExperimentVariant } from "@/lib/experiment-variant";
import { markSummaryCardSeen } from "@/lib/summary-card-storage";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/experiment-variant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/experiment-variant")>(
    "@/lib/experiment-variant"
  );
  return {
    ...actual,
    getExperimentVariant: vi.fn(),
  };
});

vi.mock("@/lib/summary-card-storage", () => ({
  markSummaryCardSeen: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockGetExperimentVariant = vi.mocked(getExperimentVariant);
const mockMarkSummaryCardSeen = vi.mocked(markSummaryCardSeen);
const mockTrackEvent = vi.mocked(trackEvent);

describe("useWjlCardEnrollment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the card and closes the gate for the test variant (show-once)", () => {
    mockGetExperimentVariant.mockReturnValue("test");

    const { result } = renderHook(() => useWjlCardEnrollment(true));

    expect(result.current).toBe(true);
    expect(mockMarkSummaryCardSeen).toHaveBeenCalledTimes(1);
  });

  it("renders the card and preserves persist-until-dismissed for an undefined variant (unenrolled)", () => {
    mockGetExperimentVariant.mockReturnValue(undefined);

    const { result } = renderHook(() => useWjlCardEnrollment(true));

    expect(result.current).toBe(true);
    expect(mockMarkSummaryCardSeen).not.toHaveBeenCalled();
  });

  it("suppresses the card and closes the gate for the control variant", () => {
    mockGetExperimentVariant.mockReturnValue("control");
    const onSuppressSession = vi.fn();

    const { result } = renderHook(() => useWjlCardEnrollment(true, onSuppressSession));

    expect(result.current).toBe(false);
    expect(mockMarkSummaryCardSeen).toHaveBeenCalledTimes(1);
    expect(onSuppressSession).toHaveBeenCalledTimes(1);
  });

  it("does not call onSuppressSession for the test variant", () => {
    mockGetExperimentVariant.mockReturnValue("test");
    const onSuppressSession = vi.fn();

    renderHook(() => useWjlCardEnrollment(true, onSuppressSession));

    expect(onSuppressSession).not.toHaveBeenCalled();
  });

  it("does not call onSuppressSession for an undefined variant", () => {
    mockGetExperimentVariant.mockReturnValue(undefined);
    const onSuppressSession = vi.fn();

    renderHook(() => useWjlCardEnrollment(true, onSuppressSession));

    expect(onSuppressSession).not.toHaveBeenCalled();
  });

  it("does not render the card and does not read the variant when not eligible (e.g. benchmark-null first run)", () => {
    const { result } = renderHook(() => useWjlCardEnrollment(false));

    expect(result.current).toBe(false);
    expect(mockGetExperimentVariant).not.toHaveBeenCalled();
    expect(mockMarkSummaryCardSeen).not.toHaveBeenCalled();
  });

  it("reads the variant only once across re-renders (enrollment happens at the first eligible verdict)", () => {
    mockGetExperimentVariant.mockReturnValue("test");

    const { rerender } = renderHook(
      ({ eligible }) => useWjlCardEnrollment(eligible),
      { initialProps: { eligible: true } }
    );

    rerender({ eligible: true });
    rerender({ eligible: true });

    expect(mockGetExperimentVariant).toHaveBeenCalledTimes(1);
  });
});

describe("useWjlCardEnrollment + useResultViewedTracking (regression guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["control", "test", undefined] as const)(
    "results_viewed fires exactly once per run_id when the wjl variant is %s",
    (variant) => {
      mockGetExperimentVariant.mockReturnValue(variant);

      renderHook(() => {
        useWjlCardEnrollment(true);
        useResultViewedTracking({
          runId: `run-${String(variant)}`,
          status: "completed",
          strategyId: "strat-1",
          entryPath: null,
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "results_viewed",
        expect.objectContaining({ run_id: `run-${String(variant)}` }),
        undefined
      );
    }
  );
});
