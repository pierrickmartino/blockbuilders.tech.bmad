# Phase 0.3 — Type & Spacing Scale Audit

**Date:** 2026-04-27
**Scope:** Arbitrary Tailwind classes (`text-[N]`, `w-[N]`, `h-[N]`, `gap-[N]`, `p-[N]`, `m-[N]`) in `frontend/src/**/*.{ts,tsx}`.
**Goal:** Identify scale drift — values shipped that aren't on a documented type/spacing scale — so Phase 1 can either add them to the scale or refactor away.

> Note: this audit excludes `data-[…]`, `group-data-[…]`, and `peer-data-[…]` because those are Tailwind variant selectors, not scale values.

---

## Typography drift — `text-[N]` (~90 hits)

| Value | Uses | Verdict |
|---|---:|---|
| `text-[10px]` | 53 | **Off-scale.** Tailwind has `text-xs`=12px. 10px is below the body-readable floor. Concentrated in `backtest/TradesSection.tsx` (table header micro-labels). |
| `text-[15px]` | 11 | **Off-scale.** Sits between `text-sm`=14 and `text-base`=16. Compromise size — pick one. |
| `text-[11px]` | 10 | **Off-scale.** |
| `text-[13px]` | 4 | **Off-scale.** |
| `text-[11.5px]` | 4 | **Off-scale, fractional.** |
| `text-[12px]` | 3 | Equivalent to `text-xs` — should be `text-xs`. |
| `text-[10.5px]`, `text-[9.5px]`, `text-[9px]` | 5 | **Off-scale, sub-readable.** Concentrated in canvas node labels. |
| `text-[1rem]` | 1 | Equivalent to `text-base`. |
| `text-[26px]`, `text-[28px]` | 2 | Off-scale display sizes. |

**Pattern:** the design has reached for **8 distinct sub-14px sizes** to compress data-dense surfaces. That's not a scale — that's improvisation.

**Phase 1 proposal:** introduce a documented **micro-type scale** with 2–3 well-defined steps for data tables/labels, plus the existing semantic scale. Candidate:

| Token | Value | Use |
|---|---|---|
| `--text-micro` | `0.6875rem` (11px) | Table headers, eyebrow labels |
| `--text-meta` | `0.75rem` (12px / `text-xs`) | Captions, timestamps |
| `--text-body-sm` | `0.875rem` (14px / `text-sm`) | Dense table rows |
| `--text-body` | `1rem` (16px / `text-base`) | Default body |

Then refactor: 53× `text-[10px]` → `text-micro`, 10× `text-[11px]` → `text-micro`, 11× `text-[15px]` → `text-base` or `text-sm` (pick consistently per surface).

---

## Sizing drift — `w-[N]` / `h-[N]` (top values)

| Value | Uses | Verdict |
|---|---:|---|
| `w-[18px]` / `h-[18px]` | 46 / 46 | **Canvas-node socket size.** Single intent, 46 reuses → should be a token (`--canvas-socket-size`) or a wrapper component. |
| `w-[11px]` / `h-[11px]` | 46 / 46 | **Canvas-node icon size.** Same conclusion. |
| `w-[150px]` / `w-[200px]` / `w-[140px]` / `w-[160px]` | 4+4+3+2 | **Filter-select widths** in `app/(app)/strategies/page.tsx`. Should be a small named scale (e.g., `--filter-width-sm/md/lg`) or move to a `<FilterSelect>` wrapper. |
| `w-[400px]` / `w-[600px]` / `w-[350px]` / `w-[250px]` | 3+2+2+3 | **Modal/dialog widths**. Should map to `Dialog` size variants. |
| `max-w-[400px]` / `max-h-[90vh]` | 4+3 | **Drawer/Dialog clamp values.** Same — promote to variants. |
| `w-[--sidebar-width]` / `w-[--sidebar-width-icon]` | 4+2 | **Acceptable** — these reference CSS vars, which is the correct token pattern. |
| `min-w-[8rem]` | 4 | Reasonable; 8rem is on a sane scale. |
| `translate-y-[2px]` | 2 | Pixel-tweak transform — probably fine but flag for review. |

**Pattern:** ~92 of the ~130 spacing/sizing arbitrary uses are **two reused atomic values** in canvas-node code (`18px`, `11px`). One token + one component wrapper would erase 184 violations in a single PR.

---

## Phase 1/3 proposals derived from this audit

### Phase 1 (token contract additions)
1. **Micro-type scale**: `--text-micro` (11px), `--text-meta` (12px), `--text-body-sm` (14px), `--text-body` (16px). Expose in Tailwind as `text-micro`, etc.
2. **Canvas tokens**: `--canvas-socket-size: 18px;` `--canvas-icon-size: 11px;`. Or — preferred — make these arguments to a `<NodeSocket>` / `<NodeIcon>` component.
3. **Sidebar tokens**: keep `w-[--sidebar-width]` pattern; **document** as canonical.

### Phase 3 (mechanical refactors)
1. Codemod `text-[10px]` → `text-micro` (53 instances).
2. Codemod `text-[12px]` → `text-xs`, `text-[1rem]` → `text-base`.
3. Refactor 92× `w-[18px] h-[18px]` and `w-[11px] h-[11px]` into shared canvas components.
4. Audit filter-select widths in `strategies/page.tsx` — pick one width or three named widths.
5. Map `w-[400px]/[600px]/[350px]/[250px]` to `Dialog`/`Sheet` size variants (`sm | md | lg | xl`).

---

## Verification target for Phase 1+3 completion

```bash
# Off-scale typography classes — must approach 0
grep -rEoh 'text-\[[0-9]+(\.[0-9]+)?(px|rem)\]' frontend/src --include="*.tsx" --include="*.ts" \
  | sort | uniq -c | sort -rn

# Reused atomic sizing classes — should be replaced by component wrappers
grep -rEoh '(w|h)-\[(11|18)px\]' frontend/src --include="*.tsx" --include="*.ts" | wc -l
# target: 0 once <NodeSocket>/<NodeIcon> exist
```
