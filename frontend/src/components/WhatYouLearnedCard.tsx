"use client";

import { GraduationCap, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InsightCard } from "@/components/ui/insight-card";

interface WhatYouLearnedCardProps {
  strategyReturnPct: number;
  benchmarkReturnPct: number;
  asset: string;
  dateRange: string;
  onDismiss?: () => void;
}

export function WhatYouLearnedCard({
  strategyReturnPct,
  benchmarkReturnPct,
  asset,
  dateRange,
  onDismiss,
}: WhatYouLearnedCardProps) {
  const delta = strategyReturnPct - benchmarkReturnPct;
  const absDelta = Math.abs(delta).toFixed(1);
  const isSmall = Math.abs(delta) < 1;

  let comparison: React.ReactNode;
  if (isSmall) {
    comparison = "Your strategy performed roughly the same as buy-and-hold.";
  } else {
    const verb = delta > 0 ? "beat" : "lagged";
    const colorClass = delta > 0 ? "text-success" : "text-destructive";
    comparison = (
      <>
        Your strategy {verb} buy-and-hold by{" "}
        <span className={`font-semibold ${colorClass}`}>
          {absDelta} percentage points
        </span>{" "}
        over {dateRange}.
      </>
    );
  }

  const badge = (
    <Badge
      variant="outline"
      className="border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
    >
      Insight
    </Badge>
  );

  const dismissLabel = (
    <>
      <Check className="h-4 w-4" aria-hidden />
      Got it
    </>
  );

  return (
    <InsightCard
      unstyled
      icon={<GraduationCap className="h-5 w-5" />}
      iconClassName="bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400 p-2 rounded-md"
      title="What you just learned"
      badge={badge}
      onDismiss={onDismiss}
      dismissLabel={dismissLabel}
      className="border-dashed border-blue-300 dark:border-blue-800"
    >
      <p className="text-sm text-muted-foreground">
        You tested whether your strategy would have outperformed simply holding{" "}
        <span className="font-medium text-foreground">{asset}</span>.{" "}
        {comparison}
      </p>
    </InsightCard>
  );
}
