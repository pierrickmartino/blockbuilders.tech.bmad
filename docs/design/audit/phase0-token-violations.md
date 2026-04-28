# Phase 0.1 — Token-Usage Report

**Date:** 2026-04-27
**Scope:** `frontend/src/**/*.{ts,tsx,css}`
**Goal:** Quantify drift away from the token contract (`globals.css` + `tailwind.config.ts`) so Phase 3 can drive it to zero.

---

## Headline numbers

| Category | Count | Notes |
|---|---:|---|
| Hex literals (`#abc`, `#aabbcc`) in source | **33** | Mostly chart/canvas color overrides. |
| Raw `hsl(N N% N%)` / `rgb(N,...)` with literal numbers | **13** | Excludes the canonical `hsl(var(--x))` pattern. |
| Tailwind arbitrary **color** classes (`bg-[#…]`, `text-[#…]`, …) | **5** | 4 in non-`text-` props + 1 `text-[#…]`. |
| **Color-token violations total** | **51** | Tractable. Was reported as 327 — that figure conflated typography. |
| Tailwind arbitrary **typography** classes (`text-[Npx]`, `text-[Nrem]`) | **90** | Phase 0.3 territory; not color drift. |
| Tailwind arbitrary **spacing/size** classes (`p-[…]`, `gap-[…]`, `w-[…]`, …) | **130** | Phase 0.3 territory. |

> **Correction vs prior audit:** the 327 figure mixed color, typography, and spacing arbitrary values. Real color-token drift is ~51. The other 220 are scale drift, audited separately in Phase 0.3.

---

## Color-token violations by file

### Hex literals (33)

| File | Count |
|---|---:|
| `components/TradeDrawer.tsx` | 18 |
| `components/canvas/CanvasMinimap.tsx` | 6 |
| `app/login/page.tsx` | 4 |
| `components/canvas/StrategyCanvas.tsx` | 3 |
| `app/globals.css` | 1 |
| `app/(app)/strategies/[id]/backtest/page.tsx` | 1 |

**Pattern:** `TradeDrawer` and `CanvasMinimap` hardcode chart palettes per theme:
```tsx
background: { color: isDark ? "#030712" : "#ffffff" },
upColor: "#22c55e",
downColor: "#ef4444",
```
This is third-party chart lib (lightweight-charts) that doesn't read CSS vars. **Cannot be fixed by classname rewrite.** Need a `getChartTheme(isDark)` helper that reads tokens via `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')` or pre-computes from a TS-side palette mirror.

### Raw `hsl(N…)`/`rgb(N…)` (13)

| File | Count |
|---|---:|
| `app/globals.css` | 6 |
| `components/backtest/DistributionRow.tsx` | 3 |
| `app/(app)/strategies/[id]/backtest/page.tsx` | 3 |
| `components/canvas/CanvasMinimap.tsx` | 1 |

`globals.css` hits are the radial-gradient definitions (`hsla(204 65% 57% / 0.06)`) — the same dark-mode-invisible gradients flagged in the live audit.

Inline JS hits are chart styling: `rgba(148, 163, 184, 0.08)` for axis backgrounds. Same root cause as hex literals: chart lib bypasses Tailwind/CSS-var layer.

### Arbitrary Tailwind color classes (5)

5 instances total — small enough to enumerate inline once Phase 3 starts.

---

## Worst-offender files (top 5, all categories combined)

| File | Hex | Raw hsl/rgb | TW arbitrary color | Sum |
|---|---:|---:|---:|---:|
| `components/TradeDrawer.tsx` | 18 | 0 | 0 | 18 |
| `components/canvas/CanvasMinimap.tsx` | 6 | 1 | 1 | 8 |
| `app/login/page.tsx` | 4 | 0 | 0 | 4 |
| `app/(app)/strategies/[id]/backtest/page.tsx` | 1 | 3 | 0 | 4 |
| `components/canvas/StrategyCanvas.tsx` | 3 | 0 | 0 | 3 |

**Implication for Phase 3:**
- ~70% of color drift lives in **chart and canvas surfaces** that consume third-party libs not aware of CSS variables.
- The fix isn't a codemod — it's a **chart-theme adapter** (`lib/chart-theme.ts`) that re-emits tokens as JS values, plus a `useChartTheme()` hook tied to the `dark` class.
- The remaining ~30% (`login/page.tsx`, etc.) IS codemod-able.

---

## Recommended Phase 3 split

1. **Codemod track** (mechanical, ~15 violations): replace `bg-[#…]`, `text-[#…]`, hardcoded `hsl(N…)` in TSX with token classes.
2. **Chart-theme track** (architectural, ~36 violations): introduce `lib/chart-theme.ts` that exports a typed object keyed off resolved CSS vars, and refactor `TradeDrawer`, `CanvasMinimap`, `StrategyCanvas`, `DistributionRow`, backtest page chart blocks to consume it.
3. **`globals.css` cleanup** (6 violations): remove or justify the dark-invisible radial gradient — already flagged by live audit.

---

## Verification target for Phase 3

```bash
# Color-token violations: must return 0
grep -rEn "#[0-9a-fA-F]{3,8}\b" frontend/src --include="*.tsx" --include="*.ts" \
  | grep -vE "^[^:]+:[0-9]+:\s*//"

grep -rEn '\b(hsl|hsla|rgb|rgba|oklch)\(\s*[0-9]' frontend/src \
  --include="*.tsx" --include="*.ts" --include="*.css"

grep -rEn '\b(bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|placeholder|caret|accent)-\[(#|rgb|hsl|oklch)' \
  frontend/src --include="*.tsx" --include="*.ts"
```

Acceptable exceptions (whitelist):
- `globals.css` token definitions (HSL triplets in custom properties).
- Chart theme adapter file once introduced — single source of truth.
