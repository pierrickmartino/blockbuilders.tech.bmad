"use client";

import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface NarrativeCardProps {
  narrative: string;
  strategyId: string;
  isZeroTradeRun: boolean;
  userId?: string;
  isLoading?: boolean;
}

export function NarrativeCard({
  narrative,
  strategyId,
  isZeroTradeRun,
  userId,
  isLoading = false,
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
    <Card
      ref={cardRef}
      aria-labelledby={titleId}
      className="border-primary/30 bg-primary/5"
    >
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3
            id={titleId}
            className="text-base font-semibold leading-none tracking-tight"
          >
            Strategy Narrative
          </h3>
          {isZeroTradeRun && (
            <span
              className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning dark:text-warning"
              role="status"
            >
              0 trades
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {isLoading ? (
          <div
            className="space-y-2"
            aria-live="polite"
            aria-label="Generating narrative"
          >
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : hasNarrative ? (
          <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No narrative available for this run.
          </p>
        )}
        {isZeroTradeRun && !isLoading && (
          <>
            <p className="mt-3 text-xs text-muted-foreground">
              No trades were triggered — adjust entry conditions or indicator
              thresholds, then re-run the backtest.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => router.push(`/strategies/${strategyId}`)}
              >
                Edit strategy conditions
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/strategies/${strategyId}/backtest`)}
              >
                Back to results
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
