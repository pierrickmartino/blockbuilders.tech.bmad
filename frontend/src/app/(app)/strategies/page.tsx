"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { Strategy } from "@/types/strategy";
import NewStrategyModal from "./new-strategy-modal";
import { StrategyWizard } from "./strategy-wizard";

type SortField = "name" | "updated_at";
type SortOrder = "asc" | "desc";

export default function StrategiesPage() {
  const router = useRouter();
  const { timezone } = useDisplay();
  const { refreshUsage } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const filteredStrategies = strategies
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = sortField === "name" ? a.name.toLowerCase() : a.updated_at;
      const bVal = sortField === "name" ? b.name.toLowerCase() : b.updated_at;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "name" ? "asc" : "desc");
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

  const isUpdatedToday = (lastAutoRunAt: string | null): boolean => {
    if (!lastAutoRunAt) return false;
    const today = new Date().toDateString();
    return new Date(lastAutoRunAt).toDateString() === today;
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
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Strategy
        </button>
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

      {filteredStrategies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">
            {strategies.length === 0
              ? "No strategies yet. Create your first strategy to get started."
              : "No strategies match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  onClick={() => handleSort("name")}
                >
                  Name <SortIcon field="name" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Timeframe
                </th>
                <th
                  className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  onClick={() => handleSort("updated_at")}
                >
                  Last Modified <SortIcon field="updated_at" />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredStrategies.map((strategy) => (
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
                      {strategy.auto_update_enabled && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            isUpdatedToday(strategy.last_auto_run_at)
                              ? "bg-green-100 text-green-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                          title={
                            strategy.last_auto_run_at
                              ? `Last auto-run: ${formatDateTime(strategy.last_auto_run_at, timezone)}`
                              : "No auto-runs yet"
                          }
                        >
                          {isUpdatedToday(strategy.last_auto_run_at) ? "Updated today" : "Needs update"}
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
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(strategy.updated_at, timezone)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/strategies/${strategy.id}`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDuplicate(strategy.id)}
                        disabled={actionLoading === strategy.id}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleArchive(strategy.id, !strategy.is_archived)}
                        disabled={actionLoading === strategy.id}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        {strategy.is_archived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
