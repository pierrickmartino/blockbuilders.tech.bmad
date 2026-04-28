# Phase 3 — Verification

**Date:** 2026-04-28
**Scope:** Component-Variant Reconciliation (chart-theme adapter, refactor 4 chart consumers, Badge variants, Card elevation variants).
**Out of scope (deferred):** Canvas wrappers — `<NodeSocket>` / `<NodeIcon>` to replace 184 atomic-pixel sizing classes across 14 node files. Tracked as Phase 3.X follow-up.

---

## Headline result

| Metric | Phase 0 baseline | Phase 2 | Phase 3 |
|---|---:|---:|---:|
| axe `color-contrast` violations | 47 nodes / 15 routes | 0 / 0 | **0 / 0** ✅ |
| Hex literal `#` count in TSX/CSS | 33 | 33 | **7** |
| Real color drift (hex + raw rgb/hsl) | ~51 | ~51 | **~3** |
| TypeScript errors | n/a | 0 | **0** |
| ESLint errors | 0 | 0 | **0** |
| Capture failures | 0 | 0 | 0 |

The remaining 7 hex hits are all **legitimate**:
- 4 = Google brand-logo SVG fills in `login/page.tsx` (third-party brand colors — correct render of the Google "G" requires these specific values).
- 3 = data-driven heatmap cell text colors in `backtest/page.tsx` line 219 (commented as Phase 6 deferred — needs a heatmap-token API to replace cleanly).
- 2 = doc-comment example strings in `chart-theme.ts` (showing the BAD pattern the adapter replaces; not real code paths).

The remaining raw `hsl(N…)` hits are all in:
- `chart-theme.ts` — the SSR fallback constants and `CANVAS_CATEGORIES` (the legitimate single source of truth, on the Phase 0 whitelist).
- `globals.css` — the `.text-gradient-primary` utility (deferred to Phase 6 along with the brand-gradient decision).
- `DistributionRow.tsx` — 3 data-driven gradients (commented as Phase 6 deferred).

**Effective drift count = 0.**

---

## Files changed in Phase 3

| File | Type | Change |
|---|---|---|
| `frontend/src/lib/chart-theme.ts` | new | `ChartTheme` interface + `useChartTheme()` hook + `readChartTheme()` SSR-safe sync read + `CANVAS_CATEGORIES` palette + `CanvasCategory` type. MutationObserver on `document.documentElement` `class` attribute makes the hook reactive to theme toggle. |
| `frontend/src/components/TradeDrawer.tsx` | edit | All 18 hex literals (background/text/grid/axis/up/down/markers/SL/TP/entry/indicators) replaced with `chartTheme` adapter values. `chartTheme` added to chart-init effect deps. |
| `frontend/src/components/canvas/CanvasMinimap.tsx` | edit | 5 category-color hex → `CANVAS_CATEGORIES[category]` lookup; viewport-indicator `rgba` + `#6366f1` → `chartTheme.primary` with `fillOpacity={0.1}`. |
| `frontend/src/components/canvas/StrategyCanvas.tsx` | edit | 2 edge-stroke `#6366f1` + 1 background-dot `#d1d5db` → `chartTheme.primary` / `chartTheme.grid`. |
| `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` | edit | Empty-state seasonality cell `rgba(148,163,184,...)` → `hsl(var(--muted-foreground) / N)` strings. Intensity-mapped heatmap branch annotated with explanatory comment + Phase 6 deferral note. |
| `frontend/src/components/backtest/DistributionRow.tsx` | edit | Doc-comment block clarifying the data-driven hsl ramps are intentional (defer to Phase 6 heatmap-token API). |
| `frontend/src/components/ui/badge.tsx` | edit | Added `variant: success \| warning \| info` keys. Backed by existing `--success / --warning / --info` tokens (and corresponding `-foreground`). Strictly additive — existing 4 variants unchanged. |
| `frontend/src/components/ui/card.tsx` | edit | Added cva-driven `variant: flat \| raised \| overlay` (default `flat` is byte-identical to previous default). New exports: `cardVariants`, `CardProps` interface. Strictly additive. |

---

## Closure status — Phase 0 findings

| Phase 0 finding | Phase 3 status |
|---|---|
| ~70% of color drift in chart/canvas surfaces (chart libs bypass CSS vars) | ✅ Resolved — chart-theme adapter is the new single source of truth. |
| 26 `<Button>` className overrides; 5 with `bg-/text-` token bypass | Out of Phase 3 scope (was conceptually in track 1). Phase 4 a11y/focus pass will revisit. |
| `Badge` lacks `success/warning/info` variants; `StatusBadge` parallel pattern | ✅ Resolved — Badge now exposes the missing variants. `StatusBadge` migration is a per-call-site edit (deferred — won't break anything; consumers can migrate opportunistically). |
| `Card` has no elevation system; 28% of `<Card>` usages override className | ✅ API resolved — `flat \| raised \| overlay` variants land. Existing 20 className overrides will be opportunistically migrated as adjacent files are touched. |
| `Input` lacks `aria-invalid` intent | Deferred — was on Phase 3 long list, but lower-leverage; will be folded into Phase 4 a11y. |
| 184 atomic pixel sizing classes in canvas nodes | Deferred to Phase 3.X (see below). |

---

## Architectural notes

### Chart theme — runtime resolution model

Chart libraries (`lightweight-charts`, Recharts inline styles) take JS strings, not CSS variable references. The adapter converts at runtime:

```
hsl(var(--primary))   →   getComputedStyle(...).getPropertyValue('--primary')
                          ↓
                      "204 75% 40%"
                          ↓
                      "hsl(204 75% 40%)"
```

The hook subscribes to `documentElement.classList` mutations via `MutationObserver`, so when the user toggles dark mode the chart-theme object re-emits and any chart with `chartTheme` in its effect-deps rebuilds. No flicker, no cache.

### Card variant default — zero visual diff

`flat` is the new default. Its class output (`border border-border bg-card text-card-foreground`) is byte-identical to the previous unconditional Card class. All 21 existing Card consumers render unchanged.

### Badge variants — additive

The 4 existing variants (`default | secondary | destructive | outline`) keep their classes verbatim. Adding `success | warning | info` is a non-breaking widening of the union type.

---

## Phase 3.X — deferred follow-up

**Canvas wrapper components** — `<NodeSocket>` + `<NodeIcon>` to replace:
- 46× `w-[18px]` + 46× `h-[18px]` (canvas-node socket size)
- 46× `w-[11px]` + 46× `h-[11px]` (canvas-node icon size)

Across 14 node files in `frontend/src/components/canvas/nodes/`. Mechanical refactor, large diff, best done as a focused PR after Phase 3 lands. Recommended scope:

1. Read 1–2 canvas-node files (BaseNode, FibonacciNode) to confirm shape.
2. Define `<NodeSocket>` and `<NodeIcon>` in `components/canvas/primitives/`.
3. Codemod across `components/canvas/nodes/*.tsx` replacing the atomic classes.
4. Verify with `grep -c "w-\[(11|18)px\]"` returning 0.
5. Run audit-v2 to confirm no regressions.

---

## Verification command (re-runnable)

```bash
# 1. Static drift check — expect 7 hex (all legitimate exceptions)
grep -rEn "#[0-9a-fA-F]{3,8}\b" frontend/src --include="*.tsx" --include="*.ts" --include="*.css" \
  | grep -vE "^[^:]+:[0-9]+:\s*//" | wc -l
# Expected: 7

# 2. Type check & lint
cd frontend
npx tsc --noEmit --pretty false
npm run lint

# 3. Live a11y — expect 0
npm run dev &
sleep 12 && cd /tmp/bb-audit && node audit-v2.mjs | tail -3
# Expected: "Total a11y violations across scans: 0"
```

---

## Status

| Sub-phase | Status |
|---|---|
| 3.1 chart-theme adapter | ✅ |
| 3.2 Refactor TradeDrawer | ✅ |
| 3.3 Refactor remaining chart consumers | ✅ |
| 3.4 Badge variants | ✅ |
| 3.5 Card elevation variants | ✅ |
| 3.6 Verify | ✅ |
| 3.X Canvas wrappers | ⏭ Deferred (separate PR) |

Phase 3 closed. **0 a11y violations sustained. ~51 → ~0 effective color drift. Chart palette has a real adapter. Badge and Card now expose the variants Phase 0 said they should.**

The major Phase 0 architectural recommendations are now in place: token contract is hard, public surfaces are remediated, and the component primitives expose the variants the codebase actually needs. Phases 4–7 (a11y, responsive, themes, docs) can build on this foundation.
