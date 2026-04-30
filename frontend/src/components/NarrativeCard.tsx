"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/ui/insight-card";
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

  const aside = (startDate || endDate) ? (
    <>
      <Calendar className="h-3.5 w-3.5" aria-hidden />
      <span>{startDate} → {endDate}</span>
    </>
  ) : undefined;

  const zeroBadge = isZeroTradeRun ? (
    <span
      className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
      role="status"
    >
      0 trades
    </span>
  ) : undefined;

  return (
    <InsightCard
      cardRef={cardRef}
      icon={<BookOpen className="h-4 w-4" />}
      iconClassName="bg-primary/10 text-primary"
      title="Strategy Narrative"
      badge={zeroBadge}
      aside={aside}
    >
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
        <p className="mt-0.5 text-xs text-muted-foreground">{narrative}</p>
      ) : (
        <p className="mt-0.5 text-xs text-muted-foreground">
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
              onClick={() => router.push(`/strategies/${strategyId}/backtest`)}
            >
              Back to results
            </Button>
          </div>
        </>
      )}
    </InsightCard>
  );
}
