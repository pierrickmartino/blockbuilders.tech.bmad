# Critique: Strategy Backtest Page

_Date: 2026-04-24_
_Scope: `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` and sub-components under `frontend/src/components/backtest/`, plus `NarrativeCard`, `WhatYouLearnedCard`, `LowTradeCountWarning`, `DataAvailabilitySection`, `TransactionCostAnalysis`, `BacktestRunsList`._

Deterministic scan: **zero findings** (`npx impeccable --json --fast` returned `[]`).

## Design Health Score

| # | Heuristic | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Visibility of System Status | 4 | Running badge with ping, batch progress via `PageAlert`, aria-live now in place |
| 2 | Match System / Real World | 4 | Trader vocabulary (sharpe, drawdown, P&L, win rate) used correctly |
| 3 | User Control and Freedom | 3 | "Pause batch" exists; no clear cancel/retry on single runs in view |
| 4 | Consistency and Standards | 4 | Tokens unified post-polish; `PageAlert`, `StatusBadge` reused throughout |
| 5 | Error Prevention | 3 | Compare-max banner prevents 5+ selection; destructive actions elsewhere not surveyed |
| 6 | Recognition Rather Than Recall | 4 | `KPIStrip` + rail show state without mode-switching; `tooltip-content.ts` carries jargon explanations |
| 7 | Flexibility and Efficiency | 3 | No keyboard shortcuts for power users (new run, open compare, page trades) |
| 8 | Aesthetic and Minimalist | 4 | Strong Signal adherence — flat fills, 1px rules, mono numbers, zero decoration |
| 9 | Error Recovery | 3 | Failed-status surfaced, but retry affordance not visible from the rail/band |
| 10 | Help and Documentation | 4 | `NarrativeCard`, `WhatYouLearnedCard`, `LowTradeCountWarning`, `DataAvailabilitySection` — unusually good for a technical tool |
| **Total** | | **36/40** | **Excellent** |

## Anti-Patterns Verdict

**LLM assessment: PASS.** No AI-slop tells present. No side-stripe borders, no gradient text, no glassmorphism, no hero-metric template, no rounded-icon-above-heading pattern. Numbers are mono/tabular, neutrals tint toward the Signal blue, left-aligned composition with intentional asymmetry (content column + sticky rail at lg).

**Deterministic scan**: `npx impeccable --json --fast` across all target files returned `[]` — zero regex matches against the 25 patterns. The recent tokenization pass closed the last theming drift.

**Would someone believe "AI made this"?** No. It reads as a deliberately-engineered instrument panel. Congruent with the "disciplined trading workstation" brief.

## Overall Impression

This is a mature, dense view that earns its density. The rhythm between the full-bleed `KPIStrip`, the horizontal runs band, and the deeper analysis sections keeps the eye moving without feeling chaotic. The single biggest lingering opportunity is **wayfinding across a long vertical** — the page has ~10 distinct analytical surfaces and nothing anchors scroll position or offers a skim-to-section path.

## What's Working

1. **Narrative scaffolding** — `NarrativeCard` + `WhatYouLearnedCard` + `LowTradeCountWarning` + `DataAvailabilitySection` give this page a pedagogical layer most trading tools skip. It teaches the reader how to read their own backtest, which is on-brand for "self-directed but serious."
2. **Tokens are now the whole system** — post-polish, theming drift is zero. Dark mode is a first-class peer.
3. **Colorblind-safe seasonality** — diagonal stripe overlay on loss cells is genuine craft. Very few trading UIs bother.

## Priority Issues

### [P1] Seasonality heatmap lacks grid structure for screen readers
- **Why**: Each cell is an isolated `role="img"`; a SR user hears 12×N descriptive strings with no orientation for year rows or month/quarter columns. This is the cognitive-load equivalent of reading the table with your eyes closed.
- **Fix**: Promote to `role="grid"` with `role="row"`/`role="columnheader"` labels for year/period axes; keep cell `aria-label` as content.
- **Command**: `/impeccable:harden`

### [P2] Page has no wayfinding across ~10 analytical surfaces
- **Why**: Power users iterating between two runs scroll back-and-forth between KPI, Drawdown, Trades, Seasonality. There is no persistent section nav or anchored TOC. Scroll fatigue in a session that's supposed to feel like "a good workstation."
- **Fix**: Sticky secondary nav (section pills) aligned with the left content column, or add `scroll-margin-top` + visible section headers that work as anchors. Consider using the rail space at lg+.
- **Command**: `/impeccable:layout`

### [P2] No keyboard shortcuts for power-user actions
- **Why**: Alex-the-power-trader will create 10+ runs per session. Every "New run" click, every pagination step, every compare-select is mouse-only. This is friction the audience will notice first.
- **Fix**: `N` = new run, `C` = toggle compare mode, `[`/`]` = prev/next run in rail, `/` = focus trade search. Surface in a `?` shortcut sheet.
- **Command**: `/impeccable:harden`

### [P2] Banner fatigue — four distinct warning surfaces can co-exist
- **Why**: `LowTradeCountWarning`, `DataAvailabilitySection`, batch-running `PageAlert`, error `PageAlert`, and the two compare-selection banners can all stack above the fold on a messy run. Signal suffers when every banner shouts equally.
- **Fix**: Consolidate into one data-health surface per run that enumerates issues by severity. Reserve `PageAlert` for transient transactional state (batch progress, errors).
- **Command**: `/impeccable:distill`

### [P3] Failed runs have no visible retry affordance from the rail/band
- **Why**: The red "Failed" badge is terminal; user has to recreate the run from scratch. For retail traders this is a small but real abandonment risk.
- **Fix**: Menu on failed card: "Retry run" / "View error" / "Duplicate". Wire to the existing jobs endpoint.
- **Command**: `/impeccable:harden`

## Persona Red Flags

**Alex (power trader — Signal's primary audience)**: Creates 10+ runs per hour. Fails at: mouse-only compare selection, no keyboard shortcut to new-run, must scroll to reach trades table every time. Workflow is serial clicks where it should be keystrokes.

**Jordan (first-timer — retail trader new to rigor)**: Served well by `NarrativeCard` + `WhatYouLearnedCard`. Fails at: seasonality heatmap (no legend key explaining intensity→magnitude mapping visible in the critique); would benefit from a one-line "How to read this" above the grid.

**Morgan (batch-backtester running parameter sweeps)**: `BacktestRunsRail` + compare mode support this well. Fails at: no way to sort/filter the rail by metric (best Sharpe, best return), so scanning a 20-run batch is linear.

## Minor Observations

- `KPIStrip` full-bleed at lg works but could feel *more* integral — a thin top-hairline + no card boundary would read as "workstation readout" rather than "card of metrics."
- `DistributionRow` bars now use opacity-based depth — verify the dark-mode `fillOpacity` 0.35 floor is still visible against `#0C0C0E`. Bump to 0.45 if faint.
- Copy: `"Select 2–4 completed runs to compare"` is right. `"Maximum 4 runs can be compared"` could be `"Limit of 4 runs reached"` — shorter, active voice.

## Questions to Consider

- What if the `BacktestRunsRail` were also the wayfinding anchor — clicking a run at lg jumps the content column between sections?
- Does `LowTradeCountWarning` need to exist as a standalone component, or is it one row inside a unified data-health panel?
- What would a confident retry flow look like from the rail? A single click + toast, or a confirm dialog?

## Recommended Actions

1. **`/impeccable:harden`** — seasonality grid roles (P1), keyboard shortcuts for Alex (P2), retry affordance on failed runs (P3).
2. **`/impeccable:layout`** — wayfinding across the long vertical; anchored section nav or a rail-integrated TOC.
3. **`/impeccable:distill`** — consolidate the four warning surfaces into one data-health panel to reduce banner fatigue.
4. **`/impeccable:polish`** — copy tightening + `DistributionRow` dark-mode opacity floor + `KPIStrip` hairline treatment.

---

## Prior Polish Context (for continuity)

This critique follows two passes completed on 2026-04-24:

- **Theming tokenization** — added `--heatmap-empty-bg`, `--heatmap-empty-fg`, `--heatmap-pos`, `--heatmap-neg`, `--heatmap-fg-pos`, `--heatmap-fg-neg`, `--heatmap-fg-high`, `--chart-duration` to `globals.css` (light + dark). Rewrote `getSeasonalityCellStyle` in `page.tsx` and `DistributionRow.tsx` Recharts `<Cell>` to consume them.
- **A11y + responsive polish** — `aria-live="polite"` + `aria-atomic="true"` on selection banners in `BacktestRunsBand.tsx` and `BacktestRunsList.tsx`; `motion-reduce:animate-none` on running-status pings in `StatusBadge.tsx` and `BacktestRunsBand.tsx`; mobile touch targets bumped in `TradesSection.tsx` (search, filter/export buttons, pagination, page-size select) with `sm:` variants restoring desktop compactness.
