import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProgressApiClient, progressKeys } from "@/lib/api/progress-client";
import * as api from "@/lib/api/internal/fetch";
import type { MilestoneItem, ProgressResponse } from "@/types/progress";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockMilestones: MilestoneItem[] = [
  { key: "first_strategy", label: "Created first strategy", done: true },
  { key: "saved_version", label: "Saved a strategy version", done: true },
  { key: "first_backtest", label: "Ran first backtest", done: false },
  { key: "reviewed_results", label: "Reviewed results", done: false },
];

const mockProgress: ProgressResponse = {
  strategies_count: 3,
  strategy_versions_count: 7,
  completed_backtests_count: 12,
  milestones: {
    total: 4,
    completed: 2,
    items: mockMilestones,
  },
  achievements: {
    total: 4,
    unlocked: 2,
    latest: { key: "first-backtest", label: "First Backtest" },
  },
  next_steps: ["Run your first backtest", "Publish a strategy"],
};

describe("progressKeys", () => {
  it("all() returns root scope key", () => {
    expect(progressKeys.all()).toEqual(["progress"]);
  });
});

describe("ProgressApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getProgress ───────────────────────────────────────────────────────────

  describe("getProgress()", () => {
    it("calls GET /progress", async () => {
      mockApiFetch.mockResolvedValueOnce(mockProgress);
      await ProgressApiClient.getProgress();
      expect(mockApiFetch).toHaveBeenCalledWith("/progress");
    });

    it("returns the progress response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockProgress);
      const result = await ProgressApiClient.getProgress();
      expect(result).toEqual(mockProgress);
    });
  });
});
