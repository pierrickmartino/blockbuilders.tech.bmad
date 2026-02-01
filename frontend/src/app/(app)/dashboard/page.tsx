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
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Welcome, {user?.email}
        </h2>
        <p className="text-muted-foreground">
          Your strategy workspace is ready. Start building your first backtest
          strategy.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Backtests are simulations using historical data.{" "}
          <Link
            href="/how-backtests-work"
            className="text-primary hover:underline"
          >
            Learn about assumptions
          </Link>
          .
        </p>

        {/* Recently Viewed Strategies */}
        {recentStrategiesData.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-foreground">Recently Viewed</h3>
              <Link
                href="/strategies"
                className="text-sm text-primary hover:underline"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="space-y-2">
              {recentStrategiesData.map((strategy) => (
                <Card key={strategy.id} className="hover:bg-muted/50">
                  <Link href={`/strategies/${strategy.id}`}>
                    <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          {strategy.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {strategy.asset} &middot; {strategy.timeframe}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(strategy.updated_at, timezone)}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Backtests */}
        {recentBacktestsData.length > 0 && (
          <div className="mt-6">
            <div className="mb-4">
              <h3 className="font-medium text-foreground">Recent Backtests</h3>
            </div>
            <div className="space-y-2">
              {recentBacktestsData.map((run) => (
                <Card key={run.run_id} className="hover:bg-muted/50">
                  <Link href={`/strategies/${run.strategy_id}/backtest`}>
                    <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">
                          {formatDateTime(run.date_from, timezone).split(" ")[0]}{" "}
                          &rarr;{" "}
                          {formatDateTime(run.date_to, timezone).split(" ")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {run.asset} &middot; {run.timeframe}
                        </div>
                      </div>
                      {run.summary && (
                        <div className="text-sm font-medium text-foreground">
                          {formatPercent(run.summary.total_return_pct)}
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-foreground">Your Strategies</h3>
            <Link
              href="/strategies"
              className="text-sm text-primary hover:underline"
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
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : strategies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-muted-foreground">
                  No strategies yet.{" "}
                  <Link href="/strategies" className="text-primary hover:underline">
                    Create your first strategy
                  </Link>{" "}
                  to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentStrategies.map((strategy) => (
                <Card key={strategy.id} className="hover:bg-muted/50">
                  <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <Link
                      href={`/strategies/${strategy.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate font-medium text-foreground">{strategy.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {strategy.asset} &middot; {strategy.timeframe}
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">
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
                  </CardContent>
                </Card>
              ))}
              {strategies.length > 5 && (
                <div className="pt-2 text-center text-sm text-muted-foreground">
                  +{strategies.length - 5} more strategies
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </main>
  );
}
