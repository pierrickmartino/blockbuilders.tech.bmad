"use client";

import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface NarrativeCardProps {
  narrative: string;
  strategyId: string;
  isZeroTradeRun: boolean;
  userId?: string;
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

export function NarrativeCard({
  narrative,
  strategyId,
  isZeroTradeRun,
  userId,
  isLoading = false,
  startDate,
  endDate,
}: NarrativeCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasFired = useRef(false);
  const titleId = useId();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasFired.current) {
          hasFired.current = true;
          trackEvent(
            "narrative_viewed",
            { strategy_id: strategyId, zero_trade: isZeroTradeRun },
            userId,
          );
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [strategyId, isZeroTradeRun, userId]);

  const hasNarrative = narrative.trim().length > 0;

  return (
    <Card ref={cardRef} aria-labelledby={titleId}>
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3
              id={titleId}
              className="text-sm font-semibold leading-none"
            >
              Strategy Narrative
            </h3>
            {isZeroTradeRun && (
              <span
                className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                role="status"
              >
                0 trades
              </span>
            )}
          </div>
          {isLoading ? (
            <div
              className="space-y-1.5 pt-1"
              aria-live="polite"
              aria-label="Generating narrative"
            >
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ) : hasNarrative ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {narrative}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              No narrative available for this run.
            </p>
          )}
          {isZeroTradeRun && !isLoading && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                No trades were triggered — adjust entry conditions or indicator
                thresholds, then re-run the backtest.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/strategies/${strategyId}`)}
                >
                  Edit strategy conditions
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.push(`/strategies/${strategyId}/backtest`)
                  }
                >
                  Back to results
                </Button>
              </div>
            </>
          )}
        </div>
        {(startDate || endDate) && (
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {startDate} → {endDate}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
