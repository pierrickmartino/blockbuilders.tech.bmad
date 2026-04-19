"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { useDisplay } from "@/context/display";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/format";
import { Strategy } from "@/types/strategy";
import { BacktestStatusResponse } from "@/types/backtest";
import { getRecentBacktests } from "@/lib/recent-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Activity,
  Clock,
  Plus,
  ArrowRight,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function formatDisplayName(email: string | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0];
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function formatAsset(asset: string): string {
  return asset.replace("/", " / ");
}

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

  const [recentBacktestRefs, setRecentBacktestRefs] = useState<
    Array<{ strategyId: string; runId?: string }>
  >([]);
  const [recentBacktestsData, setRecentBacktestsData] = useState<
    BacktestStatusResponse[]
  >([]);
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
    setRecentBacktestRefs(getRecentBacktests());
  }, []);

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
  const displayName = formatDisplayName(user?.email);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const newThisWeek = strategies.filter(
    (s) => new Date(s.created_at) >= weekStart
  ).length;

  const latestBacktest = recentBacktestsData[0];

  return (
    <main className="container mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Welcome back
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Your strategy workspace is ready.{" "}
            <Link
              href="/how-backtests-work"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              Learn about assumptions <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Strategies count */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Strategies</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight">
              {isLoading ? <Skeleton className="h-10 w-12" /> : strategies.length}
            </p>
            {!isLoading && newThisWeek > 0 && (
              <div className="mt-3">
                <Badge className="gap-1 bg-green-500/10 text-green-700 hover:bg-green-500/10 dark:text-green-400">
                  <ArrowUpRight className="h-3 w-3" />+{newThisWeek} this week
                </Badge>
              </div>
            )}
            {!isLoading && newThisWeek === 0 && (
              <div className="mt-3 h-6" />
            )}
          </CardContent>
        </Card>

        {/* Recently viewed backtests */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Recently viewed backtests
              </span>
              <Activity className="h-4 w-4 text-green-500 dark:text-green-400" />
            </div>
            <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight">
              {!recentBacktestsLoaded ? (
                <Skeleton className="h-10 w-8" />
              ) : (
                recentBacktestsData.length
              )}
            </p>
            {latestBacktest ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last run · {formatDateOnly(latestBacktest.date_to)}
              </p>
            ) : (
              <div className="mt-3 h-6" />
            )}
          </CardContent>
        </Card>

        {/* Dark CTA card */}
        <Card className="bg-foreground text-background">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-background/50">
                Start something new
              </span>
              <Button
                size="icon"
                className="h-7 w-7 bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/strategies">
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 flex-1">
              <p className="text-2xl font-bold leading-tight">New Strategy</p>
              <p className="mt-1 text-sm text-background/60">Build with blocks</p>
            </div>
            <div className="mt-4 flex justify-end">
              
            </div>
          </CardContent>
        </Card>
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

      {/* Recent Backtests */}
      <section>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-5 py-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold tracking-tight">Recent backtests</h2>
              {recentBacktestsData.length > 0 && (
                <span className="ml-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {recentBacktestsData.length}
                </span>
              )}
              <Link
                href="/strategies"
                className="ml-auto flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentBacktestsData.length > 0 ? (
              <div className="divide-y divide-border">
                {recentBacktestsData.map((run) => {
                  const returnPct = run.summary?.total_return_pct;
                  const isPositive = returnPct !== undefined && returnPct > 0;
                  const isNegative = returnPct !== undefined && returnPct < 0;

                  return (
                    <Link
                      key={run.run_id}
                      href={`/strategies/${run.strategy_id}/backtest`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-medium">
                            {formatAsset(run.asset)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDateOnly(run.date_from)} →{" "}
                            {formatDateOnly(run.date_to)}
                          </span>
                        </span>
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs font-normal"
                      >
                        {run.timeframe}
                      </Badge>
                      {run.summary && (
                        <span
                          className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${
                            isPositive
                              ? "text-green-600 dark:text-green-400"
                              : isNegative
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground"
                          }`}
                        >
                          {isPositive && (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          {isNegative && (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {formatPercent(run.summary.total_return_pct)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : recentBacktestsLoaded ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">
                Backtests you run will appear here.
              </p>
            ) : (
              <div className="space-y-px divide-y divide-border">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Your Strategies */}
      <section>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-5 py-4">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold tracking-tight">Your strategies</h2>
              {!isLoading && strategies.length > 0 && (
                <span className="ml-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {strategies.length}
                </span>
              )}
              <Link
                href="/strategies"
                className="ml-auto flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                ))}
              </div>
            ) : strategies.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
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
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-t border-border px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Strategy</span>
                  <span className="w-32 text-right">Pair</span>
                  <span className="w-36 text-right">Updated</span>
                  <span className="w-16" />
                </div>
                <div className="divide-y divide-border">
                  {recentStrategiesList.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="group relative grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <Link
                        href={`/strategies/${strategy.id}`}
                        aria-label={`Open strategy ${strategy.name}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                      />
                      {/* Strategy info */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium group-hover:text-primary">
                            {strategy.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {strategy.asset} · {strategy.timeframe}
                          </p>
                        </div>
                      </div>
                      {/* Pair */}
                      <div className="flex w-32 items-center justify-end gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {strategy.asset}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {strategy.timeframe}
                        </span>
                      </div>
                      {/* Updated */}
                      <span className="w-36 text-right text-xs text-muted-foreground">
                        {formatDateTime(strategy.updated_at, timezone)}
                      </span>
                      {/* Actions */}
                      <div className="relative z-10 flex w-16 items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleClone(strategy.id)}
                          disabled={actionLoading === strategy.id}
                        >
                          <Copy className="h-3 w-3" />
                          {actionLoading === strategy.id ? "…" : "Clone"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {strategies.length > 5 && (
                  <div className="border-t border-border px-5 py-3 text-center">
                    <Link
                      href="/strategies"
                      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      +{strategies.length - 5} more strategies
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
