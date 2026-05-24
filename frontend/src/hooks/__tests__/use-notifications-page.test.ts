import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotificationsPage } from "@/hooks/useNotificationsPage";
import * as client from "@/lib/notifications-api-client";

vi.mock("@/lib/notifications-api-client", () => ({
  NotificationsApiClient: {
    list: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/notifications",
}));

const mockList = vi.mocked(client.NotificationsApiClient.list);

const pageOne = {
  items: [{ id: "1", type: "system" as const, title: "T", body: "B", link_url: null, is_read: false, created_at: "2024-01-01T00:00:00Z" }],
  unread_count: 1,
  total: 3,
};

const pageTwo = {
  items: [{ id: "2", type: "system" as const, title: "T2", body: "B2", link_url: null, is_read: false, created_at: "2024-01-02T00:00:00Z" }],
  unread_count: 1,
  total: 3,
};

describe("useNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(pageOne);
  });

  it("fetches first page on mount", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(result.current.notifications).toHaveLength(1);
  });

  it("initializes readState as all", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.readState).toBe("all");
  });

  it("changing readState resets offset and re-fetches", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setReadState("unread");
    });

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ read_state: "unread", offset: 0 })
      )
    );
  });

  it("loadMore appends items and advances offset", async () => {
    mockList.mockResolvedValueOnce(pageOne).mockResolvedValueOnce(pageTwo);
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.notifications[0].id).toBe("1");
    expect(result.current.notifications[1].id).toBe("2");
  });

  it("refresh re-fetches from offset 0 and replaces items", async () => {
    mockList.mockResolvedValueOnce(pageOne);
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const refreshData = { items: [{ id: "99", type: "system" as const, title: "Fresh", body: "B", link_url: null, is_read: false, created_at: "2024-01-03T00:00:00Z" }], unread_count: 1, total: 1 };
    mockList.mockResolvedValueOnce(refreshData);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].id).toBe("99");
  });

  it("optimistic markAsRead updates local state immediately", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications[0].is_read).toBe(false);

    act(() => {
      result.current.markAsRead("1");
    });

    expect(result.current.notifications[0].is_read).toBe(true);
  });

  it("exposes total from response", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.total).toBe(3);
  });
});
