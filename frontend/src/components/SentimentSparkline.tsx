import { LineChart, Line, ResponsiveContainer } from "recharts";
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

export function SentimentSparkline({
  label,
  history,
  status,
  color = "#2563eb",
  formatter,
}: SentimentSparklineProps) {
  if (status === "unavailable" || history.length === 0) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 text-sm font-medium text-muted-foreground">{label}</div>
          <Badge variant="outline" className="text-xs">
            {status === "unavailable" ? "Unavailable" : "No data"}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const latest = history[history.length - 1];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-1 text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold mb-2">
          {formatter ? formatter(latest.v) : latest.v.toLocaleString()}
        </div>

        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {history[0].t} → {latest.t}
        </div>
      </CardContent>
    </Card>
  );
}
