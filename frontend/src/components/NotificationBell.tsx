"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Validate that a notification link is a safe internal link.
 * Only allows relative paths starting with /.
 */
function isValidInternalLink(url: string | null | undefined): url is string {
  if (!url) return false;
  return url.startsWith("/") && !url.startsWith("//");
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const { timezone } = useDisplay();
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);
  const triggerLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  const handleRowActivate = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(id);
    }
  };

  const handleMarkItemRead = async (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await markAsRead(id);
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setConfirmMarkAll(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={triggerLabel}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              aria-hidden="true"
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-mono tabular-nums"
            >
              {displayCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-80 sm:w-80">
        <div className="flex items-center justify-between gap-2 px-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 &&
            (confirmMarkAll ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Mark all?</span>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={async () => {
                    await markAllAsRead();
                    setConfirmMarkAll(false);
                  }}
                >
                  Yes
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-muted-foreground"
                  onClick={() => setConfirmMarkAll(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => setConfirmMarkAll(true)}
              >
                Mark all read
              </Button>
            ))}
        </div>
        <DropdownMenuSeparator />
        <div
          role="list"
          aria-busy={isLoading}
          aria-live="polite"
          className="max-h-[min(60vh,24rem)] overflow-y-auto"
        >
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm">
              <p className="text-destructive">{error}</p>
              <Button
                variant="link"
                className="mt-1 h-auto p-0 text-xs"
                onClick={fetchNotifications}
              >
                Try again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <p>No notifications yet</p>
              <p className="mt-1 text-xs">Notifications appear here when backtests complete or alerts trigger.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const isLink = isValidInternalLink(notification.link_url);
              const rowClass = `group relative border-b p-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent ${
                notification.is_read ? "bg-transparent" : "bg-accent/30"
              }`;

              const inner = (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      )}
                      <p
                        className={`line-clamp-1 text-sm ${
                          notification.is_read ? "font-medium text-muted-foreground" : "font-semibold"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="sr-only">Unread</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="data-text mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.created_at, timezone)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkItemRead(e, notification.id)}
                      className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100"
                      aria-label={`Mark "${notification.title}" as read`}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );

              const commonProps = {
                role: "listitem",
                "aria-label": `${notification.title}${
                  notification.is_read ? "" : ", unread"
                }`,
              } as const;

              if (isLink) {
                const href = notification.link_url as string;
                return (
                  <Link
                    key={notification.id}
                    href={href}
                    className={`block ${rowClass}`}
                    onClick={() =>
                      handleRowActivate(notification.id, notification.is_read)
                    }
                    {...commonProps}
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <div
                  key={notification.id}
                  tabIndex={0}
                  className={`cursor-pointer ${rowClass}`}
                  onClick={() =>
                    handleRowActivate(notification.id, notification.is_read)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowActivate(notification.id, notification.is_read);
                    }
                  }}
                  {...commonProps}
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Link
              href="/notifications"
              className="block px-3 py-2 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View all notifications
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
