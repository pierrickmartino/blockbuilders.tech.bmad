import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { AuthProvider, useAuth } from "@/context/auth";
import * as authClientModule from "@/lib/api/auth-client";
import * as usersClientModule from "@/lib/api/users-client";
import * as analyticsModule from "@/lib/analytics";

vi.mock("@/lib/api/auth-client", () => ({
  AuthApiClient: {
    login: vi.fn(),
    signup: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    startOAuth: vi.fn(),
    completeOAuth: vi.fn(),
  },
  authKeys: { all: () => ["auth"] },
}));

vi.mock("@/lib/api/users-client", () => ({
  UsersApiClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    completeOnboarding: vi.fn(),
    getUsage: vi.fn(),
  },
  usersKeys: { all: () => ["users"], me: () => ["users", "me"] },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  identifyUser: vi.fn(),
  resetIdentity: vi.fn(),
}));

const mockAuthClient = vi.mocked(authClientModule.AuthApiClient);
const mockUsersClient = vi.mocked(usersClientModule.UsersApiClient);
const mockAnalytics = vi.mocked(analyticsModule);

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  default_fee_percent: null,
  default_slippage_percent: null,
  timezone_preference: "utc" as const,
  favorite_metrics: null,
  has_completed_onboarding: false,
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("AuthProvider cache-clear contract", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("logout() clears the TanStack Query cache", async () => {
    queryClient.setQueryData(["strategies"], [{ id: "s1" }]);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.logout();
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("login() clears the TanStack Query cache after success", async () => {
    queryClient.setQueryData(["strategies"], [{ id: "s1" }]);

    mockAuthClient.login.mockResolvedValueOnce({ token: "tok", user: mockUser });
    mockUsersClient.getProfile.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
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
        has_completed_onboarding: false,
      },
      usage: {
        strategies: { used: 0, limit: 5 },
        backtests_today: { used: 0, limit: 10, resets_at_utc: "2026-05-29T00:00:00Z" },
      },
      plan: {
        tier: "free",
        interval: null,
        status: null,
        max_strategies: 5,
        max_backtests_per_day: 10,
        max_history_days: 365,
      },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login("test@example.com", "secret");
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("signup() clears the TanStack Query cache after success", async () => {
    queryClient.setQueryData(["strategies"], [{ id: "s1" }]);

    mockAuthClient.signup.mockResolvedValueOnce({ token: "tok", user: mockUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup("new@example.com", "pass");
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe("AuthProvider analytics identity binding", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("identifies the user with PostHog after a successful email login", async () => {
    mockAuthClient.login.mockResolvedValueOnce({ token: "tok", user: mockUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login("test@example.com", "secret");
    });

    expect(mockAnalytics.identifyUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("identifies the user with PostHog after a successful signup", async () => {
    mockAuthClient.signup.mockResolvedValueOnce({ token: "tok", user: mockUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup("new@example.com", "pass");
    });

    expect(mockAnalytics.identifyUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("identifies the user with PostHog after a successful OAuth completion", async () => {
    mockAuthClient.completeOAuth.mockResolvedValueOnce({ token: "tok", user: mockUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.completeOAuth("google", "code", "state");
    });

    expect(mockAnalytics.identifyUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("resets the PostHog identity on logout", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.logout();
    });

    expect(mockAnalytics.resetIdentity).toHaveBeenCalledTimes(1);
  });
});
