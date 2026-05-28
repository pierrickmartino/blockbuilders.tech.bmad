import { apiFetch, apiFetchVoid } from "@/lib/api";
import type { AlertRule, CreateAlertRequest, UpdateAlertRequest } from "@/types/alert";

export const alertsKeys = {
  all: (): string[] => ["alerts"],
  lists: (): string[] => ["alerts", "list"],
  list: (): unknown[] => ["alerts", "list", {}],
  detail: (id: string): unknown[] => ["alerts", "detail", id],
};

export const AlertsApiClient = {
  async list(): Promise<AlertRule[]> {
    return apiFetch<AlertRule[]>("/alerts/");
  },

  async create(data: CreateAlertRequest): Promise<AlertRule> {
    return apiFetch<AlertRule>("/alerts/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateAlertRequest): Promise<AlertRule> {
    return apiFetch<AlertRule>(`/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await apiFetchVoid(`/alerts/${id}`, { method: "DELETE" });
  },
};
