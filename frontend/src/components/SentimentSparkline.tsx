import { SparkLineChart, Card } from "@tremor/react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HistoryPoint } from "@/types/market";

interface SentimentSparklineProps {
  label: string;
  history: HistoryPoint[];
  status: "ok" | "partial" | "unavailable";
  color?: string;
  formatter?: (value: number) => string;
}

function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SentimentSparkline({
  label,
  history,
  status,
  color = "blue",
  formatter,
}: SentimentSparklineProps) {
  if (status === "unavailable" || history.length === 0) {
    const isUnavailable = status === "unavailable";
    return (
      <Card className="!p-3">
        <div className="mb-2 text-sm font-semibold">{label}</div>
        <Badge variant="outline" className="text-xs">
          {isUnavailable ? "Unavailable" : "No data"}
        </Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          {isUnavailable ? "Data source is offline — try again later." : "No history recorded yet."}
        </div>
      </Card>
    );
  }

  const latest = history[history.length - 1];
  const first = history[0];
  const formattedLatest = formatter ? formatter(latest.v) : latest.v.toLocaleString();
  const rangeStart = formatDate(first.t);
  const rangeEnd = formatDate(latest.t);
  const isPartial = status === "partial";

  const ariaLabel = `${label} trend: latest ${formattedLatest}, ${history.length} points from ${rangeStart} to ${rangeEnd}${
    isPartial ? " (partial data)" : ""
  }`;

  return (
    <Card className="!p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-sm font-semibold">{label}</span>
        {isPartial && (
          <span
            className="inline-flex items-center gap-0.5 text-xs text-warning"
            title="Partial data — some points may be missing"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Partial data</span>
          </span>
        )}
      </div>
      <div className="text-lg font-semibold mb-2">{formattedLatest}</div>

      <div className="h-12" role="img" aria-label={ariaLabel}>
        <SparkLineChart
          data={history}
          index="t"
          categories={["v"]}
          colors={[color]}
          className="h-12 w-full"
        />
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {rangeStart} → {rangeEnd}
      </div>
    </Card>
  );
}
