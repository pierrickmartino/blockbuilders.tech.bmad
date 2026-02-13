"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDateTime, formatPercent, formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, AlertCircle } from "lucide-react";

interface PublicBacktestView {
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  summary: {
    initial_balance: number;
    final_balance: number;
    total_return_pct: number;
    cagr_pct: number;
    max_drawdown_pct: number;
    num_trades: number;
    win_rate_pct: number;
    benchmark_return_pct: number;
    alpha: number;
    beta: number;
  };
  equity_curve: Array<{ timestamp: string; equity: number }>;
}

interface Props {
  params: Promise<{ token: string }>;
}

export default function SharedBacktestPage({ params }: Props) {
  const { token } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PublicBacktestView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/backtests/share/${token}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || "Failed to load shared backtest"
          );
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load shared backtest"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading shared backtest...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <h2 className="mb-1 font-semibold tracking-tight">
            Unable to Load Backtest
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {error || "This share link may have expired or been removed."}
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  const metrics = [
    { label: "Final Balance", value: formatPrice(data.summary.final_balance) },
    {
      label: "Total Return",
      value: formatPercent(data.summary.total_return_pct),
    },
    { label: "CAGR", value: formatPercent(data.summary.cagr_pct) },
    {
      label: "Max Drawdown",
      value: formatPercent(data.summary.max_drawdown_pct),
    },
    { label: "Trades", value: data.summary.num_trades.toString() },
    { label: "Win Rate", value: formatPercent(data.summary.win_rate_pct) },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">
                  Shared Backtest Results
                </h1>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{data.asset}</Badge>
                <Badge variant="secondary">{data.timeframe}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(data.date_from, "utc").split(" ")[0]} →{" "}
              {formatDateTime(data.date_to, "utc").split(" ")[0]}
            </p>
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
              Strategy logic is not shared. Only performance metrics and equity
              curve are visible.
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 font-semibold tracking-tight">
              Performance Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border bg-secondary/50 p-3 dark:bg-secondary/30"
                >
                  <div className="mb-1 text-xs uppercase text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="text-lg font-semibold tabular-nums tracking-tight">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equity Curve */}
        {data.equity_curve.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 font-semibold tracking-tight">
                Equity Curve
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.equity_curve}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(v) => new Date(v).toLocaleDateString()}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatPrice(v, "").trim()}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [formatPrice(Number(value)), "Equity"]}
                      labelFormatter={(label) =>
                        formatDateTime(label as string, "utc")
                      }
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "0.875rem" }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                      name="Strategy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
