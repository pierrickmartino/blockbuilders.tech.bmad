"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProgressResponse } from "@/types/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Circle,
  GitBranch,
  Layers,
  Lock,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type AchievementDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  threshold: number;
  current: (p: ProgressResponse) => number;
  hint: string;
};

const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first-strategy",
    label: "First Strategy",
    icon: Award,
    threshold: 1,
    current: (p) => p.strategies_count,
    hint: "Create 1 strategy",
  },
  {
    key: "five-strategies",
    label: "5 Strategies",
    icon: Layers,
    threshold: 5,
    current: (p) => p.strategies_count,
    hint: "Create 5 strategies",
  },
  {
    key: "first-backtest",
    label: "First Backtest",
    icon: BarChart3,
    threshold: 1,
    current: (p) => p.completed_backtests_count,
    hint: "Run 1 backtest",
  },
  {
    key: "ten-backtests",
    label: "10 Backtests",
    icon: Zap,
    threshold: 10,
    current: (p) => p.completed_backtests_count,
    hint: "Run 10 backtests",
  },
];

function MetricCard({
  title,
  icon: Icon,
  value,
  caption,
  emptyHint,
}: {
  title: string;
  icon: LucideIcon;
  value: number;
  caption: string;
  emptyHint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {value === 0 && emptyHint ? emptyHint : caption}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ProgressResponse>("/progress");
      setProgress(data);
    } catch {
      setError("Couldn't load progress. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[104px] w-full" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProgress}
            className="self-start sm:self-auto"
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (!progress) {
    return null;
  }

  const lessonsPct =
    progress.lessons.total > 0
      ? Math.round((progress.lessons.completed / progress.lessons.total) * 100)
      : 0;
  const primaryStep = progress.next_steps[0];
  const remainingSteps = progress.next_steps.slice(1);

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Progress</h1>
          <p className="text-sm text-muted-foreground">
            Building momentum one strategy at a time
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Core Metrics */}
        <div className="flex flex-col gap-4">
          <MetricCard
            title="Strategies Created"
            icon={Layers}
            value={progress.strategies_count}
            caption="Total strategies in your lab"
            emptyHint="Create your first strategy to get started"
          />
          <MetricCard
            title="Backtests Run"
            icon={BarChart3}
            value={progress.completed_backtests_count}
            caption="Completed backtest runs"
            emptyHint="Run a backtest to see results here"
          />
          <MetricCard
            title="Strategy Versions"
            icon={GitBranch}
            value={progress.strategy_versions_count}
            caption="Total saved versions"
            emptyHint="Save a version to track your iterations"
          />
        </div>

        {/* Right Column: Lessons & Achievements */}
        <div className="flex flex-col gap-4">
          {/* Lessons Card */}
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Lessons Learned
                <Badge variant="secondary" className="ml-auto">
                  {progress.lessons.completed}/{progress.lessons.total}
                </Badge>
              </CardTitle>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={lessonsPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Lessons completed"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${lessonsPct}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progress.lessons.items.map((lesson) => (
                  <div key={lesson.key} className="flex items-center gap-3">
                    {lesson.done ? (
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span
                      className={
                        lesson.done
                          ? "text-sm font-medium"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {lesson.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Achievements
                <Badge variant="secondary" className="ml-auto">
                  {progress.achievements.unlocked}/{progress.achievements.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.map((a) => {
                  const current = a.current(progress);
                  const unlocked = current >= a.threshold;
                  const Icon = a.icon;
                  const status = unlocked ? "unlocked" : "locked";
                  return (
                    <div
                      key={a.key}
                      aria-label={`${a.label} — ${status}. ${a.hint}. Progress: ${Math.min(current, a.threshold)} of ${a.threshold}`}
                      className={`relative rounded-lg border p-3 text-center ${
                        unlocked
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-muted/50"
                      }`}
                    >
                      {!unlocked && (
                        <Lock
                          aria-hidden
                          className="absolute right-2 top-2 h-3 w-3 text-muted-foreground"
                        />
                      )}
                      <Icon
                        aria-hidden
                        className={`mx-auto mb-2 h-6 w-6 ${
                          unlocked ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <div className="text-xs font-medium">{a.label}</div>
                      <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                        {unlocked
                          ? "Unlocked"
                          : `${Math.min(current, a.threshold)}/${a.threshold}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {progress.achievements.latest && (
                <div className="mt-4 rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Latest Achievement
                  </p>
                  <p className="mt-1 font-semibold">
                    {progress.achievements.latest.label}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          {progress.next_steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {primaryStep && (
                    <Link href="/strategies" className="block">
                      <Button className="w-full" size="lg">
                        <span className="truncate">{primaryStep}</span>
                      </Button>
                    </Link>
                  )}
                  {remainingSteps.map((step) => (
                    <div
                      key={step}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
