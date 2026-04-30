# Phase 0.2 — Component-Variant Matrix

**Date:** 2026-04-27
**Scope:** `frontend/src/components/ui/*` declared variants vs actual call-site usage in `frontend/src/**/*.tsx`.
**Goal:** Identify (a) variants declared but never used, (b) call sites bypassing variants via `className`, (c) primitives that lack a variant API but should have one.

---

## Button (`ui/button.tsx`)

**Declared:** `variant: default | destructive | outline | secondary | ghost | link` · `size: default | sm | lg | icon`

| Variant | Uses |
|---|---:|
| `outline` | 84 |
| `ghost` | 27 |
| `secondary` | 23 |
| `link` | 15 |
| `default` | 7 |
| `destructive` | 5 |

| Size | Uses |
|---|---:|
| `sm` | 72 |
| `icon` | 9 |
| `lg` | 5 |
| `default` (implicit) | rest |

**Findings**
- `default` (the canonical primary CTA) is used **only 7 times** — `outline` is 12× more common. The "primary" button is effectively a **secondary** action in this UI. Either the visual weight of `default` is wrong, or the primary CTA should be visually heavier so that 7 high-intent moments stand out from 84 outlines.
- **26 `<Button>` instances carry a `className` override**, of which **5 override `bg-` or `text-`** — direct token-contract violations. These are the source of the "two different primary blues" finding in the live audit. Phase 3 should enumerate and refactor these 5.
- Only 5 `size="lg"` hits — confirm intent or remove from the API.

---

## Badge (`ui/badge.tsx`)

**Declared:** `variant: default | secondary | destructive | outline`

**Findings**
- The recent commit `a26a179` introduced a `StatusBadge` component for backtest statuses. Its color logic lives outside `Badge`'s variant API.
- **Phase 3 candidate:** promote `StatusBadge` semantics into `Badge` variants (`success`, `warning`, `info`) backed by the existing `--success / --warning / --info` tokens (already defined in `globals.css`). Eliminates a parallel pattern.

---

## Card (`ui/card.tsx`)

**Declared:** No `cva` — no variants. Single `border bg-card` style.

**Usage**
- 71 `<Card>` instances; **20 with `className` overrides** (28%).
- Override patterns spotted in worst offenders: `bg-muted/50`, custom shadow, custom padding.

**Findings**
- Card has **no elevation system**. Every elevated/overlay variant is hand-rolled. Live audit flagged "no real layering" — this is the structural cause.
- **Phase 3 proposal:** introduce `Card` variants `flat | raised | overlay` keyed to a future `--surface-base / --surface-elevated / --surface-overlay` token tier (Phase 1).

---

## Sheet (`ui/sheet.tsx`)

**Declared:** `side: top | bottom | left | right` (default `right`).

**Findings**
- 10 usages — all sides used somewhere. No drift.
- Mobile-pattern audit (Phase 5): cross-check whether some `Dialog` instances should be `Sheet` below `md:` breakpoint per `web/patterns.md`.

---

## Other primitives — no `cva`, no declared variants

| Primitive | Usages | Has stories | Notes |
|---|---:|:-:|---|
| `card.tsx` | 71 | ✓ | See above. Needs variants. |
| `input.tsx` | many | ✓ | No `intent` for `aria-invalid` / error state. Hand-rolled at call sites. |
| `dialog.tsx` | 14 | ✓ | Single style. OK. |
| `tabs.tsx` | several | ✓ | Single style. OK. |
| `select.tsx` | several | ✓ | Single style. OK. |
| `dropdown-menu.tsx` | 14 | ✓ | Single style. OK. |
| `tooltip.tsx` | 17 | ✓ | Single style. OK. |
| `skeleton.tsx` | several | ✓ | Single style. OK. |
| `table.tsx` | several | ✓ | Single style. OK. |
| `popover.tsx` | 1 | ✗ | Underused — confirm intent. |
| `breadcrumb.tsx` | — | ✗ | Confirm where it's used. |
| `checkbox.tsx` | — | ✗ | Missing stories. |
| `switch.tsx` | — | ✗ | Missing stories. |
| `separator.tsx` | — | ✗ | Missing stories. |

---

## Sidebar (`ui/sidebar.tsx` + `components/app-sidebar/*`)

`Sidebar` has its own variant system (`inset`, `sidebar`) and `MenuButton` has `size: sm | md | lg`. This is a **second variant vocabulary** parallel to Button's. Acceptable because it's a layout shell, but document the divergence in `tokens.md` to prevent confusion.

`ui/sidebar.tsx` is the file with the most arbitrary spacing values (13 hits) — Phase 0.3 captures this.

---

## Stories coverage gaps

Primitives **with** `.stories.tsx`: button, badge, card, dialog, sheet, tabs, select, dropdown-menu, tooltip, skeleton, table, input.

Primitives **without** `.stories.tsx`: `breadcrumb`, `checkbox`, `popover`, `separator`, `switch`, `sidebar`.

**Phase 7 task:** add stories for the six gaps; render in both themes.

---

## Phase 3 candidates derived from this matrix

1. **Eliminate the 26 `<Button>` className overrides**, especially the 5 that touch color tokens.
2. **Add `Badge` variants** (`success`, `warning`, `info`) and migrate `StatusBadge` consumers.
3. **Add `Card` elevation variants** (`flat | raised | overlay`).
4. **Add `Input` error/invalid intent** so call sites stop hand-rolling red-bordered states.
5. **Backfill stories** for the six primitives missing them.
6. **Audit `size="lg"` usage** on Button (5 hits) — keep or drop.
