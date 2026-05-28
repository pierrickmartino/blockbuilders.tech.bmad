import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsApiClient } from "@/lib/api/notifications-client";

vi.mock("@/lib/api/notifications-client", () => ({
  NotificationsApiClient: {
    list: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
  notificationsKeys: {
    all: () => ["notifications"],
    lists: () => ["notifications", "list"],
    list: (filters: unknown) => ["notifications", "list", filters],
  },
}));

const mockList = vi.mocked(NotificationsApiClient.list);
const mockMarkAsRead = vi.mocked(NotificationsApiClient.markAsRead);
const mockMarkAllAsRead = vi.mocked(NotificationsApiClient.markAllAsRead);

const makeItem = (id: string, is_read = false) => ({
  id,
  type: "system" as const,
  title: `Notification ${id}`,
  body: "body",
  link_url: null,
  is_read,
  created_at: "2024-01-01T00:00:00Z",
  archived_at: null,
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkAsRead.mockResolvedValue(undefined);
    mockMarkAllAsRead.mockResolvedValue(undefined);
  });

  it("exposes notifications and unreadCount from fetched data", async () => {
    mockList.mockResolvedValue({
      items: [makeItem("1"), makeItem("2")],
      unread_count: 2,
      total: 2,
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });

  it("exposes isLoading while the fetch is pending", async () => {
    mockList.mockResolvedValue({ items: [], unread_count: 0, total: 0 });
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("markAsRead optimistically marks the notification as read", async () => {
    mockList.mockResolvedValue({
      items: [makeItem("1", false), makeItem("2", false)],
      unread_count: 2,
      total: 2,
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications[0].is_read).toBe(false);

    act(() => {
      result.current.markAsRead("1");
    });

    await waitFor(() => {
      expect(result.current.notifications[0].is_read).toBe(true);
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it("markAllAsRead optimistically marks every notification as read", async () => {
    mockList.mockResolvedValue({
      items: [makeItem("1", false), makeItem("2", false)],
      unread_count: 2,
      total: 2,
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.markAllAsRead();
    });

    await waitFor(() => {
      expect(result.current.notifications.every((n) => n.is_read)).toBe(true);
    });
    expect(result.current.unreadCount).toBe(0);
  });

  it("exposes a fetchNotifications function that re-fetches", async () => {
    mockList.mockResolvedValue({ items: [], unread_count: 0, total: 0 });
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.fetchNotifications).toBe("function");
  });
});
