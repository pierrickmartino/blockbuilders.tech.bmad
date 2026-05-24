import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NotificationsApiClient } from "@/lib/notifications-api-client";
import type { Notification, ReadState, Tab } from "@/types/notification";

const PAGE_SIZE = 25;

interface UseNotificationsPageReturn {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  tab: Tab;
  readState: ReadState;
  offset: number;
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  setTab: (tab: Tab) => void;
  setReadState: (state: ReadState) => void;
  loadMore: () => void;
  refresh: () => void;
  markAsRead: (id: string) => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  bulkMarkRead: () => void;
  bulkArchive: () => void;
  bulkUnarchive: () => void;
}

export function useNotificationsPage(): UseNotificationsPageReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as Tab) ?? "inbox";
  const initialReadState = (searchParams.get("read") as ReadState) ?? "all";
  const initialOffset = Number(searchParams.get("offset") ?? "0");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTabLocal] = useState<Tab>(initialTab);
  const [readState, setReadStateLocal] = useState<ReadState>(initialReadState);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const syncUrl = useCallback(
    (t: Tab, rs: ReadState, off: number) => {
      const params = new URLSearchParams();
      if (t !== "inbox") params.set("tab", t);
      if (rs !== "all") params.set("read", rs);
      if (off > 0) params.set("offset", String(off));
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname]
  );

  const fetchPage = useCallback(
    async (t: Tab, rs: ReadState, off: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await NotificationsApiClient.list({
          read_state: rs,
          offset: off,
          limit: PAGE_SIZE,
          archived: t === "archived",
        });
        setTotal(data.total);
        setUnreadCount(data.unread_count);
        setNotifications((prev) => (append ? [...prev, ...data.items] : data.items));
      } catch {
        setError("Couldn't load notifications. Check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPage(tab, readState, offset, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = useCallback(
    (t: Tab) => {
      setTabLocal(t);
      setOffset(0);
      setNotifications([]);
      setSelectedIds(new Set());
      syncUrl(t, readState, 0);
      fetchPage(t, readState, 0, false);
    },
    [readState, fetchPage, syncUrl]
  );

  const setReadState = useCallback(
    (rs: ReadState) => {
      setReadStateLocal(rs);
      setOffset(0);
      setNotifications([]);
      setSelectedIds(new Set());
      syncUrl(tab, rs, 0);
      fetchPage(tab, rs, 0, false);
    },
    [tab, fetchPage, syncUrl]
  );

  const loadMore = useCallback(() => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    setSelectedIds(new Set());
    syncUrl(tab, readState, next);
    fetchPage(tab, readState, next, true);
  }, [offset, tab, readState, fetchPage, syncUrl]);

  const refresh = useCallback(() => {
    setOffset(0);
    syncUrl(tab, readState, 0);
    fetchPage(tab, readState, 0, false);
  }, [tab, readState, fetchPage, syncUrl]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const archive = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    NotificationsApiClient.archive(id).catch(() => {});
  }, []);

  const unarchive = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    NotificationsApiClient.unarchive(id).catch(() => {});
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allIds = notifications.map((n) => n.id);
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, [notifications]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkMarkRead = useCallback(() => {
    const ids = [...selectedIds];
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) =>
      Math.max(0, prev - notifications.filter((n) => selectedIds.has(n.id) && !n.is_read).length)
    );
    setSelectedIds(new Set());
    NotificationsApiClient.bulkAcknowledge(ids).catch(() => {});
  }, [selectedIds, notifications]);

  const bulkArchive = useCallback(() => {
    const ids = [...selectedIds];
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    NotificationsApiClient.bulkArchive(ids).catch(() => {});
  }, [selectedIds]);

  const bulkUnarchive = useCallback(() => {
    const ids = [...selectedIds];
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    // Unarchive one-by-one (no bulk-unarchive endpoint)
    ids.forEach((id) => NotificationsApiClient.unarchive(id).catch(() => {}));
  }, [selectedIds]);

  return {
    notifications,
    total,
    unreadCount,
    tab,
    readState,
    offset,
    isLoading,
    error,
    selectedIds,
    setTab,
    setReadState,
    loadMore,
    refresh,
    markAsRead,
    archive,
    unarchive,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    bulkMarkRead,
    bulkArchive,
    bulkUnarchive,
  };
}
