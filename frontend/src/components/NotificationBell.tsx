"use client";

import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
function isValidInternalLink(url: string | null | undefined): boolean {
  if (!url) return false;
  // Only allow relative paths starting with /
  // Block any URL that could redirect externally
  return url.startsWith("/") && !url.startsWith("//");
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { timezone } = useDisplay();

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-80 sm:w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="link" className="h-auto p-0 text-xs" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[60vh] overflow-y-auto sm:max-h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((notification) => {
              const content = (
                <div
                  className={`cursor-pointer border-b p-3 hover:bg-accent ${notification.is_read ? "opacity-60" : ""}`}
                  onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{notification.title}</p>
                        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary"></span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {formatDateTime(notification.created_at, timezone)}
                      </p>
                    </div>
                  </div>
                </div>
              );

              // Only render as link if URL is a valid internal path
              if (isValidInternalLink(notification.link_url)) {
                return (
                  <Link key={notification.id} href={notification.link_url} className="block">
                    {content}
                  </Link>
                );
              }

              return <div key={notification.id}>{content}</div>;
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
