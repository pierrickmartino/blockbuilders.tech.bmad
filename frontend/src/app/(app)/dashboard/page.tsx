"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function formatDisplayName(email: string | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0];
  // Replace separators with spaces and title-case
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { timezone } = useDisplay();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [strategiesLoadFailed, setStrategiesLoadFailed] = useState(false);

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
  const [recentStrategiesLoaded, setRecentStrategiesLoaded] = useState(false);
  const [recentBacktestsLoaded, setRecentBacktestsLoaded] = useState(false);

  const loadStrategies = useCallback(() => {
    setIsLoading(true);
    setStrategiesLoadFailed(false);
    apiFetch<Strategy[]>("/strategies/")
      .then((data) => {
        setStrategies(data);
        setStrategiesLoadFailed(false);
      })
      .catch((err) => {
        setStrategiesLoadFailed(true);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your strategies. Please try again."
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    setRecentStrategyIds(getRecentStrategies());
    setRecentBacktestRefs(getRecentBacktests());
  }, []);

  useEffect(() => {
    if (recentStrategyIds.length === 0) {
      setRecentStrategiesLoaded(true);
      return;
    }

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
      setRecentStrategiesLoaded(true);
    };

    fetchRecent();
  }, [recentStrategyIds]);

  useEffect(() => {
    if (recentBacktestRefs.length === 0) {
      setRecentBacktestsLoaded(true);
      return;
    }

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
      setRecentBacktestsLoaded(true);
    };

    fetchRecent();
  }, [recentBacktestRefs]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleClone = async (id: string) => {
    setActionLoading(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const cloned = await apiFetch<Strategy>(`/strategies/${id}/duplicate`, {
        method: "POST",
      });
      const updatedStrategies = await apiFetch<Strategy[]>("/strategies/");
      setStrategies(updatedStrategies);
      setSuccessMessage(`"${cloned.name}" was created from your strategy.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone strategy");
    } finally {
      setActionLoading(null);
    }
  };

  const recentStrategiesList = strategies.slice(0, 5);
  const recentListIds = new Set(recentStrategiesList.map((s) => s.id));
  // Avoid duplicating items already shown in "Your Strategies" below
  const recentStrategiesUnique = recentStrategiesData.filter(
    (s) => !recentListIds.has(s.id)
  );
  const displayName = formatDisplayName(user?.email);

  return (
    <main className="container mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      {/* Hero welcome section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="text-foreground">{displayName}</span>
        </h1>
        <p className="text-muted-foreground">
          Your strategy workspace is ready.{" "}
          <Link
            href="/how-backtests-work"
            className="text-primary/80 transition-colors hover:text-primary hover:underline"
          >
            Learn about assumptions
          </Link>
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-10" /> : strategies.length}
              </p>
              <p className="text-sm text-muted-foreground">Strategies</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-10" /> : recentBacktestsData.length}
              </p>
              <p className="text-sm text-muted-foreground">Recently Viewed Backtests</p>
            </div>
          </CardContent>
        </Card>

        <Link href="/strategies" className="block">
          <Card className="group h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 transition-colors group-hover:bg-green-500/15 dark:bg-green-400/10 dark:text-green-400">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">New Strategy</p>
                <p className="text-sm text-muted-foreground">Build with blocks</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">{error}</div>
          {strategiesLoadFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadStrategies}
              className="h-7"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* Recently Viewed Strategies */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold tracking-tight">Recently Viewed</h2>
          </div>
          <Link
            href="/strategies"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
        {recentStrategiesUnique.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentStrategiesUnique.map((strategy) => (
              <Card
                key={strategy.id}
                className="group relative h-full transition-all duration-200 hover:border-primary/20 hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="mb-2 truncate font-medium tracking-tight group-hover:text-primary">
                    <Link
                      href={`/strategies/${strategy.id}`}
                      aria-label={`Open strategy ${strategy.name}`}
                      className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="relative z-10">{strategy.name}</span>
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {strategy.asset}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {strategy.timeframe}
                    </span>
                  </div>
                  <p className="relative z-10 mt-3 text-xs text-muted-foreground">
                    {formatDateTime(strategy.updated_at, timezone)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentStrategiesLoaded ? (
          <p className="text-sm text-muted-foreground">
            Strategies you open will appear here.
          </p>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </section>

      {/* Recent Backtests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold tracking-tight">Recent Backtests</h2>
        </div>
        {recentBacktestsData.length > 0 ? (
          <div className="space-y-2">
            {recentBacktestsData.map((run) => {
              const returnPct = run.summary?.total_return_pct;
              const isPositive = returnPct !== undefined && returnPct > 0;
              const isNegative = returnPct !== undefined && returnPct < 0;

              return (
                <Card
                  key={run.run_id}
                  className="group relative transition-all duration-200 hover:shadow-md"
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <Link
                      href={`/strategies/${run.strategy_id}/backtest`}
                      aria-label={`Open backtest for ${run.asset} ${run.timeframe}`}
                      className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-foreground">
                          {formatDateTime(run.date_from, timezone).split(" ")[0]}
                        </span>
                        <span className="text-muted-foreground">–</span>
                        <span className="text-foreground">
                          {formatDateTime(run.date_to, timezone).split(" ")[0]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {run.asset}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {run.timeframe}
                        </span>
                      </div>
                    </div>
                    {run.summary && (
                      <div className="relative z-10 flex items-center gap-1.5">
                        {isPositive && (
                          <ArrowUpRight className="h-4 w-4 text-green-500 dark:text-green-400" />
                        )}
                        {isNegative && (
                          <ArrowDownRight className="h-4 w-4 text-red-500 dark:text-red-400" />
                        )}
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive
                              ? "text-green-600 dark:text-green-400"
                              : isNegative
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground"
                          }`}
                        >
                          {formatPercent(run.summary.total_return_pct)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : recentBacktestsLoaded ? (
          <p className="text-sm text-muted-foreground">
            Backtests you run will appear here.
          </p>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </section>

      {/* Your Strategies */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold tracking-tight">Your Strategies</h2>
          </div>
          <Link
            href="/strategies"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-14" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Layers className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">No strategies yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first strategy to get started
              </p>
              <Button asChild>
                <Link href="/strategies">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategy
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentStrategiesList.map((strategy) => (
              <Card
                key={strategy.id}
                className="group relative transition-all duration-200 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/strategies/${strategy.id}`}
                      aria-label={`Open strategy ${strategy.name}`}
                      className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <div className="relative z-10 truncate font-medium tracking-tight group-hover:text-primary">
                      {strategy.name}
                    </div>
                    <div className="relative z-10 mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {strategy.asset}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {strategy.timeframe}
                      </span>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(strategy.updated_at, timezone)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleClone(strategy.id)}
                      disabled={actionLoading === strategy.id}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {actionLoading === strategy.id ? "Cloning..." : "Clone"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {strategies.length > 5 && (
              <div className="pt-2 text-center">
                <Link
                  href="/strategies"
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                >
                  +{strategies.length - 5} more strategies
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
