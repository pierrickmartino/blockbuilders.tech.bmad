import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NotificationsApiClient } from "@/lib/notifications-api-client";
import type { Notification, ReadState, Tab } from "@/types/notification";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;
const POLL_INTERVAL_MS = 30_000;

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
  typeFilter: string[];
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  newNotificationsBannerCount: number;
  setTab: (tab: Tab) => void;
  setReadState: (state: ReadState) => void;
  setTypeFilter: (types: string[]) => void;
  setDateFrom: (from: string) => void;
  setDateTo: (to: string) => void;
  setSearchQuery: (q: string) => void;
  loadMore: () => void;
  refresh: () => void;
  pollUnreadCount: () => void;
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
  const [typeFilter, setTypeFilterLocal] = useState<string[]>([]);
  const [dateFrom, setDateFromLocal] = useState("");
  const [dateTo, setDateToLocal] = useState("");
  const [searchQuery, setSearchQueryLocal] = useState("");
  const [newNotificationsBannerCount, setNewNotificationsBannerCount] = useState(0);
  const baseUnreadCountRef = useRef<number | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    async (
      t: Tab,
      rs: ReadState,
      off: number,
      append: boolean,
      filters?: { types?: string[]; from?: string; to?: string; q?: string },
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await NotificationsApiClient.list({
          read_state: rs,
          offset: off,
          limit: PAGE_SIZE,
          archived: t === "archived",
          types: filters?.types,
          from: filters?.from || undefined,
          to: filters?.to || undefined,
          q: filters?.q || undefined,
        });
        setTotal(data.total);
        if (baseUnreadCountRef.current === null) {
          baseUnreadCountRef.current = data.unread_count;
        }
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

  const currentFilters = useCallback(
    () => ({ types: typeFilter, from: dateFrom, to: dateTo, q: searchQuery }),
    [typeFilter, dateFrom, dateTo, searchQuery]
  );

  useEffect(() => {
    fetchPage(tab, readState, offset, false, currentFilters());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = useCallback(
    (t: Tab) => {
      setTabLocal(t);
      setOffset(0);
      setNotifications([]);
      setSelectedIds(new Set());
      syncUrl(t, readState, 0);
      fetchPage(t, readState, 0, false, currentFilters());
    },
    [readState, fetchPage, syncUrl, currentFilters]
  );

  const setReadState = useCallback(
    (rs: ReadState) => {
      setReadStateLocal(rs);
      setOffset(0);
      setNotifications([]);
      setSelectedIds(new Set());
      syncUrl(tab, rs, 0);
      fetchPage(tab, rs, 0, false, currentFilters());
    },
    [tab, fetchPage, syncUrl, currentFilters]
  );

  const loadMore = useCallback(() => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    setSelectedIds(new Set());
    syncUrl(tab, readState, next);
    fetchPage(tab, readState, next, true, currentFilters());
  }, [offset, tab, readState, fetchPage, syncUrl, currentFilters]);

  const refresh = useCallback(() => {
    setOffset(0);
    setNewNotificationsBannerCount(0);
    baseUnreadCountRef.current = null;
    syncUrl(tab, readState, 0);
    fetchPage(tab, readState, 0, false, currentFilters());
  }, [tab, readState, fetchPage, syncUrl, currentFilters]);

  const setTypeFilter = useCallback(
    (types: string[]) => {
      setTypeFilterLocal(types);
      setOffset(0);
      setSelectedIds(new Set());
      fetchPage(tab, readState, 0, false, { types, from: dateFrom, to: dateTo, q: searchQuery });
    },
    [tab, readState, fetchPage, dateFrom, dateTo, searchQuery]
  );

  const setDateFrom = useCallback(
    (from: string) => {
      setDateFromLocal(from);
      setOffset(0);
      fetchPage(tab, readState, 0, false, { types: typeFilter, from, to: dateTo, q: searchQuery });
    },
    [tab, readState, fetchPage, typeFilter, dateTo, searchQuery]
  );

  const setDateTo = useCallback(
    (to: string) => {
      setDateToLocal(to);
      setOffset(0);
      fetchPage(tab, readState, 0, false, { types: typeFilter, from: dateFrom, to, q: searchQuery });
    },
    [tab, readState, fetchPage, typeFilter, dateFrom, searchQuery]
  );

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryLocal(q);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        setOffset(0);
        fetchPage(tab, readState, 0, false, { types: typeFilter, from: dateFrom, to: dateTo, q });
      }, SEARCH_DEBOUNCE_MS);
    },
    [tab, readState, fetchPage, typeFilter, dateFrom, dateTo]
  );

  const pollUnreadCount = useCallback(async () => {
    try {
      const data = await NotificationsApiClient.list({ limit: 1, archived: false });
      const newCount = data.unread_count;
      if (baseUnreadCountRef.current !== null && newCount > baseUnreadCountRef.current) {
        setNewNotificationsBannerCount(newCount - baseUnreadCountRef.current);
      }
    } catch {
      // silently ignore poll failures
    }
  }, []);

  useEffect(() => {
    const id = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollUnreadCount]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    NotificationsApiClient.bulkAcknowledge([id]).catch(() => {});
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
    typeFilter,
    dateFrom,
    dateTo,
    searchQuery,
    newNotificationsBannerCount,
    setTab,
    setReadState,
    setTypeFilter,
    setDateFrom,
    setDateTo,
    setSearchQuery,
    loadMore,
    refresh,
    pollUnreadCount,
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
