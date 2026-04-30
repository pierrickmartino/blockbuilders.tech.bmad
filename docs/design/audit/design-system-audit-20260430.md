# Design System Audit — Blockbuilders Frontend

**Branch:** `design-system/signal-theme-rethink`
**Date:** 2026-04-30
**Baseline:** Post-Phase 6 (Phases 0–6 complete)
**Skills used:** `frontend-design`, `frontend-patterns`

---

## Baseline status (inherited from Phases 0–6)

| Metric | Status |
|---|---|
| TypeScript errors | ✅ 0 |
| ESLint errors | ✅ 0 (19 pre-existing warnings in chart-theme.ts) |
| Contrast matrix FAIL rows | ✅ 0 (89 pairs) |
| Live a11y violations | ✅ 0 (180 captures, Phase 5) |
| Horizontal overflow | ✅ 0 (180 captures, Phase 5) |

---

## 1. Styling Architecture

**Stack:**
- Tailwind CSS v3 + `tailwindcss-animate` plugin
- shadcn/ui primitive layer (`src/components/ui/`) — 18 components + Storybook stories
- CSS custom properties in `globals.css` (`@layer base`) — single runtime token source of truth
- `src/lib/chart-theme.ts` — JS adapter that reads CSS vars at runtime for third-party chart libs
- No MUI, no CSS Modules, no styled-components

**Token flow:**
```
globals.css (:root / .dark)
  → tailwind.config.ts (hsl(var(--token)) mappings)
    → component className strings
    → chart-theme.ts (getComputedStyle() at runtime)
```

### Duplicated / overlapping tokens

| Issue | Detail | Severity |
|---|---|---|
| `--info` ≡ `--primary` | Both resolve to `204 75% 40%` (light) / `204 76% 63%` (dark). Undocumented alias. | **High** |
| `--ring` ≡ `--focus-ring` ≡ `--primary` | Three names, one value. `--focus-ring` exists to be independently tunable; currently it isn't. | Medium |
| `--secondary` ≡ `--muted` | Intentionally aliased (documented Phase 6.1). | ✅ Intentional |
| `--chart-5` ≡ `--destructive` | Intentionally aliased (documented Phase 6.3). | ✅ Intentional |
| `--sidebar-border` ≡ `--border` | Same value both modes; no unique sidebar border token. | Low |
| `--surface-base` ≡ `--background` | Same value both modes. | Low |
| `--surface-overlay` ≡ `--background` | Same in light mode only. | Low |

### Missing token categories

| Category | Gap | Impact |
|---|---|---|
| **Shadows** | Zero CSS vars for elevation. `shadow-sm / shadow-md` are raw Tailwind defaults — no `--shadow-*` token. | Any brand elevation change requires hunting all shadow callsites. |
| **Z-index** | No `--z-*` tokens. Tailwind named levels (`z-10 / z-20 / z-30 / z-50`) used consistently — no conflicts, but no semantic names. | Low risk today; becomes painful at scale. |
| **Motion / easing** | No `--duration-*` or `--ease-*` tokens. `tailwindcss-animate` defaults + ~30 inline `duration-150 / duration-200` sprinkled through pages. | Inconsistent motion rhythm; can't change brand timing globally. |
| **Breakpoints** | Default Tailwind only (`sm/640 md/768 lg/1024 xl/1280 2xl/1536`). No custom breakpoints. | Acceptable given responsive doc exists. |

---

## 2. Design Tokens

### Colors

- **Defined:** 52 CSS vars across background, foreground, 3 surface tiers, primary+fg, secondary+fg, muted+fg, accent+fg, destructive+fg+soft, success+fg+soft, warning+fg+soft, info+fg+soft, border, input, ring, focus-ring, chart-1..5, sidebar group
- **Gap:** `--info` and `--primary` carry identical computed values — semantically separate roles (informational vs. action), visually indistinct. In a financial app, an info banner and a primary CTA should never be the same color.
- **Gap:** No `--text-*` scale beyond `--text-subtle`. Text hierarchy (`font-bold / font-semibold / font-medium`) is scattered inline.

### Typography

- **Fonts:** IBM Plex Sans (`--font-sans`) + IBM Plex Mono (`--font-mono`) — CSS vars wired into tailwind config
- **Scale:** Default Tailwind type scale — no custom CSS var scale
- **Utilities:** `.tabular-nums`, `.data-text` (mono + tabular + tracking-tight) defined in `globals.css`
- **Gap:** No explicit line-height tokens; heading weight choices are ad-hoc per page.

### Spacing

- Base: Tailwind 4px default scale
- Custom: `--space-section: clamp(3rem, 2.4rem + 3vw, 6rem)` → `py-section`; `--space-section-tight` → `py-section-tight`
- **Gap:** Only two named spacing tokens. All in-page spacing is raw Tailwind (`p-4 p-6 gap-2 gap-4 space-y-4`).

### Border Radius

- `--radius: 0.5rem` → `rounded-lg / rounded-md / rounded-sm` via tailwind config
- **Debt:** 26 occurrences of `"rounded-md"`, `"rounded-full"`, `"rounded-lg"` as raw class strings in `(app)/` pages — these don't scale with `--radius`.

### Shadows

- **None defined.** Tailwind defaults (`shadow-sm / shadow-md / shadow-lg`) used ad-hoc. No token.

### Z-Index

- **None defined as tokens.** Tailwind named scale used consistently (`z-10 / z-20 / z-30 / z-50`). No `z-[xxx]` arbitrary values found — clean.

### Motion / Transitions

- `prefers-reduced-motion` handled globally in `globals.css` (neutralizes all to 0.01ms)
- `tailwindcss-animate` plugin provides `animate-*` utilities
- **Gap:** No design-token-level easing/duration vars. Pages use inline `transition-colors duration-150`, `transition-all duration-150` without a standard.

### Breakpoints

- Default Tailwind only. Responsive doc (`docs/design/responsive.md`) exists post-Phase 5.

---

## 3. Component Inventory

### shadcn/ui primitives (all with Storybook stories where marked)

| Component | Story | Notes |
|---|---|---|
| Badge | ✅ | Semantic color variants |
| Breadcrumb | — | Basic navigation |
| Button | ✅ | CVA variants; 150ms transitions; `focus-visible:ring-focus-ring` |
| Card | ✅ | Surface container |
| Checkbox | — | Radix-based; focus-visible ring |
| Dialog | ✅ | Modal; `z-50`; animated in/out |
| DropdownMenu | ✅ | Popover-style; `z-50`; animated |
| Input | ✅ | Single text input; ring on focus |
| Popover | — | Anchor-based; `z-50` |
| Select | ✅ | Radix Select; CVA variants |
| Separator | — | Divider primitive |
| Sheet | ✅ | Mobile drawer; `z-50`; `duration-200/500` |
| Sidebar | — | shadcn layout primitive; complex nested structure |
| Skeleton | ✅ | Placeholder loading state |
| Switch | — | Toggle; focus-visible ring |
| Table | ✅ | Responsive table structure |
| Tabs | ✅ | Tablist/content; `ring-offset-2` on focus |
| Tooltip | ✅ | `z-50`; primary bg |

### Feature components

| Category | Components |
|---|---|
| Navigation / Shell | `app-sidebar.tsx`, `site-header.tsx`, `StrategyTabs.tsx` |
| Canvas | `BaseNode`, `StrategyCanvas`, `SmartCanvas`, `CanvasMinimap`, `BlockPalette`, `BlockLibrarySheet`, `HealthBar`, `InlinePopover`, `InspectorPanel`, `ParameterForm`, `MobileBottomBar`, `edges/*`, `nodes/*` (25+ node types) |
| Backtest | `DistributionRow`, `DrawdownSection`, `KPIStrip`, `PageHeader`, `PositionAnalysisCard`, `RunConfig`, `StatusBadge`, `TradesSection` |
| Modals / Drawers | `TradeDrawer`, `ShareBacktestModal`, `KeyboardShortcutsModal`, `AllRunsDrawer` |
| Feedback / State | `ConsentBanner`, `LowTradeCountWarning`, `NarrativeCard`, `WhatYouLearnedCard`, `DataAvailabilitySection`, `DataCompletenessTimeline` |
| Data vis | `SentimentGauge`, `SentimentSparkline`, `MarketSentimentPanel`, `ZoomableChart`, `TradeExplanation`, `TransactionCostAnalysis` |
| Utility | `InfoIcon`, `NotificationBell`, `PostHogBootstrap` |

### Missing as formal components (inline in page files)

| Pattern | Current location | Impact |
|---|---|---|
| Empty state | Inline in `dashboard`, `strategies`, `market` pages | Duplicated markup; no design consistency guaranteed |
| Error fallback | Inline in multiple pages | No standard error presentation |
| Loading card | `Skeleton` primitive exists; no composed variant | Inconsistent loading states across surfaces |
| Toast / notification | Not found in component inventory; likely via layout | Unknown — needs locate |

---

## 4. UX & Accessibility Issues

### Contrast

- ✅ 0 FAIL rows in Phase 6 contrast matrix (89 pairs)
- ⚠️ `--info` = `--primary` — semantic split between informational and primary action is visually invisible

### Focus States

- ✅ Consistent `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring` across most interactive elements
- ⚠️ **Inconsistency:** `profile-settings-section.tsx:167` uses `ring-2 ring-offset-2` (double width, with 2px offset) while the rest of the app uses `ring-1` no offset. Renders differently on the profile page.
- ⚠️ Canvas interactive elements (node handles, minimap controls) — focus visibility not confirmed. Canvas components bypass shadcn.

### Keyboard Navigation

- ✅ shadcn/ui primitives handle keyboard navigation natively (Radix UI)
- ⚠️ Custom canvas interactions (drag-connect, inline popover, block palette) — no evidence of keyboard nav implementation in `BlockPalette`, `InlinePopover`, `InspectorPanel`
- ⚠️ `MobileBottomBar` — no keyboard nav audit found

### Semantic HTML

- ✅ Skip-to-content link on homepage (`sr-only focus:not-sr-only`)
- ✅ 110+ `aria-*` attributes across the codebase (`aria-busy` on async sections, `aria-live` regions, correct use of `aria-label` on icon buttons)
- ⚠️ Page-level landmark audit not confirmed — `<main>`, `<nav>`, `<aside>` usage consistency across `(app)/` pages is unknown

### ARIA

- ✅ shadcn/ui carries correct Radix-generated ARIA
- ⚠️ `StatusBadge` — ships icons; needs explicit `aria-label` on icon-only meaning per Phase 6.3 color-blind safety rule
- ⚠️ Canvas node connection handles — no ARIA role or label evidence

### Responsive

- ✅ `MobileBottomBar` for canvas on `<768px`
- ✅ `Sheet` for mobile parameter editing
- ⚠️ `strategies/[id]/page.tsx` (~1600 lines) — responsive logic is fully inline; no dedicated audit confirms completeness

---

## 5. Inconsistencies & Debt

### Hardcoded color violations

| Location | Violation | Fix |
|---|---|---|
| `strategies/[id]/backtest/page.tsx:219` | `"#ffffff"`, `"#166534"`, `"#991b1b"` in conditional text color logic. No dark-mode equivalent. Maps to `--primary-foreground`, `--success`, `--destructive`. | Replace with `hsl(var(--success))` etc.; extract `getCellColor()` helper. **P0.** |
| `lib/chart-theme.ts` — `CANVAS_CATEGORIES` | Static HSL literals for node type colors (input/indicator/logic/signal/risk). Documented as "Tailwind 600 mid-tones that work both themes" — intentional for now, but outside the token system. | Promote to CSS vars if brand colors ever change. **P3.** |
| `login/page.tsx` | Google OAuth SVG fills (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) | External brand colors — intentional. No action needed. |

### Hardcoded class strings (not via tokens)

| Type | Count | Files |
|---|---|---|
| Raw `"rounded-md"` / `"rounded-full"` / `"rounded-lg"` (not via `--radius`) | 26 | `(app)/` pages |
| Inline `duration-150 / duration-200 / duration-300` (no token) | ~30 | `(app)/` pages + canvas |
| Canvas atomic class callsites (`NodeSocket`, `NodeIcon`) | 184+ | `canvas/nodes/*` (deferred Phase 3.X) |

### Near-duplicate components (merge candidates)

| Pair | Rationale |
|---|---|
| `NarrativeCard` + `WhatYouLearnedCard` | Both render educational narrative text in a card; likely a single configurable component |
| `BacktestRunsList` + `AllRunsDrawer` | Both render lists of backtest runs; unclear if logic is shared |
| `DataAvailabilitySection` + `DataCompletenessTimeline` | Both display data quality signals |

### One-off styling patterns

| Location | Issue |
|---|---|
| `profile-settings-section.tsx:167` | Native `<input>` with manual ring styles instead of shadcn `Input` |
| Various `(app)/` pages | Local `cn(...)` button-like elements instead of `<Button variant="ghost">` |

### Files exceeding size threshold (800-line limit)

| File | Estimated lines | Problem |
|---|---|---|
| `strategies/[id]/page.tsx` | ~1600 | Well above limit; responsive logic, render, state all inline |
| `strategies/page.tsx` | ~800 | At limit |
| `canvas/StrategyCanvas.tsx` | Large | Multi-concern; canvas layout + event handling + state |

### Open deferred items (from Phase 6)

| Item | Status |
|---|---|
| `docs/design-system.json` ↔ `globals.css` reconciliation | ⏳ Deferred — product decision needed on which is authoritative |
| Canvas wrapper components `NodeSocket`, `NodeIcon` (184 atomic callsites) | ⏳ Phase 3.X — separate PR |

---

## 6. Prioritized Action Plan

### P0 — Token gaps (blocks future design work)

1. **Define `--info` independently from `--primary`**
   Both are `204 75% 40%` in light. Choose a distinct hue (e.g., sky `210 80% 45%`). Update `globals.css`, `docs/design/tokens.md`, contrast matrix.

2. **Fix `backtest/page.tsx:219` hardcoded hex colors**
   Replace `"#ffffff"`, `"#166534"`, `"#991b1b"` with `hsl(var(--primary-foreground))`, `hsl(var(--success))`, `hsl(var(--destructive))`. Extract `getCellColor()` helper for dark-mode safety.

3. **Define shadow tokens**
   Add `--shadow-sm / --shadow-md / --shadow-overlay` to `globals.css`; wire into tailwind config. Without these, elevation has no token basis and can't be themed.

### P1 — Structural debt (maintainability)

4. **Reconcile `docs/design-system.json` ↔ `globals.css`**
   Designate one as authoritative (recommend `globals.css` as runtime truth; auto-generate JSON from it). Eliminates silent drift.

5. **Extract `EmptyState`, `ErrorFallback`, `LoadingCard` components**
   Consolidate inline duplicates across dashboard, strategies, market pages into shared components under `src/components/ui/`.

6. **Fix `profile-settings-section.tsx`**
   Replace native `<input>` with shadcn `Input`. Fixes the `ring-2 ring-offset-2` focus inconsistency.

7. **Define motion tokens**
   Add `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--ease-default: cubic-bezier(0.16, 1, 0.3, 1)` to `globals.css`. Eliminate ~30 inline `duration-*` classes.

8. **Split `strategies/[id]/page.tsx`**
   ~1600 lines violates the 800-line file limit. Extract `StrategyHeader`, `StrategyRunBar`, `ConditionEditor` as sub-components.

### P2 — Accessibility

9. **Canvas keyboard navigation audit**
   `BlockPalette`, `InlinePopover`, `InspectorPanel` need keyboard nav. Canvas is the core product surface.

10. **`StatusBadge` aria audit**
    Confirm icon-only cells carry `aria-label` per Phase 6.3 color-blind safety rule.

11. **Landmark audit**
    Verify `<main>`, `<nav>`, `<aside>` in `(app)/layout.tsx` and key pages.

### P3 — Cosmetic consistency

12. **Replace 26 hardcoded `rounded-*` strings** in `(app)/` pages with `rounded-lg / rounded-md / rounded-sm` (which already map to `--radius`).

13. **Promote `CANVAS_CATEGORIES` to CSS vars** in `chart-theme.ts` so node type colors participate in the token system.

14. **Merge `NarrativeCard` / `WhatYouLearnedCard`** — single component, configurable title and content slot.

---

## Appendix — Component file inventory

### `src/components/ui/`
`badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `popover.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `tooltip.tsx`

### `src/app/(app)/` routes
`/dashboard`, `/strategies`, `/strategies/templates`, `/strategies/[id]`, `/strategies/[id]/backtest`, `/strategies/[id]/backtest/compare`, `/how-backtests-work`, `/strategy-guide`, `/metrics-glossary`, `/profile`, `/settings`, `/progress`, `/alerts`, `/market`, `/u/[handle]`

### Key cross-cutting files

| File | Role |
|---|---|
| `src/app/globals.css` | Token definitions — runtime source of truth |
| `tailwind.config.ts` | Token exposure to component layer |
| `src/lib/chart-theme.ts` | CSS var → JS color adapter for chart libs |
| `docs/design/tokens.md` | Token documentation and decision log |
| `docs/design-system.json` | Component specs (needs reconciliation with globals.css) |
| `docs/design_concept.json` | Brand philosophy reference |
