"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { useDisplay } from "@/context/display";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/format";
import { Strategy } from "@/types/strategy";
import { BacktestStatusResponse } from "@/types/backtest";
import { getRecentStrategies, getRecentBacktests } from "@/lib/recent-views";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const { timezone } = useDisplay();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recently viewed state
  const [recentStrategyIds, setRecentStrategyIds] = useState<string[]>([]);
  const [recentBacktestRefs, setRecentBacktestRefs] = useState<
    Array<{ strategyId: string; runId?: string }>
  >([]);
  const [recentStrategiesData, setRecentStrategiesData] = useState<Strategy[]>(
    []
  );
  const [recentBacktestsData, setRecentBacktestsData] = useState<
    BacktestStatusResponse[]
  >([]);

  useEffect(() => {
    apiFetch<Strategy[]>("/strategies/")
      .then(setStrategies)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Load recent items from storage
  useEffect(() => {
    setRecentStrategyIds(getRecentStrategies());
    setRecentBacktestRefs(getRecentBacktests());
  }, []);

  // Fetch recent strategies data
  useEffect(() => {
    if (recentStrategyIds.length === 0) return;

    const fetchRecent = async () => {
      const results = await Promise.allSettled(
        recentStrategyIds.map((id) =>
          apiFetch<Strategy>(`/strategies/${id}`)
        )
      );

      const validStrategies = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<Strategy>).value);

      setRecentStrategiesData(validStrategies);
    };

    fetchRecent();
  }, [recentStrategyIds]);

  // Fetch recent backtests data
  useEffect(() => {
    if (recentBacktestRefs.length === 0) return;

    const fetchRecent = async () => {
      const results = await Promise.allSettled(
        recentBacktestRefs
          .filter((ref) => ref.runId)
          .map((ref) =>
            apiFetch<BacktestStatusResponse>(`/backtests/${ref.runId}`)
          )
      );

      const validBacktests = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<BacktestStatusResponse>).value);

      setRecentBacktestsData(validBacktests);
    };

    fetchRecent();
  }, [recentBacktestRefs]);

  const handleClone = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await apiFetch<Strategy>(`/strategies/${id}/duplicate`, {
        method: "POST",
      });
      const updatedStrategies = await apiFetch<Strategy[]>("/strategies/");
      setStrategies(updatedStrategies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone strategy");
    } finally {
      setActionLoading(null);
    }
  };

  const recentStrategies = strategies.slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="rounded-lg bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Welcome, {user?.email}
        </h2>
        <p className="text-gray-600">
          Your strategy workspace is ready. Start building your first backtest
          strategy.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Backtests are simulations using historical data.{" "}
          <Link
            href="/how-backtests-work"
            className="text-blue-600 hover:underline"
          >
            Learn about assumptions
          </Link>
          .
        </p>

        {/* Recently Viewed Strategies */}
        {recentStrategiesData.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Recently Viewed</h3>
              <Link
                href="/strategies"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="space-y-2">
              {recentStrategiesData.map((strategy) => (
                <Link
                  key={strategy.id}
                  href={`/strategies/${strategy.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">
                      {strategy.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {strategy.asset} &middot; {strategy.timeframe}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatDateTime(strategy.updated_at, timezone)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Backtests */}
        {recentBacktestsData.length > 0 && (
          <div className="mt-6">
            <div className="mb-4">
              <h3 className="font-medium text-gray-900">Recent Backtests</h3>
            </div>
            <div className="space-y-2">
              {recentBacktestsData.map((run) => (
                <Link
                  key={run.run_id}
                  href={`/strategies/${run.strategy_id}/backtest`}
                  className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(run.date_from, timezone).split(" ")[0]}{" "}
                      &rarr;{" "}
                      {formatDateTime(run.date_to, timezone).split(" ")[0]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {run.asset} &middot; {run.timeframe}
                    </div>
                  </div>
                  {run.summary && (
                    <div className="text-sm font-medium text-gray-900">
                      {formatPercent(run.summary.total_return_pct)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Your Strategies</h3>
            <Link
              href="/strategies"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all &rarr;
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : strategies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">
                No strategies yet.{" "}
                <Link href="/strategies" className="text-blue-600 hover:text-blue-800">
                  Create your first strategy
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStrategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <Link
                    href={`/strategies/${strategy.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate font-medium text-gray-900">{strategy.name}</div>
                    <div className="text-sm text-gray-500">
                      {strategy.asset} &middot; {strategy.timeframe}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-400">
                      {formatDateTime(strategy.updated_at, timezone)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(strategy.id)}
                      disabled={actionLoading === strategy.id}
                    >
                      {actionLoading === strategy.id ? "Cloning..." : "Clone"}
                    </Button>
                  </div>
                </div>
              ))}
              {strategies.length > 5 && (
                <div className="pt-2 text-center text-sm text-gray-500">
                  +{strategies.length - 5} more strategies
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
