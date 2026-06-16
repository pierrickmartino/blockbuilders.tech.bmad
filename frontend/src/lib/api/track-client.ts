import { apiFetch } from "@/lib/api/internal/fetch";
import type { TrackView } from "@/types/track";

export const trackKeys = {
  all: (): string[] => ["track"],
};

export const TrackApiClient = {
  async getTrack(): Promise<TrackView> {
    return apiFetch<TrackView>("/track");
  },
};
