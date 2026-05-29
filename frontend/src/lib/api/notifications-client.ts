import { apiFetch, apiFetchVoid } from "@/lib/api/internal/fetch";
import type { NotificationFilters, NotificationListResponse } from "@/types/notification";

export const notificationsKeys = {
  all: (): string[] => ["notifications"],
  lists: (): string[] => ["notifications", "list"],
  list: (filters: Record<string, unknown>): unknown[] => [
    "notifications",
    "list",
    filters,
  ],
};

export const NotificationsApiClient = {
  async list(filters: NotificationFilters): Promise<NotificationListResponse> {
    const params = new URLSearchParams();

    if (filters.read_state && filters.read_state !== "all") {
      params.set("read_state", filters.read_state);
    }
    if (filters.offset && filters.offset > 0) {
      params.set("offset", String(filters.offset));
    }
    if (filters.limit !== undefined) {
      params.set("limit", String(filters.limit));
    }
    if (filters.archived) {
      params.set("archived", "true");
    }
    for (const t of filters.types ?? []) {
      params.append("type", t);
    }
    if (filters.from) {
      params.set("from", filters.from);
    }
    if (filters.to) {
      params.set("to", filters.to);
    }
    if (filters.q) {
      params.set("q", filters.q);
    }

    const qs = params.toString();
    const url = qs ? `/notifications/?${qs}` : "/notifications/";
    return apiFetch<NotificationListResponse>(url);
  },

  async markAsRead(id: string): Promise<void> {
    await apiFetchVoid(`/notifications/${id}/acknowledge`, { method: "POST" });
  },

  async markAllAsRead(): Promise<void> {
    await apiFetchVoid("/notifications/acknowledge-all", { method: "POST" });
  },

  async archive(id: string): Promise<void> {
    await apiFetchVoid(`/notifications/${id}/archive`, { method: "POST" });
  },

  async unarchive(id: string): Promise<void> {
    await apiFetchVoid(`/notifications/${id}/unarchive`, { method: "POST" });
  },

  async bulkAcknowledge(ids: string[]): Promise<void> {
    await apiFetchVoid("/notifications/bulk-acknowledge", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  async bulkArchive(ids: string[]): Promise<void> {
    await apiFetchVoid("/notifications/bulk-archive", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};
