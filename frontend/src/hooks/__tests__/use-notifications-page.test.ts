import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotificationsPage } from "@/hooks/useNotificationsPage";
import * as client from "@/lib/notifications-api-client";

vi.mock("@/lib/notifications-api-client", () => ({
  NotificationsApiClient: {
    list: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    bulkAcknowledge: vi.fn(),
    bulkArchive: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/notifications",
}));

const mockList = vi.mocked(client.NotificationsApiClient.list);
const mockArchive = vi.mocked(client.NotificationsApiClient.archive);
const mockUnarchive = vi.mocked(client.NotificationsApiClient.unarchive);
const mockBulkAcknowledge = vi.mocked(client.NotificationsApiClient.bulkAcknowledge);
const mockBulkArchive = vi.mocked(client.NotificationsApiClient.bulkArchive);

const makeItem = (id: string, is_read = false) => ({
  id,
  type: "system" as const,
  title: `Title ${id}`,
  body: "B",
  link_url: null,
  is_read,
  created_at: "2024-01-01T00:00:00Z",
  archived_at: null,
});

const pageOne = {
  items: [makeItem("1"), makeItem("2")],
  unread_count: 2,
  total: 3,
};

const pageTwo = {
  items: [makeItem("3")],
  unread_count: 2,
  total: 3,
};

describe("useNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(pageOne);
    mockArchive.mockResolvedValue(undefined);
    mockUnarchive.mockResolvedValue(undefined);
    mockBulkAcknowledge.mockResolvedValue(undefined);
    mockBulkArchive.mockResolvedValue(undefined);
  });

  it("fetches first page on mount", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(result.current.notifications).toHaveLength(2);
  });

  it("initializes readState as all", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.readState).toBe("all");
  });

  it("initializes tab as inbox", async () => {
    const { result } = renderHook(() => useNotificationsPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tab).toBe("inbox");
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

  it("changing tab to archived fetches with archived=true", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTab("archived");
    });

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ archived: true, offset: 0 })
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

    await waitFor(() => expect(result.current.notifications).toHaveLength(3));
    expect(result.current.notifications[0].id).toBe("1");
    expect(result.current.notifications[2].id).toBe("3");
  });

  it("refresh re-fetches from offset 0 and replaces items", async () => {
    mockList.mockResolvedValueOnce(pageOne);
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const refreshData = {
      items: [makeItem("99")],
      unread_count: 1,
      total: 1,
    };
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

  // Selection model tests
  it("selectedIds starts empty", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.selectedIds.size).toBe(0);
  });

  it("toggleSelect adds an id to selectedIds", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });

    expect(result.current.selectedIds.has("1")).toBe(true);
  });

  it("toggleSelect removes an already-selected id", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.toggleSelect("1");
    });

    expect(result.current.selectedIds.has("1")).toBe(false);
  });

  it("toggleSelectAll selects all visible ids", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selectedIds.has("1")).toBe(true);
    expect(result.current.selectedIds.has("2")).toBe(true);
  });

  it("toggleSelectAll clears selection when all are selected", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelectAll();
    });
    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selectedIds.size).toBe(0);
  });

  it("clearSelection empties selectedIds", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedIds.size).toBe(0);
  });

  it("selection clears when tab changes", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.setTab("archived");
    });

    await waitFor(() => expect(result.current.selectedIds.size).toBe(0));
  });

  it("selection clears when readState changes", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.setReadState("unread");
    });

    expect(result.current.selectedIds.size).toBe(0);
  });

  // Optimistic archive/unarchive tests
  it("archive removes notification from inbox list optimistically", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.archive("1");
    });

    expect(result.current.notifications.find((n) => n.id === "1")).toBeUndefined();
    expect(mockArchive).toHaveBeenCalledWith("1");
  });

  it("unarchive removes notification from archived list optimistically", async () => {
    mockList.mockResolvedValue({
      items: [{ ...makeItem("1"), archived_at: "2024-01-01T00:00:00Z" }],
      unread_count: 0,
      total: 1,
    });
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.unarchive("1");
    });

    expect(result.current.notifications.find((n) => n.id === "1")).toBeUndefined();
    expect(mockUnarchive).toHaveBeenCalledWith("1");
  });

  // Bulk action tests
  it("bulkMarkRead calls bulkAcknowledge with selectedIds and updates optimistically", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
      result.current.toggleSelect("2");
    });
    act(() => {
      result.current.bulkMarkRead();
    });

    expect(mockBulkAcknowledge).toHaveBeenCalledWith(["1", "2"]);
    expect(result.current.notifications[0].is_read).toBe(true);
    expect(result.current.notifications[1].is_read).toBe(true);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("bulkArchive calls bulkArchive API and removes items optimistically", async () => {
    const { result } = renderHook(() => useNotificationsPage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleSelect("1");
    });
    act(() => {
      result.current.bulkArchive();
    });

    expect(mockBulkArchive).toHaveBeenCalledWith(["1"]);
    expect(result.current.notifications.find((n) => n.id === "1")).toBeUndefined();
    expect(result.current.selectedIds.size).toBe(0);
  });
});
