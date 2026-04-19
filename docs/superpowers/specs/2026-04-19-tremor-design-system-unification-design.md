# Design — Tremor Design System Unification (Charts/KPIs)

- **Date:** 2026-04-19
- **Branch:** `design-system/signal-theme`
- **Scope:** Frontend UI only. Adopt `@tremor/react` for data-viz and KPI surfaces. Keep existing shadcn/ui primitives for everything else.
- **Non-goals:** Canvas/@xyflow changes; shadcn primitive replacement; candlestick chart migration (lightweight-charts stays); backend changes; new features beyond 1:1 comp replacement.

## 1. Goal

Unify the look-and-feel of all numeric/chart surfaces (backtest results, comparison, share, sentiment, dashboards) behind a single design system, while preserving the existing shadcn/ui primitive library for interactive UI (forms, modals, menus, tables, sidebar).

## 2. Stack decisions

| Decision | Choice | Rationale |
|---|---|---|
| Adoption scope | Charts + KPIs + Callouts + Trackers only (Option A) | Min risk, max harmony where user looks at data |
| Tremor variant | `@tremor/react` npm package | Fastest path; Tailwind config handles theming |
| Token strategy | Alias Tremor palette to existing shadcn CSS vars | Single source of truth = `globals.css`; Tremor inherits brand + dark mode automatically |
| Rollout | Single big-bang PR | User-selected; commit-per-stage inside PR eases review |
| Branch | `design-system/signal-theme` | Already open, scope matches |

## 3. Architecture

- Add `@tremor/react` to `frontend/package.json` dependencies.
- Extend `frontend/tailwind.config.ts`:
  - `content` paths include `./node_modules/@tremor/**/*.{js,ts,jsx,tsx}`.
  - `theme.extend.colors.tremor` + `theme.extend.colors["dark-tremor"]` keys, each value = `hsl(var(--…))` from `globals.css`.
  - `safelist` per Tremor docs (color class patterns).
- Dark mode: existing `.dark` class on `<html>`; Tremor inherits because aliased CSS vars flip at root.
- Direct imports from `@tremor/react` in components. No re-export barrel at first.
- Thin wrapper layer at `src/components/charts/`:
  - `CurrencyChart.tsx` — Tremor chart wrapper w/ USD `valueFormatter`.
  - `PercentChart.tsx` — Tremor chart wrapper w/ `%` `valueFormatter`.
  - `SeriesColors.ts` — exports canvas-category palette (input=purple, indicator=blue, logic=amber, signal=green, risk=red) for chart `colors` prop.
- No new CSS file. No parallel theme.

## 4. Token map (Tailwind config)

```ts
// theme.extend.colors
tremor: {
  brand: {
    faint:      "hsl(var(--primary) / 0.08)",
    muted:      "hsl(var(--primary) / 0.2)",
    subtle:     "hsl(var(--primary) / 0.5)",
    DEFAULT:    "hsl(var(--primary))",
    emphasis:   "hsl(var(--primary))",
    inverted:   "hsl(var(--primary-foreground))",
  },
  background: {
    muted:      "hsl(var(--muted))",
    subtle:     "hsl(var(--accent))",
    DEFAULT:    "hsl(var(--background))",
    emphasis:   "hsl(var(--foreground))",
  },
  border: { DEFAULT: "hsl(var(--border))" },
  ring:   { DEFAULT: "hsl(var(--ring))" },
  content: {
    subtle:     "hsl(var(--muted-foreground))",
    DEFAULT:    "hsl(var(--foreground))",
    emphasis:   "hsl(var(--foreground))",
    strong:     "hsl(var(--foreground))",
    inverted:   "hsl(var(--background))",
  },
},
"dark-tremor": {
  // same key shape; same hsl(var(--…)) values.
  // CSS vars already flip via `.dark` in globals.css, so Tremor dark keys
  // resolve to the dark palette automatically.
},
```

Constraint: zero raw hex literals in Tremor color entries.

## 5. Migration targets (single PR)

| Current component | Tremor replacement | Notes |
|---|---|---|
| `backtest/KPIStrip.tsx` | `Card` + `Metric` + `BadgeDelta` | Delta color from perf sign |
| `backtest/PageHeader.tsx` stats | `Metric` | Inline |
| `backtest/DrawdownSection.tsx` | `AreaChart` | Remove recharts |
| `backtest/DistributionRow.tsx` | `BarChart` | Remove recharts |
| `backtest/PositionAnalysisCard.tsx` | `Card` + `BarList` | |
| `TransactionCostAnalysis.tsx` | `Card` + `BarList` | `DonutChart` if breakdown ≤5 slices |
| `NarrativeCard.tsx` | `Card` + `Callout` | Preserve narrative text shape |
| `WhatYouLearnedCard.tsx` | `Callout` | |
| `LowTradeCountWarning.tsx` | `Callout color="yellow"` | |
| `DataCompletenessTimeline.tsx` | `Tracker` | |
| `DataAvailabilitySection.tsx` | `Tracker` + `Callout` | |
| `SentimentGauge.tsx` | `ProgressCircle` | |
| `SentimentSparkline.tsx` | `SparkAreaChart` | Remove recharts |
| `MarketSentimentPanel.tsx` | `Card` + `Metric` + `BadgeDelta` | |
| `app/(app)/strategies/[id]/backtest/compare/page.tsx` charts | `LineChart` | Remove recharts |
| `app/share/backtests/[token]/page.tsx` charts | Tremor charts | Remove recharts |
| `app/(app)/strategies/[id]/backtest/page.tsx` inline charts | Tremor charts | Remove recharts |

**Untouched:** `ZoomableChart.tsx` (lightweight-charts); canvas/@xyflow nodes; shadcn primitives (`Button`, `Input`, `Select`, `Dialog`, `Tabs`, `Badge`, `DropdownMenu`, `Checkbox`, `Popover`, `Separator`, `Sheet`, `Sidebar`, `Skeleton`, `Switch`, `Table`, `Tooltip`, `Breadcrumb`); `StrategyTabs`; `TradeDrawer`; `AllRunsDrawer`; `ShareBacktestModal`.

**Recharts removal:** after migration, grep `from "recharts"` in `frontend/src`. If zero imports, remove `recharts` from `package.json`.

## 6. Storybook + QA

**Stories (update or add per migrated comp):**
- Variants: default, dark mode, loading (Skeleton), empty data, error state.
- Add `src/components/charts/*.stories.tsx` for the 3 wrappers.
- Delete stories only if underlying comp is removed outright.

**Type-check / lint:**
- `npx tsc --noEmit` + `npm run lint` must pass pre-merge.
- Tremor ships types; no `@types/tremor__*` needed.

**Visual QA checklist (`npm run dev`):**
1. Walk `/strategies/[id]/backtest`, `/backtest/compare`, `/share/backtests/[token]` in light + dark.
2. Mobile <768px — charts responsive, no horizontal scroll on core flows.
3. `BadgeDelta` color ↔ perf sign (green +, red –).
4. `Callout` severity colors: info=blue, warning=yellow, error=red, success=green.
5. `Tracker` cells match data-completeness scale in `design-system.json`.
6. Grep `from "recharts"` returns zero (or explicit justified survivor).

**Unit tests:** none added. No UI unit-test baseline exists; out of scope.

## 7. Doc updates (per CLAUDE.md hygiene table)

| File | Update |
|---|---|
| `frontend/CLAUDE.md` | Add Tremor section; list adopted Tremor comps; import path; token-alias rule; wrapper layer location; Storybook pattern note |
| `CLAUDE.md` (root) | No change |
| `docs/design-system.json` | Add `tremor` namespace: chart palette, Metric/BadgeDelta/Callout specs, Tracker cell colors. Tokens inherit existing color strategy |
| `docs/design_concept.json` | No change |
| `docs/product.md` | §13 design system (Tremor scope + variant), §16.1 tech stack (add `@tremor/react`), §17.1 (link new PRD) |
| `docs/prd-design-system-tremor-unification.md` (new) | Goal, non-goals, AC, migration table, rollout (single PR), success metrics |
| `docs/tst-design-system-tremor-unification.md` (new) | Visual QA scenarios, token-alias tests, Storybook parity, dark-mode parity, mobile responsive |
| `docs/phase2.md` | Add one line under current iteration with link to PRD |

Backend docs/code: no change.

## 8. Rollout (single PR, commit-per-stage)

Branch: `design-system/signal-theme`.

1. Tailwind config + token aliases + `@tremor/react` install.
2. `src/components/charts/` wrappers + palette.
3. Migrate 17 comps (§5).
4. Update/add Storybook stories.
5. Update docs (§7).
6. Remove `recharts` from `package.json` if zero imports.
7. Type-check + lint + visual QA.

Each stage = one commit for reviewer walkthrough.

## 9. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Token alias mismatch in dark mode | `dark-tremor` keys mirror `tremor` keys; verify during dark-mode QA pass |
| Tremor content path missing from Tailwind `content` | Classes purged, broken styles. Explicit `./node_modules/@tremor/**` path + safelist per Tremor docs |
| Lightweight-charts + Tremor coexistence | Separate libs, verified: `ZoomableChart` stays untouched |
| Bundle size growth | Per-component Tremor imports tree-shake; recharts removal offsets |
| Review fatigue on big PR | Commit-per-stage (§8) so reviewer walks stages individually |
| Dark mode variables not flipping for Tremor classes | Root `<html class="dark">` already toggles CSS vars used by aliases; smoke-test early |

## 10. Acceptance criteria

1. `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass.
2. `grep -r 'from "recharts"' frontend/src` → zero (or explicit justified survivor documented in PR).
3. All 17 migrated comps render in Storybook with default, dark, loading, empty variants.
4. Visual QA checklist (§6) passes in `npm run dev` across light and dark, desktop and <768px mobile.
5. Zero raw hex literals in `tremor` / `dark-tremor` color entries in `tailwind.config.ts`.
6. Docs updated per §7.
7. Dark mode parity: every Tremor surface flips correctly on `.dark`.
