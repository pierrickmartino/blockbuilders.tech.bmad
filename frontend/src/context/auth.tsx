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

interface AuthContextType {
  user: User | null;
  usage: Usage | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
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
  };

  const signup = async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
    refreshUsage();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setUsage(null);
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
