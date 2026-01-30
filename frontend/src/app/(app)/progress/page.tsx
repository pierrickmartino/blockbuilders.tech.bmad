"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProgressResponse } from "@/types/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Circle,
  GitBranch,
  Layers,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const data = await apiFetch<ProgressResponse>("/progress");
        setProgress(data);
      } catch (err) {
        setError("Couldn't load progress. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgress();
  }, []);

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading progress...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      </main>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your Progress</h1>
        <p className="text-sm text-muted-foreground">
          Building momentum one strategy at a time
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Core Metrics */}
        <div className="flex flex-col gap-4">
          {/* Strategies Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Strategies Created
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress.strategies_count}
              </div>
              <p className="text-xs text-muted-foreground">
                Total strategies in your lab
              </p>
            </CardContent>
          </Card>

          {/* Backtests Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Backtests Run
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress.completed_backtests_count}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed backtest runs
              </p>
            </CardContent>
          </Card>

          {/* Versions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Strategy Versions
              </CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress.strategy_versions_count}
              </div>
              <p className="text-xs text-muted-foreground">
                Total saved versions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Lessons & Achievements */}
        <div className="flex flex-col gap-4">
          {/* Lessons Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Lessons Learned
                <Badge variant="secondary" className="ml-auto">
                  {progress.lessons.completed}/{progress.lessons.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progress.lessons.items.map((lesson) => (
                  <div
                    key={lesson.key}
                    className="flex items-center gap-3"
                  >
                    {lesson.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
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
                <Award className="h-5 w-5" />
                Achievements
                <Badge variant="secondary" className="ml-auto">
                  {progress.achievements.unlocked}/{progress.achievements.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {/* First Strategy */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    progress.strategies_count >= 1
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <Award
                    className={`mx-auto mb-2 h-6 w-6 ${
                      progress.strategies_count >= 1
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-xs font-medium">First Strategy</div>
                </div>

                {/* 5 Strategies */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    progress.strategies_count >= 5
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <Layers
                    className={`mx-auto mb-2 h-6 w-6 ${
                      progress.strategies_count >= 5
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-xs font-medium">5 Strategies</div>
                </div>

                {/* First Backtest */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    progress.completed_backtests_count >= 1
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <BarChart3
                    className={`mx-auto mb-2 h-6 w-6 ${
                      progress.completed_backtests_count >= 1
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-xs font-medium">First Backtest</div>
                </div>

                {/* 10 Backtests */}
                <div
                  className={`rounded-lg border p-3 text-center ${
                    progress.completed_backtests_count >= 10
                      ? "border-primary bg-primary/10"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <Zap
                    className={`mx-auto mb-2 h-6 w-6 ${
                      progress.completed_backtests_count >= 10
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-xs font-medium">10 Backtests</div>
                </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progress.next_steps.map((step, index) => {
                  let href = "/strategies";
                  if (step.includes("backtest")) {
                    href = "/strategies";
                  } else if (step.includes("Create")) {
                    href = "/strategies";
                  }

                  return index === 0 ? (
                    <Link key={index} href={href} className="block">
                      <Button className="w-full" size="lg">
                        {step}
                      </Button>
                    </Link>
                  ) : (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
