import { apiFetch } from "@/lib/api/internal/fetch";
import type { AuthResponse } from "@/types/auth";

interface OAuthStartResponse {
  auth_url: string;
}

interface MessageResponse {
  message: string;
}

export const authKeys = {
  all: (): string[] => ["auth"],
};

export const AuthApiClient = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async requestPasswordReset(email: string): Promise<string> {
    const response = await apiFetch<MessageResponse>("/auth/password-reset-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return response.message;
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<string> {
    const response = await apiFetch<MessageResponse>("/auth/password-reset-confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return response.message;
  },

  async startOAuth(provider: "google" | "github"): Promise<OAuthStartResponse> {
    return apiFetch<OAuthStartResponse>(`/auth/oauth/${provider}/start`);
  },

  async completeOAuth(provider: string, code: string, state: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>(`/auth/oauth/${provider}/callback`, {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
  },
};
