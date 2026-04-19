# Test spec — Tremor Design System Unification

**Paired PRD:** `docs/prd-tremor-design-system-unification.md`

## Unit / type checks

- `npx tsc --noEmit` — 0 errors. ✓
- `npm run lint` — 0 errors (pre-existing 18 warnings unrelated to this PR). ✓
- `npm run build` — production build compiles, all routes generate. ✓

## Storybook coverage

Each migrated component renders in Storybook with the variants listed:

| Component | Variants |
|---|---|
| `LowTradeCountWarning` | 1/5/9 trades, hidden (≥10, 0, null), Dark |
| `WhatYouLearnedCard` | (pre-existing) |
| `NarrativeCard` | (pre-existing) |
| `DataAvailabilitySection` | (pre-existing) |
| `SentimentGauge` | Fearful, Neutral, Greedy, ExtremeGreed, Partial, Unavailable, WithUnit |
| `SentimentSparkline` | Default, Partial, Empty, Unavailable, Dark |
| `KPIStrip` | Default, NegativeReturn, Empty, Dark |
| `PositionAnalysisCard` | Default, Empty, MissingTimestamps, Dark |
| `DrawdownSection` | Default, Loading, ErrorState, Empty, Dark |
| `DistributionRow` | Default, WithSkewWarning, WithoutDuration, Empty, Dark |
| `TransactionCostAnalysis` | (pre-existing) |
| `CurrencyChart` / `PercentChart` | Area/Bar/Line, DarkMode, Empty |

## Manual smoke (post-merge)

1. `npm run dev`; load `/strategies/<id>/backtest` for a run with trades
   - Equity chart renders Strategy + Buy&Hold lines
   - KPI strip shows 6 cards, `BadgeDelta` on Total Return
   - Drawdown chart renders below-zero area
   - Distribution row: return histogram shows red (neg) / emerald (pos) bars; duration histogram shows blue bars
   - PositionAnalysisCard + TransactionCostAnalysis cards render with Tremor shells
2. Load `/strategies/<id>/backtest/compare?runs=<ids>`
   - N-run equity curves render with distinct palette colors
3. Load `/share/backtests/<token>`
   - Shared equity chart renders
4. Load `/market/<asset>`
   - Sentiment panel: 3-up gauge + 2 sparklines; try toggling an asset with partial/missing data to verify Callout fallback
5. Toggle dark mode — all Tremor shells (Card, Callout, chart backgrounds) should match foreground/background tokens.

## Regression risks to watch in review

- `DrawdownSection`: no more pinch-zoom / reference-area highlight
- `DistributionRow`: bars are flat colors (no per-bar lightness gradient)
- Chart tooltips now use Tremor's built-in tooltip styling (not our popover tokens). Visual-only; acceptable per spec.

## Build hygiene

- `recharts` and `react-zoom-pan-pinch` removed from `package.json`.
- `ZoomableChart.tsx` deleted.
- `.recharts-*` CSS overrides removed from `globals.css`.
- `frontend/CLAUDE.md` Tremor section added.
