"use client";

import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { useDisplay } from "@/context/display";
import { useNotificationsPage } from "@/hooks/useNotificationsPage";
import { NotificationRow } from "@/components/NotificationRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReadState } from "@/types/notification";

const READ_STATE_TABS: { label: string; value: ReadState }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

function NotificationsInbox() {
  const { timezone } = useDisplay();
  const {
    notifications,
    total,
    readState,
    isLoading,
    error,
    setReadState,
    loadMore,
    refresh,
    markAsRead,
  } = useNotificationsPage();

  const hasMore = notifications.length < total;

  const handleMarkItemRead = async (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(id);
  };

  const handleActivate = (id: string, isRead: boolean) => {
    if (!isRead) markAsRead(id);
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          aria-label="Refresh notifications"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
        </Button>
      </div>

      {/* Read-state segmented control */}
      <div
        role="tablist"
        aria-label="Filter notifications"
        className="mb-4 flex gap-1 rounded-lg border p-1 w-fit"
      >
        {READ_STATE_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={readState === tab.value}
            onClick={() => setReadState(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              readState === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-lg border" role="list" aria-label="Notifications" aria-busy={isLoading} aria-live="polite">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm">
            <p className="text-destructive">{error}</p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <p className="font-medium">No notifications</p>
            <p className="mt-1 text-xs">
              {readState === "unread"
                ? "You're all caught up."
                : "Notifications appear here when backtests complete or alerts trigger."}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                timezone={timezone}
                onActivate={handleActivate}
                onMarkRead={handleMarkItemRead}
              />
            ))}
            {hasMore && (
              <div className="border-t p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {notifications.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Showing {notifications.length} of {total}
        </p>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsInbox />
    </Suspense>
  );
}
