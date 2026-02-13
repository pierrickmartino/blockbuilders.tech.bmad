"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { AlertRule } from "@/types/alert";
import { ALLOWED_ASSETS } from "@/types/strategy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Mail, Webhook } from "lucide-react";
import CreatePriceAlertModal from "./create-price-alert-modal";

type StatusFilter = "all" | "active" | "triggered" | "inactive";

interface StrategyInfo {
  id: string;
  name: string;
}

export default function AlertsPage() {
  const { timezone } = useDisplay();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [strategies, setStrategies] = useState<Record<string, StrategyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AlertRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await apiFetch<AlertRule[]>("/alerts/");
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  };

  const fetchStrategies = async () => {
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
  };

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchStrategies()]).finally(() => setLoading(false));
  }, []);

  const priceAlerts = alerts.filter((a) => a.alert_type === "price");
  const performanceAlerts = alerts.filter((a) => a.alert_type === "performance");

  const filterAlerts = (alertList: AlertRule[]) => {
    return alertList.filter((alert) => {
      // Asset filter (for price alerts)
      if (assetFilter !== "all" && alert.asset !== assetFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !alert.is_active) return false;
      if (statusFilter === "inactive" && alert.is_active) return false;
      if (statusFilter === "triggered" && !alert.last_triggered_at) return false;

      return true;
    });
  };

  const filteredPriceAlerts = filterAlerts(priceAlerts);
  const filteredPerformanceAlerts = filterAlerts(performanceAlerts);

  const handleToggleActive = async (alert: AlertRule) => {
    try {
      const updated = await apiFetch<AlertRule>(`/alerts/${alert.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !alert.is_active }),
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/alerts/${deleteConfirm.id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
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
    if (alert.expires_at && new Date(alert.expires_at) < new Date()) {
      return <Badge variant="outline">Expired</Badge>;
    }
    return <Badge className="bg-green-600 dark:bg-green-700">Active</Badge>;
  };

  const getChannelIcons = (alert: AlertRule) => {
    const icons = [];
    if (alert.notify_in_app) {
      icons.push(<span key="bell" title="In-app"><Bell className="h-4 w-4 text-muted-foreground" /></span>);
    }
    if (alert.notify_email) {
      icons.push(<span key="mail" title="Email"><Mail className="h-4 w-4 text-muted-foreground" /></span>);
    }
    if (alert.notify_webhook) {
      icons.push(<span key="webhook" title="Webhook"><Webhook className="h-4 w-4 text-muted-foreground" /></span>);
    }
    return <div className="flex gap-1">{icons}</div>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Manage price and performance alerts
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Tabs defaultValue="price" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price">
            Price Alerts ({priceAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="performance">
            Performance Alerts ({performanceAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price" className="space-y-4">
          {/* Price Alerts Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger className="w-[140px]">
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="triggered">Triggered</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Alert
            </Button>
          </div>

          {/* Price Alerts Table (Desktop) */}
          {filteredPriceAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">No price alerts</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create an alert to get notified when prices reach your targets
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filteredPriceAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.asset}</TableCell>
                        <TableCell className="capitalize">{alert.direction}</TableCell>
                        <TableCell>${formatAlertPrice(alert.threshold_price)}</TableCell>
                        <TableCell>{getStatusBadge(alert)}</TableCell>
                        <TableCell>{getChannelIcons(alert)}</TableCell>
                        <TableCell>{formatDateTime(alert.expires_at, timezone)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(alert)}
                              title={alert.is_active ? "Deactivate" : "Activate"}
                            >
                              {alert.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(alert)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {filteredPriceAlerts.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alert.asset}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.direction} ${formatAlertPrice(alert.threshold_price)}
                          </p>
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
                            size="sm"
                            onClick={() => handleToggleActive(alert)}
                          >
                            {alert.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(alert)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Alerts Info */}
          <p className="text-sm text-muted-foreground">
            Performance alerts are configured per strategy. Visit a strategy&apos;s settings to manage its alert.
          </p>

          {filteredPerformanceAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">No performance alerts</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Configure alerts in your strategy settings
                </p>
                <Button asChild>
                  <Link href="/strategies">Go to Strategies</Link>
                </Button>
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
                      return (
                        <TableRow key={alert.id}>
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
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/strategies/${alert.strategy_id}`}>
                                <ExternalLink className="h-4 w-4" />
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
                  return (
                    <Card key={alert.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {strategy ? strategy.name : "Unknown Strategy"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {alert.threshold_pct && `DD: ${alert.threshold_pct}%`}
                              {alert.alert_on_entry && " | Entry"}
                              {alert.alert_on_exit && " | Exit"}
                            </p>
                          </div>
                          {getStatusBadge(alert)}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {alert.last_triggered_at
                              ? `Triggered ${formatDateTime(alert.last_triggered_at, timezone)}`
                              : "Not triggered"}
                          </span>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/strategies/${alert.strategy_id}`}>
                              <ExternalLink className="h-4 w-4" />
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
    </div>
  );
}
