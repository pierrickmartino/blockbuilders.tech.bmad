"use client";

import { AreaChart, LineChart, BarChart } from "@tremor/react";
import { formatPercent } from "@/lib/format";
import { defaultSeriesColors } from "./SeriesColors";

type Kind = "area" | "line" | "bar";

type PercentChartProps<T extends Record<string, unknown>> = {
  kind?: Kind;
  data: T[];
  index: keyof T & string;
  categories: (keyof T & string)[];
  colors?: string[];
  showLegend?: boolean;
  showGridLines?: boolean;
  className?: string;
};

export function PercentChart<T extends Record<string, unknown>>({
  kind = "area",
  data,
  index,
  categories,
  colors = defaultSeriesColors,
  showLegend = true,
  showGridLines = true,
  className = "h-64",
}: PercentChartProps<T>) {
  const valueFormatter = (n: number) => formatPercent(n);
  const common = {
    data,
    index,
    categories,
    colors,
    showLegend,
    showGridLines,
    valueFormatter,
    className,
  };
  if (kind === "line") return <LineChart {...common} />;
  if (kind === "bar") return <BarChart {...common} />;
  return <AreaChart {...common} />;
}
