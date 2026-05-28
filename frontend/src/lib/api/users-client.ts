import { apiFetch, apiFetchVoid } from "@/lib/api";
import type { ProfileResponse, UserUpdateRequest, Usage } from "@/types/auth";

export const usersKeys = {
  all: (): string[] => ["users"],
  me: (): string[] => ["users", "me"],
};

export const UsersApiClient = {
  async getProfile(): Promise<ProfileResponse> {
    return apiFetch<ProfileResponse>("/users/me");
  },

  async updateProfile(data: UserUpdateRequest): Promise<ProfileResponse> {
    return apiFetch<ProfileResponse>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async completeOnboarding(): Promise<void> {
    await apiFetchVoid("/users/me/complete-onboarding", { method: "POST" });
  },

  async getUsage(): Promise<Usage> {
    return apiFetch<Usage>("/usage/me");
  },
};
