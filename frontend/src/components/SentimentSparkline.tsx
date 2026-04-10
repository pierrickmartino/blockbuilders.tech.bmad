import { LineChart, Line, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  // HistoryPoint.t is YYYY-MM-DD — render as localized short date.
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
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 text-sm font-semibold">{label}</div>
          <Badge variant="outline" className="text-xs">
            {isUnavailable ? "Unavailable" : "No data"}
          </Badge>
          <div className="mt-1 text-xs text-muted-foreground">
            {isUnavailable ? "Data source is offline — try again later." : "No history recorded yet."}
          </div>
        </CardContent>
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
    <Card>
      <CardContent className="p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-sm font-semibold">{label}</span>
          {isPartial && (
            <span
              className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-500"
              title="Partial data — some points may be missing"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Partial data</span>
            </span>
          )}
        </div>
        <div className="text-lg font-semibold mb-2">{formattedLatest}</div>

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
          {rangeStart} → {rangeEnd}
        </div>
      </CardContent>
    </Card>
  );
}
