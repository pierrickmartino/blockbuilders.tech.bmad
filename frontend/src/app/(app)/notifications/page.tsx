"use client";

import { Suspense } from "react";
import {
  RefreshCw,
  CheckCheck,
  Archive,
  ArchiveRestore,
  Filter,
  Search,
  X,
  Bell,
} from "lucide-react";
import { useDisplay } from "@/context/display";
import { useNotificationsPage } from "@/hooks/useNotificationsPage";
import { NotificationRow } from "@/components/NotificationRow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import type { NotificationType, ReadState, Tab } from "@/types/notification";

const TYPE_OPTIONS: { label: string; value: NotificationType }[] = [
  { label: "Backtest completed", value: "backtest_completed" },
  { label: "Usage limit reached", value: "usage_limit_reached" },
  { label: "Performance alert", value: "performance_alert" },
  { label: "New follower", value: "new_follower" },
  { label: "Strategy commented", value: "strategy_commented" },
  { label: "System", value: "system" },
];

const READ_STATE_TABS: { label: string; value: ReadState }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const TOP_TABS: { label: string; value: Tab }[] = [
  { label: "Inbox", value: "inbox" },
  { label: "Archived", value: "archived" },
];

interface FilterBarProps {
  typeFilter: string[];
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  onTypeChange: (types: string[]) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}

function FilterBar({
  typeFilter,
  dateFrom,
  dateTo,
  searchQuery,
  onTypeChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
}: FilterBarProps) {
  const toggleType = (value: string) => {
    const next = typeFilter.includes(value)
      ? typeFilter.filter((t) => t !== value)
      : [...typeFilter, value];
    onTypeChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            {typeFilter.length > 0 ? `Type (${typeFilter.length})` : "Type"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {TYPE_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={typeFilter.includes(opt.value)}
              onCheckedChange={() => toggleType(opt.value)}
              onSelect={(e) => e.preventDefault()}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date range */}
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        placeholder="From"
        aria-label="From date"
        className="h-8 w-36 text-xs"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        placeholder="To"
        aria-label="To date"
        className="h-8 w-36 text-xs"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          aria-label="Search notifications"
          className="h-8 w-44 pl-7 text-xs"
        />
      </div>

      {/* Clear filters */}
      {(typeFilter.length > 0 || dateFrom || dateTo || searchQuery) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground"
          onClick={() => {
            onTypeChange([]);
            onDateFromChange("");
            onDateToChange("");
            onSearchChange("");
          }}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

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

  const handleActivate = (id: string, isRead: boolean) => {
    if (!isRead) markAsRead(id);
  };

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

  const filterBarProps: FilterBarProps = {
    typeFilter,
    dateFrom,
    dateTo,
    searchQuery,
    onTypeChange: setTypeFilter,
    onDateFromChange: setDateFrom,
    onDateToChange: setDateTo,
    onSearchChange: setSearchQuery,
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

      {/* New notifications banner */}
      {newNotificationsBannerCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">
            {newNotificationsBannerCount} new notification{newNotificationsBannerCount !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs text-primary"
            onClick={refresh}
          >
            Refresh
          </Button>
        </div>
      )}

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

      {/* Filters — desktop: inline; mobile: Sheet */}
      <div className="mb-4">
        {/* Desktop filter bar */}
        <div className="hidden md:flex">
          <FilterBar {...filterBarProps} />
        </div>

        {/* Mobile filter trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {(typeFilter.length > 0 || dateFrom || dateTo || searchQuery) && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {typeFilter.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (searchQuery ? 1 : 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-xl">
              <SheetHeader className="mb-4">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 pb-6">
                <FilterBar {...filterBarProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

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
