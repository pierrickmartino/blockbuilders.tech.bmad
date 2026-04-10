"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [exiting, setExiting] = useState(false);

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

  const handleDismiss = () => {
    setExiting(true);
  };

  return (
    <Card
      className={`border-border bg-muted/50 transition-all duration-150 ease-out motion-reduce:transition-none ${
        exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
      }`}
      onTransitionEnd={() => {
        if (exiting) onDismiss?.();
      }}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            What you just learned
          </CardTitle>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="min-h-[44px] min-w-[44px] rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              Got it
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-sm text-muted-foreground">
          You tested whether your strategy would have outperformed simply holding{" "}
          <span className="font-medium text-foreground">{asset}</span>.{" "}
          {comparison}
        </p>
      </CardContent>
    </Card>
  );
}
