import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NotificationsApiClient } from "@/lib/notifications-api-client";
import type { Notification, ReadState } from "@/types/notification";

const PAGE_SIZE = 25;

interface UseNotificationsPageReturn {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  readState: ReadState;
  offset: number;
  isLoading: boolean;
  error: string | null;
  setReadState: (state: ReadState) => void;
  loadMore: () => void;
  refresh: () => void;
  markAsRead: (id: string) => void;
}

export function useNotificationsPage(): UseNotificationsPageReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialReadState = (searchParams.get("read") as ReadState) ?? "all";
  const initialOffset = Number(searchParams.get("offset") ?? "0");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readState, setReadStateLocal] = useState<ReadState>(initialReadState);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUrl = useCallback(
    (rs: ReadState, off: number) => {
      const params = new URLSearchParams();
      if (rs !== "all") params.set("read", rs);
      if (off > 0) params.set("offset", String(off));
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname]
  );

  const fetchPage = useCallback(
    async (rs: ReadState, off: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await NotificationsApiClient.list({
          read_state: rs,
          offset: off,
          limit: PAGE_SIZE,
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
    fetchPage(readState, offset, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setReadState = useCallback(
    (rs: ReadState) => {
      setReadStateLocal(rs);
      setOffset(0);
      setNotifications([]);
      syncUrl(rs, 0);
      fetchPage(rs, 0, false);
    },
    [fetchPage, syncUrl]
  );

  const loadMore = useCallback(() => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    syncUrl(readState, next);
    fetchPage(readState, next, true);
  }, [offset, readState, fetchPage, syncUrl]);

  const refresh = useCallback(() => {
    setOffset(0);
    syncUrl(readState, 0);
    fetchPage(readState, 0, false);
  }, [readState, fetchPage, syncUrl]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    notifications,
    total,
    unreadCount,
    readState,
    offset,
    isLoading,
    error,
    setReadState,
    loadMore,
    refresh,
    markAsRead,
  };
}
