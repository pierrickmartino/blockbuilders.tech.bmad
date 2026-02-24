"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { User, AuthResponse, Usage, ProfileResponse } from "@/types/auth";
import { trackEvent } from "@/lib/analytics";

interface OAuthStartResponse {
  auth_url: string;
}

interface MessageResponse {
  message: string;
}

interface AuthContextType {
  user: User | null;
  usage: Usage | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

  const refreshUser = useCallback(async () => {
    try {
      const profileData = await apiFetch<ProfileResponse>("/users/me");
      setUser({
        id: profileData.id,
        email: profileData.email,
        default_fee_percent: profileData.settings.default_fee_percent,
        default_slippage_percent: profileData.settings.default_slippage_percent,
        timezone_preference: profileData.settings.timezone_preference,
        favorite_metrics: profileData.settings.favorite_metrics,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
        setUsage(null);
      }
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const usageData = await apiFetch<Usage>("/usage/me");
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
    const response = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    trackEvent("login_completed", { method: "email" }, response.user.id);
  };

  const signup = async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    trackEvent("signup_completed", { method: "email" }, response.user.id);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setUsage(null);
  };

  const requestPasswordReset = async (email: string): Promise<string> => {
    const response = await apiFetch<MessageResponse>("/auth/password-reset-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return response.message;
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<string> => {
    const response = await apiFetch<MessageResponse>("/auth/password-reset-confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return response.message;
  };

  const startOAuth = async (provider: "google" | "github"): Promise<void> => {
    const response = await apiFetch<OAuthStartResponse>(`/auth/oauth/${provider}/start`);

    // Validate OAuth redirect URL (should be Google or GitHub)
    const url = new URL(response.auth_url);
    const allowedHosts = ["accounts.google.com", "github.com"];
    if (!allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      throw new Error("Invalid OAuth provider URL");
    }

    localStorage.setItem("oauth_provider", provider);
    window.location.href = response.auth_url;
  };

  const completeOAuth = async (provider: string, code: string, state: string): Promise<void> => {
    const response = await apiFetch<AuthResponse>(`/auth/oauth/${provider}/callback`, {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
    trackEvent("login_completed", { method: `oauth_${provider}` }, response.user.id);
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
