import { LineChart, Line, ResponsiveContainer } from "recharts";
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
  // HistoryPoint.t is YYYY-MM-DD, rendered as a localized short date.
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SentimentSparkline({
  label,
  history,
  status,
  color = "hsl(var(--primary))",
  formatter,
}: SentimentSparklineProps) {
  if (status === "unavailable" || history.length === 0) {
    const isUnavailable = status === "unavailable";
    return (
      <div className="p-3">
        <div className="mb-2 break-words text-sm font-semibold">{label}</div>
        <Badge variant="outline" className="text-xs">
          {isUnavailable ? "Source unavailable" : "No history yet"}
        </Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          {isUnavailable ? "This source is offline. Try again later." : "We do not have enough history to draw a trend yet."}
        </div>
      </div>
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
    <div className="p-3">
      <div className="mb-1 flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 break-words text-sm font-semibold">{label}</span>
        {isPartial && (
          <span
            className="inline-flex items-center gap-0.5 text-xs text-warning"
            title="Partial source, some points may be missing"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Partial source data</span>
          </span>
        )}
      </div>
      <div className="data-text mb-2 text-lg font-semibold">{formattedLatest}</div>

      <div className="h-12" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} aria-hidden="true">
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              strokeDasharray={isPartial ? "4 3" : undefined}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {rangeStart} to {rangeEnd}
      </div>
    </div>
  );
}
