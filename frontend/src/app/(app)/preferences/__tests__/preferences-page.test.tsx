import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PreferencesPage from "../page";
import { UsersApiClient } from "@/lib/api/users-client";
import type { ProfileResponse } from "@/types/auth";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/context/display", () => ({
  useDisplay: () => ({
    timezone: "utc",
    setTimezone: vi.fn(),
    theme: "system",
    setTheme: vi.fn(),
    nodeDisplayMode: "compact",
    setNodeDisplayMode: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  getConsent: vi.fn(() => null),
  setConsent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/users-client", () => ({
  UsersApiClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
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

describe("PreferencesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UsersApiClient.getProfile).mockResolvedValue(mockProfile);
  });

  it("renders the Backtest Defaults card", async () => {
    render(<PreferencesPage />);
    await waitFor(() => {
      expect(screen.getByText("Backtest Defaults")).toBeInTheDocument();
    });
  });

  it("does not render the Email Digest card", async () => {
    render(<PreferencesPage />);
    await waitFor(() => {
      expect(screen.getByText("Backtest Defaults")).toBeInTheDocument();
    });
    expect(screen.queryByText("Email Digest")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Strategy Digest")).not.toBeInTheDocument();
  });
});
