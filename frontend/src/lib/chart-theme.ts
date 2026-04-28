"use client";

import { useEffect, useState } from "react";

/**
 * Chart theme adapter — bridges design tokens (`--primary`, `--success`,
 * `--chart-{1..5}`, etc.) into the JS-string color values that third-party
 * chart libraries (`lightweight-charts`, Recharts inline styles) need.
 *
 * Why this file exists
 * --------------------
 * Chart libraries don't read CSS custom properties at runtime. Without this
 * adapter, every chart consumer hardcodes hex literals per-theme:
 *
 *   background: { color: isDark ? "#030712" : "#ffffff" }
 *   upColor: "#22c55e", downColor: "#ef4444"
 *
 * Phase 0's audit found ~36 such literal violations concentrated in
 * `TradeDrawer`, `CanvasMinimap`, `StrategyCanvas`, `DistributionRow`, and
 * the backtest page. This module is their single source of truth.
 *
 * Usage
 * -----
 *   const theme = useChartTheme();
 *   chart.applyOptions({ layout: { background: { color: theme.background } } });
 *
 * The hook re-emits a fresh theme object whenever the `dark` class on
 * `<html>` toggles, so chart consumers can include `theme` in their
 * effect-deps and rebuild on theme switch.
 */

export interface ChartTheme {
  /** Page surface — chart background. */
  background: string;
  /** Primary text color. */
  text: string;
  /** Grid lines & axis borders. */
  grid: string;
  /** Axis line color. */
  axis: string;
  /** Up-bar / gain / TP color (semantic: success). */
  up: string;
  /** Down-bar / loss / SL color (semantic: destructive). */
  down: string;
  /** Brand accent (entry markers, primary indicators). */
  primary: string;
  /** Soft tinted axis label background (translucent). */
  axisLabelBg: string;
  /** Tooltip surface. */
  tooltipBg: string;
  /** Tooltip border. */
  tooltipBorder: string;
  /** Indicator series palette (chart-1 through chart-5). */
  indicators: readonly [string, string, string, string, string];
}

const FALLBACK_LIGHT: ChartTheme = {
  background: "hsl(0 0% 100%)",
  text: "hsl(0 0% 4%)",
  grid: "hsl(210 13% 94%)",
  axis: "hsl(210 13% 94%)",
  up: "hsl(142 76% 36%)",
  down: "hsl(0 72% 51%)",
  primary: "hsl(204 75% 40%)",
  axisLabelBg: "hsl(0 0% 40% / 0.08)",
  tooltipBg: "hsl(0 0% 100%)",
  tooltipBorder: "hsl(210 13% 94%)",
  indicators: [
    "hsl(204 75% 40%)",
    "hsl(142 76% 36%)",
    "hsl(38 92% 50%)",
    "hsl(204 66% 72%)",
    "hsl(0 72% 51%)",
  ],
};

function readVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hsl(token: string, alpha?: number): string {
  if (!token) return "transparent";
  return alpha === undefined ? `hsl(${token})` : `hsl(${token} / ${alpha})`;
}

/**
 * Synchronously read the current chart theme from CSS custom properties.
 * Safe to call from inside an effect or event handler. Returns a static
 * fallback when called during SSR.
 */
export function readChartTheme(): ChartTheme {
  if (typeof document === "undefined") return FALLBACK_LIGHT;

  const indicators: ChartTheme["indicators"] = [
    hsl(readVar("--chart-1")),
    hsl(readVar("--chart-2")),
    hsl(readVar("--chart-3")),
    hsl(readVar("--chart-4")),
    hsl(readVar("--chart-5")),
  ];

  return {
    background: hsl(readVar("--background")),
    text: hsl(readVar("--foreground")),
    grid: hsl(readVar("--border")),
    axis: hsl(readVar("--border")),
    up: hsl(readVar("--success")),
    down: hsl(readVar("--destructive")),
    primary: hsl(readVar("--primary")),
    axisLabelBg: hsl(readVar("--muted-foreground"), 0.08),
    tooltipBg: hsl(readVar("--popover")),
    tooltipBorder: hsl(readVar("--border")),
    indicators,
  };
}

/**
 * Canvas-node category palette. Used by `BaseNode`, `CanvasMinimap`, and
 * any future canvas-related visualization to color nodes by category.
 *
 * These don't theme-switch today: the saturated mid-tones (Tailwind 600
 * shades) work on both light and dark canvas backgrounds. If a future
 * a11y review demands per-theme variants, promote these to CSS custom
 * properties in `globals.css`.
 *
 * Keep in sync with `frontend/CLAUDE.md` § Colors → "Canvas node
 * categories" and the canonical mapping in `docs/design_concept.json`.
 */
export const CANVAS_CATEGORIES = Object.freeze({
  input: "hsl(271 81% 56%)",      // purple
  indicator: "hsl(217 91% 60%)",  // blue
  logic: "hsl(32 95% 44%)",       // amber
  signal: "hsl(142 71% 45%)",     // green
  risk: "hsl(0 72% 51%)",         // red
} as const);

export type CanvasCategory = keyof typeof CANVAS_CATEGORIES;

/**
 * Reactive chart theme. Re-emits whenever the `dark` class on
 * `document.documentElement` toggles, so chart consumers rebuild on
 * theme switch by including the returned object in their effect-deps.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => readChartTheme());

  useEffect(() => {
    // Read once on mount to pick up any client-side theme that wasn't
    // resolvable during SSR.
    setTheme(readChartTheme());

    const observer = new MutationObserver(() => {
      setTheme(readChartTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
