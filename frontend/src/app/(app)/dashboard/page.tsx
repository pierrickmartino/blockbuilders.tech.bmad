"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { useDisplay } from "@/context/display";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  Plus,
  ArrowRight,
  Copy,
  AlertCircle,
  PlayCircle,
  RotateCw,
  Target,
} from "lucide-react";

const MAX_DISPLAY_NAME_LENGTH = 40;

function formatDisplayName(email: string | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0];
  const cleaned = local
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "there";
  const displayName = cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return displayName.length > MAX_DISPLAY_NAME_LENGTH
    ? `${displayName.slice(0, MAX_DISPLAY_NAME_LENGTH).trim()}...`
    : displayName;
}

function formatAsset(asset: string): string {
  return asset.replace(/\//g, " / ");
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatValidationQueue(count: number): string {
  if (count === 0) return "Clear";
  return formatCount(count, "to test", "to test");
}

function getValidationDetail(count: number): string {
  if (count === 0) return "Every listed strategy has a current backtest.";
  if (count === 1) return "One strategy needs a fresh run.";
  return "Run these before trusting the current results.";
}

function formatUntestedWork(untested: number, changed: number): string {
  if (untested === 0 && changed === 0) return "None";
  if (changed === 0) return `${untested} untested`;
  if (untested === 0) return `${changed} changed`;
  return `${untested} untested, ${changed} changed`;
}

function getUntestedWorkDetail(untested: number, changed: number): string {
  if (untested === 0 && changed === 0) {
    return "No hidden draft risk in this list.";
  }
  if (untested > 0 && changed > 0) return "New and edited strategies need validation.";
  if (untested > 0) return "New strategies need their first backtest.";
  return "Saved edits have not been tested yet.";
}

function formatOutcomePercent(value: number): string {
  return value > 0 ? `+${formatPercent(value)}` : formatPercent(value);
}

function getLatestOutcomeDetail(value: number | null | undefined): string {
  if (value == null) return "No completed result is available yet.";
  if (value > 0) return "Latest completed result is positive.";
  if (value < 0) return "Latest completed result is negative.";
  return "Latest completed result is flat.";
}

function getValidationTone(count: number) {
  if (count === 0) {
    return {
      surface: "bg-success-soft/60",
      label: "text-foreground",
      value: "text-foreground",
    };
  }
  return {
    surface: "bg-primary/5",
    label: "text-primary",
    value: "text-primary",
  };
}

function getLatestOutcomeTone(value: number | null | undefined) {
  if (value == null || value === 0) {
    return {
      surface: "",
      label: "text-muted-foreground",
      value: "text-foreground",
    };
  }
  if (value > 0) {
    return {
      surface: "bg-success-soft/60",
      label: "text-foreground",
      value: "text-foreground",
    };
  }
  return {
    surface: "bg-destructive-soft",
    label: "text-foreground",
    value: "text-foreground",
  };
}

function getUntestedWorkTone(untested: number, changed: number) {
  if (untested === 0 && changed === 0) {
    return {
      surface: "",
      label: "text-muted-foreground",
      value: "text-foreground",
    };
  }
  return {
    surface: "bg-warning-soft/70",
    label: "text-foreground",
    value: "text-foreground",
  };
}

function getDashboardErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return "The request timed out. Check your connection, then retry the dashboard.";
    }
    if (err.status === 401) {
      return "Your session expired. Sign in again to load your strategies.";
    }
    if (err.status === 403) {
      return "You do not have permission to view this strategy data.";
    }
    if (err.status === 429) {
      return "Too many requests hit the API at once. Wait a moment, then retry.";
    }
    if (err.status >= 500) {
      return "The server could not load this data. Retry in a moment.";
    }
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function getTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function hasBacktestRun(strategy: Strategy): boolean {
  return Boolean(
    strategy.last_run_at ||
      strategy.latest_total_return_pct != null ||
      strategy.latest_max_drawdown_pct != null ||
      strategy.latest_win_rate_pct != null ||
      strategy.latest_num_trades != null
  );
}

function needsValidation(strategy: Strategy): boolean {
  if (!hasBacktestRun(strategy)) return true;
  if (!strategy.last_run_at) return false;
  return getTime(strategy.updated_at) > getTime(strategy.last_run_at);
}

function sortByUpdatedDesc(a: Strategy, b: Strategy): number {
  return getTime(b.updated_at) - getTime(a.updated_at);
}

function sortByLastRunDesc(a: Strategy, b: Strategy): number {
  return getTime(b.last_run_at) - getTime(a.last_run_at);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { timezone } = useDisplay();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategiesLoadFailed, setStrategiesLoadFailed] = useState(false);

  const [recentBacktestRefs, setRecentBacktestRefs] = useState<
    Array<{ strategyId: string; runId?: string }>
  >([]);
  const [recentBacktestsData, setRecentBacktestsData] = useState<
    BacktestStatusResponse[]
  >([]);
  const [recentBacktestsLoaded, setRecentBacktestsLoaded] = useState(false);
  const isMountedRef = useRef(true);
  const strategiesRequestId = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStrategies = useCallback(() => {
    const requestId = strategiesRequestId.current + 1;
    strategiesRequestId.current = requestId;
    setIsLoading(true);
    setStrategiesLoadFailed(false);
    setError(null);
    apiFetch<Strategy[]>("/strategies/")
      .then((data) => {
        if (!isMountedRef.current || strategiesRequestId.current !== requestId) {
          return;
        }
        setStrategies(data);
        setStrategiesLoadFailed(false);
      })
      .catch((err) => {
        if (!isMountedRef.current || strategiesRequestId.current !== requestId) {
          return;
        }
        setStrategiesLoadFailed(true);
        setError(
          getDashboardErrorMessage(
            err,
            "We could not load your strategies. Retry to refresh the dashboard."
          )
        );
      })
      .finally(() => {
        if (
          isMountedRef.current &&
          strategiesRequestId.current === requestId
        ) {
          setIsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    setRecentBacktestRefs(
      getRecentBacktests().filter(
        (ref) =>
          typeof ref.strategyId === "string" && typeof ref.runId === "string"
      )
    );
  }, []);

  useEffect(() => {
    let isActive = true;
    const refsWithRuns = recentBacktestRefs.filter((ref) => ref.runId);

    setRecentBacktestsLoaded(false);
    setRecentBacktestsData([]);

    if (refsWithRuns.length === 0) {
      setRecentBacktestsLoaded(true);
      return () => {
        isActive = false;
      };
    }

    const fetchRecent = async () => {
      const results = await Promise.allSettled(
        refsWithRuns.map((ref) =>
          apiFetch<BacktestStatusResponse>(
            `/backtests/${encodeURIComponent(ref.runId ?? "")}`
          )
        )
      );

      if (!isActive) return;
      const validBacktests = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<BacktestStatusResponse>).value);

      setRecentBacktestsData(validBacktests);
      setRecentBacktestsLoaded(true);
    };

    fetchRecent();
    return () => {
      isActive = false;
    };
  }, [recentBacktestRefs]);

  const handleClone = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(id);
    setError(null);
    try {
      const cloned = await apiFetch<Strategy>(`/strategies/${id}/duplicate`, {
        method: "POST",
      });
      if (!isMountedRef.current) return;
      try {
        const updatedStrategies = await apiFetch<Strategy[]>("/strategies/");
        if (!isMountedRef.current) return;
        setStrategies(updatedStrategies);
        toast.success(`Created "${cloned.name}".`, {
          description: "Open it from your strategy list when you are ready to edit.",
        });
      } catch {
        if (!isMountedRef.current) return;
        setStrategies((current) => {
          if (current.some((strategy) => strategy.id === cloned.id)) {
            return current;
          }
          return [cloned, ...current];
        });
        toast.success(`Created "${cloned.name}".`, {
          description: "It is shown here now, but the full list could not refresh.",
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error(
        getDashboardErrorMessage(
          err,
          "We could not duplicate this strategy. Try again from the strategy row."
        )
      );
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const recentStrategiesList = strategies.slice(0, 5);
  const displayName = formatDisplayName(user?.email);

  const strategiesNeedingValidation = strategies.filter(needsValidation);
  const untestedStrategies = strategies.filter(
    (strategy) => !hasBacktestRun(strategy)
  );
  const staleStrategies = strategies.filter((strategy) => {
    return hasBacktestRun(strategy) && needsValidation(strategy);
  });
  const nextStrategy = [...strategiesNeedingValidation].sort(
    sortByUpdatedDesc
  )[0];
  const latestResultStrategy = [...strategies]
    .filter((strategy) => hasBacktestRun(strategy))
    .sort(sortByLastRunDesc)[0];
  const latestBacktest = recentBacktestsData[0];
  const completedLatestBacktest =
    latestBacktest?.status === "completed" ? latestBacktest : null;
  const latestReturn =
    latestResultStrategy?.latest_total_return_pct ??
    completedLatestBacktest?.summary?.total_return_pct;
  const validationTone = getValidationTone(strategiesNeedingValidation.length);
  const latestOutcomeTone = getLatestOutcomeTone(latestReturn);
  const untestedWorkTone = getUntestedWorkTone(
    untestedStrategies.length,
    staleStrategies.length
  );
  const validationDetail = getValidationDetail(
    strategiesNeedingValidation.length
  );
  const latestOutcomeDetail = getLatestOutcomeDetail(latestReturn);
  const untestedWorkDetail = getUntestedWorkDetail(
    untestedStrategies.length,
    staleStrategies.length
  );
  const primaryStrategy = nextStrategy ?? latestResultStrategy ?? strategies[0];
  const primaryHref = strategiesLoadFailed
    ? "/dashboard"
    : strategies.length === 0
      ? "/strategies"
      : nextStrategy
        ? `/strategies/${nextStrategy.id}/backtest`
        : completedLatestBacktest
          ? `/strategies/${completedLatestBacktest.strategy_id}/backtest`
          : primaryStrategy
            ? `/strategies/${primaryStrategy.id}`
            : "/strategies";
  const primaryTitle = strategiesLoadFailed
    ? "Strategy data did not load"
    : strategies.length === 0
      ? "Create your first strategy"
      : nextStrategy
        ? `Test ${nextStrategy.name}`
        : completedLatestBacktest
          ? `Review the ${formatAsset(completedLatestBacktest.asset)} result`
          : latestResultStrategy
            ? `Continue from ${latestResultStrategy.name}`
            : "Open your strategy workspace";
  const primaryDescription = strategiesLoadFailed
    ? "Retry loading so the dashboard can find the next strategy to test or review."
    : strategies.length === 0
      ? "Build a visual strategy first. After that, this dashboard will track what needs testing."
      : nextStrategy
        ? "This strategy has saved changes that have not been backtested yet."
        : completedLatestBacktest
          ? "Your latest viewed backtest is ready for a closer read."
          : latestResultStrategy
            ? "All visible strategies have current results. Reopen the latest result or refine the strategy."
            : "Open the strategy list to pick up your work.";
  const primaryActionLabel = strategiesLoadFailed
    ? "Retry loading"
    : strategies.length === 0
      ? "Create strategy"
      : nextStrategy
        ? "Run backtest"
        : completedLatestBacktest
          ? "Open result"
          : "Open strategy";
  const PrimaryIcon = strategiesLoadFailed
    ? RotateCw
    : strategies.length === 0
      ? Plus
      : nextStrategy
        ? PlayCircle
        : Target;
  const openStrategyHref = primaryStrategy
    ? `/strategies/${primaryStrategy.id}`
    : null;
  const showOpenStrategyLink =
    openStrategyHref !== null &&
    !isLoading &&
    !strategiesLoadFailed &&
    primaryHref !== openStrategyHref;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 py-4 sm:px-4 md:gap-6 md:px-6 md:py-7">
      <div className="max-w-2xl space-y-1">
        <h1 className="text-2xl font-bold tracking-tight [overflow-wrap:anywhere] md:text-3xl">
          Next strategy check, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Validate saved changes, then review the latest result.{" "}
          <Link
            href="/how-backtests-work"
            className="inline-flex items-center gap-0.5 underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded-sm"
          >
            Backtest assumptions
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </p>
      </div>

      <section aria-labelledby="next-action-heading">
        <Card variant="raised" className="border-primary/10">
          <CardContent className="p-5 lg:p-6">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                    <PrimaryIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h2
                      id="next-action-heading"
                      className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere]"
                    >
                      {isLoading ? (
                        <Skeleton className="h-7 w-56" />
                      ) : (
                        primaryTitle
                      )}
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {isLoading ? (
                        <Skeleton className="h-5 w-full max-w-md" />
                      ) : (
                        primaryDescription
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid w-full shrink-0 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  {strategiesLoadFailed ? (
                    <Button
                      size="touch"
                      onClick={loadStrategies}
                      className="sm:h-9"
                    >
                      <RotateCw className="mr-2 h-4 w-4" />
                      {primaryActionLabel}
                    </Button>
                  ) : isLoading ? (
                    <Button size="touch" disabled className="sm:h-9">
                      <PrimaryIcon className="mr-2 h-4 w-4" />
                      {primaryActionLabel}
                    </Button>
                  ) : (
                    <Button size="touch" className="sm:h-9" asChild>
                      <Link href={primaryHref}>
                        <PrimaryIcon className="mr-2 h-4 w-4" />
                        {primaryActionLabel}
                      </Link>
                    </Button>
                  )}
                  {showOpenStrategyLink && openStrategyHref && (
                    <Button
                      variant="ghost"
                      size="touch"
                      className="sm:h-9"
                      asChild
                    >
                      <Link href={openStrategyHref}>Open strategy</Link>
                    </Button>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid border-t border-border text-sm sm:grid-cols-3 divide-y divide-border sm:divide-y-0 sm:divide-x">
                <div
                  className={cn(
                    "grid min-h-[4.5rem] content-start gap-1 px-3 py-3",
                    validationTone.surface
                  )}
                >
                  <dt
                    className={cn("text-xs font-medium", validationTone.label)}
                  >
                    Stale results
                  </dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      validationTone.value
                    )}
                  >
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      formatValidationQueue(strategiesNeedingValidation.length)
                    )}
                  </dd>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    {isLoading ? (
                      <Skeleton className="h-4 w-36" />
                    ) : (
                      validationDetail
                    )}
                  </dd>
                </div>
                <div
                  className={cn(
                    "grid min-h-[4.5rem] content-start gap-1 px-3 py-3",
                    latestOutcomeTone.surface
                  )}
                >
                  <dt
                    className={cn(
                      "text-xs font-medium",
                      latestOutcomeTone.label
                    )}
                  >
                    Latest result
                  </dt>
                  <dd
                    className={cn(
                      latestReturn == null
                        ? "font-semibold"
                        : "data-text font-semibold",
                      latestOutcomeTone.value
                    )}
                  >
                    {isLoading || !recentBacktestsLoaded ? (
                      <Skeleton className="h-5 w-16" />
                    ) : latestReturn != null ? (
                      formatOutcomePercent(latestReturn)
                    ) : (
                      "No result"
                    )}
                  </dd>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    {isLoading || !recentBacktestsLoaded ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      latestOutcomeDetail
                    )}
                  </dd>
                </div>
                <div
                  className={cn(
                    "grid min-h-[4.5rem] content-start gap-1 px-3 py-3",
                    untestedWorkTone.surface
                  )}
                >
                  <dt
                    className={cn("text-xs font-medium", untestedWorkTone.label)}
                  >
                    Never tested
                  </dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      untestedWorkTone.value
                    )}
                  >
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      formatUntestedWork(
                        untestedStrategies.length,
                        staleStrategies.length
                      )
                    )}
                  </dd>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    {isLoading ? (
                      <Skeleton className="h-4 w-36" />
                    ) : (
                      untestedWorkDetail
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </section>

      {error && strategiesLoadFailed && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-start"
        >
          <div className="flex min-w-0 gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 [overflow-wrap:anywhere]">{error}</div>
          </div>
          <Button
            variant="outline"
            size="touch"
            onClick={loadStrategies}
            className="w-full sm:h-9 sm:w-auto"
          >
            Retry
          </Button>
        </div>
      )}

      <section aria-labelledby="strategies-heading">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-4 sm:px-5">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h2
                id="strategies-heading"
                className="text-base font-semibold tracking-tight"
              >
                Your strategies
              </h2>
              {!isLoading && strategies.length > 0 && (
                <span className="ml-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {strategies.length}
                </span>
              )}
              <Link
                href="/strategies"
                className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring md:min-h-9"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4 sm:px-5"
                  >
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
              <div className="flex flex-col items-center justify-center px-5 py-14 text-center sm:py-16">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Layers className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-1 font-semibold">No strategies yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Build one visual strategy, then test it against historical data.
                </p>
                <Button asChild>
                  <Link href="/strategies">
                    <Plus className="mr-2 h-4 w-4" />
                    Create strategy
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1fr)_8rem_9rem_5.5rem] items-center gap-4 border-t border-border px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
                  <span>Strategy</span>
                  <span className="text-right">Pair</span>
                  <span className="text-right">Updated</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="divide-y divide-border">
                  {recentStrategiesList.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="group relative flex flex-col gap-3 px-4 py-4 transition-colors duration-fast hover:bg-primary/[0.04] sm:px-5 md:grid md:grid-cols-[minmax(0,1fr)_8rem_minmax(7rem,9rem)_6rem] md:items-center md:gap-4 md:py-3.5"
                    >
                      <Link
                        href={`/strategies/${strategy.id}`}
                        aria-label={`Open strategy ${strategy.name}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus-ring"
                      />
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary">
                          <Activity className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="flex min-w-0 items-center gap-1 text-sm font-medium group-hover:text-primary">
                            <span className="truncate">{strategy.name}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity duration-fast group-hover:opacity-50" aria-hidden="true" />
                          </p>
                          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere] md:hidden">
                            {formatAsset(strategy.asset)} ·{" "}
                            {strategy.timeframe} ·{" "}
                            <span className="font-mono tabular-nums">
                              {formatDateTime(strategy.updated_at, timezone)}
                            </span>
                          </p>
                          <p className="hidden truncate text-xs text-muted-foreground md:block">
                            {strategy.asset} · {strategy.timeframe}
                          </p>
                        </div>
                      </div>
                      <div className="hidden items-center justify-end gap-1.5 md:flex">
                        <Badge
                          variant="secondary"
                          className="max-w-full truncate text-xs font-normal"
                        >
                          {strategy.asset}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {strategy.timeframe}
                        </span>
                      </div>
                      <span className="hidden text-right font-mono tabular-nums text-xs text-muted-foreground md:block">
                        {formatDateTime(strategy.updated_at, timezone)}
                      </span>
                      <div className="relative z-10 flex items-center justify-start md:justify-end">
                        <Button
                          variant="ghost"
                          size="touch"
                          className="h-11 gap-1 px-3 text-xs text-muted-foreground hover:text-foreground md:h-8 md:px-2"
                          aria-label={`Duplicate ${strategy.name}`}
                          onClick={() => handleClone(strategy.id)}
                          disabled={actionLoading !== null}
                        >
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          {actionLoading === strategy.id
                            ? "Cloning"
                            : "Duplicate"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {strategies.length > 5 && (
                  <div className="border-t border-border px-5 py-3 text-center">
                    <Link
                      href="/strategies"
                      className="inline-flex min-h-11 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring md:min-h-9"
                    >
                      +{strategies.length - 5} more{" "}
                      {strategies.length - 5 === 1 ? "strategy" : "strategies"}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
