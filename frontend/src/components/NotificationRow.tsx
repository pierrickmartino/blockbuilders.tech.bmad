"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import type { Notification } from "@/types/notification";
import { formatDateTime, type TimezoneMode } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NotificationRowProps {
  notification: Notification;
  timezone: TimezoneMode;
  onActivate: (id: string, isRead: boolean) => void;
  onMarkRead: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onArchive?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onUnarchive?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  isArchivedTab?: boolean;
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
  onArchive,
  onUnarchive,
  isSelected = false,
  onToggleSelect,
  isArchivedTab = false,
  className = "",
}: NotificationRowProps) {
  const isLink = isValidInternalLink(notification.link_url);
  const rowClass = `group relative border-b p-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent ${
    notification.is_read ? "bg-transparent" : "bg-accent/30"
  } ${className}`;

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isArchivedTab) {
      onUnarchive?.(e, notification.id);
    } else {
      onArchive?.(e, notification.id);
    }
  };

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      {/* Mark read button — desktop only, unread only */}
      {!notification.is_read && !isArchivedTab && (
        <button
          type="button"
          onClick={(e) => onMarkRead(e, notification.id)}
          className="hidden rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 sm:block"
          aria-label={`Mark "${notification.title}" as read`}
        >
          Mark read
        </button>
      )}

      {/* Archive / Unarchive — desktop */}
      {(onArchive || onUnarchive) && (
        <button
          type="button"
          onClick={handleArchiveClick}
          className="hidden rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 sm:block"
          aria-label={
            isArchivedTab
              ? `Unarchive "${notification.title}"`
              : `Archive "${notification.title}"`
          }
        >
          {isArchivedTab ? (
            <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Mobile 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:hidden"
            aria-label="More actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!notification.is_read && !isArchivedTab && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(e, notification.id);
              }}
            >
              Mark read
            </DropdownMenuItem>
          )}
          {onArchive && !isArchivedTab && (
            <DropdownMenuItem onClick={handleArchiveClick}>Archive</DropdownMenuItem>
          )}
          {onUnarchive && isArchivedTab && (
            <DropdownMenuItem onClick={handleArchiveClick}>Unarchive</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const inner = (
    <div className="flex items-start gap-2">
      {/* Checkbox — hidden on mobile */}
      {onToggleSelect && (
        <div
          className="mt-0.5 hidden shrink-0 sm:block"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(notification.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(notification.id)}
            aria-label={`Select "${notification.title}"`}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
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
        {actions}
      </div>
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
