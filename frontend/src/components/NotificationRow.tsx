"use client";

import Link from "next/link";
import type { Notification } from "@/types/notification";
import { formatDateTime, type TimezoneMode } from "@/lib/format";

interface NotificationRowProps {
  notification: Notification;
  timezone: TimezoneMode;
  onActivate: (id: string, isRead: boolean) => void;
  onMarkRead: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  className?: string;
}

function isValidInternalLink(url: string | null | undefined): url is string {
  if (!url) return false;
  return url.startsWith("/") && !url.startsWith("//");
}

export function NotificationRow({
  notification,
  timezone,
  onActivate,
  onMarkRead,
  className = "",
}: NotificationRowProps) {
  const isLink = isValidInternalLink(notification.link_url);
  const rowClass = `group relative border-b p-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent ${
    notification.is_read ? "bg-transparent" : "bg-accent/30"
  } ${className}`;

  const inner = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {!notification.is_read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
          <p
            className={`line-clamp-1 text-sm ${
              notification.is_read ? "font-medium text-muted-foreground" : "font-semibold"
            }`}
          >
            {notification.title}
          </p>
          {!notification.is_read && <span className="sr-only">Unread</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
        <p className="data-text mt-1 text-xs text-muted-foreground">
          {formatDateTime(notification.created_at, timezone)}
        </p>
      </div>
      {!notification.is_read && (
        <button
          type="button"
          onClick={(e) => onMarkRead(e, notification.id)}
          className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100"
          aria-label={`Mark "${notification.title}" as read`}
        >
          Mark read
        </button>
      )}
    </div>
  );

  const commonProps = {
    role: "listitem" as const,
    "aria-label": `${notification.title}${notification.is_read ? "" : ", unread"}`,
  };

  if (isLink) {
    return (
      <Link
        href={notification.link_url as string}
        className={`block ${rowClass}`}
        onClick={() => onActivate(notification.id, notification.is_read)}
        {...commonProps}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      tabIndex={0}
      className={`cursor-pointer ${rowClass}`}
      onClick={() => onActivate(notification.id, notification.is_read)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(notification.id, notification.is_read);
        }
      }}
      {...commonProps}
    >
      {inner}
    </div>
  );
}
