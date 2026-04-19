# PRD — Tremor Design System Unification (Charts + KPIs)

**Status:** Implemented · single-PR rollout on `design-system/signal-theme`
**Owner:** pierrick
**Date:** 2026-04-19

## Problem

Chart and KPI components had grown inconsistently: recharts for line/bar/area, hand-rolled cards for metrics, ad-hoc Tailwind classes for callouts, and mixed color strategies (hex, `hsl(var(--chart-*))`, amber-*/blue-* utilities). Visual harmony drifted across backtest, compare, share, and market pages. Dark-mode parity was uneven.

## Goals

- Unify charts on a single library: `@tremor/react`.
- Unify KPI cards, callouts, and metric panels via Tremor `Card` + `Metric` + `BadgeDelta` + `Callout`.
- Alias Tremor's color namespace to the existing shadcn CSS-var tokens so shells (background, border, text) match the theme in both modes.
- Remove recharts from the stack.

## Non-goals

- Canvas (`@xyflow/react`) — untouched.
- Candlestick charts (`lightweight-charts`) — untouched.
- Forms, dialogs, dropdowns — stay on shadcn/ui.
- No brand/palette redesign. Tokens unchanged.

## Scope — migrated components

**Panels & callouts**
- `LowTradeCountWarning` → Tremor `Callout`
- `WhatYouLearnedCard` → Tremor `Card` shell
- `NarrativeCard` → Tremor `Card` shell
- `DataAvailabilitySection` warning block → Tremor `Callout`
- `SentimentGauge` → Tremor `Card` shell
- `MarketSentimentPanel` → Tremor `Card` + `Callout` for error state
- `PositionAnalysisCard` → Tremor `Card` shell
- `TransactionCostAnalysis` → Tremor `Card` shell

**KPIs**
- `backtest/KPIStrip` → Tremor `Card` + `Metric` + `BadgeDelta`

**Charts (recharts → Tremor)**
- `SentimentSparkline` → `SparkLineChart`
- `DrawdownSection` → `AreaChart`
- `DistributionRow` → two `BarChart`s (return + duration)
- `strategies/[id]/backtest` equity curve → `LineChart`
- `strategies/[id]/backtest/compare` equity curves → `LineChart`
- `share/backtests/[token]` equity curve → `LineChart`

**Chart wrappers added** (Stage A)
- `components/charts/CurrencyChart.tsx`, `PercentChart.tsx`, `SeriesColors.ts`

## Architecture

- Tremor `tremor.*` + `dark-tremor.*` tailwind color keys aliased to `hsl(var(--primary))`, `hsl(var(--muted))`, etc. So Tremor shells inherit the theme.
- Chart **series** colors use Tremor's built-in palette (`blue`, `emerald`, `amber`, `red`, `violet`, `gray`). Tremor resolves those through `text-${color}-500` — which requires the full Tailwind color scale. Semantic tokens (`primary`, `success`, etc.) do **not** have a 500 scale and therefore cannot be used as chart colors.
- Safelist covers `(bg|text|border|stroke|fill|ring)-tremor-.*` + `-dark-tremor-.*` so Tremor's dynamic classes survive JIT.

## Accepted visual regressions

- `DrawdownSection`: loss of `ZoomableChart` pinch-zoom + `ReferenceArea` max-DD highlight.
- `DistributionRow`: loss of per-bar lightness gradient; now two flat categories (`red` for negative buckets, `emerald` for positive).

## Acceptance criteria

- No `recharts` import remaining in `src/` (only MDX prose references are allowed).
- No hex color literals in migrated components; colors come from CSS vars or Tremor palette names.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass (0 errors; pre-existing warnings are out of scope).
- Stories present for each migrated chart/KPI component with Default / Empty / ErrorState (where applicable) / Dark variants.

## Rollout

Big-bang on branch `design-system/signal-theme`, merged to main as one PR.

## Dependencies

- Added: `@tremor/react ^3.18.7` (installed with `--legacy-peer-deps` — Tremor 3.x declares React 18 peer; works on React 19 at runtime).
- Removed: `recharts`, `react-zoom-pan-pinch`.
- `ZoomableChart.tsx` deleted (no remaining consumers).

## Related

- Design spec: `docs/superpowers/specs/2026-04-19-tremor-design-system-unification-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-19-tremor-design-system-unification.md`
- TST: `docs/tst-tremor-design-system-unification.md`
