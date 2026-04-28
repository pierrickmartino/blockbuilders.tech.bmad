# Phase 0.4 — Theme Parity Check

**Date:** 2026-04-27
**Scope:** `frontend/src/app/globals.css` — every CSS custom property in `:root` (light) vs `.dark`.
**Goal:** Find missing dark counterparts, decorative-only tokens, and **token aliasing** (multiple names pointing at the same value, which signals a missing semantic distinction).

> Cross-reference: `docs/design_concept.json` and `docs/design-system.json` are the canonical token sources per `frontend/CLAUDE.md`. This audit captures what's actually shipped in `globals.css`; Phase 1 should reconcile both sides.

---

## Parity check — light vs dark

All semantic tokens defined in `:root` have a `.dark` counterpart. ✅
Non-color tokens (`--radius`) are correctly defined once. ✅

**No missing tokens.** Parity is structurally clean. The problems are elsewhere.

---

## Aliasing — multiple tokens, one value

This is where the design system **says less than it pretends to.**

### Cluster A — "brand blue" (6 tokens, 1 value)

In **light** mode, six tokens resolve to `204 65% 57%`:
- `--primary`
- `--info`
- `--ring`
- `--chart-1`
- `--sidebar-primary`
- `--sidebar-ring`

In **dark** mode, the same six tokens resolve to `204 76% 63%`.

**Implication:** the design system has no semantic distinction between "primary action", "informational", "focus ring", "first chart series", and "sidebar accent". When Phase 4 needs to make the focus ring high-contrast (WCAG 2.2 AA requires 3:1 against adjacent surfaces), changing `--ring` will silently alter primary-button color, info badges, the first chart line, and sidebar branding. **`--ring` must split off into its own token** (`--focus-ring`) before any a11y work.

### Cluster B — "soft surface" (3 tokens, 1 value)

In **light**: `--secondary`, `--muted`, `--accent` all = `220 23% 97%`.
In **dark**: all three = `240 4% 9%`.

**Implication:** `hover:bg-accent` does nothing on a `bg-secondary` parent — they're the same surface. This is why hover/active states feel undesigned (live-audit complaint). Either:
- **Differentiate** (`--accent` = secondary + 3% lightness) so hovers are perceptible, or
- **Collapse** to one token and document the simplification.

### Cluster C — "destructive / chart-5" (2 tokens, 1 value)

`--destructive` = `--chart-5`. Means a chart series colored "danger" red is indistinguishable from an actual error indicator. For a backtest UI where red = drawdown but red also = error, this is a perception risk. Phase 6 should pick one of:
- Move `--chart-5` to a different hue.
- Document that drawdown red and error red are intentionally identical.

### Cluster D — "border family" (4 tokens, 1 value)

In **light**: `--border`, `--input`, `--sidebar-accent`, `--sidebar-border` all = `210 13% 94%`.

**Implication:** "input border" and "sidebar accent" are the same color, which means an input dropped into the sidebar disappears. Likely fine in practice (no inputs in sidebar), but flag it.

### Cluster E — "neutral text" (multiple `*-foreground` tokens, 1 value)

Many `-foreground` tokens collapse to either `0 0% 4%` (light text on dark) or `240 5% 92%` (dark text on light). Acceptable.

---

## Decorative tokens flagged for removal/justification

### Body radial gradients (lines 95–103 in `globals.css`)

```css
/* light */
radial-gradient(ellipse 80% 50% at 50% -20%, hsl(204 65% 57% / 0.04), transparent),
radial-gradient(ellipse 60% 40% at 80% 50%, hsl(204 66% 82% / 0.03), transparent);

/* dark */
radial-gradient(ellipse 80% 50% at 50% -20%, hsl(204 76% 63% / 0.06), transparent),
radial-gradient(ellipse 60% 40% at 80% 50%, hsl(204 51% 21% / 0.08), transparent);
```

- Already flagged in live audit as **mathematically invisible** in dark mode.
- `docs/design_concept.json` explicitly says **"no decorative gradients"**.
- **Phase 1 decision:** delete. Saves a parse + paint cost per page for zero perceptible benefit and aligns with the brand voice.

### `.text-gradient-primary` utility (lines 129–135)

```css
background-image: linear-gradient(135deg, hsl(204 65% 57%), hsl(204 66% 82%));
```

- Used by the home hero on the word "visually" — flagged in live audit as the most identifiable AI-template tell.
- **Phase 2 decision:** remove the utility (or at minimum stop applying it on the hero).

### React Flow dark-mode hex override (line 109)

```css
.dark .react-flow__background circle { fill: #2A2A2E !important; }
```

- One of the 1 hex hits in `globals.css`.
- This is the canvas dot pattern. The hex equivalent of `--border` in dark would be ~`#2B2B30`. **Phase 1 fix:** rewrite as `fill: hsl(var(--border)) !important;` to track the token.

---

## Missing semantic tokens (Phase 1 additions)

Audit + variant matrix together imply the following gaps:

| Token | Purpose | Why needed |
|---|---|---|
| `--focus-ring` | Dedicated focus ring color | Decouple from `--primary`/`--ring` so a11y can raise contrast independently. |
| `--surface-base` | Page background | Currently `--background`. Rename for clarity. |
| `--surface-elevated` | Card on page | **Currently identical to `--background`.** Need a real elevation step (e.g., page = `0 0% 100%`, elevated = `220 14% 99%` in light; page = `240 8% 5%`, elevated = `240 6% 8%` in dark). |
| `--surface-overlay` | Modal/popover surface | Already exists as `--popover`; consolidate naming. |
| `--success-soft` / `--warning-soft` / `--destructive-soft` | Tinted backgrounds for status surfaces | Currently hand-rolled (`bg-destructive/10`, etc.) at call sites. |
| `--text-subtle` | One step softer than `--muted-foreground` | `--muted-foreground` is too strong for tertiary metadata. |

---

## Chart palette — color-blind safety

Light-mode chart palette:
- `--chart-1` 204 65% 57% (blue)
- `--chart-2` 142 76% 36% (green)
- `--chart-3` 38 92% 50% (amber)
- `--chart-4` 204 66% 82% (light blue)
- `--chart-5` 0 72% 51% (red)

**Issues:**
- `chart-1` and `chart-4` are the same hue (blue) at different lightness — readable, but they collapse under deuteranopia simulation against `chart-2`.
- `chart-2` (green) vs `chart-5` (red) — classic red/green confusion under protanopia/deuteranopia. **Phase 6** should add either icon/shape encoding or a documented color-blind override palette.

---

## Phase 1 deliverables derived from this audit

1. Split `--ring` into `--focus-ring` with a token value chosen for ≥3:1 contrast against both `--background` and `--card`.
2. Introduce 3-tier surface elevation: `--surface-base`, `--surface-elevated`, `--surface-overlay`.
3. Add soft state tokens: `--success-soft`, `--warning-soft`, `--destructive-soft`.
4. Add `--text-subtle`.
5. Delete the body radial gradients (light + dark) per brand voice.
6. Decide fate of `.text-gradient-primary` utility (recommend remove).
7. Replace the React Flow `#2A2A2E` literal with `hsl(var(--border))`.
8. Reconcile `globals.css` with `docs/design-system.json` — pick one as authoritative and generate the other.
