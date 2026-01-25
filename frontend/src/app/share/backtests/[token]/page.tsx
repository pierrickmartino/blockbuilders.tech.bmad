"use client";

import { useEffect, useState } from "react";
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
  params: { token: string };
}

export default function SharedBacktestPage({ params }: Props) {
  const { token } = params;
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading shared backtest...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Backtest
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {error || "This share link may have expired or been removed."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Go to Homepage
          </button>
        </div>
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Shared Backtest Results
            </h1>
            <div className="flex gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
                {data.asset}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
                {data.timeframe}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {formatDateTime(data.date_from, "utc").split(" ")[0]} →{" "}
            {formatDateTime(data.date_to, "utc").split(" ")[0]}
          </p>
          <div className="mt-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Strategy logic is not shared. Only performance metrics and equity
            curve are visible.
          </div>
        </div>

        {/* Metrics */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded border border-gray-200 bg-gray-50 p-3"
              >
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {metric.label}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equity Curve */}
        {data.equity_curve.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatPrice(v, "").trim()}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => [formatPrice(Number(value)), "Equity"]}
                    labelFormatter={(label) =>
                      formatDateTime(label as string, "utc")
                    }
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "0.875rem" }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#3b82f6" }}
                    name="Strategy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
