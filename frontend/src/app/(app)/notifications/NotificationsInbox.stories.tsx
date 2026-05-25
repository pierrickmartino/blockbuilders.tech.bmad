import type { Meta, StoryObj } from "@storybook/react";
import { Archive, ArchiveRestore, Bell, CheckCheck, Filter, RefreshCw, Search, X } from "lucide-react";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationRow } from "@/components/NotificationRow";
import type { Notification } from "@/types/notification";

// Design tokens from docs/design-system.json — spacing, color, radius
const sampleNotifications: Notification[] = [
  {
    id: "1",
    type: "backtest_completed",
    title: "BTC/USDT Backtest Complete",
    body: "Your RSI momentum strategy finished running with a Sharpe ratio of 1.42 and 68% win rate.",
    link_url: "/backtests/abc123",
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    archived_at: null,
  },
  {
    id: "2",
    type: "performance_alert",
    title: "Drawdown threshold exceeded",
    body: "Your ETH trend-following strategy has exceeded the 15% drawdown limit you configured.",
    link_url: null,
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    archived_at: null,
  },
  {
    id: "3",
    type: "system",
    title: "Scheduled maintenance tonight",
    body: "Blockbuilders will be briefly unavailable from 2:00–2:15 AM UTC for infrastructure upgrades.",
    link_url: null,
    is_read: true,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    archived_at: null,
  },
];

const archivedNotifications: Notification[] = [
  {
    id: "a1",
    type: "new_follower",
    title: "New follower: alex_trader",
    body: "alex_trader started following your strategies.",
    link_url: null,
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// Minimal shell that renders the inbox layout with injected state
interface InboxShellProps {
  notifications: Notification[];
  total: number;
  tab: "inbox" | "archived";
  isLoading?: boolean;
  error?: string | null;
  selectedIds?: Set<string>;
  newNotificationsBannerCount?: number;
  showFilters?: boolean;
  typeFilter?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

function InboxShell({
  notifications,
  total,
  tab,
  isLoading = false,
  error = null,
  selectedIds = new Set(),
  newNotificationsBannerCount = 0,
  showFilters = true,
  typeFilter = [],
  dateFrom = "",
  dateTo = "",
  searchQuery = "",
}: InboxShellProps) {
  const isArchivedTab = tab === "archived";
  const hasMore = notifications.length < total;
  const allSelected =
    notifications.length > 0 && notifications.every((n) => selectedIds.has(n.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="ghost" size="icon" aria-label="Refresh" onClick={noop}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* New notifications banner */}
      {newNotificationsBannerCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">
            {newNotificationsBannerCount} new notification{newNotificationsBannerCount !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-primary" onClick={noop}>
            Refresh
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="mb-4 flex gap-1 rounded-lg border p-1 w-fit">
        {(["inbox", "archived"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={noop}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Read-state tabs — inbox only */}
      {!isArchivedTab && (
        <div role="tablist" className="mb-4 flex gap-1 rounded-lg border p-1 w-fit">
          {(["All", "Unread", "Read"] as const).map((label) => (
            <button
              key={label}
              role="tab"
              aria-selected={label === "All"}
              onClick={noop}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                label === "All"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                {typeFilter.length > 0 ? `Type (${typeFilter.length})` : "Type"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {["backtest_completed", "performance_alert", "system"].map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.includes(t)}
                  onCheckedChange={noop}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Input type="date" value={dateFrom} onChange={noop} aria-label="From date" className="h-8 w-36 text-xs" />
          <Input type="date" value={dateTo} onChange={noop} aria-label="To date" className="h-8 w-36 text-xs" />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={noop}
              placeholder="Search…"
              className="h-8 w-44 pl-7 text-xs"
            />
          </div>
          {(typeFilter.length > 0 || dateFrom || dateTo || searchQuery) && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={noop}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            {!isArchivedTab && (
              <Button variant="ghost" size="sm" onClick={noop} className="h-7 gap-1.5 text-xs">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark read
              </Button>
            )}
            {isArchivedTab ? (
              <Button variant="ghost" size="sm" onClick={noop} className="h-7 gap-1.5 text-xs">
                <ArchiveRestore className="h-3.5 w-3.5" />
                Unarchive
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={noop} className="h-7 gap-1.5 text-xs">
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={noop} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Master checkbox — desktop */}
      {notifications.length > 0 && (
        <div className="mb-1 flex items-center gap-2 px-3 py-1">
          <Checkbox
            checked={someSelected ? "indeterminate" : allSelected}
            onCheckedChange={noop}
            aria-label="Select all"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      {/* List */}
      <div className="rounded-lg border" role="list" aria-label="Notifications">
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
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" onClick={noop}>
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
                : "You're all caught up."}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                timezone="local"
                onActivate={noop}
                onMarkRead={noop}
                onArchive={!isArchivedTab ? noop : undefined}
                onUnarchive={isArchivedTab ? noop : undefined}
                isSelected={selectedIds.has(n.id)}
                onToggleSelect={noop}
                isArchivedTab={isArchivedTab}
              />
            ))}
            {hasMore && (
              <div className="border-t p-3 text-center">
                <Button variant="ghost" size="sm" onClick={noop}>
                  Load more
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

// Mobile Sheet story variant
function MobileFilterSheet() {
  return (
    <div className="w-80 p-4">
      <p className="mb-4 text-sm text-muted-foreground">Mobile (&lt;768px) — tap Filters to open the Sheet</p>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Filters
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">2</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto rounded-t-xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Filter className="h-3.5 w-3.5" />
                  Type (2)
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {["backtest_completed", "performance_alert", "system"].map((t) => (
                  <DropdownMenuCheckboxItem
                    key={t}
                    checked={t !== "system"}
                    onCheckedChange={noop}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {t.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input type="date" aria-label="From date" className="h-8 text-xs" defaultValue="2024-01-01" />
            <Input type="date" aria-label="To date" className="h-8 text-xs" />
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Search…" className="h-8 pl-7 text-xs" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const meta = {
  title: "Notifications/NotificationsInbox",
  component: InboxShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof InboxShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyInbox: Story = {
  name: "Empty inbox",
  args: {
    notifications: [],
    total: 0,
    tab: "inbox",
  },
};

export const LoadingSkeleton: Story = {
  name: "Loading skeleton",
  args: {
    notifications: [],
    total: 0,
    tab: "inbox",
    isLoading: true,
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: {
    notifications: [],
    total: 0,
    tab: "inbox",
    error: "Couldn't load notifications. Check your connection and try again.",
  },
};

export const PopulatedInbox: Story = {
  name: "Populated inbox",
  args: {
    notifications: sampleNotifications,
    total: sampleNotifications.length,
    tab: "inbox",
  },
};

export const ArchivedTab: Story = {
  name: "Archived tab",
  args: {
    notifications: archivedNotifications,
    total: archivedNotifications.length,
    tab: "archived",
  },
};

export const BulkActionBarActive: Story = {
  name: "Bulk action bar active",
  args: {
    notifications: sampleNotifications,
    total: sampleNotifications.length,
    tab: "inbox",
    selectedIds: new Set(["1", "2"]),
  },
};

export const WithActiveFilters: Story = {
  name: "Active filters (type + search)",
  args: {
    notifications: sampleNotifications.filter((n) => n.type === "backtest_completed"),
    total: 1,
    tab: "inbox",
    typeFilter: ["backtest_completed"],
    searchQuery: "BTC",
  },
};

export const NewNotificationsBanner: Story = {
  name: "New notifications banner",
  args: {
    notifications: sampleNotifications,
    total: sampleNotifications.length,
    tab: "inbox",
    newNotificationsBannerCount: 3,
  },
};

export const MobileFilterSheetStory: Story = {
  name: "Mobile filter Sheet",
  render: () => <MobileFilterSheet />,
  args: {
    notifications: sampleNotifications,
    total: sampleNotifications.length,
    tab: "inbox",
  },
};
