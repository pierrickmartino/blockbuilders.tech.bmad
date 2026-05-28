import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  NotificationsApiClient,
  notificationsKeys,
} from "@/lib/api/notifications-client";
import type { NotificationListResponse } from "@/types/notification";

const BELL_QUERY_KEY = notificationsKeys.list({ limit: 5 });

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BELL_QUERY_KEY,
    queryFn: () => NotificationsApiClient.list({ limit: 5 }),
    refetchInterval: 60_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => NotificationsApiClient.markAsRead(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<NotificationListResponse>(BELL_QUERY_KEY);
      queryClient.setQueryData<NotificationListResponse>(BELL_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
          unread_count: Math.max(0, old.unread_count - 1),
        };
      });
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all() });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BELL_QUERY_KEY, context.previous);
      }
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationsApiClient.markAllAsRead(),
    onMutate: async () => {
      const previous = queryClient.getQueryData<NotificationListResponse>(BELL_QUERY_KEY);
      queryClient.setQueryData<NotificationListResponse>(BELL_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((n) => ({ ...n, is_read: true })),
          unread_count: 0,
        };
      });
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all() });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BELL_QUERY_KEY, context.previous);
      }
    },
  });

  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
    error: query.error
      ? "Couldn't load notifications. Check your connection and try again."
      : null,
    fetchNotifications: () => { query.refetch(); },
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
  };
}
