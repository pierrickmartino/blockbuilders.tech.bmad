import { apiFetch } from "@/lib/api/internal/fetch";
import type { PublicProfile } from "@/types/profile";

export const socialKeys = {
  all: (): string[] => ["social"],
  profile: (handle: string): string[] => ["social", "profile", handle],
};

export const SocialApiClient = {
  async getPublicProfile(handle: string): Promise<PublicProfile> {
    return apiFetch<PublicProfile>(`/profiles/${handle}`);
  },
};
