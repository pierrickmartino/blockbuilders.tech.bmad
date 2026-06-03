import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocialApiClient, socialKeys } from "@/lib/api/social-client";
import * as api from "@/lib/api/internal/fetch";
import type { PublicProfile } from "@/types/profile";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockPublicProfile: PublicProfile = {
  handle: "trendbuilder",
  display_name: "Trend Builder",
  bio: "Trading the trend since 2020",
  follower_count: 42,
  published_strategies: [{ id: "strat-1", name: "BTC Momentum" }],
  contributions: {
    published_strategies: 1,
    completed_backtests: 55,
  },
  badges: [{ key: "early-access", label: "Early Access" }],
};

describe("socialKeys", () => {
  it("all() returns root scope key", () => {
    expect(socialKeys.all()).toEqual(["social"]);
  });

  it("profile(handle) returns handle-scoped key", () => {
    expect(socialKeys.profile("trendbuilder")).toEqual([
      "social",
      "profile",
      "trendbuilder",
    ]);
  });
});

describe("SocialApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getPublicProfile ──────────────────────────────────────────────────────

  describe("getPublicProfile()", () => {
    it("calls GET /profiles/:handle", async () => {
      mockApiFetch.mockResolvedValueOnce(mockPublicProfile);
      await SocialApiClient.getPublicProfile("trendbuilder");
      expect(mockApiFetch).toHaveBeenCalledWith("/profiles/trendbuilder");
    });

    it("returns the public profile", async () => {
      mockApiFetch.mockResolvedValueOnce(mockPublicProfile);
      const result = await SocialApiClient.getPublicProfile("trendbuilder");
      expect(result).toEqual(mockPublicProfile);
    });
  });
});
