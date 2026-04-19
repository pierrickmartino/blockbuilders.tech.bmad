# Tremor Design System Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify chart/KPI surfaces across the frontend on `@tremor/react`, sharing shadcn CSS-var tokens, via a single big-bang PR on branch `design-system/signal-theme`.

**Architecture:** Install `@tremor/react`. Alias Tremor's color keys in `tailwind.config.ts` to existing `hsl(var(--…))` CSS variables from `src/app/globals.css`. Add a thin wrapper layer at `src/components/charts/` for currency/percent formatters and the semantic series palette. Migrate 17 components (10 comp files + 7 chart usages across 3 pages) from custom Tailwind/recharts to Tremor primitives (`Card`, `Metric`, `BadgeDelta`, `AreaChart`, `BarChart`, `LineChart`, `SparkAreaChart`, `BarList`, `DonutChart`, `Tracker`, `Callout`, `ProgressCircle`). Preserve all business logic, prop shapes, timezone formatting, and accessibility. Remove `recharts` dependency after migration if no imports remain.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 3.4, `@tremor/react` (latest 3.x), lightweight-charts (untouched), Storybook 10.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-04-19-tremor-design-system-unification-design.md`
- Frontend CLAUDE.md: `frontend/CLAUDE.md`
- Design tokens: `docs/design-system.json`, `docs/design_concept.json`
- Runtime tokens: `frontend/src/app/globals.css`, `frontend/tailwind.config.ts`

**Commands reminder (`cd frontend` before each):**
- `npm run dev` → http://localhost:3000
- `npm run build` → production build
- `npm run lint` → ESLint (must pass)
- `npx tsc --noEmit` → type check (must pass)
- `npm run storybook` → http://localhost:6006

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `frontend/src/components/charts/SeriesColors.ts` | Canvas-category palette (input/indicator/logic/signal/risk) as Tremor `colors` array + helpers |
| `frontend/src/components/charts/CurrencyChart.tsx` | Thin wrapper around Tremor `LineChart`/`AreaChart` with USD `valueFormatter` default |
| `frontend/src/components/charts/PercentChart.tsx` | Thin wrapper around Tremor `LineChart`/`AreaChart`/`BarChart` with `%` `valueFormatter` default |
| `frontend/src/components/charts/index.ts` | Barrel re-export for the three above |
| `frontend/src/components/charts/CurrencyChart.stories.tsx` | Storybook for `CurrencyChart` |
| `frontend/src/components/charts/PercentChart.stories.tsx` | Storybook for `PercentChart` |
| `docs/prd-design-system-tremor-unification.md` | PRD per hygiene rules |
| `docs/tst-design-system-tremor-unification.md` | Matching test scenarios doc |

### Modified files

| Path | Change |
|---|---|
| `frontend/package.json` | Add `@tremor/react` dep; remove `recharts` at end if unused |
| `frontend/tailwind.config.ts` | Add Tremor color aliases + content path + safelist |
| `frontend/src/app/globals.css` | (No change expected; source of truth stays) |
| `frontend/src/components/backtest/KPIStrip.tsx` | Tremor `Card` + `Metric` + `BadgeDelta` |
| `frontend/src/components/backtest/PageHeader.tsx` | Tremor `Metric` inline |
| `frontend/src/components/backtest/DrawdownSection.tsx` | Tremor `AreaChart`, recharts removed |
| `frontend/src/components/backtest/DistributionRow.tsx` | Tremor `BarChart`, recharts removed |
| `frontend/src/components/backtest/PositionAnalysisCard.tsx` | Tremor `Card` + `BarList` |
| `frontend/src/components/TransactionCostAnalysis.tsx` | Tremor `Card` + `BarList` (or `DonutChart` if ≤5 slices) |
| `frontend/src/components/NarrativeCard.tsx` | Tremor `Card` + `Callout` |
| `frontend/src/components/WhatYouLearnedCard.tsx` | Tremor `Callout` |
| `frontend/src/components/LowTradeCountWarning.tsx` | Tremor `Callout color="yellow"` |
| `frontend/src/components/DataCompletenessTimeline.tsx` | Tremor `Tracker` |
| `frontend/src/components/DataAvailabilitySection.tsx` | Tremor `Tracker` + `Callout` |
| `frontend/src/components/SentimentGauge.tsx` | Tremor `ProgressCircle` |
| `frontend/src/components/SentimentSparkline.tsx` | Tremor `SparkAreaChart` |
| `frontend/src/components/MarketSentimentPanel.tsx` | Tremor `Card` + `Metric` + `BadgeDelta` |
| `frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx` | Replace recharts `LineChart` with Tremor `LineChart` |
| `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` | Replace recharts chart blocks with Tremor |
| `frontend/src/app/share/backtests/[token]/page.tsx` | Replace recharts charts with Tremor |
| `frontend/src/components/backtest/*.stories.tsx` | Update affected stories (default/dark/loading/empty) |
| `frontend/src/components/*.stories.tsx` | Update affected stories |
| `frontend/CLAUDE.md` | Add Tremor section |
| `docs/design-system.json` | Add `tremor` namespace |
| `docs/product.md` | Update §13, §16.1, §17.1 |
| `docs/phase2.md` | One line under current iteration with link to new PRD |

### Untouched (do NOT modify)

- `frontend/src/components/ZoomableChart.tsx` (lightweight-charts)
- `frontend/src/components/canvas/**` (@xyflow/react nodes)
- `frontend/src/components/ui/**` (shadcn primitives)
- `frontend/src/components/TradeDrawer.tsx`, `AllRunsDrawer.tsx`, `ShareBacktestModal.tsx`, `StrategyTabs.tsx`, `KeyboardShortcutsModal.tsx`, `NotificationBell.tsx`, `ConsentBanner.tsx`, `TradeExplanation.tsx`, `BacktestRunsList.tsx`, `InfoIcon.tsx`, `PostHogBootstrap.tsx`
- Backend, `backend/CLAUDE.md`, root `CLAUDE.md`, `docs/design_concept.json`, `docs/mvp.md`

---

## Stage A — Foundation (install + theme + wrappers)

### Task A1: Install `@tremor/react`

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (via npm)

- [ ] **Step 1: Install**

```bash
cd frontend && npm install @tremor/react
```

Expected: `@tremor/react@^3.x` appears under `dependencies` in `frontend/package.json`; no version conflict with React 19 (Tremor 3 peer-depends on React ≥18; React 19 satisfies).

- [ ] **Step 2: Verify peer deps**

```bash
cd frontend && npm ls @tremor/react
```

Expected: single version resolved, no `UNMET DEPENDENCY` warning. If install warns about `@headlessui/react` or `@heroicons/react` missing as peers, install them:

```bash
cd frontend && npm install @headlessui/react @heroicons/react
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add @tremor/react dependency"
```

---

### Task A2: Extend Tailwind config with Tremor color aliases + content path + safelist

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Update `content` array and add `tremor` / `dark-tremor` color aliases + safelist**

Replace the entire file with:

```ts
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.stories.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Tremor dynamic color classes used by BarList, Tracker, BadgeDelta, Callout, charts
    { pattern: /^(bg|text|border|stroke|fill|ring)-(primary|secondary|muted|accent|destructive|success|warning|info)(-foreground)?/ },
    { pattern: /^(bg|text|border|stroke|fill|ring)-chart-[1-5]/ },
    { pattern: /^(bg|text|border|stroke|fill|ring)-tremor-.+/ },
    { pattern: /^(bg|text|border|stroke|fill|ring)-dark-tremor-.+/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "tremor-small": "calc(var(--radius) - 4px)",
        "tremor-default": "var(--radius)",
        "tremor-full": "9999px",
      },
      boxShadow: {
        "tremor-input": "0 1px 2px 0 hsl(var(--foreground) / 0.05)",
        "tremor-card": "0 1px 3px 0 hsl(var(--foreground) / 0.05), 0 1px 2px -1px hsl(var(--foreground) / 0.05)",
        "tremor-dropdown": "0 4px 6px -1px hsl(var(--foreground) / 0.1), 0 2px 4px -2px hsl(var(--foreground) / 0.1)",
        "dark-tremor-input": "0 1px 2px 0 hsl(var(--foreground) / 0.05)",
        "dark-tremor-card": "0 1px 3px 0 hsl(var(--foreground) / 0.05), 0 1px 2px -1px hsl(var(--foreground) / 0.05)",
        "dark-tremor-dropdown": "0 4px 6px -1px hsl(var(--foreground) / 0.1), 0 2px 4px -2px hsl(var(--foreground) / 0.1)",
      },
      fontSize: {
        "tremor-label": ["0.75rem", "1rem"],
        "tremor-default": ["0.875rem", "1.25rem"],
        "tremor-title": ["1.125rem", "1.75rem"],
        "tremor-metric": ["1.875rem", "2.25rem"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Tremor palette — light theme, aliased to shadcn CSS vars
        tremor: {
          brand: {
            faint: "hsl(var(--primary) / 0.08)",
            muted: "hsl(var(--primary) / 0.2)",
            subtle: "hsl(var(--primary) / 0.5)",
            DEFAULT: "hsl(var(--primary))",
            emphasis: "hsl(var(--primary))",
            inverted: "hsl(var(--primary-foreground))",
          },
          background: {
            muted: "hsl(var(--muted))",
            subtle: "hsl(var(--accent))",
            DEFAULT: "hsl(var(--background))",
            emphasis: "hsl(var(--foreground))",
          },
          border: { DEFAULT: "hsl(var(--border))" },
          ring: { DEFAULT: "hsl(var(--ring))" },
          content: {
            subtle: "hsl(var(--muted-foreground))",
            DEFAULT: "hsl(var(--foreground))",
            emphasis: "hsl(var(--foreground))",
            strong: "hsl(var(--foreground))",
            inverted: "hsl(var(--background))",
          },
        },
        "dark-tremor": {
          brand: {
            faint: "hsl(var(--primary) / 0.08)",
            muted: "hsl(var(--primary) / 0.2)",
            subtle: "hsl(var(--primary) / 0.5)",
            DEFAULT: "hsl(var(--primary))",
            emphasis: "hsl(var(--primary))",
            inverted: "hsl(var(--primary-foreground))",
          },
          background: {
            muted: "hsl(var(--muted))",
            subtle: "hsl(var(--accent))",
            DEFAULT: "hsl(var(--background))",
            emphasis: "hsl(var(--foreground))",
          },
          border: { DEFAULT: "hsl(var(--border))" },
          ring: { DEFAULT: "hsl(var(--ring))" },
          content: {
            subtle: "hsl(var(--muted-foreground))",
            DEFAULT: "hsl(var(--foreground))",
            emphasis: "hsl(var(--foreground))",
            strong: "hsl(var(--foreground))",
            inverted: "hsl(var(--background))",
          },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: PASS (no TypeScript errors).

- [ ] **Step 3: Smoke-build**

```bash
cd frontend && npm run build
```

Expected: PASS (Next build succeeds with new Tailwind config; no class-purge warnings from Tremor).

- [ ] **Step 4: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat(frontend): alias Tremor palette to shadcn CSS vars"
```

---

### Task A3: Add chart wrapper layer

**Files:**
- Create: `frontend/src/components/charts/SeriesColors.ts`
- Create: `frontend/src/components/charts/CurrencyChart.tsx`
- Create: `frontend/src/components/charts/PercentChart.tsx`
- Create: `frontend/src/components/charts/index.ts`

- [ ] **Step 1: Create `SeriesColors.ts`**

```ts
// Canvas-category palette (input=purple, indicator=blue, logic=amber, signal=green, risk=red).
// Tremor charts accept a `colors` prop with names referring to Tailwind color keys.
// We use our shadcn semantic keys so charts inherit brand theme + dark mode automatically.

export const SERIES_COLORS = [
  "primary", // brand blue
  "success", // green (signal)
  "warning", // amber (logic)
  "destructive", // red (risk)
  "info", // input variant (aliased to primary in current theme)
] as const;

export type SeriesColor = (typeof SERIES_COLORS)[number];

/** Tremor `colors` prop expects string[]. */
export const defaultSeriesColors: string[] = [...SERIES_COLORS];

/** For positive/negative delta visuals. */
export const deltaColors = {
  positive: "success" as const,
  negative: "destructive" as const,
  neutral: "muted-foreground" as const,
};
```

- [ ] **Step 2: Create `CurrencyChart.tsx`**

```tsx
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
  /** Currency symbol prefix (default empty — formatMoney already returns a bare number). */
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
```

- [ ] **Step 3: Create `PercentChart.tsx`**

```tsx
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
  const valueFormatter = (n: number) => `${formatPercent(n)}`;
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
```

- [ ] **Step 4: Create `index.ts`**

```ts
export { CurrencyChart } from "./CurrencyChart";
export { PercentChart } from "./PercentChart";
export { SERIES_COLORS, defaultSeriesColors, deltaColors } from "./SeriesColors";
export type { SeriesColor } from "./SeriesColors";
```

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/charts/
git commit -m "feat(frontend): add Tremor chart wrappers (currency, percent, series palette)"
```

---

### Task A4: Storybook for wrappers

**Files:**
- Create: `frontend/src/components/charts/CurrencyChart.stories.tsx`
- Create: `frontend/src/components/charts/PercentChart.stories.tsx`

- [ ] **Step 1: Create `CurrencyChart.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CurrencyChart } from "./CurrencyChart";

const sample = [
  { date: "Jan", equity: 10000, benchmark: 10000 },
  { date: "Feb", equity: 10500, benchmark: 10200 },
  { date: "Mar", equity: 11200, benchmark: 10350 },
  { date: "Apr", equity: 10900, benchmark: 10500 },
  { date: "May", equity: 11800, benchmark: 10700 },
];

const meta: Meta<typeof CurrencyChart> = {
  title: "Charts/CurrencyChart",
  component: CurrencyChart,
};
export default meta;
type Story = StoryObj<typeof CurrencyChart>;

export const AreaDefault: Story = {
  args: {
    kind: "area",
    data: sample,
    index: "date",
    categories: ["equity", "benchmark"],
  },
};

export const Line: Story = {
  args: { kind: "line", data: sample, index: "date", categories: ["equity"] },
};

export const DarkMode: Story = {
  args: { kind: "area", data: sample, index: "date", categories: ["equity", "benchmark"] },
  parameters: { backgrounds: { default: "dark" } },
  decorators: [(Story) => <div className="dark bg-background p-6"><Story /></div>],
};

export const Empty: Story = {
  args: { kind: "area", data: [], index: "date", categories: ["equity"] },
};
```

- [ ] **Step 2: Create `PercentChart.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PercentChart } from "./PercentChart";

const sample = [
  { date: "Jan", returnPct: 0 },
  { date: "Feb", returnPct: 5 },
  { date: "Mar", returnPct: 12 },
  { date: "Apr", returnPct: 9 },
  { date: "May", returnPct: 18 },
];

const meta: Meta<typeof PercentChart> = {
  title: "Charts/PercentChart",
  component: PercentChart,
};
export default meta;
type Story = StoryObj<typeof PercentChart>;

export const AreaDefault: Story = { args: { kind: "area", data: sample, index: "date", categories: ["returnPct"] } };
export const Bar: Story = { args: { kind: "bar", data: sample, index: "date", categories: ["returnPct"] } };
export const DarkMode: Story = {
  args: { kind: "area", data: sample, index: "date", categories: ["returnPct"] },
  decorators: [(Story) => <div className="dark bg-background p-6"><Story /></div>],
};
export const Empty: Story = { args: { kind: "area", data: [], index: "date", categories: ["returnPct"] } };
```

- [ ] **Step 3: Verify Storybook renders (smoke)**

```bash
cd frontend && npm run storybook &
sleep 8
curl -sS -o /dev/null -w "%{http_code}" http://localhost:6006 || echo "storybook not up"
kill %1 2>/dev/null
```

Expected: `200` from curl. Then kill the background process. If Storybook doesn't start, check console output for missing tremor-related plugin config.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/charts/CurrencyChart.stories.tsx frontend/src/components/charts/PercentChart.stories.tsx
git commit -m "docs(storybook): add stories for Tremor chart wrappers"
```

---

## Stage B — Callouts and simple panels

Each task in Stage B follows the same pattern:

1. Read the current file to understand props and business logic.
2. Preserve the exported component name and prop signature — downstream callers MUST NOT need to change.
3. Keep all timezone/formatting helpers (`formatPercent`, `formatMoney`, `formatChartDate`, `formatDateTime`, `formatDuration`).
4. Replace the visual shell with Tremor primitives; keep data transforms as-is.
5. Color rules: map severity to Tremor `color` prop using semantic tokens: `blue` → info, `yellow` → warning, `red` → error/destructive, `green` → success, `gray` → neutral/muted.
6. Run `npx tsc --noEmit` + `npm run lint` after each task. Commit per task.

### Task B1: `LowTradeCountWarning.tsx` → Tremor `Callout`

**Files:**
- Modify: `frontend/src/components/LowTradeCountWarning.tsx`
- Modify (if exists): `frontend/src/components/LowTradeCountWarning.stories.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/LowTradeCountWarning.tsx
```

Note current props; preserve them.

- [ ] **Step 2: Rewrite using Tremor `Callout`**

Target shape (adapt to actual prop names from Step 1):

```tsx
"use client";

import { Callout } from "@tremor/react";
import { AlertTriangle } from "lucide-react";

interface LowTradeCountWarningProps {
  tradeCount: number;
  threshold?: number;
}

export function LowTradeCountWarning({ tradeCount, threshold = 30 }: LowTradeCountWarningProps) {
  if (tradeCount >= threshold) return null;
  return (
    <Callout
      title={`Low sample size (${tradeCount} trades)`}
      icon={AlertTriangle}
      color="yellow"
      className="mt-2"
    >
      Results from fewer than {threshold} trades may be unreliable. Interpret performance metrics with caution.
    </Callout>
  );
}
```

If the current file has additional props (e.g. `minTradesForReliability`, `context`), merge them into the target while keeping the Callout shape.

- [ ] **Step 3: Update story**

Replace story variants so each renders in default and dark mode:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { LowTradeCountWarning } from "./LowTradeCountWarning";

const meta: Meta<typeof LowTradeCountWarning> = { title: "Warnings/LowTradeCount", component: LowTradeCountWarning };
export default meta;
type Story = StoryObj<typeof LowTradeCountWarning>;

export const Below: Story = { args: { tradeCount: 12 } };
export const AtThreshold: Story = { args: { tradeCount: 30 } };
export const Dark: Story = {
  args: { tradeCount: 12 },
  decorators: [(Story) => <div className="dark bg-background p-6"><Story /></div>],
};
```

- [ ] **Step 4: Type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LowTradeCountWarning.tsx frontend/src/components/LowTradeCountWarning.stories.tsx
git commit -m "refactor(frontend): migrate LowTradeCountWarning to Tremor Callout"
```

---

### Task B2: `WhatYouLearnedCard.tsx` → Tremor `Callout` + `Card`

**Files:**
- Modify: `frontend/src/components/WhatYouLearnedCard.tsx`
- Modify: `frontend/src/components/WhatYouLearnedCard.stories.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/WhatYouLearnedCard.tsx
```

- [ ] **Step 2: Replace shell with Tremor `Card` wrapping `Callout`(s)**

Keep all existing props, bullet/insight arrays, icons. Shell pattern:

```tsx
"use client";

import { Card, Callout } from "@tremor/react";
import { Lightbulb, Sparkles } from "lucide-react";

// Preserve existing prop interface name + fields from current file.
// Replace outer `<div className="rounded border …">` wrapper with `<Card>` (className="p-4 sm:p-5").
// Replace each inline insight block with `<Callout title={…} icon={Lightbulb|Sparkles} color="blue">{body}</Callout>`.
// If there is a "congrats" variant, use color="green" + icon={Sparkles}.
```

Preserve:
- All conditional logic (first-run, null states)
- All copy strings
- All analytics/PostHog hooks

- [ ] **Step 3: Update story** (variants: default, firstRun, dark)

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/WhatYouLearnedCard.tsx frontend/src/components/WhatYouLearnedCard.stories.tsx
git commit -m "refactor(frontend): migrate WhatYouLearnedCard to Tremor Card + Callout"
```

---

### Task B3: `NarrativeCard.tsx` → Tremor `Card` + `Callout`

**Files:**
- Modify: `frontend/src/components/NarrativeCard.tsx`
- Modify: `frontend/src/components/NarrativeCard.stories.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/NarrativeCard.tsx
```

- [ ] **Step 2: Replace shell**

- Outer wrapper → Tremor `Card` (preserve padding `p-5` or whatever the existing container uses; Tremor `Card` defaults to sufficient padding, remove duplicate padding).
- If the narrative renders a "highlight" strip at top (strategy summary headline), use `Callout` color mapped to narrative sentiment:
  - positive outcome → `color="green"`
  - negative outcome → `color="red"`
  - mixed → `color="yellow"`
  - neutral → `color="blue"`
- Keep the body paragraphs using the existing typographic classes (`text-sm text-muted-foreground`). Do not Tremor-ify prose blocks.
- Preserve Badge/status rendering if present (shadcn `StatusBadge` stays).

- [ ] **Step 3: Update story** (default, each sentiment color, dark)

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/NarrativeCard.tsx frontend/src/components/NarrativeCard.stories.tsx
git commit -m "refactor(frontend): migrate NarrativeCard to Tremor Card + Callout"
```

---

### Task B4: `DataAvailabilitySection.tsx` → Tremor `Callout`

**Files:**
- Modify: `frontend/src/components/DataAvailabilitySection.tsx`
- Modify: `frontend/src/components/DataAvailabilitySection.stories.tsx`

- [ ] **Step 1: Read current file + note the date-range warning logic**

```bash
cat frontend/src/components/DataAvailabilitySection.tsx
```

- [ ] **Step 2: Replace the warning block with a Tremor `Callout`**

Severity mapping:
- "Requested range exceeds available data" → `color="yellow"`, icon `AlertTriangle`
- "No data in requested range" → `color="red"`, icon `AlertCircle`
- "All data available" → `color="green"`, icon `CheckCircle2`

Keep the date range display (labels + from/to) as plain text inside the Callout body or beside it — don't Tremor-ify that. The `Tracker` migration comes separately in Task C4 below; keep the Tracker usage (if any) untouched here — it's a different file.

- [ ] **Step 3: Update story** (all three severities + dark)

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/DataAvailabilitySection.tsx frontend/src/components/DataAvailabilitySection.stories.tsx
git commit -m "refactor(frontend): migrate DataAvailabilitySection warning to Tremor Callout"
```

---

## Stage C — KPIs, Metrics, Trackers

### Task C1: `KPIStrip.tsx` → Tremor `Card` + `Metric` + `BadgeDelta`

**Files:**
- Modify: `frontend/src/components/backtest/KPIStrip.tsx`

- [ ] **Step 1: Rewrite with Tremor primitives**

Replace the current custom `KPICard` function with Tremor `Card` + `Metric` + `BadgeDelta`. Preserve the 6-card grid, all labels, subtitles, and values. Use `BadgeDelta` for the Total return card (deltaType = "increase" if positive, "decrease" if negative). Full replacement:

```tsx
"use client";

import { Card, Metric, BadgeDelta, Text } from "@tremor/react";
import { BacktestSummary, TradeDetail } from "@/types/backtest";
import { formatPercent, formatDuration } from "@/lib/format";

interface PositionStats {
  avgHoldSeconds: number;
}

interface KPIStripProps {
  summary: BacktestSummary;
  trades: TradeDetail[];
  positionStats: PositionStats | null;
}

interface KPICardProps {
  label: string;
  value: string;
  subtitle: string;
  delta?: { value: string; deltaType: "increase" | "decrease" | "unchanged" };
}

function KPICard({ label, value, subtitle, delta }: KPICardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider">{label}</Text>
        {delta && <BadgeDelta deltaType={delta.deltaType}>{delta.value}</BadgeDelta>}
      </div>
      <Metric className="mt-2 font-mono text-2xl sm:text-[26px]">{value}</Metric>
      <Text className="mt-1 text-[11px]">{subtitle}</Text>
    </Card>
  );
}

export function KPIStrip({ summary, trades, positionStats }: KPIStripProps) {
  const totalReturn = summary.total_return_pct;
  const isPositiveReturn = totalReturn >= 0;
  const wins = Math.round((summary.win_rate_pct / 100) * summary.num_trades);

  const perMonth =
    trades.length > 0
      ? Math.round(
          summary.num_trades /
            Math.max(
              1,
              Math.ceil(
                (new Date(trades[trades.length - 1]?.exit_time).getTime() -
                  new Date(trades[0]?.entry_time).getTime()) /
                  (30 * 86400000),
              ),
            ),
        )
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <KPICard
        label="Total return"
        value={`${isPositiveReturn ? "+" : ""}${formatPercent(totalReturn)}`}
        subtitle={`vs B&H ${summary.benchmark_return_pct >= 0 ? "+" : ""}${formatPercent(summary.benchmark_return_pct)}`}
        delta={{
          value: isPositiveReturn ? "+" : "",
          deltaType: isPositiveReturn ? "increase" : "decrease",
        }}
      />
      <KPICard
        label="Sharpe ratio"
        value={summary.sharpe_ratio.toFixed(2)}
        subtitle={`Sortino ${summary.sortino_ratio.toFixed(2)} · Calmar ${summary.calmar_ratio.toFixed(2)}`}
      />
      <KPICard
        label="Max drawdown"
        value={formatPercent(summary.max_drawdown_pct)}
        subtitle={`${summary.max_consecutive_losses} max consec. losses`}
        delta={{ value: "", deltaType: "decrease" }}
      />
      <KPICard
        label="Win rate"
        value={formatPercent(summary.win_rate_pct)}
        subtitle={`${wins} wins / ${summary.num_trades} total`}
      />
      <KPICard
        label="Total trades"
        value={String(summary.num_trades)}
        subtitle={perMonth != null ? `${perMonth} per month` : "—"}
      />
      <KPICard
        label="Avg hold"
        value={positionStats ? formatDuration(positionStats.avgHoldSeconds) : "—"}
        subtitle={positionStats ? `${(positionStats.avgHoldSeconds / 86400).toFixed(1)}d` : "—"}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/backtest/KPIStrip.tsx
git commit -m "refactor(frontend): migrate KPIStrip to Tremor Card/Metric/BadgeDelta"
```

---

### Task C2: `backtest/PageHeader.tsx` — inline `Metric` swap

**Files:**
- Modify: `frontend/src/components/backtest/PageHeader.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/backtest/PageHeader.tsx
```

- [ ] **Step 2: Replace the inline KPI numbers in the header (e.g. final equity, total return) with Tremor `Metric` for the main figure and `Text` for labels. Keep StatusBadge, Run config button, anything else unchanged.**

Preserve every other element of the header. Only the big number(s) become `<Metric>`. If the header shows a small delta next to final equity, swap for `BadgeDelta`.

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/backtest/PageHeader.tsx
git commit -m "refactor(frontend): use Tremor Metric for PageHeader KPIs"
```

---

### Task C3: `DataCompletenessTimeline.tsx` → Tremor `Tracker`

**Files:**
- Modify: `frontend/src/components/DataCompletenessTimeline.tsx`
- Modify: `frontend/src/components/DataCompletenessTimeline.stories.tsx`

- [ ] **Step 1: Read current file to understand the per-bucket status shape**

```bash
cat frontend/src/components/DataCompletenessTimeline.tsx
```

- [ ] **Step 2: Replace the timeline renderer with Tremor `Tracker`**

```tsx
"use client";

import { Tracker, type Color } from "@tremor/react";

// Preserve the existing prop/data type name. Assume each bucket has:
//   { tooltip: string; status: "complete" | "partial" | "missing" }
// Map status → Tremor Color:
const STATUS_COLOR: Record<string, Color> = {
  complete: "emerald",
  partial: "amber",
  missing: "rose",
};

interface DataCompletenessTimelineProps {
  buckets: Array<{ tooltip: string; status: "complete" | "partial" | "missing" }>;
  title?: string;
}

export function DataCompletenessTimeline({ buckets, title }: DataCompletenessTimelineProps) {
  const data = buckets.map((b) => ({ color: STATUS_COLOR[b.status], tooltip: b.tooltip }));
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>}
      <Tracker data={data} className="h-6" />
    </div>
  );
}
```

If the actual prop shape is different (e.g. status is a number 0–1 gap ratio), adjust the mapper accordingly but keep the Tracker usage.

- [ ] **Step 3: Update story** (complete, partial, missing, mixed, dark)

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/DataCompletenessTimeline.tsx frontend/src/components/DataCompletenessTimeline.stories.tsx
git commit -m "refactor(frontend): migrate DataCompletenessTimeline to Tremor Tracker"
```

---

### Task C4: `SentimentGauge.tsx` → Tremor `ProgressCircle`

**Files:**
- Modify: `frontend/src/components/SentimentGauge.tsx`
- Modify: `frontend/src/components/SentimentGauge.stories.tsx`

- [ ] **Step 1: Read current file; note the gauge scale (0–100 or -1..1)**

- [ ] **Step 2: Replace the visual gauge with `ProgressCircle`**

```tsx
"use client";

import { ProgressCircle } from "@tremor/react";

interface SentimentGaugeProps {
  value: number; // expected 0..100 (normalize if original scale is -1..1)
  label?: string;
}

function colorForValue(v: number): "red" | "amber" | "emerald" {
  if (v < 35) return "red";
  if (v < 65) return "amber";
  return "emerald";
}

export function SentimentGauge({ value, label }: SentimentGaugeProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex flex-col items-center gap-2">
      <ProgressCircle value={pct} color={colorForValue(pct)} size="lg">
        <span className="font-mono text-sm font-semibold">{pct}</span>
      </ProgressCircle>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
```

If the original component normalizes from a different scale, preserve that normalization step and only pass 0..100 to `ProgressCircle`.

- [ ] **Step 3: Update story** (low, mid, high, dark)

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/SentimentGauge.tsx frontend/src/components/SentimentGauge.stories.tsx
git commit -m "refactor(frontend): migrate SentimentGauge to Tremor ProgressCircle"
```

---

### Task C5: `MarketSentimentPanel.tsx` → Tremor `Card` + `Metric` + `BadgeDelta`

**Files:**
- Modify: `frontend/src/components/MarketSentimentPanel.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/MarketSentimentPanel.tsx
```

- [ ] **Step 2: Replace outer `<div>` shell with Tremor `Card`, key numbers with `Metric`, and sentiment delta with `BadgeDelta` (deltaType based on sign of change). Leave the `SentimentGauge` and `SentimentSparkline` placements as children of the Card.**

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/MarketSentimentPanel.tsx
git commit -m "refactor(frontend): migrate MarketSentimentPanel to Tremor Card/Metric/BadgeDelta"
```

---

### Task C6: `PositionAnalysisCard.tsx` → Tremor `Card` + `BarList`

**Files:**
- Modify: `frontend/src/components/backtest/PositionAnalysisCard.tsx`

- [ ] **Step 1: Rewrite**

Keep `computePositionStats`, `timeframeToSeconds`, `getHoldTimeInterpretation`, and the `PositionAnalysisCardProps` prop shape unchanged. Only replace the visual shell:

```tsx
"use client";

import { Card, BarList, Text, Metric } from "@tremor/react";
import { TradeDetail } from "@/types/backtest";
import { formatDuration, formatMoney } from "@/lib/format";
import { Info } from "lucide-react";
import { useMemo } from "react";

// (copy interfaces + helpers unchanged from current file: PositionStats,
//  PositionAnalysisCardProps, timeframeToSeconds, computePositionStats,
//  getHoldTimeInterpretation)

export function PositionAnalysisCard({ trades, timeframe }: PositionAnalysisCardProps) {
  const positionStats = useMemo(() => {
    const tfs = timeframeToSeconds(timeframe);
    return computePositionStats(trades, tfs);
  }, [trades, timeframe]);

  if (!positionStats) {
    return (
      <Card className="p-4 sm:p-5">
        <Text className="text-[15px] font-semibold">Position analysis</Text>
        <Text className="mt-1 text-xs text-muted-foreground">How long positions are held and sized</Text>
        <Text className="mt-6 text-center text-sm text-muted-foreground">
          Not enough trades to analyze. Need at least 2 trades.
        </Text>
      </Card>
    );
  }

  const holdList = !positionStats.hasMissingTimestamps
    ? [
        { name: "Avg", value: positionStats.avgHoldSeconds },
        { name: "Longest", value: positionStats.longestHoldSeconds },
        { name: "Shortest", value: positionStats.shortestHoldSeconds },
      ]
    : [];

  return (
    <Card className="p-4 sm:p-5">
      <Text className="text-[15px] font-semibold">Position analysis</Text>
      <Text className="mt-1 text-xs text-muted-foreground">How long positions are held and sized</Text>

      {holdList.length > 0 && (
        <div className="mt-4 space-y-2">
          <Text className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Hold time
          </Text>
          <BarList
            data={holdList}
            valueFormatter={(n: number) => formatDuration(n)}
            color="primary"
          />
        </div>
      )}

      {!positionStats.hasMissingPositionData && positionStats.avgPositionSize > 0 && (
        <div className="mt-4">
          <Text className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg size
          </Text>
          <Metric className="mt-1">
            {formatMoney(positionStats.avgPositionSize, "")} <span className="text-xs text-muted-foreground">USDT</span>
          </Metric>
        </div>
      )}

      {positionStats.hasMissingTimestamps && (
        <Text className="mt-4 text-xs text-amber-800 dark:text-amber-400">
          Some trades have missing timestamps. Hold time statistics are hidden.
        </Text>
      )}

      {!positionStats.hasMissingTimestamps && positionStats.avgHoldSeconds > 0 && (
        <div className="mt-4 flex gap-3 border-t border-border pt-3">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
          <Text className="text-xs text-muted-foreground">{getHoldTimeInterpretation(positionStats.avgHoldSeconds)}</Text>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/backtest/PositionAnalysisCard.tsx
git commit -m "refactor(frontend): migrate PositionAnalysisCard to Tremor Card/BarList/Metric"
```

---

### Task C7: `TransactionCostAnalysis.tsx` → Tremor `Card` + `BarList` (or `DonutChart` if ≤5 slices)

**Files:**
- Modify: `frontend/src/components/TransactionCostAnalysis.tsx`
- Modify: `frontend/src/components/TransactionCostAnalysis.stories.tsx`

- [ ] **Step 1: Read current file; identify the cost-breakdown data shape**

```bash
cat frontend/src/components/TransactionCostAnalysis.tsx
```

- [ ] **Step 2: Replace outer shell with `<Card>`. Replace any horizontal/vertical bar list with `BarList`. If the file computes a breakdown of ≤5 categories (e.g., commission/slippage/spread/funding), use Tremor `DonutChart` for the breakdown and keep a side panel of `Metric`s for the headline numbers.**

Example donut pattern (adapt field names to actual breakdown shape):

```tsx
<DonutChart
  data={breakdown}             // [{ name: "Commission", value: 12.4 }, …]
  category="value"
  index="name"
  colors={["primary", "info", "warning", "destructive", "muted-foreground"]}
  valueFormatter={(n) => formatMoney(n, "$")}
/>
```

Preserve:
- Headline cost number (`Metric`)
- Cost-as-% of return (`BadgeDelta` with "decrease" if >5%, "unchanged" otherwise; never "increase" since costs reduce return)
- All per-category rows

- [ ] **Step 3: Update story**

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/TransactionCostAnalysis.tsx frontend/src/components/TransactionCostAnalysis.stories.tsx
git commit -m "refactor(frontend): migrate TransactionCostAnalysis to Tremor Card/BarList/DonutChart"
```

---

## Stage D — Charts (recharts → Tremor)

These tasks remove recharts imports from each migrated file. After all D tasks, Task F1 verifies zero recharts imports and removes the dependency.

### Task D1: `backtest/DrawdownSection.tsx` → Tremor `AreaChart`

**Files:**
- Modify: `frontend/src/components/backtest/DrawdownSection.tsx`

Preserve: props, header block (title + right-aligned Max DD + Consec losses), loading/error/empty states, `ZoomableChart` removal (NB: `ZoomableChart` wraps recharts SVG specifically and is NOT compatible with Tremor — drop it; rely on Tremor's built-in responsiveness + any Tremor zoom capability if needed. Accept loss of pinch-zoom on this one chart; note this in PR description.)

- [ ] **Step 1: Rewrite the chart block**

```tsx
"use client";

import { AreaChart } from "@tremor/react";
import { Button } from "@/components/ui/button";
import { BacktestSummary } from "@/types/backtest";
import { formatChartDate, formatPercent, type TimezoneMode } from "@/lib/format";

interface DrawdownDataPoint {
  timestamp: string;
  drawdown: number;
  isMaxDrawdown: boolean;
}

interface DrawdownSectionProps {
  drawdownData: DrawdownDataPoint[];
  summary: BacktestSummary | null | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  timezone: TimezoneMode;
  tickConfig: { xAxisTicks?: number; yAxisTicks?: number };
}

export function DrawdownSection({
  drawdownData,
  summary,
  isLoading,
  error,
  onRetry,
  timezone,
}: DrawdownSectionProps) {
  const data = drawdownData.map((d) => ({
    date: formatChartDate(d.timestamp, timezone),
    drawdown: d.drawdown,
  }));

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">Drawdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Peak-to-trough equity decline</p>
        </div>
        {summary && (
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Max DD</div>
              <div className="font-mono text-sm font-semibold text-destructive">
                {formatPercent(summary.max_drawdown_pct)}
              </div>
            </div>
            <div className="h-7 w-px bg-border" />
            <div className="text-right">
              <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Consec. losses</div>
              <div className="font-mono text-sm font-semibold">{summary.max_consecutive_losses}</div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-5 sm:px-5">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading drawdown data...</p>
          </div>
        ) : error ? (
          <div className="flex h-56 items-center justify-center rounded border border-destructive/30 bg-destructive/5">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="link" size="sm" onClick={onRetry} className="mt-2">Retry</Button>
            </div>
          </div>
        ) : data.length < 2 ? (
          <div className="flex h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground">Not enough data to display drawdown chart</p>
          </div>
        ) : (
          <AreaChart
            data={data}
            index="date"
            categories={["drawdown"]}
            colors={["destructive"]}
            valueFormatter={(v: number) => `${v.toFixed(2)}%`}
            showLegend={false}
            showGridLines={true}
            className="h-44 sm:h-56"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Grep to confirm no recharts imports remain in this file**

```bash
grep -n "from \"recharts\"" frontend/src/components/backtest/DrawdownSection.tsx || echo "clean"
```

Expected: `clean`.

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/backtest/DrawdownSection.tsx
git commit -m "refactor(frontend): migrate DrawdownSection to Tremor AreaChart"
```

---

### Task D2: `backtest/DistributionRow.tsx` → Tremor `BarChart`

**Files:**
- Modify: `frontend/src/components/backtest/DistributionRow.tsx`

Preserve: props, skew/callout logic, bucket reversal, headers, total trade badges. Drop the custom `getReturnBarColor` gradient — Tremor `BarChart` doesn't support per-bar cell colors out of the box. Approximation: use a two-category split into "loss" and "win" series keyed off `isNegativeBucket`, and render two bars per bucket with semantic colors `destructive` and `success`. Duration histogram uses one category with color `primary`.

- [ ] **Step 1: Rewrite**

```tsx
"use client";

import { BarChart } from "@tremor/react";
import { formatPercent } from "@/lib/format";

interface DistributionBucket {
  label: string;
  count: number;
  percentage: number;
}

interface DistributionRowProps {
  returnDistribution: DistributionBucket[];
  durationDistribution: DistributionBucket[] | null;
  totalTrades: number;
  durationDistributionTotal: number;
  skewCallout: string;
  skew?: number;
}

function isNegativeBucket(label: string): boolean {
  return label.startsWith("-") || label.startsWith("<-") || label.includes("to -");
}

export function DistributionRow({
  returnDistribution,
  durationDistribution,
  totalTrades,
  durationDistributionTotal,
  skewCallout,
  skew,
}: DistributionRowProps) {
  const reversedReturn = [...returnDistribution].reverse();
  const returnData = reversedReturn.map((b) => ({
    label: b.label,
    loss: isNegativeBucket(b.label) ? b.count : 0,
    win: isNegativeBucket(b.label) ? 0 : b.count,
  }));

  if (returnDistribution.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Return Distribution */}
      <div className="rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold">Return distribution</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Histogram of trade P&amp;L %</p>
          </div>
          {skew !== undefined ? (
            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400">
              SKEW {skew >= 0 ? "+" : ""}{skew.toFixed(2)}
            </span>
          ) : (
            skewCallout.includes("Review risk") && (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Skewed
              </span>
            )
          )}
        </div>
        <div className="px-4 py-5 sm:px-5">
          <BarChart
            data={returnData}
            index="label"
            categories={["loss", "win"]}
            colors={["destructive", "success"]}
            stack
            showLegend={false}
            valueFormatter={(n: number) =>
              `${n} trades (${formatPercent(totalTrades > 0 ? (n / totalTrades) * 100 : 0)})`
            }
            className="h-56 sm:h-64"
          />
        </div>
      </div>

      {/* Duration Distribution */}
      {durationDistribution && (
        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold">Duration distribution</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Trades bucketed by hold time</p>
            </div>
            <span className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
              {durationDistributionTotal} TRADES
            </span>
          </div>
          <div className="px-4 py-5 sm:px-5">
            <BarChart
              data={durationDistribution}
              index="label"
              categories={["count"]}
              colors={["primary"]}
              showLegend={false}
              valueFormatter={(n: number) =>
                `${n} trades (${formatPercent(durationDistributionTotal > 0 ? (n / durationDistributionTotal) * 100 : 0)})`
              }
              className="h-56 sm:h-64"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Grep recharts**

```bash
grep -n "from \"recharts\"" frontend/src/components/backtest/DistributionRow.tsx || echo "clean"
```

Expected: `clean`.

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/backtest/DistributionRow.tsx
git commit -m "refactor(frontend): migrate DistributionRow to Tremor BarChart"
```

---

### Task D3: `SentimentSparkline.tsx` → Tremor `SparkAreaChart`

**Files:**
- Modify: `frontend/src/components/SentimentSparkline.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/SentimentSparkline.tsx
```

- [ ] **Step 2: Replace the recharts `ResponsiveContainer` + `AreaChart` block with Tremor `SparkAreaChart`. Preserve data shape, responsive sizing, and color mapping (positive sentiment → success, negative → destructive, otherwise primary).**

```tsx
"use client";

import { SparkAreaChart } from "@tremor/react";

interface SentimentSparklineProps {
  data: Array<{ t: string; v: number }>;
  tone?: "positive" | "negative" | "neutral";
}

export function SentimentSparkline({ data, tone = "neutral" }: SentimentSparklineProps) {
  const color = tone === "positive" ? "success" : tone === "negative" ? "destructive" : "primary";
  return (
    <SparkAreaChart
      data={data}
      index="t"
      categories={["v"]}
      colors={[color]}
      className="h-8 w-24"
    />
  );
}
```

Merge the actual prop names from the current file (props may differ).

- [ ] **Step 3: Grep recharts**

```bash
grep -n "from \"recharts\"" frontend/src/components/SentimentSparkline.tsx || echo "clean"
```

- [ ] **Step 4: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
git add frontend/src/components/SentimentSparkline.tsx
git commit -m "refactor(frontend): migrate SentimentSparkline to Tremor SparkAreaChart"
```

---

### Task D4: `backtest/page.tsx` inline charts → Tremor

**Files:**
- Modify: `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx`

- [ ] **Step 1: Identify recharts usage**

```bash
grep -n "from \"recharts\"" frontend/src/app/\(app\)/strategies/\[id\]/backtest/page.tsx
```

Likely the equity curve or a secondary chart rendered inline on the backtest results page.

- [ ] **Step 2: Read the full file**

```bash
cat "frontend/src/app/(app)/strategies/[id]/backtest/page.tsx"
```

- [ ] **Step 3: Replace each recharts chart with the appropriate wrapper from `@/components/charts`:**

- Equity curve → `<CurrencyChart kind="line" data={…} index="date" categories={["equity","benchmark"]} />`
- Cumulative return → `<PercentChart kind="area" data={…} index="date" categories={["returnPct"]} />`
- Monthly returns bar → `<PercentChart kind="bar" data={…} index="month" categories={["returnPct"]} />`

Preserve all other JSX on the page (headers, tabs, KPI strip, drawers, etc).

- [ ] **Step 4: Grep + type-check + lint + commit**

```bash
grep -n "from \"recharts\"" "frontend/src/app/(app)/strategies/[id]/backtest/page.tsx" || echo "clean"
cd frontend && npx tsc --noEmit && npm run lint
git add "frontend/src/app/(app)/strategies/[id]/backtest/page.tsx"
git commit -m "refactor(frontend): migrate backtest page inline charts to Tremor"
```

---

### Task D5: `backtest/compare/page.tsx` → Tremor `LineChart`

**Files:**
- Modify: `frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx`

- [ ] **Step 1: Read the file**

```bash
cat "frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx"
```

- [ ] **Step 2: Replace the comparison recharts chart(s) with Tremor `LineChart` via `<CurrencyChart kind="line" …>` or `<PercentChart kind="line" …>` depending on the metric. Multi-run comparison → pass each run as its own `category`, map `colors` from `defaultSeriesColors`.**

- [ ] **Step 3: Grep + type-check + lint + commit**

```bash
grep -n "from \"recharts\"" "frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx" || echo "clean"
cd frontend && npx tsc --noEmit && npm run lint
git add "frontend/src/app/(app)/strategies/[id]/backtest/compare/page.tsx"
git commit -m "refactor(frontend): migrate backtest compare page charts to Tremor LineChart"
```

---

### Task D6: `share/backtests/[token]/page.tsx` → Tremor

**Files:**
- Modify: `frontend/src/app/share/backtests/[token]/page.tsx`

- [ ] **Step 1: Read the file**

```bash
cat "frontend/src/app/share/backtests/[token]/page.tsx"
```

- [ ] **Step 2: Replace each recharts chart with `CurrencyChart` / `PercentChart` per chart semantics. Preserve share-link read-only behavior, token handling, and the "share preview" chrome.**

- [ ] **Step 3: Grep + type-check + lint + commit**

```bash
grep -n "from \"recharts\"" "frontend/src/app/share/backtests/[token]/page.tsx" || echo "clean"
cd frontend && npx tsc --noEmit && npm run lint
git add "frontend/src/app/share/backtests/[token]/page.tsx"
git commit -m "refactor(frontend): migrate share page charts to Tremor"
```

---

## Stage E — Storybook sweep

### Task E1: Update remaining Storybook stories for migrated components

Some stories already got updated alongside their comp in Stage B/C. This task ensures every migrated comp has the 4 required variants: **default, dark, loading (or equivalent empty), error/empty**.

**Files (audit + update as needed):**
- `frontend/src/components/backtest/KPIStrip` — if a story exists, add dark + empty (no trades) variants
- `frontend/src/components/backtest/DrawdownSection` — add dark, loading, error, empty-data variants
- `frontend/src/components/backtest/DistributionRow` — add dark, empty-distribution, skew-warning variants
- `frontend/src/components/backtest/PositionAnalysisCard` — add dark, <2-trades, missingTimestamps variants
- `frontend/src/components/MarketSentimentPanel.stories.tsx` — create if missing, add dark + low/mid/high sentiment variants
- `frontend/src/components/SentimentSparkline.stories.tsx` — create if missing, add 3 tone variants + dark

- [ ] **Step 1: List existing stories for migrated components**

```bash
ls frontend/src/components/backtest/*.stories.tsx
ls frontend/src/components/*.stories.tsx | grep -E "KPIStrip|Drawdown|Distribution|Position|Sentiment|Market|Narrative|WhatYouLearned|LowTradeCount|DataAvailability|DataCompleteness|TransactionCost"
```

- [ ] **Step 2: For each migrated component, ensure its `.stories.tsx` has these 4 exports**

Template (adapt per component):

```tsx
export const Default: Story = { args: { /* realistic happy path */ } };
export const Empty: Story = { args: { /* empty or loading data */ } };
export const ErrorState: Story = { args: { /* error prop set, or loading=true */ } };
export const Dark: Story = {
  args: { /* same as Default */ },
  decorators: [(Story) => <div className="dark bg-background p-6"><Story /></div>],
};
```

- [ ] **Step 3: Smoke-run Storybook**

```bash
cd frontend && npm run build-storybook
```

Expected: build succeeds, no MDX/JS errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/**/*.stories.tsx
git commit -m "docs(storybook): add required variants for Tremor-migrated components"
```

---

## Stage F — Cleanup + docs + verification

### Task F1: Remove `recharts` dependency (if zero imports)

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Grep for any remaining recharts imports**

```bash
grep -rn "from \"recharts\"" frontend/src || echo "RECHARTS-CLEAN"
```

Expected: `RECHARTS-CLEAN`.

- [ ] **Step 2: If clean, remove the dep**

```bash
cd frontend && npm uninstall recharts
```

Verify `frontend/package.json` no longer lists `"recharts"` under `dependencies`.

- [ ] **Step 3: If NOT clean, list the survivors and STOP**

Document the surviving recharts imports in the PR description with justification. Do not remove the dep. Add a TODO at the bottom of the PR description. (This plan's acceptance criterion 2 tolerates justified survivors.)

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): remove recharts (fully replaced by Tremor)"
```

---

### Task F2: Update `frontend/CLAUDE.md`

**Files:**
- Modify: `frontend/CLAUDE.md`

- [ ] **Step 1: Add a "Tremor" section right after the "shadcn/ui" section**

Insert this block between the existing `## shadcn/ui` and `## Design system — read before writing any UI` sections:

```markdown
## Tremor (charts + KPIs)

- **Installed:** `@tremor/react` — used for data-viz (`AreaChart`, `LineChart`, `BarChart`, `SparkAreaChart`, `BarList`, `DonutChart`), KPIs (`Metric`, `BadgeDelta`, `Card`), progress (`ProgressCircle`), trackers (`Tracker`), and severity callouts (`Callout`).
- **Scope:** charts, KPIs, Callouts, Trackers **only**. Keep shadcn/ui for Button, Input, Select, Dialog, Tabs, Badge, DropdownMenu, Checkbox, Popover, Sheet, Sidebar, Skeleton, Switch, Table, Tooltip, Breadcrumb.
- **Tokens:** Tremor's `tremor.*` + `dark-tremor.*` color keys in `tailwind.config.ts` alias to `hsl(var(--…))` from `globals.css`. Never add Tremor hex literals — always alias to existing CSS vars.
- **Wrappers:** use `@/components/charts/{CurrencyChart, PercentChart}` for chart surfaces that need consistent USD or `%` formatters. Palette lives in `@/components/charts/SeriesColors.ts` — reuse `defaultSeriesColors` for multi-series charts so colors match canvas categories (input/indicator/logic/signal/risk).
- **Imports:** `import { Card, Metric, BadgeDelta, Callout, Tracker, ProgressCircle } from "@tremor/react"`.
- **Storybook:** every migrated component has `Default`, `Empty`, `ErrorState`, and `Dark` variants.
- **Do NOT** use Tremor for lightweight-charts candlestick/equity surfaces — `ZoomableChart` stays on lightweight-charts.
- **Do NOT** use Tremor on canvas nodes (`components/canvas/`) — custom Tailwind only.
```

Also update the `## shadcn/ui` line that reads "Canvas nodes (`components/canvas/`) use **custom Tailwind only — no shadcn/ui**" to also mention "— no Tremor" at the end.

- [ ] **Step 2: Commit**

```bash
git add frontend/CLAUDE.md
git commit -m "docs(frontend): document Tremor adoption + usage rules"
```

---

### Task F3: Update `docs/design-system.json`

**Files:**
- Modify: `docs/design-system.json`

- [ ] **Step 1: Read the file to find the top-level shape**

```bash
cat docs/design-system.json | head -60
```

- [ ] **Step 2: Add a `tremor` namespace under `components` (or wherever other comp specs live). Structure:**

```jsonc
"tremor": {
  "scope": "Data-viz, KPIs, Callouts, Trackers only. Shadcn/ui keeps primitives.",
  "tokens": {
    "source": "Inherits from existing color strategy via tailwind.config.ts aliases (hsl(var(--…)))",
    "chartPalette": ["primary", "success", "warning", "destructive", "info"],
    "canvasCategoryMap": {
      "input": "primary",
      "indicator": "info",
      "logic": "warning",
      "signal": "success",
      "risk": "destructive"
    }
  },
  "components": {
    "Metric": { "fontFamily": "mono", "size": "1.875rem / 2.25rem", "weight": 700 },
    "BadgeDelta": {
      "positive": "color=increase (success hue)",
      "negative": "color=decrease (destructive hue)",
      "neutral": "color=unchanged (muted)"
    },
    "Callout": {
      "severities": { "info": "blue", "success": "green", "warning": "yellow", "error": "red" }
    },
    "Tracker": {
      "statusColors": { "complete": "emerald", "partial": "amber", "missing": "rose" }
    },
    "ProgressCircle": { "sizeDefault": "lg", "colorByValue": "<35 red, 35-64 amber, ≥65 emerald" }
  }
}
```

Adapt the exact JSON path to match the existing structure (likely under a `components` or `tokens` sibling).

- [ ] **Step 3: Commit**

```bash
git add docs/design-system.json
git commit -m "docs(design-system): add tremor namespace"
```

---

### Task F4: Create PRD `docs/prd-design-system-tremor-unification.md`

**Files:**
- Create: `docs/prd-design-system-tremor-unification.md`

- [ ] **Step 1: Write the PRD**

```markdown
# PRD — Design System Unification via Tremor (Charts/KPIs)

## Goal

Adopt `@tremor/react` for all data-viz and KPI surfaces so charts, metrics, callouts, and trackers share one consistent visual language aligned with the shadcn/ui primitives already used for forms, modals, tables, and navigation.

## Non-goals

- No replacement of shadcn/ui primitives (Button, Input, Dialog, Tabs, Badge, DropdownMenu, Checkbox, Popover, Sheet, Sidebar, Skeleton, Switch, Table, Tooltip, Breadcrumb).
- No changes to the canvas (`@xyflow/react`) or canvas node styling.
- No migration of the lightweight-charts candlestick/equity surface (`ZoomableChart`).
- No backend changes.
- No new features beyond 1:1 visual/component replacement (pinch-zoom on drawdown chart is accepted loss).

## Acceptance criteria

1. `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass in `frontend/`.
2. `grep -r 'from "recharts"' frontend/src` returns zero (or explicit justified survivor).
3. All 17 migrated components render in Storybook with Default, Empty, ErrorState, and Dark variants.
4. Visual QA checklist (`docs/tst-design-system-tremor-unification.md`) passes on `npm run dev` across light + dark and desktop + <768px.
5. Zero raw hex literals in `tremor` / `dark-tremor` color keys in `tailwind.config.ts` — all values `hsl(var(--…))`.
6. Frontend CLAUDE.md, `docs/design-system.json`, `docs/product.md`, and `docs/phase2.md` updated.
7. Dark mode parity: every Tremor surface flips correctly via `.dark` class.

## Migration scope (17 items, single PR)

- `backtest/KPIStrip.tsx` → Card + Metric + BadgeDelta
- `backtest/PageHeader.tsx` stats → Metric
- `backtest/DrawdownSection.tsx` → AreaChart
- `backtest/DistributionRow.tsx` → BarChart
- `backtest/PositionAnalysisCard.tsx` → Card + BarList + Metric
- `TransactionCostAnalysis.tsx` → Card + BarList (or DonutChart if ≤5 slices)
- `NarrativeCard.tsx` → Card + Callout
- `WhatYouLearnedCard.tsx` → Card + Callout
- `LowTradeCountWarning.tsx` → Callout (yellow)
- `DataCompletenessTimeline.tsx` → Tracker
- `DataAvailabilitySection.tsx` → Callout
- `SentimentGauge.tsx` → ProgressCircle
- `SentimentSparkline.tsx` → SparkAreaChart
- `MarketSentimentPanel.tsx` → Card + Metric + BadgeDelta
- `app/(app)/strategies/[id]/backtest/page.tsx` inline charts → Tremor wrappers
- `app/(app)/strategies/[id]/backtest/compare/page.tsx` → LineChart
- `app/share/backtests/[token]/page.tsx` → Tremor wrappers

## Rollout

Single big-bang PR on branch `design-system/signal-theme`. Commit-per-stage inside the PR (foundation → callouts → KPIs → charts → storybook → cleanup/docs) so reviewer walks stages.

## Success metrics

- Bundle size diff (target: within ±10% of pre-change production bundle — recharts removal offsets Tremor add).
- Zero recharts imports in `frontend/src`.
- Visual consistency: one token source (`globals.css`) feeds both shadcn primitives and Tremor.

## Risks + mitigations

See `docs/superpowers/specs/2026-04-19-tremor-design-system-unification-design.md` §9.

## Links

- Design spec: `docs/superpowers/specs/2026-04-19-tremor-design-system-unification-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-19-tremor-design-system-unification.md`
- Test doc: `docs/tst-design-system-tremor-unification.md`
```

- [ ] **Step 2: Commit**

```bash
git add docs/prd-design-system-tremor-unification.md
git commit -m "docs(prd): add Tremor design-system unification PRD"
```

---

### Task F5: Create test doc `docs/tst-design-system-tremor-unification.md`

**Files:**
- Create: `docs/tst-design-system-tremor-unification.md`

- [ ] **Step 1: Write the test scenarios doc**

```markdown
# TST — Design System Unification via Tremor

Validation scenarios for the PRD in `docs/prd-design-system-tremor-unification.md`.

## T1. Type + lint + build

1. `cd frontend && npx tsc --noEmit` → PASS.
2. `cd frontend && npm run lint` → PASS.
3. `cd frontend && npm run build` → PASS.

## T2. Recharts eradication

1. `grep -rn 'from "recharts"' frontend/src` → zero matches.
2. `cat frontend/package.json | grep recharts` → no match.

## T3. Token-alias integrity

1. `cat frontend/tailwind.config.ts | grep -E '#[0-9a-fA-F]{3,6}' | grep -v '//'` → zero literal hex values inside `tremor` / `dark-tremor` blocks.
2. Every `tremor.*.DEFAULT` value uses `hsl(var(--…))` form.

## T4. Storybook parity

1. `cd frontend && npm run build-storybook` → PASS, no errors.
2. Every migrated component has these stories: `Default`, `Empty`, `ErrorState`, `Dark`.

## T5. Visual QA — `npm run dev` walkthrough

For each page below, verify in light + dark and desktop + <768px (Chrome DevTools responsive):

### T5.1 Backtest results (`/strategies/:id/backtest`)
- KPIStrip: 6 cards render; positive return shows green BadgeDelta; negative shows red.
- Drawdown AreaChart: series color = destructive; gridlines visible; tooltip shows `%`.
- DistributionRow: return histogram stacks loss (red) + win (green) per bucket; duration histogram uses primary color.
- PositionAnalysisCard: BarList renders hold times; Metric shows avg position size; warning Text visible if timestamps missing.
- TransactionCostAnalysis: Card + breakdown renders; no overflow on mobile.
- NarrativeCard / WhatYouLearnedCard: Callouts render with correct severity colors.
- LowTradeCountWarning: yellow Callout renders when trade count < threshold.

### T5.2 Backtest compare (`/strategies/:id/backtest/compare`)
- LineChart renders multi-run series; colors from `defaultSeriesColors` in order.
- Legend shows each run name.

### T5.3 Share page (`/share/backtests/:token`)
- Charts render in read-only layout.
- No auth-gated UI leaks in.

### T5.4 Market sentiment surfaces
- MarketSentimentPanel: Metric + BadgeDelta render; sentiment gauge (ProgressCircle) color changes based on value.
- SentimentSparkline: SparkAreaChart renders in compact form (h-8 w-24).

## T6. Dark mode parity

1. Toggle `<html>` class to `dark` via DevTools.
2. Re-run T5 checks: every Tremor surface flips colors correctly (background, border, text, chart axes, tooltip background).
3. No "white flash" on chart SVG backgrounds.

## T7. Responsive

1. At width 375 px (iPhone SE), core backtest page scrolls vertically only; no horizontal overflow.
2. KPIStrip stacks to 2 cols; charts shrink to ≥h-44.
3. Tooltips do not clip at viewport edges.

## T8. A11y smoke

1. Tab-through the backtest results page: every interactive element focusable with visible focus ring.
2. `BadgeDelta` announces icon + text to screen reader (Tremor defaults are accessible; verify with axe in DevTools).
3. Color contrast on muted text ≥ WCAG AA (4.5:1) in both light + dark.

## T9. Regression — untouched surfaces

1. Canvas (`/strategies/:id/canvas`): nodes render, connections OK — unchanged.
2. Candlestick/equity curve (ZoomableChart): renders via lightweight-charts — unchanged.
3. Drawers and modals (TradeDrawer, AllRunsDrawer, ShareBacktestModal): open/close, keyboard dismiss — unchanged.
4. Sidebar, navigation, forms: unchanged.
```

- [ ] **Step 2: Commit**

```bash
git add docs/tst-design-system-tremor-unification.md
git commit -m "docs(tst): add Tremor design-system unification test scenarios"
```

---

### Task F6: Update `docs/product.md` + `docs/phase2.md`

**Files:**
- Modify: `docs/product.md`
- Modify: `docs/phase2.md`

- [ ] **Step 1: Update `docs/product.md` §13 (design system)**

Add a bullet under §13 noting Tremor adoption scope: "Data-viz, KPIs, Callouts, Trackers unified on `@tremor/react` (npm pkg). shadcn/ui retained for primitives. Tokens share one source (`globals.css`)."

- [ ] **Step 2: Update `docs/product.md` §16.1 (tech stack)**

Add `@tremor/react` to the frontend deps list.

- [ ] **Step 3: Update `docs/product.md` §17.1**

Add a row/link referencing `prd-design-system-tremor-unification.md`.

- [ ] **Step 4: Update `docs/phase2.md`**

Add one line under the current iteration's in-flight work: `- Design system harmonization via Tremor (charts/KPIs). See prd-design-system-tremor-unification.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/product.md docs/phase2.md
git commit -m "docs: link Tremor design-system PRD from product and phase2"
```

---

### Task F7: Final verification sweep

- [ ] **Step 1: Full build + type-check + lint**

```bash
cd frontend && npm run build && npx tsc --noEmit && npm run lint
```

Expected: ALL PASS.

- [ ] **Step 2: Grep recharts one more time**

```bash
grep -rn "from \"recharts\"" frontend/src || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 3: Hex-literal sanity check in Tailwind config**

```bash
grep -nE "#[0-9a-fA-F]{3,6}" frontend/tailwind.config.ts | grep -v "hsl" || echo "NO-HEX"
```

Expected: `NO-HEX` (or only commented hex lines).

- [ ] **Step 4: Run Storybook build**

```bash
cd frontend && npm run build-storybook
```

Expected: PASS.

- [ ] **Step 5: Manual visual QA per `docs/tst-design-system-tremor-unification.md` T5–T9**

```bash
cd frontend && npm run dev &
# Open http://localhost:3000 → walk backtest + compare + share pages in light + dark, desktop + mobile.
# Kill dev server when done.
```

Record any visual regressions in the PR description.

- [ ] **Step 6: Commit if any last fixes**

```bash
git add -A
git commit -m "chore: final verification fixes for Tremor migration" || echo "nothing to commit"
```

- [ ] **Step 7: Summary commit message for PR description (no new commit)**

Draft the PR description referencing:
- Spec: `docs/superpowers/specs/2026-04-19-tremor-design-system-unification-design.md`
- Plan: `docs/superpowers/plans/2026-04-19-tremor-design-system-unification.md`
- PRD: `docs/prd-design-system-tremor-unification.md`
- Test scenarios: `docs/tst-design-system-tremor-unification.md`
- Note any justified recharts survivors (or state "none").
- Note the pinch-zoom loss on DrawdownSection.
- Link to Storybook build artifact if CI produces one.

---

## Self-review checklist (for the executor)

Before opening the PR, run through this list:

- [ ] 17 components migrated (10 comp files + 3 pages + 4 dependent components counted inside pages/panels). Confirm by `grep -l "@tremor/react" frontend/src` yields ≥17 distinct files.
- [ ] No component lost its props or export name.
- [ ] `formatMoney`, `formatPercent`, `formatDuration`, `formatChartDate`, `formatDateTime` still wired to Tremor charts via `valueFormatter` + `index`.
- [ ] Every severity Callout uses the correct Tremor `color` for its semantic.
- [ ] Storybook stories: default + empty + error + dark exist for every migrated component.
- [ ] Docs updated: `frontend/CLAUDE.md`, `docs/design-system.json`, `docs/product.md` (§13, §16.1, §17.1), `docs/phase2.md`, new PRD, new TST.
- [ ] `recharts` removed from `package.json` OR survivors documented in PR description.
- [ ] Zero hex literals in `tremor`/`dark-tremor` Tailwind keys.
- [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm run build-storybook` all pass.
- [ ] Manual QA pass done.
