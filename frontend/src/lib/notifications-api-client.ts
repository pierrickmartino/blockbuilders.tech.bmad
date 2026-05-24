import { apiFetch, apiFetchVoid } from "@/lib/api";
import type { NotificationFilters, NotificationListResponse } from "@/types/notification";

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

    const qs = params.toString();
    const url = qs ? `/notifications/?${qs}` : "/notifications/";
    return apiFetch<NotificationListResponse>(url);
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
