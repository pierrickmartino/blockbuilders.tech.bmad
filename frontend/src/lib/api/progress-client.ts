import { apiFetch } from "@/lib/api/internal/fetch";
import type { ProgressResponse } from "@/types/progress";

export const progressKeys = {
  all: (): string[] => ["progress"],
};

export const ProgressApiClient = {
  async getProgress(): Promise<ProgressResponse> {
    return apiFetch<ProgressResponse>("/progress");
  },
};
