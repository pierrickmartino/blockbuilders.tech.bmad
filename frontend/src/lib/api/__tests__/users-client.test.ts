import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersApiClient, usersKeys } from "@/lib/api/users-client";
import * as api from "@/lib/api/internal/fetch";
import type { ProfileResponse, UserUpdateRequest } from "@/types/auth";
import type { ProfileSettings, ProfileUpdateRequest } from "@/types/profile";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockUsage = {
  strategies_count: 2,
  strategies_limit: 5,
  backtests_today_count: 1,
  backtests_daily_limit: 10,
  backtests_reset_at: "2026-05-29T00:00:00Z",
};

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

const mockProfile: ProfileResponse = {
  id: "user-1",
  email: "test@example.com",
  settings: {
    default_fee_percent: null,
    default_slippage_percent: null,
    timezone_preference: "utc",
    theme_preference: "system",
    backtest_credit_balance: 10,
    extra_strategy_slots: 0,
    favorite_metrics: null,
    user_tier: "standard",
    digest_email_enabled: false,
    has_completed_onboarding: false,
  },
  usage: {
    strategies: { used: 2, limit: 5 },
    backtests_today: { used: 1, limit: 10, resets_at_utc: "2026-05-29T00:00:00Z" },
  },
  plan: {
    tier: "free",
    interval: null,
    status: null,
    max_strategies: 5,
    max_backtests_per_day: 10,
    max_history_days: 365,
  },
};

describe("usersKeys", () => {
  it("all() returns root scope key", () => {
    expect(usersKeys.all()).toEqual(["users"]);
  });

  it("me() returns the current-user key", () => {
    expect(usersKeys.me()).toEqual(["users", "me"]);
  });
});

describe("UsersApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe("getProfile()", () => {
    it("calls GET /users/me", async () => {
      mockApiFetch.mockResolvedValueOnce(mockProfile);
      await UsersApiClient.getProfile();
      expect(mockApiFetch).toHaveBeenCalledWith("/users/me");
    });

    it("returns the profile response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockProfile);
      const result = await UsersApiClient.getProfile();
      expect(result).toEqual(mockProfile);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe("updateProfile()", () => {
    it("calls PATCH /users/me with the update body", async () => {
      const update: UserUpdateRequest = { timezone_preference: "local" };
      mockApiFetch.mockResolvedValueOnce(mockProfile);
      await UsersApiClient.updateProfile(update);
      expect(mockApiFetch).toHaveBeenCalledWith("/users/me", {
        method: "PUT",
        body: JSON.stringify(update),
      });
    });

    it("returns the updated profile", async () => {
      mockApiFetch.mockResolvedValueOnce(mockProfile);
      const result = await UsersApiClient.updateProfile({});
      expect(result).toEqual(mockProfile);
    });
  });

  // ── completeOnboarding ────────────────────────────────────────────────────

  describe("completeOnboarding()", () => {
    it("calls POST /users/me/complete-onboarding with no body", async () => {
      await UsersApiClient.completeOnboarding();
      expect(mockApiFetchVoid).toHaveBeenCalledWith("/users/me/complete-onboarding", {
        method: "POST",
      });
    });
  });

  // ── getUsage ──────────────────────────────────────────────────────────────

  describe("getUsage()", () => {
    it("calls GET /usage/me", async () => {
      mockApiFetch.mockResolvedValueOnce(mockUsage);
      await UsersApiClient.getUsage();
      expect(mockApiFetch).toHaveBeenCalledWith("/usage/me");
    });

    it("returns the usage response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockUsage);
      const result = await UsersApiClient.getUsage();
      expect(result).toEqual(mockUsage);
    });
  });

  // ── getProfileSettings ────────────────────────────────────────────────────

  describe("getProfileSettings()", () => {
    const mockSettings: ProfileSettings = {
      is_public: true,
      handle: "trendbuilder",
      display_name: "Trend Builder",
      bio: "Trading since 2020",
      show_strategies: true,
      show_contributions: true,
      show_badges: false,
      follower_count: 12,
    };

    it("calls GET /profiles/me/settings", async () => {
      mockApiFetch.mockResolvedValueOnce(mockSettings);
      await UsersApiClient.getProfileSettings();
      expect(mockApiFetch).toHaveBeenCalledWith("/profiles/me/settings");
    });

    it("returns the profile settings", async () => {
      mockApiFetch.mockResolvedValueOnce(mockSettings);
      const result = await UsersApiClient.getProfileSettings();
      expect(result).toEqual(mockSettings);
    });
  });

  // ── updateProfileSettings ─────────────────────────────────────────────────

  describe("updateProfileSettings()", () => {
    const mockSettings: ProfileSettings = {
      is_public: false,
      handle: null,
      display_name: null,
      bio: null,
      show_strategies: true,
      show_contributions: true,
      show_badges: true,
      follower_count: 0,
    };

    it("calls PUT /profiles/me/settings with the update body", async () => {
      const update: ProfileUpdateRequest = { is_public: false };
      mockApiFetch.mockResolvedValueOnce(mockSettings);
      await UsersApiClient.updateProfileSettings(update);
      expect(mockApiFetch).toHaveBeenCalledWith("/profiles/me/settings", {
        method: "PUT",
        body: JSON.stringify(update),
      });
    });

    it("returns the updated settings", async () => {
      mockApiFetch.mockResolvedValueOnce(mockSettings);
      const result = await UsersApiClient.updateProfileSettings({});
      expect(result).toEqual(mockSettings);
    });
  });

  // ── usersKeys extensions ──────────────────────────────────────────────────

  describe("usersKeys extensions", () => {
    it("profileSettings() returns the profile-settings key", () => {
      expect(usersKeys.profileSettings()).toEqual(["users", "profileSettings"]);
    });
  });
});
