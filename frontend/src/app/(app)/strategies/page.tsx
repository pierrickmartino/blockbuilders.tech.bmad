"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { ALLOWED_ASSETS, Strategy, StrategyExportFile, StrategyVersion, StrategyVersionDetail } from "@/types/strategy";
import type { ValidationResponse } from "@/types/canvas";
import NewStrategyModal from "./new-strategy-modal";
import { StrategyWizard } from "./strategy-wizard";

type SortField = "name" | "updated_at" | "total_return" | "last_run" | "asset";
type SortOrder = "asc" | "desc";
type PerformanceFilter = "all" | "positive" | "negative";
type LastRunFilter = "all" | "7days" | "30days" | "never";

export default function StrategiesPage() {
  const router = useRouter();
  const { timezone } = useDisplay();
  const { refreshUsage } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>("total_return");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<StrategyExportFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // New filter states
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>("all");
  const [lastRunFilter, setLastRunFilter] = useState<LastRunFilter>("all");

  useEffect(() => {
    const loadStrategies = async () => {
      try {
        const params = new URLSearchParams();
        if (showArchived) params.set("include_archived", "true");
        const data = await apiFetch<Strategy[]>(`/strategies/?${params}`);
        setStrategies(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load strategies");
      } finally {
        setIsLoading(false);
      }
    };
    loadStrategies();
  }, [showArchived]);

  const refreshStrategies = async () => {
    try {
      const params = new URLSearchParams();
      if (showArchived) params.set("include_archived", "true");
      const data = await apiFetch<Strategy[]>(`/strategies/?${params}`);
      setStrategies(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies");
    }
  };

  // Filter and sort logic
  const filteredAndSortedStrategies = useMemo(() => {
    let filtered = strategies;

    // Search filter
    if (search) {
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Asset filter
    if (assetFilter !== "all") {
      filtered = filtered.filter((s) => s.asset === assetFilter);
    }

    // Performance filter
    if (performanceFilter === "positive") {
      filtered = filtered.filter((s) => (s.latest_total_return_pct ?? 0) > 0);
    } else if (performanceFilter === "negative") {
      filtered = filtered.filter((s) => (s.latest_total_return_pct ?? 0) < 0);
    }

    // Last run filter
    if (lastRunFilter !== "all") {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((s) => {
        if (lastRunFilter === "never") {
          return !s.last_run_at;
        }
        if (!s.last_run_at) return false;

        const runDate = new Date(s.last_run_at);
        if (lastRunFilter === "7days") {
          return runDate >= sevenDaysAgo;
        }
        if (lastRunFilter === "30days") {
          return runDate >= thirtyDaysAgo;
        }
        return true;
      });
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "updated_at":
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        case "total_return":
          aVal = a.latest_total_return_pct ?? -Infinity;
          bVal = b.latest_total_return_pct ?? -Infinity;
          break;
        case "last_run":
          aVal = a.last_run_at ? new Date(a.last_run_at).getTime() : -Infinity;
          bVal = b.last_run_at ? new Date(b.last_run_at).getTime() : -Infinity;
          break;
        case "asset":
          aVal = a.asset;
          bVal = b.asset;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [strategies, search, assetFilter, performanceFilter, lastRunFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "name" || field === "asset" ? "asc" : "desc");
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(id);
    try {
      const newStrategy = await apiFetch<Strategy>(`/strategies/${id}/duplicate`, {
        method: "POST",
      });
      router.push(`/strategies/${newStrategy.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate strategy");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    setActionLoading(id);
    try {
      await apiFetch(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: archive }),
      });
      await refreshStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update strategy");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (id: string) => {
    setActionLoading(id);
    try {
      // Fetch strategy + versions
      const strategy = await apiFetch<Strategy>(`/strategies/${id}`);
      const versions = await apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);

      if (versions.length === 0) {
        setError("Cannot export strategy without a saved version");
        return;
      }

      // Fetch latest version detail
      const versionDetail = await apiFetch<StrategyVersionDetail>(
        `/strategies/${id}/versions/${versions[0].version_number}`
      );

      // Build export file per PRD format
      const exportFile: StrategyExportFile = {
        schema_version: 1,
        exported_at: new Date().toISOString(),
        strategy: {
          name: strategy.name,
          asset: strategy.asset,
          timeframe: strategy.timeframe,
        },
        definition_json: versionDetail.definition_json,
      };

      // Trigger browser download
      const blob = new Blob([JSON.stringify(exportFile, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strategy-${strategy.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export strategy");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // Frontend validation (fast checks per PRD)
        if (!data.schema_version || data.schema_version !== 1) {
          setImportError("Unsupported schema version");
          return;
        }

        if (!data.strategy?.name || !data.strategy?.asset || !data.strategy?.timeframe) {
          setImportError("Invalid file: missing strategy fields");
          return;
        }

        if (!data.definition_json) {
          setImportError("Invalid file: missing definition");
          return;
        }

        setImportData(data);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Invalid JSON file");
      }
    };
    reader.onerror = () => setImportError("Failed to read file");
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    if (!importData) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // Step 1: Create strategy (backend validates asset/timeframe)
      const newStrategy = await apiFetch<Strategy>("/strategies/", {
        method: "POST",
        body: JSON.stringify({
          name: importData.strategy.name,
          asset: importData.strategy.asset,
          timeframe: importData.strategy.timeframe,
        }),
      });

      // Step 2: Validate definition
      const validation = await apiFetch<ValidationResponse>(
        `/strategies/${newStrategy.id}/validate`,
        {
          method: "POST",
          body: JSON.stringify(importData.definition_json),
        }
      );

      if (validation.status === "invalid") {
        const messages = validation.errors.map((error) => error.message).filter(Boolean);
        setImportError(
          messages.length > 0
            ? `Validation failed: ${messages.join(" ")}`
            : "Validation failed. Please fix the strategy and try again."
        );
        return;
      }

      // Step 3: Create version (backend validates definition)
      await apiFetch(`/strategies/${newStrategy.id}/versions`, {
        method: "POST",
        body: JSON.stringify({
          definition: importData.definition_json,
        }),
      });

      // Success - navigate to new strategy
      setShowImportModal(false);
      router.push(`/strategies/${newStrategy.id}`);
      await refreshUsage();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setImportError("Invalid strategy definition. Please export a strategy from the app and try again.");
      } else {
        setImportError(err instanceof Error ? err.message : "Failed to import strategy");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setImportData(null);
    setImportError(null);
  };

  // Helper functions for metric formatting
  const formatMetric = (value: number | null | undefined, suffix = ""): string => {
    if (value === null || value === undefined) return "—";
    return `${value.toFixed(2)}${suffix}`;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "Never";
    return formatDateTime(date, timezone);
  };

  const getReturnColorClass = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "text-gray-900";
    return value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-900";
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-400">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Strategies</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Import
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New Strategy
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search strategies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show archived
        </label>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Assets</option>
          {ALLOWED_ASSETS.map((asset) => (
            <option key={asset} value={asset}>
              {asset}
            </option>
          ))}
        </select>

        <select
          value={performanceFilter}
          onChange={(e) => setPerformanceFilter(e.target.value as PerformanceFilter)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Performance</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
        </select>

        <select
          value={lastRunFilter}
          onChange={(e) => setLastRunFilter(e.target.value as LastRunFilter)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Runs</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="never">Never Run</option>
        </select>
      </div>

      {filteredAndSortedStrategies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">
            {strategies.length === 0
              ? "No strategies yet. Create your first strategy to get started."
              : "No strategies match your search or filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort("name")}
                  >
                    Name <SortIcon field="name" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort("asset")}
                  >
                    Asset <SortIcon field="asset" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Timeframe
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort("total_return")}
                  >
                    Total Return <SortIcon field="total_return" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Max DD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Trades
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort("last_run")}
                  >
                    Last Run <SortIcon field="last_run" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAndSortedStrategies.map((strategy) => (
                  <tr
                    key={strategy.id}
                    className={`hover:bg-gray-50 ${strategy.is_archived ? "opacity-60" : ""}`}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/strategies/${strategy.id}`)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {strategy.name}
                        </button>
                        {strategy.is_archived && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            Archived
                          </span>
                        )}
                        {strategy.auto_update_enabled && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                            Auto: On
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {strategy.asset}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {strategy.timeframe}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${getReturnColorClass(strategy.latest_total_return_pct)}`}>
                      {formatMetric(strategy.latest_total_return_pct, "%")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatMetric(strategy.latest_max_drawdown_pct, "%")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatMetric(strategy.latest_win_rate_pct, "%")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatMetric(strategy.latest_num_trades)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(strategy.last_run_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <details className="relative inline-block text-left">
                        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                          <span className="sr-only">Open actions</span>
                          <span aria-hidden>•••</span>
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-gray-200 bg-white py-1 text-left text-sm shadow-lg">
                          <button
                            onClick={() => router.push(`/strategies/${strategy.id}`)}
                            className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDuplicate(strategy.id)}
                            disabled={actionLoading === strategy.id}
                            className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleExport(strategy.id)}
                            disabled={actionLoading === strategy.id}
                            className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleArchive(strategy.id, !strategy.is_archived)}
                            disabled={actionLoading === strategy.id}
                            className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {strategy.is_archived ? "Unarchive" : "Archive"}
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 md:hidden">
            {filteredAndSortedStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${strategy.is_archived ? "opacity-60" : ""}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
                    <p className="text-sm text-gray-600">
                      {strategy.asset} • {strategy.timeframe}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {strategy.is_archived && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Archived
                        </span>
                      )}
                      {strategy.auto_update_enabled && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                          Auto: On
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/strategies/${strategy.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Open
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Total Return</div>
                    <div className={`font-semibold ${getReturnColorClass(strategy.latest_total_return_pct)}`}>
                      {formatMetric(strategy.latest_total_return_pct, "%")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Max Drawdown</div>
                    <div className="font-semibold text-gray-900">
                      {formatMetric(strategy.latest_max_drawdown_pct, "%")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Win Rate</div>
                    <div className="font-semibold text-gray-900">
                      {formatMetric(strategy.latest_win_rate_pct, "%")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Trades</div>
                    <div className="font-semibold text-gray-900">
                      {formatMetric(strategy.latest_num_trades)}
                    </div>
                  </div>
                </div>

                <div className="mb-3 text-sm text-gray-600">
                  Last run: {formatDate(strategy.last_run_at)}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicate(strategy.id)}
                    disabled={actionLoading === strategy.id}
                    className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => handleExport(strategy.id)}
                    disabled={actionLoading === strategy.id}
                    className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Export
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => handleArchive(strategy.id, !strategy.is_archived)}
                    disabled={actionLoading === strategy.id}
                    className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    {strategy.is_archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <NewStrategyModal
          onClose={() => setShowModal(false)}
          onCreated={(strategy) => {
            setShowModal(false);
            router.push(`/strategies/${strategy.id}`);
          }}
          onOpenWizard={() => {
            setShowModal(false);
            setShowWizard(true);
          }}
        />
      )}

      {showWizard && (
        <StrategyWizard
          onClose={() => setShowWizard(false)}
          onComplete={(strategyId) => {
            setShowWizard(false);
            router.push(`/strategies/${strategyId}`);
            refreshUsage();
          }}
        />
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Import Strategy</h2>

            {!importData ? (
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm text-gray-600">
                    Select a strategy JSON file
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                </label>

                {importError && (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {importError}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleImportCancel}
                    className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {importData.strategy.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {importData.strategy.asset} • {importData.strategy.timeframe}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Exported: {new Date(importData.exported_at).toLocaleDateString()}
                  </div>
                </div>

                {importError && (
                  <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {importError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleImportConfirm}
                    disabled={isImporting}
                    className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImporting ? "Importing..." : "Import"}
                  </button>
                  <button
                    onClick={handleImportCancel}
                    disabled={isImporting}
                    className="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
