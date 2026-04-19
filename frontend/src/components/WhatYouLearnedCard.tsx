"use client";

import { useState } from "react";
import { Card } from "@tremor/react";
import { GraduationCap, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      className={cn(
        "flex items-center gap-4 border-dashed border-primary/40 bg-primary/5 !p-3 transition-all duration-150 ease-out motion-reduce:transition-none dark:border-primary/30",
        exiting ? "scale-95 opacity-0" : "scale-100 opacity-100",
      )}
      onTransitionEnd={() => {
        if (exiting) onDismiss?.();
      }}
    >
      <div className="flex-shrink-0 rounded-md bg-primary/10 p-2 text-primary">
        <GraduationCap className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            What you just learned
          </span>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Insight
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          You tested whether your strategy would have outperformed simply holding{" "}
          <span className="font-medium text-foreground">{asset}</span>. {comparison}
        </p>
      </div>

      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="flex min-h-[44px] flex-shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <Check className="h-4 w-4" />
          Got it
        </button>
      )}
    </Card>
  );
}
