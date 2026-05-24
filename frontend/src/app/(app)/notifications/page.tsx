"use client";

import { Suspense } from "react";
import { RefreshCw, CheckCheck, Archive, ArchiveRestore } from "lucide-react";
import { useDisplay } from "@/context/display";
import { useNotificationsPage } from "@/hooks/useNotificationsPage";
import { NotificationRow } from "@/components/NotificationRow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReadState, Tab } from "@/types/notification";

const READ_STATE_TABS: { label: string; value: ReadState }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const TOP_TABS: { label: string; value: Tab }[] = [
  { label: "Inbox", value: "inbox" },
  { label: "Archived", value: "archived" },
];

function NotificationsInbox() {
  const { timezone } = useDisplay();
  const {
    notifications,
    total,
    tab,
    readState,
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
  } = useNotificationsPage();

  const hasMore = notifications.length < total;
  const isArchivedTab = tab === "archived";
  const allSelected =
    notifications.length > 0 && notifications.every((n) => selectedIds.has(n.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleMarkItemRead = async (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(id);
  };

  const handleArchive = (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    archive(id);
  };

  const handleUnarchive = (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    unarchive(id);
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

      {/* Inbox / Archived top tabs */}
      <div
        role="tablist"
        aria-label="Notification tabs"
        className="mb-4 flex gap-1 rounded-lg border p-1 w-fit"
      >
        {TOP_TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              tab === t.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Read-state filter — inbox only */}
      {!isArchivedTab && (
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="mb-4 flex gap-1 rounded-lg border p-1 w-fit"
        >
          {READ_STATE_TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={readState === t.value}
              onClick={() => setReadState(t.value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                readState === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {!isArchivedTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={bulkMarkRead}
                className="h-7 gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark read
              </Button>
            )}
            {isArchivedTab ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={bulkUnarchive}
                className="h-7 gap-1.5 text-xs"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Unarchive
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={bulkArchive}
                className="h-7 gap-1.5 text-xs"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Master checkbox row — desktop only */}
      {notifications.length > 0 && (
        <div className="mb-1 hidden items-center gap-2 px-3 py-1 sm:flex">
          <Checkbox
            checked={someSelected ? "indeterminate" : allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all notifications"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      {/* Notification list */}
      <div className="rounded-lg border" role="list" aria-label="Notifications" aria-busy={isLoading} aria-live="polite">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
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
            <p className="font-medium">
              {isArchivedTab ? "No archived notifications" : "No notifications"}
            </p>
            <p className="mt-1 text-xs">
              {isArchivedTab
                ? "Archived notifications will appear here."
                : readState === "unread"
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
                onArchive={!isArchivedTab ? handleArchive : undefined}
                onUnarchive={isArchivedTab ? handleUnarchive : undefined}
                isSelected={selectedIds.has(notification.id)}
                onToggleSelect={toggleSelect}
                isArchivedTab={isArchivedTab}
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
