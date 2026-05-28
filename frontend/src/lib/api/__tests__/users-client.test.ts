import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersApiClient, usersKeys } from "@/lib/api/users-client";
import * as api from "@/lib/api";
import type { ProfileResponse, UserUpdateRequest } from "@/types/auth";

vi.mock("@/lib/api", () => ({
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
});
