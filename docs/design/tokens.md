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
| `--text-subtle` (Tailwind: `subtle`) | `0 0% 38%` | `240 3% 55%` | Tertiary metadata that should fade into the background but remain readable. **Light value tightened in Phase 2** to ≥6:1 vs white after axe flagged the original `45%` gray as borderline. |
| `--accent` / `--accent-foreground` | `220 14% 93%` / `0 0% 4%` | `240 4% 13%` / `240 5% 92%` | Hover/active surface for interactive elements. **Phase 6.1: differentiated from `--secondary`/`--muted` by ~4% lightness so `bg-secondary hover:bg-accent` produces perceptible feedback.** |

**Phase 6.1 resolution:** `--accent` is now distinct from `--secondary`/`--muted` (which remain aliased to each other — they serve compatible roles: mild emphasis surface and muted text container). Hover-on-secondary is now visible without diverging from the neutral palette.

---

## State

| Token | Light | Dark | Use |
|---|---|---|---|
| `--destructive` / `-foreground` | `0 72% 51%` / `0 0% 100%` | `0 84% 60%` / `240 5% 92%` | Destructive CTAs, error backgrounds. |
| `--destructive-soft` (Tailwind: `destructive-soft`) | `0 84% 96%` | `0 55% 14%` | Tinted error banner background. |
| `--success` / `-foreground` | `142 76% 36%` / `0 0% 4%` | `142 71% 45%` / `240 8% 5%` | Success badges, success CTAs. **Light-theme foreground darkened in Phase 4** for AA contrast on the green bg. |
| `--success-soft` (Tailwind: `success-soft`) | `142 70% 94%` | `142 50% 12%` | Tinted success banner background. |
| `--warning` / `-foreground` | `38 92% 50%` / `0 0% 4%` | `43 96% 56%` / `240 8% 5%` | Warning badges. **Light-theme foreground darkened in Phase 4** — white on amber failed all WCAG thresholds. |
| `--warning-soft` (Tailwind: `warning-soft`) | `38 92% 94%` | `38 60% 14%` | Tinted warning banner background. |

**Rule:** never `bg-destructive/10` to fake a soft surface — use `bg-destructive-soft` so a future palette change tracks.

**Rule (Phase 4):** for inline body text inside a soft state surface, use `text-foreground`, not `text-{state}`. The state hue communicates intent via the bg + an optional colored heading; the body must keep AA-normal contrast against the soft tint. See `docs/design/audit/phase4-contrast-matrix.md` for the contrast pairs that fail under the old pattern.

**Rule (Phase 4):** solid state buttons/badges (`bg-{state}` + `text-{state}-foreground`) reach AA-large (≥3:1) but not always AA-normal (≥4.5:1). They are appropriate only at button/badge typography (≥14pt bold or ≥18pt regular). Don't use them for body text.

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
| `--chart-5` | `0 72% 51%` | `0 84% 60%` | Red — **deliberately aliased to `--destructive`**. See aliasing note below. |

**Phase 6.3 — `--destructive` ↔ `--chart-5` aliasing decision:** the alias is **kept by design**. Rationale:

- Both communicate the same semantic — *negative outcome* (loss in a P/L chart, error in a banner, destructive action on a button). Splitting would let the two drift and create a credibility gap when an "error" red and a "loss" red sit on the same screen.
- A single token also means Phase 4's contrast tightening propagates to the chart palette without a second migration.
- If a future need arises (e.g., a "muted loss" series next to a strong "error" red), introduce a new token (e.g., `--chart-loss`) rather than splitting the alias — the alias is the cheap default; deviation should be explicit.

**Color-blind safety (binding rule):** under deuteranopia/protanopia (~8% of male users), `--chart-2` (green) and `--chart-5`/`--destructive` (red) collapse to near-identical yellow-browns. Any chart, badge, or status indicator that uses red/green alone to convey meaning is **inaccessible**.

Required encoding patterns:

| Surface | Required redundancy |
|---|---|
| P/L charts (TradeDrawer, equity curve, distribution) | Color **+** sign of value (`+`/`-` prefix) **+** position relative to zero baseline. |
| Status badges (success/destructive) | Color **+** icon (e.g., `<CheckCircle/>` / `<AlertTriangle/>`) **+** text label. |
| Trade markers on candles | Color **+** marker shape (▲ buy / ▼ sell). |
| Heatmap intensity | Color **+** numeric label inside the cell at the values that matter. |
| Connection edges in canvas | Color (when used) **+** stroke style (solid for valid, dashed for warning). |

Code review must reject any single-channel red/green meaning on a primary surface.

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

// Status banners (body text uses text-foreground for AA contrast — Phase 4 rule)
<div className="bg-success-soft text-foreground">  // ✓ correct
<div className="bg-success/10 text-success">       // ✗ avoid — won't track palette changes
<div className="bg-success-soft text-success">     // ⚠ AA-large only; OK for headings, not body

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

## What changed in Phase 6

| Change | Reason |
|---|---|
| `--accent` light: `220 23% 97%` → `220 14% 93%`; dark: `240 4% 9%` → `240 4% 13%` | Differentiates from `--secondary`/`--muted` so `hover:bg-accent` on secondary surfaces is perceptible. |
| Removed `.text-gradient-primary` utility from `globals.css` | All consumers eliminated in Phase 2; dead code. |
| Documented `--destructive` ↔ `--chart-5` alias as deliberate | Single token tracks negative-outcome semantics across surfaces; future divergence requires a new token, not a split. |
| Codified color-blind safety encoding rules (above) | Red/green collapse under deuteranopia/protanopia — single-channel meaning is inaccessible. |

## What's deferred

- Reconciling `docs/design-system.json` with `globals.css` — pick one authoritative source.
- Card/Input variant adoption of new surface and soft tokens — Phase 3 shipped the API; per-call-site migration is opportunistic.
- Canvas wrapper components (`<NodeSocket>`, `<NodeIcon>`) replacing 184 atomic size classes — Phase 3.X (separate PR).
