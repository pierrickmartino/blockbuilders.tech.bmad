import { apiFetch, apiFetchVoid } from "@/lib/api/internal/fetch";
import type { ProfileResponse, UserUpdateRequest, Usage } from "@/types/auth";
import type { ProfileSettings, ProfileUpdateRequest } from "@/types/profile";

export const usersKeys = {
  all: (): string[] => ["users"],
  me: (): string[] => ["users", "me"],
  profileSettings: (): string[] => ["users", "profileSettings"],
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

  async getProfileSettings(): Promise<ProfileSettings> {
    return apiFetch<ProfileSettings>("/profiles/me/settings");
  },

  async updateProfileSettings(data: ProfileUpdateRequest): Promise<ProfileSettings> {
    return apiFetch<ProfileSettings>("/profiles/me/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
