import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfilePage from "../page";
import { UsersApiClient } from "@/lib/api/users-client";
import type { ProfileResponse } from "@/types/auth";

vi.mock("@/lib/api/users-client", () => ({
  UsersApiClient: {
    getProfile: vi.fn(),
  },
}));

const mockProfile: ProfileResponse = {
  id: "user-1",
  email: "test@example.com",
  settings: {
    default_fee_percent: null,
    default_slippage_percent: null,
    timezone_preference: "utc",
    theme_preference: "system",
    backtest_credit_balance: 0,
    extra_strategy_slots: 0,
    favorite_metrics: null,
    user_tier: "standard",
    digest_email_enabled: false,
    has_completed_onboarding: true,
  },
  usage: {
    strategies: { used: 0, limit: 10 },
    backtests_today: { used: 0, limit: 50, resets_at_utc: "2026-06-18T00:00:00Z" },
  },
  plan: {
    tier: "free",
    interval: null,
    status: null,
    max_strategies: 10,
    max_backtests_per_day: 50,
    max_history_days: 365,
  },
};

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UsersApiClient.getProfile).mockResolvedValue(mockProfile);
  });

  it("renders the Account card", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Account")).toBeInTheDocument();
    });
  });

  it("does not render the Public Profile card after loading", async () => {
    render(<ProfilePage />);
    // Wait for page load to complete (Account card must be visible)
    await waitFor(() => {
      expect(screen.getByText("Account")).toBeInTheDocument();
    });
    // Only now assert the card is absent
    expect(screen.queryByText("Public Profile")).not.toBeInTheDocument();
  });
});
