import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthApiClient, authKeys } from "@/lib/api/auth-client";
import * as api from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  default_fee_percent: null,
  default_slippage_percent: null,
  timezone_preference: "utc" as const,
  favorite_metrics: null,
  has_completed_onboarding: false,
};

const mockAuthResponse: AuthResponse = {
  token: "tok-abc123",
  user: mockUser,
};

describe("authKeys", () => {
  it("all() returns root scope key", () => {
    expect(authKeys.all()).toEqual(["auth"]);
  });
});

describe("AuthApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("calls POST /auth/login with email and password", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      await AuthApiClient.login("test@example.com", "secret");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "secret" }),
      });
    });

    it("returns the auth response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      const result = await AuthApiClient.login("test@example.com", "secret");
      expect(result).toEqual(mockAuthResponse);
    });
  });

  // ── signup ────────────────────────────────────────────────────────────────

  describe("signup()", () => {
    it("calls POST /auth/signup with email and password", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      await AuthApiClient.signup("new@example.com", "pass123");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "pass123" }),
      });
    });

    it("returns the auth response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      const result = await AuthApiClient.signup("new@example.com", "pass123");
      expect(result).toEqual(mockAuthResponse);
    });
  });

  // ── requestPasswordReset ──────────────────────────────────────────────────

  describe("requestPasswordReset()", () => {
    it("calls POST /auth/password-reset-request with email", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: "Email sent" });
      await AuthApiClient.requestPasswordReset("user@example.com");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/password-reset-request", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      });
    });

    it("returns the message string", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: "Check your inbox" });
      const result = await AuthApiClient.requestPasswordReset("user@example.com");
      expect(result).toBe("Check your inbox");
    });
  });

  // ── confirmPasswordReset ──────────────────────────────────────────────────

  describe("confirmPasswordReset()", () => {
    it("calls POST /auth/password-reset-confirm with token and new_password", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: "Password updated" });
      await AuthApiClient.confirmPasswordReset("reset-tok", "newpass");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/password-reset-confirm", {
        method: "POST",
        body: JSON.stringify({ token: "reset-tok", new_password: "newpass" }),
      });
    });

    it("returns the message string", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: "Password updated" });
      const result = await AuthApiClient.confirmPasswordReset("reset-tok", "newpass");
      expect(result).toBe("Password updated");
    });
  });

  // ── startOAuth ────────────────────────────────────────────────────────────

  describe("startOAuth()", () => {
    it("calls GET /auth/oauth/{provider}/start", async () => {
      mockApiFetch.mockResolvedValueOnce({ auth_url: "https://accounts.google.com/o/oauth2/auth?foo=bar" });
      await AuthApiClient.startOAuth("google");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/oauth/google/start");
    });

    it("returns the OAuthStartResponse", async () => {
      const resp = { auth_url: "https://accounts.google.com/o/oauth2/auth?foo=bar" };
      mockApiFetch.mockResolvedValueOnce(resp);
      const result = await AuthApiClient.startOAuth("google");
      expect(result).toEqual(resp);
    });
  });

  // ── completeOAuth ─────────────────────────────────────────────────────────

  describe("completeOAuth()", () => {
    it("calls POST /auth/oauth/{provider}/callback with code and state", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      await AuthApiClient.completeOAuth("github", "auth-code", "state-val");
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/oauth/github/callback", {
        method: "POST",
        body: JSON.stringify({ code: "auth-code", state: "state-val" }),
      });
    });

    it("returns the auth response", async () => {
      mockApiFetch.mockResolvedValueOnce(mockAuthResponse);
      const result = await AuthApiClient.completeOAuth("github", "auth-code", "state-val");
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
