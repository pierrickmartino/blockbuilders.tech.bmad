import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrackApiClient, trackKeys } from "@/lib/api/track-client";
import * as api from "@/lib/api/internal/fetch";
import type { TrackView } from "@/types/track";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockTrackView: TrackView = {
  modules: [
    {
      id: "module-1-foundations",
      title: "Foundations",
      order: 1,
      lessons: [
        { id: "lesson-1-rsi", title: "RSI Oversold Bounce", order: 1, completed: false },
      ],
      completed_count: 0,
      total_count: 4,
      percent_complete: 0,
    },
  ],
  total_lessons: 12,
  completed_lessons: 0,
  percent_complete: 0,
  resume_lesson_id: "lesson-1-rsi",
};

describe("trackKeys", () => {
  it("all() returns root scope key", () => {
    expect(trackKeys.all()).toEqual(["track"]);
  });
});

describe("TrackApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTrack()", () => {
    it("calls GET /track", async () => {
      mockApiFetch.mockResolvedValueOnce(mockTrackView);
      await TrackApiClient.getTrack();
      expect(mockApiFetch).toHaveBeenCalledWith("/track");
    });

    it("returns the track view response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockTrackView);
      const result = await TrackApiClient.getTrack();
      expect(result).toEqual(mockTrackView);
    });
  });
});
