"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
import { StrategiesApiClient, strategiesKeys } from "@/lib/api/strategies-client";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { AlertRule } from "@/types/alert";
import { ALLOWED_ASSETS } from "@/types/strategy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Mail,
  Webhook,
  Loader2,
  X,
  BarChart3,
  History,
  PauseCircle,
  Clock,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";
import CreatePriceAlertModal from "./create-price-alert-modal";

type StatusFilter = "all" | "active" | "inactive" | "expired";

interface StrategyInfo {
  id: string;
  name: string;
}

const isExpired = (alert: AlertRule) =>
  !!alert.expires_at && new Date(alert.expires_at) < new Date();

const getQuoteSymbol = (asset: string | undefined) => {
  if (!asset) return "$";
  const parts = asset.split("/");
  return parts[1] || "$";
};

const formatAlertPrice = (price: number | undefined) => {
  if (price === undefined) return "—";
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

function getAlertsLoadErrorMessage(err: unknown): string {
  const fallback = "We couldn't load your alerts. Retry to refresh the list.";

  if (err instanceof ApiError) {
    if (err.status === 0) {
      return "The request timed out. Check your connection, then retry the alerts list.";
    }
    if (err.status === 401) {
      return "Your session expired. Sign in again to load your alerts.";
    }
    if (err.status === 403) {
      return "You do not have permission to view these alerts.";
    }
    if (err.status === 429) {
      return "Too many requests hit the API at once. Wait a moment, then retry.";
    }
    if (err.status >= 500) {
      return "The server could not load your alerts. Retry in a moment.";
    }
    return err.message || fallback;
  }

  return err instanceof Error ? err.message : fallback;
}

function StatusBadge({ alert }: { alert: AlertRule }) {
  if (!alert.is_active) {
    return (
      <Badge variant="outline" className="gap-1">
        <PauseCircle className="h-3 w-3" aria-hidden />
        Inactive
      </Badge>
    );
  }
  if (isExpired(alert)) {
    return (
      <Badge variant="outline" className="gap-1 border-warning text-warning">
        <Clock className="h-3 w-3" aria-hidden />
        Expired
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Active
    </Badge>
  );
}

function ChannelIcons({ alert }: { alert: AlertRule }) {
  const channels: { key: string; label: string; icon: React.ReactNode }[] = [];
  if (alert.notify_in_app) {
    channels.push({
      key: "bell",
      label: "In-app notification",
      icon: <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />,
    });
  }
  if (alert.notify_email) {
    channels.push({
      key: "mail",
      label: "Email notification",
      icon: <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />,
    });
  }
  if (alert.notify_webhook) {
    channels.push({
      key: "webhook",
      label: "Webhook notification",
      icon: <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden />,
    });
  }
  if (channels.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }
  return (
    <ul className="flex gap-1.5" aria-label="Notification channels">
      {channels.map((c) => (
        <li key={c.key}>
          <span aria-label={c.label} title={c.label}>
            {c.icon}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TabCount({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="ml-1.5 px-1.5 py-0 text-xs tabular-nums"
    >
      {count}
    </Badge>
  );
}

export default function AlertsPage() {
  const { timezone } = useDisplay();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const activeAlertsLoadErrorRef = useRef<string | null>(null);

  // Filters (apply to Price and Performance tabs only)
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AlertRule | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: alerts = [],
    isLoading: loading,
    isError: alertsLoadFailed,
    error: alertsLoadError,
  } = useQuery({
    queryKey: alertsKeys.list(),
    queryFn: () => AlertsApiClient.list(),
  });

  const { data: strategiesData = [] } = useQuery({
    queryKey: strategiesKeys.list({}),
    queryFn: () => StrategiesApiClient.list({}),
  });
  const strategies: Record<string, StrategyInfo> = Object.fromEntries(
    strategiesData.map((s) => [s.id, { id: s.id, name: s.name }]),
  );

  // Per-row pending state
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const setRowPending = (id: string, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  // Selection (price alerts only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const refreshAlerts = () => {
    queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
  };

  useEffect(() => {
    if (alertsLoadFailed) {
      const message = getAlertsLoadErrorMessage(alertsLoadError);
      activeAlertsLoadErrorRef.current = message;
      setError(message);
      return;
    }

    setError((current) =>
      current !== null && current === activeAlertsLoadErrorRef.current
        ? null
        : current,
    );
    activeAlertsLoadErrorRef.current = null;
  }, [alertsLoadFailed, alertsLoadError]);

  // Scroll error into view + announce
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  // Active tabs show all managed alerts of each type (re-armed alerts remain
  // active even after firing, so we partition by type — not by trigger state).
  // History is a chronological log of every alert that has ever fired.
  const priceAlerts = alerts.filter((a) => a.alert_type === "price");
  const performanceAlerts = alerts.filter(
    (a) => a.alert_type === "performance",
  );
  const historyAlerts = alerts
    .filter((a) => !!a.last_triggered_at)
    .sort(
      (a, b) =>
        new Date(b.last_triggered_at!).getTime() -
        new Date(a.last_triggered_at!).getTime(),
    );

  const filterAlerts = (alertList: AlertRule[]) =>
    alertList.filter((alert) => {
      if (assetFilter !== "all" && alert.asset !== assetFilter) return false;
      if (statusFilter === "active" && (!alert.is_active || isExpired(alert)))
        return false;
      if (statusFilter === "inactive" && alert.is_active) return false;
      if (statusFilter === "expired" && !isExpired(alert)) return false;
      return true;
    });

  const filteredPriceAlerts = filterAlerts(priceAlerts);
  const filteredPerformanceAlerts = filterAlerts(performanceAlerts);

  const filtersActive = assetFilter !== "all" || statusFilter !== "all";
  const listLoadUnavailable = alertsLoadFailed && alerts.length === 0;
  const clearFilters = () => {
    setAssetFilter("all");
    setStatusFilter("all");
  };

  // Bulk selection helpers
  const visibleSelectedIds = filteredPriceAlerts
    .filter((a) => selectedIds.has(a.id))
    .map((a) => a.id);
  const allVisibleSelected =
    filteredPriceAlerts.length > 0 &&
    visibleSelectedIds.length === filteredPriceAlerts.length;
  const someVisibleSelected =
    visibleSelectedIds.length > 0 && !allVisibleSelected;
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredPriceAlerts.forEach((a) => next.delete(a.id));
      } else {
        filteredPriceAlerts.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      AlertsApiClient.update(id, { is_active: isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsKeys.all() }),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to update alert"),
  });

  const handleToggleActive = (alert: AlertRule) => {
    setRowPending(alert.id, true);
    toggleMutation.mutate(
      { id: alert.id, isActive: !alert.is_active },
      { onSettled: () => setRowPending(alert.id, false) },
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => AlertsApiClient.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteConfirm(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to delete alert"),
    onSettled: () => setIsDeleting(false),
  });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    deleteMutation.mutate(deleteConfirm.id);
  };

  const handleBulkSetActive = async (next: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    ids.forEach((id) => setRowPending(id, true));
    try {
      await Promise.all(ids.map((id) => AlertsApiClient.update(id, { is_active: next })));
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alerts");
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
    } finally {
      ids.forEach((id) => setRowPending(id, false));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) => AlertsApiClient.delete(id)));
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
      clearSelection();
      setBulkDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alerts");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreated = (alert: AlertRule) => {
    queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
    const quote = getQuoteSymbol(alert.asset);
    const price = formatAlertPrice(alert.threshold_price);
    toast.success("Alert created", {
      description: `Watching ${alert.asset} ${alert.direction} ${price} ${quote}`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div role="status" aria-live="polite" className="sr-only">
          Loading alerts
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            New alert
          </Button>
        </div>

        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <span className="flex-1">{error}</span>
            <div className="flex shrink-0 gap-1">
              {alertsLoadFailed && error === activeAlertsLoadErrorRef.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    setError(null);
                    refreshAlerts();
                  }}
                >
                  <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
                  Retry
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        <Tabs
          defaultValue="price"
          className="space-y-4"
          onValueChange={() => clearSelection()}
        >
          <TabsList>
            <TabsTrigger value="price" className="gap-0">
              Price Alerts
              <TabCount count={filtersActive ? filteredPriceAlerts.length : priceAlerts.length} />
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-0">
              Performance Alerts
              <TabCount count={filtersActive ? filteredPerformanceAlerts.length : performanceAlerts.length} />
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-0">
              History
              <TabCount count={historyAlerts.length} />
            </TabsTrigger>
          </TabsList>

          {/* ── Price Alerts tab ── */}
          <TabsContent value="price" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={assetFilter} onValueChange={setAssetFilter}>
                  <SelectTrigger className="w-[140px]" aria-label="Filter by asset">
                    <SelectValue placeholder="All Assets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assets</SelectItem>
                    {ALLOWED_ASSETS.map((asset) => (
                      <SelectItem key={asset} value={asset}>
                        {asset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                {filtersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    aria-label="Clear all filters"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div
                role="toolbar"
                aria-label="Bulk actions"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
              >
                <span>{selectedIds.size} selected</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSetActive(true)}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSetActive(false)}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteConfirm(true)}
                  >
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear selection
                  </Button>
                </div>
              </div>
            )}

            {filteredPriceAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell
                    className="mb-4 h-12 w-12 text-muted-foreground"
                    aria-hidden
                  />
                  {listLoadUnavailable ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        Could not load alerts
                      </p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Retry loading your alert list.
                      </p>
                      <Button variant="outline" onClick={refreshAlerts}>
                        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                        Retry
                      </Button>
                    </>
                  ) : priceAlerts.length === 0 ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        No alerts watching the market
                      </p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Create an alert to be notified when prices reach your targets
                      </p>
                      <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden />
                        Create alert
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mb-2 text-lg font-medium">No matching alerts</p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        No price alerts match the current filters.
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : someVisibleSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={toggleSelectAllVisible}
                            aria-label="Select all visible alerts"
                          />
                        </TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Channels</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPriceAlerts.map((alert) => {
                        const pending = pendingIds.has(alert.id);
                        const selected = selectedIds.has(alert.id);
                        const quote = getQuoteSymbol(alert.asset);
                        return (
                          <TableRow
                            key={alert.id}
                            data-state={selected ? "selected" : undefined}
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleSelected(alert.id)}
                                aria-label={`Select alert for ${alert.asset}`}
                              />
                            </TableCell>
                            <TableCell className="data-text font-medium">
                              {alert.asset}
                            </TableCell>
                            <TableCell className="data-text capitalize">
                              {alert.direction}{" "}
                              {formatAlertPrice(alert.threshold_price)} {quote}
                              {alert.last_triggered_at && (
                                <span className="mt-0.5 block text-xs font-normal normal-case text-muted-foreground">
                                  Last fired:{" "}
                                  {formatRelativeTime(alert.last_triggered_at)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge alert={alert} />
                            </TableCell>
                            <TableCell>
                              <ChannelIcons alert={alert} />
                            </TableCell>
                            <TableCell className="data-text">
                              {formatDateTime(alert.expires_at, timezone)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleActive(alert)}
                                      disabled={pending}
                                      aria-label={
                                        alert.is_active
                                          ? `Deactivate alert for ${alert.asset}`
                                          : `Activate alert for ${alert.asset}`
                                      }
                                    >
                                      {pending ? (
                                        <Loader2
                                          className="h-4 w-4 animate-spin"
                                          aria-hidden
                                        />
                                      ) : alert.is_active ? (
                                        <ToggleRight
                                          className="h-4 w-4 text-success"
                                          aria-hidden
                                        />
                                      ) : (
                                        <ToggleLeft className="h-4 w-4" aria-hidden />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {alert.is_active ? "Deactivate" : "Activate"}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteConfirm(alert)}
                                      aria-label={`Delete alert for ${alert.asset}`}
                                    >
                                      <Trash2
                                        className="h-4 w-4 text-destructive"
                                        aria-hidden
                                      />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete alert</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {filteredPriceAlerts.map((alert) => {
                    const pending = pendingIds.has(alert.id);
                    const selected = selectedIds.has(alert.id);
                    const quote = getQuoteSymbol(alert.asset);
                    return (
                      <Card
                        key={alert.id}
                        data-state={selected ? "selected" : undefined}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleSelected(alert.id)}
                                aria-label={`Select alert for ${alert.asset}`}
                                className="mt-1"
                              />
                              <div>
                                <p className="data-text font-medium">{alert.asset}</p>
                                <p className="data-text text-sm text-muted-foreground capitalize">
                                  {alert.direction}{" "}
                                  {formatAlertPrice(alert.threshold_price)} {quote}
                                </p>
                                {alert.last_triggered_at && (
                                  <p className="data-text mt-0.5 text-xs text-muted-foreground">
                                    Last fired:{" "}
                                    {formatRelativeTime(alert.last_triggered_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <StatusBadge alert={alert} />
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChannelIcons alert={alert} />
                              {alert.expires_at && (
                                <span className="data-text text-xs text-muted-foreground">
                                  Expires {formatDateTime(alert.expires_at, timezone)}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                onClick={() => handleToggleActive(alert)}
                                disabled={pending}
                                aria-label={
                                  alert.is_active
                                    ? `Deactivate alert for ${alert.asset}`
                                    : `Activate alert for ${alert.asset}`
                                }
                              >
                                {pending ? (
                                  <Loader2
                                    className="h-5 w-5 animate-spin"
                                    aria-hidden
                                  />
                                ) : alert.is_active ? (
                                  <ToggleRight
                                    className="h-5 w-5 text-success"
                                    aria-hidden
                                  />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" aria-hidden />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteConfirm(alert)}
                                aria-label={`Delete alert for ${alert.asset}`}
                              >
                                <Trash2 className="h-5 w-5" aria-hidden />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Performance Alerts tab ── */}
          <TabsContent value="performance" className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Performance alerts are configured per strategy.{" "}
                <Link href="/strategies" className="underline hover:text-foreground">
                  Go to Strategies
                </Link>{" "}
                to set up drawdown or entry/exit monitoring.
              </span>
            </div>
            {filteredPerformanceAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell
                    className="mb-4 h-12 w-12 text-muted-foreground"
                    aria-hidden
                  />
                  {listLoadUnavailable ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        Could not load alerts
                      </p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Retry loading your alert list.
                      </p>
                      <Button variant="outline" onClick={refreshAlerts}>
                        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                        Retry
                      </Button>
                    </>
                  ) : performanceAlerts.length === 0 ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        No performance alerts
                      </p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Configure alerts in your strategy settings
                      </p>
                      <Button asChild>
                        <Link href="/strategies">Go to Strategies</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mb-2 text-lg font-medium">No matching alerts</p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        No performance alerts match the current filters.
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Drawdown Threshold</TableHead>
                        <TableHead>Monitors Entry</TableHead>
                        <TableHead>Monitors Exit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPerformanceAlerts.map((alert) => {
                        const strategy = alert.strategy_id
                          ? strategies[alert.strategy_id]
                          : null;
                        const strategyLabel = strategy
                          ? strategy.name
                          : "Unknown Strategy";
                        return (
                          <TableRow key={alert.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {strategy ? (
                                <Link
                                  href={`/strategies/${alert.strategy_id}`}
                                  className="hover:underline"
                                >
                                  {strategy.name}
                                </Link>
                              ) : (
                                "Unknown Strategy"
                              )}
                            </TableCell>
                            <TableCell className="data-text">
                              {alert.threshold_pct ? `${alert.threshold_pct}%` : "—"}
                            </TableCell>
                            <TableCell>
                              {alert.alert_on_entry ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {alert.alert_on_exit ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge alert={alert} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    aria-label={`Open ${strategyLabel} settings`}
                                  >
                                    <Link
                                      href={`/strategies/${alert.strategy_id}`}
                                    >
                                      <ExternalLink className="h-4 w-4" aria-hidden />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open strategy</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {filteredPerformanceAlerts.map((alert) => {
                    const strategy = alert.strategy_id
                      ? strategies[alert.strategy_id]
                      : null;
                    const strategyLabel = strategy
                      ? strategy.name
                      : "Unknown Strategy";
                    return (
                      <Card key={alert.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{strategyLabel}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {alert.threshold_pct !== undefined &&
                                  alert.threshold_pct !== null && (
                                    <Badge
                                      variant="secondary"
                                      className="data-text"
                                    >
                                      DD {alert.threshold_pct}%
                                    </Badge>
                                  )}
                                {alert.alert_on_entry && (
                                  <Badge variant="secondary">Entry</Badge>
                                )}
                                {alert.alert_on_exit && (
                                  <Badge variant="secondary">Exit</Badge>
                                )}
                              </div>
                            </div>
                            <StatusBadge alert={alert} />
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11"
                              asChild
                              aria-label={`Open ${strategyLabel} settings`}
                            >
                              <Link href={`/strategies/${alert.strategy_id}`}>
                                <ExternalLink className="h-5 w-5" aria-hidden />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── History tab ── */}
          <TabsContent value="history" className="space-y-4">
            {historyAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <History
                    className="mb-4 h-12 w-12 text-muted-foreground"
                    aria-hidden
                  />
                  {listLoadUnavailable ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        Could not load alerts
                      </p>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Retry loading your alert list.
                      </p>
                      <Button variant="outline" onClick={refreshAlerts}>
                        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                        Retry
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        No alerts have fired yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Triggered alerts will appear here with a link to the chart at
                        trigger time.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alert Type</TableHead>
                        <TableHead>Asset / Strategy</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Triggered</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyAlerts.map((alert) => {
                        const isPrice = alert.alert_type === "price";
                        const strategy =
                          alert.strategy_id ? strategies[alert.strategy_id] : null;
                        return (
                          <TableRow key={alert.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge variant="secondary">
                                {isPrice ? "Price" : "Performance"}
                              </Badge>
                            </TableCell>
                            <TableCell className="data-text font-medium">
                              {isPrice
                                ? alert.asset
                                : strategy?.name ?? "Unknown Strategy"}
                            </TableCell>
                            <TableCell className="data-text text-sm text-muted-foreground capitalize">
                              {isPrice
                                ? `${alert.direction} ${formatAlertPrice(alert.threshold_price)} ${getQuoteSymbol(alert.asset)}`
                                : alert.threshold_pct
                                  ? `Drawdown ${alert.threshold_pct}%`
                                  : "—"}
                            </TableCell>
                            <TableCell className="data-text">
                              {formatDateTime(alert.last_triggered_at, timezone)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isPrice && alert.asset ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link
                                        href={`/market?asset=${encodeURIComponent(alert.asset)}`}
                                        aria-label={`View ${alert.asset} chart`}
                                      >
                                        <BarChart3 className="h-4 w-4" aria-hidden />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View chart</TooltipContent>
                                </Tooltip>
                              ) : strategy ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link
                                        href={`/strategies/${alert.strategy_id}`}
                                        aria-label={`Open ${strategy.name}`}
                                      >
                                        <ExternalLink
                                          className="h-4 w-4"
                                          aria-hidden
                                        />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open strategy</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {historyAlerts.map((alert) => {
                    const isPrice = alert.alert_type === "price";
                    const strategy =
                      alert.strategy_id ? strategies[alert.strategy_id] : null;
                    return (
                      <Card key={alert.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="data-text font-medium">
                                {isPrice
                                  ? alert.asset
                                  : strategy?.name ?? "Unknown Strategy"}
                              </p>
                              <p className="data-text text-sm text-muted-foreground capitalize">
                                {isPrice
                                  ? `${alert.direction} ${formatAlertPrice(alert.threshold_price)} ${getQuoteSymbol(alert.asset)}`
                                  : alert.threshold_pct
                                    ? `Drawdown ${alert.threshold_pct}%`
                                    : "—"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {isPrice ? "Price" : "Performance"}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="data-text text-xs text-muted-foreground">
                              {formatDateTime(alert.last_triggered_at, timezone)}
                            </span>
                            {isPrice && alert.asset ? (
                              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                                <Link
                                  href={`/market?asset=${encodeURIComponent(alert.asset)}`}
                                  aria-label={`View ${alert.asset} chart`}
                                >
                                  <BarChart3 className="h-5 w-5" aria-hidden />
                                </Link>
                              </Button>
                            ) : strategy ? (
                              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                                <Link
                                  href={`/strategies/${alert.strategy_id}`}
                                  aria-label={`Open ${strategy.name}`}
                                >
                                  <ExternalLink className="h-5 w-5" aria-hidden />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Price Alert Modal */}
        <CreatePriceAlertModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={handleCreated}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {deleteConfirm?.alert_type === "price"
                  ? `Delete ${deleteConfirm.asset} ${deleteConfirm.direction} ${formatAlertPrice(deleteConfirm.threshold_price)} ${getQuoteSymbol(deleteConfirm.asset)}?`
                  : deleteConfirm?.strategy_id && strategies[deleteConfirm.strategy_id]
                  ? `Delete alert for ${strategies[deleteConfirm.strategy_id].name}?`
                  : "Delete alert?"}
              </DialogTitle>
              <DialogDescription>
                This alert will be permanently removed and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "alert" : "alerts"}?
              </DialogTitle>
              <DialogDescription>
                {selectedIds.size === 1
                  ? "This alert will be removed and cannot be undone."
                  : `These ${selectedIds.size} alerts will be removed and cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
