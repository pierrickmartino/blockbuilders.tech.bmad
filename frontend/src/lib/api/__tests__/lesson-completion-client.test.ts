import { describe, it, expect, vi, beforeEach } from "vitest";
import { LessonCompletionApiClient } from "@/lib/api/lesson-completion-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

describe("LessonCompletionApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("record()", () => {
    it("calls POST /lesson-completion/record with the strategy_id", async () => {
      mockApiFetch.mockResolvedValueOnce({ lesson_id: null, completed_at: null });
      await LessonCompletionApiClient.record("strat-abc");
      expect(mockApiFetch).toHaveBeenCalledWith("/lesson-completion/record", {
        method: "POST",
        body: JSON.stringify({ strategy_id: "strat-abc" }),
      });
    });

    it("returns lesson_id and completed_at from the response", async () => {
      mockApiFetch.mockResolvedValueOnce({
        lesson_id: "lesson-1-rsi",
        completed_at: "2026-06-16T12:00:00Z",
      });
      const result = await LessonCompletionApiClient.record("strat-xyz");
      expect(result.lesson_id).toBe("lesson-1-rsi");
      expect(result.completed_at).toBe("2026-06-16T12:00:00Z");
    });

    it("returns null lesson_id and completed_at for non-lesson strategies", async () => {
      mockApiFetch.mockResolvedValueOnce({ lesson_id: null, completed_at: null });
      const result = await LessonCompletionApiClient.record("strat-blank");
      expect(result.lesson_id).toBeNull();
      expect(result.completed_at).toBeNull();
    });
  });
});
