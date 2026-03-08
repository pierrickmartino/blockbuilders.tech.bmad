"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface NarrativeCardProps {
  narrative: string;
  strategyId: string;
  isZeroTradeRun: boolean;
  userId?: string;
}

export function NarrativeCard({
  narrative,
  strategyId,
  isZeroTradeRun,
  userId,
}: NarrativeCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
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

  return (
    <Card ref={cardRef} className="border-primary/20 bg-primary/5">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold">Strategy Narrative</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-base leading-relaxed text-muted-foreground">{narrative}</p>
        {isZeroTradeRun && (
          <Button
            className="mt-4"
            onClick={() => router.push(`/strategies/${strategyId}`)}
          >
            Modify Strategy
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
