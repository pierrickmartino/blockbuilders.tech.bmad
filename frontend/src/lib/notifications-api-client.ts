import { apiFetch } from "@/lib/api";
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

    const qs = params.toString();
    const url = qs ? `/notifications/?${qs}` : "/notifications/";
    return apiFetch<NotificationListResponse>(url);
  },
};
