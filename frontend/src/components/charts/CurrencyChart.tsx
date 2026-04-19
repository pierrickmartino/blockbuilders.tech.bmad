"use client";

import { AreaChart, LineChart, BarChart } from "@tremor/react";
import { formatMoney } from "@/lib/format";
import { defaultSeriesColors } from "./SeriesColors";

type Kind = "area" | "line" | "bar";

type CurrencyChartProps<T extends Record<string, unknown>> = {
  kind?: Kind;
  data: T[];
  index: keyof T & string;
  categories: (keyof T & string)[];
  colors?: string[];
  showLegend?: boolean;
  showGridLines?: boolean;
  className?: string;
  currency?: string;
};

export function CurrencyChart<T extends Record<string, unknown>>({
  kind = "area",
  data,
  index,
  categories,
  colors = defaultSeriesColors,
  showLegend = true,
  showGridLines = true,
  className = "h-64",
  currency = "",
}: CurrencyChartProps<T>) {
  const valueFormatter = (n: number) => formatMoney(n, currency);
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
