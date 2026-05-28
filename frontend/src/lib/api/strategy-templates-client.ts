import { apiFetch } from "@/lib/api";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

export const strategyTemplatesKeys = {
  all: (): string[] => ["strategy-templates"],
  lists: (): string[] => ["strategy-templates", "list"],
  list: (): unknown[] => ["strategy-templates", "list", {}],
  detail: (id: string): unknown[] => ["strategy-templates", "detail", id],
};

export const StrategyTemplatesApiClient = {
  async list(): Promise<StrategyTemplate[]> {
    return apiFetch<StrategyTemplate[]>("/strategy-templates/");
  },

  async clone(templateId: string): Promise<Strategy> {
    return apiFetch<Strategy>(`/strategy-templates/${templateId}/clone`, {
      method: "POST",
    });
  },
};
