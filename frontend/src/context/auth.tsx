"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { AuthApiClient } from "@/lib/api/auth-client";
import { UsersApiClient } from "@/lib/api/users-client";
import { User, Usage, ProfileResponse } from "@/types/auth";
import {
  trackEvent,
  identifyUser,
  resetIdentity,
  getConsent,
} from "@/lib/analytics";

/**
 * Best-effort sync of a *decided* local analytics-consent choice to the
 * backend after authentication, so the "decide consent before logging in"
 * flow reaches the server and the worker can honor it. Never blocks or fails
 * the auth flow — analytics consent is non-critical to signing in.
 */
async function syncConsentToServer(): Promise<void> {
  const consent = getConsent();
  if (consent === null) return;
  try {
    await UsersApiClient.syncAnalyticsConsent(consent === "accepted");
  } catch {
    // Non-critical: a failed consent sync must not break authentication.
  }
}

interface AuthContextType {
  user: User | null;
  usage: Usage | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  refreshUsage: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<string>;
  startOAuth: (provider: "google" | "github") => Promise<void>;
  completeOAuth: (provider: string, code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const profileData: ProfileResponse = await UsersApiClient.getProfile();
      const nextUser: User = {
        id: profileData.id,
        email: profileData.email,
        default_fee_percent: profileData.settings.default_fee_percent,
        default_slippage_percent: profileData.settings.default_slippage_percent,
        timezone_preference: profileData.settings.timezone_preference,
        favorite_metrics: profileData.settings.favorite_metrics,
        has_completed_onboarding: profileData.settings.has_completed_onboarding,
      };
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
        setUsage(null);
      }
      return null;
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const usageData = await UsersApiClient.getUsage();
      setUsage(usageData);
    } catch {
      // Silently ignore - usage display is nice-to-have
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      Promise.all([refreshUser(), refreshUsage()]).finally(() =>
        setIsLoading(false)
      );
    } else {
      setIsLoading(false);
    }
  }, [refreshUser, refreshUsage]);

  const login = async (email: string, password: string) => {
    const response = await AuthApiClient.login(email, password);
    queryClient.clear();
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    identifyUser(response.user.id);
    trackEvent("login_completed", { method: "email" }, response.user.id);
    syncConsentToServer();
  };

  const signup = async (email: string, password: string) => {
    const response = await AuthApiClient.signup(email, password);
    queryClient.clear();
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    identifyUser(response.user.id);
    trackEvent("signup_completed", { method: "email" }, response.user.id);
    syncConsentToServer();
  };

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    setUser(null);
    setUsage(null);
    resetIdentity();
  };

  const requestPasswordReset = async (email: string): Promise<string> => {
    return AuthApiClient.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<string> => {
    return AuthApiClient.confirmPasswordReset(token, newPassword);
  };

  const startOAuth = async (provider: "google" | "github"): Promise<void> => {
    const response = await AuthApiClient.startOAuth(provider);

    const url = new URL(response.auth_url);
    const allowedHosts = ["accounts.google.com", "github.com"];
    if (!allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      throw new Error("Invalid OAuth provider URL");
    }

    localStorage.setItem("oauth_provider", provider);
    window.location.href = response.auth_url;
  };

  const completeOAuth = async (provider: string, code: string, state: string): Promise<void> => {
    const response = await AuthApiClient.completeOAuth(provider, code, state);
    queryClient.clear();
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    identifyUser(response.user.id);
    // First-time OAuth sign-ups emit the canonical `signup_completed` so they
    // enter the activation funnel (ADR-0008); returning users emit
    // `login_completed`. This mirrors the email signup/login split.
    if (response.is_new_user) {
      trackEvent("signup_completed", { method: `oauth_${provider}` }, response.user.id);
    } else {
      trackEvent("login_completed", { method: `oauth_${provider}` }, response.user.id);
    }
    syncConsentToServer();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usage,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        refreshUsage,
        requestPasswordReset,
        confirmPasswordReset,
        startOAuth,
        completeOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
