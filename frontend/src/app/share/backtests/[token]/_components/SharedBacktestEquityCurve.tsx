"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { EquityCurvePoint } from "@/types/backtest";

interface SharedBacktestEquityCurveProps {
  equityCurve: EquityCurvePoint[];
}

/** Interactive equity curve chart for the Shared backtest page (ADR-0019). */
export function SharedBacktestEquityCurve({ equityCurve }: SharedBacktestEquityCurveProps) {
  return (
    <div className="h-80" role="img" aria-label="Equity curve over the backtest period">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={equityCurve}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          aria-hidden="true"
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
            labelFormatter={(label) => formatDateTime(label as string, "utc")}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "0.875rem" }} iconType="line" />
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
  );
}
