import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WhatYouLearnedCardProps {
  strategyReturnPct: number;
  benchmarkReturnPct: number;
  asset: string;
  dateRange: string;
}

export function WhatYouLearnedCard({
  strategyReturnPct,
  benchmarkReturnPct,
  asset,
  dateRange,
}: WhatYouLearnedCardProps) {
  const delta = strategyReturnPct - benchmarkReturnPct;
  const absDelta = Math.abs(delta).toFixed(1);
  const isNeutral = Math.abs(delta) < 0.05;

  let comparison: React.ReactNode;
  if (isNeutral) {
    comparison = "Your strategy performed roughly the same as buy-and-hold.";
  } else {
    const verb = delta > 0 ? "beat" : "lagged";
    const colorClass =
      delta > 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";
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

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">
          What you just learned
        </CardTitle>
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
