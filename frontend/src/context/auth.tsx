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
import { User, AuthResponse } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiFetch<User>("/users/me");
      setUser(userData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
  };

  const signup = async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, refreshUser }}
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
