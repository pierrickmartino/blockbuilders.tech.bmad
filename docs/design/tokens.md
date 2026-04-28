# Design Tokens — Reference & Usage Rules

**Runtime source of truth:** `frontend/src/app/globals.css`
**Tailwind exposure:** `frontend/tailwind.config.ts`
**Brand philosophy:** `docs/design_concept.json`
**Machine-readable mirror:** `docs/design-system.json` (TODO: reconcile with `globals.css` — Phase 1 left this open).

> **Rule of thumb:** every color decision goes through a token. If you find yourself reaching for `bg-[#…]`, `text-[…]`, `hsl(N N% N%)`, or any literal hex/rgb in a component, it's a violation. The only legitimate place to define a literal color value is `globals.css`.

---

## Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `0 0% 100%` | `240 8% 5%` | Page body. |
| `--foreground` | `0 0% 4%` | `240 5% 92%` | Default text on `--background`. |
| `--surface-base` | `0 0% 100%` | `240 8% 5%` | Alias of `--background`. Use when you need to communicate "page surface" intent. |
| `--surface-elevated` | `220 14% 96%` | `240 6% 9%` | Cards, panels, raised regions. **Today:** `--card` is still aliased to `--background` — Phase 3 will switch `Card` to consume this token. |
| `--surface-overlay` | `0 0% 100%` | `240 4% 11%` | Modals, popovers, dropdowns. Mirrors existing `--popover`. |
| `--card` / `--card-foreground` | `0 0% 100%` / `0 0% 4%` | `240 8% 5%` / `240 5% 92%` | Card surface. **Same as `--background` today** — Phase 3 may switch to `--surface-elevated`. |
| `--popover` / `--popover-foreground` | `0 0% 100%` / `0 0% 4%` | `240 4% 9%` / `240 5% 92%` | Popover surface. |

**Rule:** use the `surface-*` aliases when writing **new** components. Existing components consume `--card` / `--popover`; Phase 3 reconciles.

---

## Brand / action

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `204 75% 40%` | `204 76% 63%` | Primary CTA backgrounds, primary links. **Light value chosen for ≥4.5:1 contrast vs white** (WCAG 2.2 AA). |
| `--primary-foreground` | `0 0% 100%` | `240 8% 5%` | Text on primary backgrounds. |
| `--info` | `204 75% 40%` | `204 76% 63%` | Informational accents. Currently aliased to `--primary` — Phase 6 may diverge. |
| `--info-foreground` | `0 0% 100%` | `240 8% 5%` | Text on info backgrounds. |
| `--info-soft` | `204 80% 95%` | `204 60% 14%` | Tinted background for info banners/chips. |

**Rule:** never use `--primary` for non-interactive surfaces (e.g., decorative tints). For status banners, use the `*-soft` family.

---

## Neutral text & surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--secondary` / `--secondary-foreground` | `220 23% 97%` / `0 0% 4%` | `240 4% 9%` / `240 5% 92%` | Secondary buttons, mild emphasis surfaces. |
| `--muted` / `--muted-foreground` | `220 23% 97%` / `0 0% 40%` | `240 4% 9%` / `240 3% 62%` | Muted surfaces; secondary body text. |
| `--text-subtle` (Tailwind: `subtle`) | `0 0% 45%` | `240 3% 55%` | Tertiary metadata that should fade into the background but remain readable. |
| `--accent` / `--accent-foreground` | `220 23% 97%` / `0 0% 4%` | `240 4% 9%` / `240 5% 92%` | Hover/active surface for interactive elements. |

**Known aliasing — to be addressed in Phase 6:** `--secondary`, `--muted`, and `--accent` resolve to identical values today. Hover-on-secondary states are therefore invisible. Phase 6 will either differentiate or collapse this triple.

---

## State

| Token | Light | Dark | Use |
|---|---|---|---|
| `--destructive` / `-foreground` | `0 72% 51%` / `0 0% 100%` | `0 84% 60%` / `240 5% 92%` | Destructive CTAs, error backgrounds. |
| `--destructive-soft` (Tailwind: `destructive-soft`) | `0 84% 96%` | `0 55% 14%` | Tinted error banner background. |
| `--success` / `-foreground` | `142 76% 36%` / `0 0% 100%` | `142 71% 45%` / `240 8% 5%` | Success badges, success CTAs. |
| `--success-soft` (Tailwind: `success-soft`) | `142 70% 94%` | `142 50% 12%` | Tinted success banner background. |
| `--warning` / `-foreground` | `38 92% 50%` / `0 0% 100%` | `43 96% 56%` / `240 8% 5%` | Warning badges. |
| `--warning-soft` (Tailwind: `warning-soft`) | `38 92% 94%` | `38 60% 14%` | Tinted warning banner background. |

**Rule:** never `bg-destructive/10` to fake a soft surface — use `bg-destructive-soft` so a future palette change tracks.

---

## Borders, input, focus

| Token | Light | Dark | Use |
|---|---|---|---|
| `--border` | `210 13% 94%` | `240 5% 17%` | Default border. |
| `--input` | `210 13% 94%` | `240 5% 17%` | Input field border. |
| `--ring` | `204 75% 40%` | `204 76% 63%` | Generic ring color (cards, sidebar selection). |
| `--focus-ring` (Tailwind: `focus-ring`) | `204 75% 40%` | `204 76% 63%` | **Dedicated** focus indicator. Currently matches `--ring` but is a separate token so a11y can tune it independently. **Use `ring-focus-ring focus-visible:ring-1` going forward**, not `ring-ring`. |

**Phase 4 note:** if any focus-visible state fails ≥3:1 contrast vs adjacent surfaces, change `--focus-ring` only — it must not affect primary buttons or charts.

---

## Charts

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--chart-1` | `204 75% 40%` | `204 76% 63%` | Aliased to `--primary` — first series. |
| `--chart-2` | `142 76% 36%` | `142 71% 45%` | Green. |
| `--chart-3` | `38 92% 50%` | `43 96% 56%` | Amber. |
| `--chart-4` | `204 66% 72%` | `204 51% 21%` | Light blue (sibling of chart-1). |
| `--chart-5` | `0 72% 51%` | `0 84% 60%` | Red — **also aliased to `--destructive`**. Phase 6 may split. |

**Color-blind safety**: chart-2 (green) and chart-5 (red) collapse under protanopia/deuteranopia. Phase 6 must add icon/shape encoding for any chart relying on color alone.

---

## Sidebar

Sidebar tokens mirror the global palette but allow the navigation chrome to evolve independently:

| Token | Aliased to today |
|---|---|
| `--sidebar-background` | `--secondary` (light) / `--popover` (dark) |
| `--sidebar-foreground` | `--foreground` |
| `--sidebar-primary` | `--primary` |
| `--sidebar-accent` | `--border` (light) / `--border` (dark) |
| `--sidebar-border` | `--border` |
| `--sidebar-ring` | `--ring` |

**Rule:** never reach into sidebar tokens from outside the sidebar. They exist to let the chrome diverge.

---

## Radius & shape

| Token | Value |
|---|---|
| `--radius` | `0.5rem` |
| Tailwind `rounded-sm` | `calc(var(--radius) - 4px)` |
| Tailwind `rounded-md` | `calc(var(--radius) - 2px)` |
| Tailwind `rounded-lg` | `var(--radius)` |

---

## Tailwind class cheatsheet (post-Phase-1)

```tsx
// Surfaces
<div className="bg-surface-base">         // page
<div className="bg-surface-elevated">     // raised card (Phase 3)
<div className="bg-surface-overlay">      // modal/popover

// Text
<p className="text-foreground">           // default
<p className="text-muted-foreground">     // secondary
<p className="text-subtle">               // tertiary metadata

// Status banners
<div className="bg-success-soft text-success">     // ✓ correct
<div className="bg-success/10 text-success">       // ✗ avoid — won't track palette changes

// Focus
<button className="focus-visible:ring-2 focus-visible:ring-focus-ring">  // ✓ correct
<button className="focus-visible:ring-2 focus-visible:ring-ring">        // ⚠ legacy — works but blocks future a11y tuning
```

---

## What changed in Phase 1

| Change | Reason |
|---|---|
| `--primary` light: `204 65% 57%` → `204 75% 40%` | Resolves 47 axe `color-contrast` violations across all light-mode routes. |
| Added `--surface-base` / `-elevated` / `-overlay` | Establishes a 3-tier elevation system (consumed in Phase 3). |
| Added `--text-subtle` (Tailwind: `subtle`) | Decouples tertiary metadata from `--muted-foreground`. |
| Added `--success-soft` / `-warning-soft` / `-destructive-soft` / `-info-soft` | Replaces ad-hoc `bg-{state}/10` hand-rolling. |
| Added `--focus-ring` (Tailwind: `focus-ring`) | Decouples focus indicator from `--primary` so a11y can tune independently. |
| `--chart-1`, `--ring`, `--info`, `--sidebar-primary`, `--sidebar-ring` matched to new `--primary` | Preserves visual cohesion while the system stays aliased. Phase 6 may diverge. |
| Removed body radial gradients (light + dark) | Below perceptible contrast; violates `design_concept.json` ("no decorative gradients"). |
| `react-flow__background circle` `#2A2A2E` → `hsl(var(--border))` | Tracks the border token instead of drifting independently. |

## What's deferred

- `.text-gradient-primary` utility — kept for Phase 2 home-hero rewrite.
- Reconciling `docs/design-system.json` with `globals.css` — pick one authoritative source.
- Aliasing decisions on `--secondary`/`--muted`/`--accent` and `--destructive`/`--chart-5` — Phase 6.
- Card/Input variant adoption of new surface and soft tokens — Phase 3.
