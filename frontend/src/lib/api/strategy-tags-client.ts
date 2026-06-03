import { apiFetch } from "@/lib/api/internal/fetch";
import type { StrategyTag } from "@/types/strategy";

export const strategyTagsKeys = {
  all: (): string[] => ["strategy-tags"],
  lists: (): string[] => ["strategy-tags", "list"],
  list: (): unknown[] => ["strategy-tags", "list", {}],
};

export const StrategyTagsApiClient = {
  async list(): Promise<StrategyTag[]> {
    return apiFetch<StrategyTag[]>("/strategy-tags");
  },

  async create(name: string): Promise<StrategyTag> {
    return apiFetch<StrategyTag>("/strategy-tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
};
