import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLessonCompletion } from "../useLessonCompletion";
import { LessonCompletionApiClient } from "@/lib/api/lesson-completion-client";

vi.mock("@/lib/api/lesson-completion-client", () => ({
  LessonCompletionApiClient: {
    record: vi.fn(),
  },
}));

const mockRecord = vi.mocked(LessonCompletionApiClient.record);

describe("useLessonCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls record() once when status becomes completed", async () => {
    mockRecord.mockResolvedValueOnce({ lesson_id: "lesson-1-rsi", completed_at: "2026-06-16T12:00:00Z" });

    renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: "run-1", status: "completed" })
    );

    await waitFor(() => {
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledWith("strat-1");
    });
  });

  it("does not call record() when status is pending", () => {
    renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: "run-1", status: "pending" })
    );
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("does not call record() when status is running", () => {
    renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: "run-1", status: "running" })
    );
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("does not call record() when runId is null", () => {
    renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: null, status: "completed" })
    );
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("returns lessonId and completedAt after record() resolves", async () => {
    mockRecord.mockResolvedValueOnce({ lesson_id: "lesson-1-rsi", completed_at: "2026-06-16T12:00:00Z" });

    const { result } = renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: "run-1", status: "completed" })
    );

    await waitFor(() => {
      expect(result.current.lessonId).toBe("lesson-1-rsi");
      expect(result.current.completedAt).toBe("2026-06-16T12:00:00Z");
    });
  });

  it("does not call record() twice for the same runId on re-render", async () => {
    mockRecord.mockResolvedValue({ lesson_id: "lesson-1-rsi", completed_at: "2026-06-16T12:00:00Z" });

    const { rerender } = renderHook(
      ({ runId }: { runId: string }) =>
        useLessonCompletion({ strategyId: "strat-1", runId, status: "completed" }),
      { initialProps: { runId: "run-dedup" } }
    );

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));

    rerender({ runId: "run-dedup" });
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it("calls record() again for a different runId", async () => {
    mockRecord.mockResolvedValue({ lesson_id: "lesson-1-rsi", completed_at: "2026-06-16T12:00:00Z" });

    const { rerender } = renderHook(
      ({ runId }: { runId: string }) =>
        useLessonCompletion({ strategyId: "strat-1", runId, status: "completed" }),
      { initialProps: { runId: "run-A" } }
    );

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));

    rerender({ runId: "run-B" });

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(2));
  });

  it("silently ignores record() failures without throwing", async () => {
    mockRecord.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() =>
      useLessonCompletion({ strategyId: "strat-1", runId: "run-fail", status: "completed" })
    );

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    expect(result.current.lessonId).toBeNull();
  });
});
