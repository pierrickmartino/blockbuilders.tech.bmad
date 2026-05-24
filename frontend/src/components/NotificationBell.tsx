"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
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
import { NotificationRow } from "@/components/NotificationRow";

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
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                timezone={timezone}
                onActivate={handleRowActivate}
                onMarkRead={handleMarkItemRead}
              />
            ))
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
