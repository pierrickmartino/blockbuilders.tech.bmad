"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
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
} from "lucide-react";
import CreatePriceAlertModal from "./create-price-alert-modal";

type StatusFilter = "all" | "active" | "triggered" | "inactive" | "expired";

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

export default function AlertsPage() {
  const { timezone } = useDisplay();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [strategies, setStrategies] = useState<Record<string, StrategyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Filters
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AlertRule | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Per-row pending state
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const setRowPending = (id: string, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  // Selection (price alerts only — performance alerts are managed per strategy)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await apiFetch<AlertRule[]>("/alerts/");
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, []);

  const fetchStrategies = useCallback(async () => {
    try {
      const data = await apiFetch<StrategyInfo[]>("/strategies/");
      const map: Record<string, StrategyInfo> = {};
      data.forEach((s) => {
        map[s.id] = s;
      });
      setStrategies(map);
    } catch {
      // Ignore - strategies are for display only
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchStrategies()]).finally(() => setLoading(false));
  }, [fetchAlerts, fetchStrategies]);

  // Scroll error into view + announce
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const priceAlerts = alerts.filter((a) => a.alert_type === "price");
  const performanceAlerts = alerts.filter((a) => a.alert_type === "performance");

  const filterAlerts = (alertList: AlertRule[]) => {
    return alertList.filter((alert) => {
      if (assetFilter !== "all" && alert.asset !== assetFilter) return false;
      if (statusFilter === "active" && (!alert.is_active || isExpired(alert))) return false;
      if (statusFilter === "inactive" && alert.is_active) return false;
      if (statusFilter === "triggered" && !alert.last_triggered_at) return false;
      if (statusFilter === "expired" && !isExpired(alert)) return false;
      return true;
    });
  };

  const filteredPriceAlerts = filterAlerts(priceAlerts);
  const filteredPerformanceAlerts = filterAlerts(performanceAlerts);

  const filtersActive = assetFilter !== "all" || statusFilter !== "all";
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

  const handleToggleActive = async (alert: AlertRule) => {
    // Optimistic update
    const next = !alert.is_active;
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, is_active: next } : a))
    );
    setRowPending(alert.id, true);
    try {
      const updated = await apiFetch<AlertRule>(`/alerts/${alert.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next }),
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      // Rollback
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: !next } : a))
      );
      setError(err instanceof Error ? err.message : "Failed to update alert");
    } finally {
      setRowPending(alert.id, false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/alerts/${deleteConfirm.id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteConfirm.id);
        return next;
      });
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkSetActive = async (next: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    ids.forEach((id) => setRowPending(id, true));
    // Optimistic
    setAlerts((prev) =>
      prev.map((a) => (selectedIds.has(a.id) ? { ...a, is_active: next } : a))
    );
    try {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/alerts/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: next }),
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alerts");
      fetchAlerts();
    } finally {
      ids.forEach((id) => setRowPending(id, false));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        ids.map((id) => apiFetch(`/alerts/${id}`, { method: "DELETE" }))
      );
      setAlerts((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      clearSelection();
      setBulkDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alerts");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreated = (alert: AlertRule) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  const formatAlertPrice = (price: number | undefined) => {
    if (price === undefined) return "—";
    return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const getStatusBadge = (alert: AlertRule) => {
    if (alert.last_triggered_at) {
      return <Badge variant="secondary">Triggered</Badge>;
    }
    if (!alert.is_active) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (isExpired(alert)) {
      return <Badge variant="outline">Expired</Badge>;
    }
    return (
      <Badge className="bg-success text-success-foreground hover:bg-success/90">
        Active
      </Badge>
    );
  };

  const getChannelIcons = (alert: AlertRule) => {
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
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div role="status" aria-live="polite" className="sr-only">
          Loading alerts
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
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

  const priceTabLabel =
    filtersActive && filteredPriceAlerts.length !== priceAlerts.length
      ? `Price Alerts (${filteredPriceAlerts.length}/${priceAlerts.length})`
      : `Price Alerts (${priceAlerts.length})`;
  const perfTabLabel =
    filtersActive && filteredPerformanceAlerts.length !== performanceAlerts.length
      ? `Performance Alerts (${filteredPerformanceAlerts.length}/${performanceAlerts.length})`
      : `Performance Alerts (${performanceAlerts.length})`;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Manage price and performance alerts
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New alert
        </Button>
      </div>

      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      <Tabs defaultValue="price" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price">{priceTabLabel}</TabsTrigger>
          <TabsTrigger value="performance">{perfTabLabel}</TabsTrigger>
        </TabsList>

        <TabsContent value="price" className="space-y-4">
          {/* Filters */}
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
                  <SelectItem value="triggered">Triggered</SelectItem>
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

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
            >
              <span>
                {selectedIds.size} selected
              </span>
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
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Empty / Filtered-empty / List */}
          {filteredPriceAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
                {priceAlerts.length === 0 ? (
                  <>
                    <p className="mb-2 text-lg font-medium">No price alerts</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Create an alert to get notified when prices reach your targets
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden />
                      Create Alert
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
                      <TableHead>Condition</TableHead>
                      <TableHead>Threshold</TableHead>
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
                          <TableCell className="font-medium">{alert.asset}</TableCell>
                          <TableCell className="capitalize">{alert.direction}</TableCell>
                          <TableCell>
                            {formatAlertPrice(alert.threshold_price)} {quote}
                          </TableCell>
                          <TableCell>{getStatusBadge(alert)}</TableCell>
                          <TableCell>{getChannelIcons(alert)}</TableCell>
                          <TableCell>{formatDateTime(alert.expires_at, timezone)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
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
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : alert.is_active ? (
                                  <ToggleRight
                                    className="h-4 w-4 text-success"
                                    aria-hidden
                                  />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(alert)}
                                aria-label={`Delete alert for ${alert.asset}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                              </Button>
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
                    <Card key={alert.id} data-state={selected ? "selected" : undefined}>
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
                              <p className="font-medium">{alert.asset}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {alert.direction} {formatAlertPrice(alert.threshold_price)}{" "}
                                {quote}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(alert)}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getChannelIcons(alert)}
                            {alert.expires_at && (
                              <span className="text-xs text-muted-foreground">
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
                                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                              ) : alert.is_active ? (
                                <ToggleRight className="h-5 w-5 text-success" aria-hidden />
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

        <TabsContent value="performance" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Performance alerts are configured per strategy. Visit a strategy&apos;s
            settings to manage its alert.
          </p>

          {filteredPerformanceAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
                {performanceAlerts.length === 0 ? (
                  <>
                    <p className="mb-2 text-lg font-medium">No performance alerts</p>
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
                      <TableHead>Entry Signal</TableHead>
                      <TableHead>Exit Signal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPerformanceAlerts.map((alert) => {
                      const strategy = alert.strategy_id ? strategies[alert.strategy_id] : null;
                      const strategyLabel = strategy ? strategy.name : "Unknown Strategy";
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
                          <TableCell>
                            {alert.threshold_pct ? `${alert.threshold_pct}%` : "—"}
                          </TableCell>
                          <TableCell>{alert.alert_on_entry ? "Yes" : "No"}</TableCell>
                          <TableCell>{alert.alert_on_exit ? "Yes" : "No"}</TableCell>
                          <TableCell>{getStatusBadge(alert)}</TableCell>
                          <TableCell>{formatDateTime(alert.last_triggered_at, timezone)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              aria-label={`Open ${strategyLabel} settings`}
                            >
                              <Link href={`/strategies/${alert.strategy_id}`}>
                                <ExternalLink className="h-4 w-4" aria-hidden />
                              </Link>
                            </Button>
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
                  const strategy = alert.strategy_id ? strategies[alert.strategy_id] : null;
                  const strategyLabel = strategy ? strategy.name : "Unknown Strategy";
                  return (
                    <Card key={alert.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{strategyLabel}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {alert.threshold_pct !== undefined && alert.threshold_pct !== null && (
                                <Badge variant="secondary">DD {alert.threshold_pct}%</Badge>
                              )}
                              {alert.alert_on_entry && <Badge variant="secondary">Entry</Badge>}
                              {alert.alert_on_exit && <Badge variant="secondary">Exit</Badge>}
                            </div>
                          </div>
                          {getStatusBadge(alert)}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {alert.last_triggered_at
                              ? `Triggered ${formatDateTime(alert.last_triggered_at, timezone)}`
                              : "Not triggered"}
                          </span>
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
            <DialogTitle>Delete Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this alert? This action cannot be undone.
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
            <DialogTitle>Delete {selectedIds.size} alerts?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.size} selected alert
              {selectedIds.size === 1 ? "" : "s"}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>
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
  );
}
