# Phase 0 — Design System Audit, Summary

**Date:** 2026-04-27
**Status:** Static slice complete. Live slice deferred (needs `pnpm dev`).

---

## Artifacts produced

| # | File | What it covers |
|---|---|---|
| 0.1 | [`phase0-token-violations.md`](./phase0-token-violations.md) | Hex / raw `hsl()` / arbitrary-color drift. Headline: **51 real color-token violations** (not 327 — that figure conflated typography). |
| 0.2 | [`phase0-variant-matrix.md`](./phase0-variant-matrix.md) | Declared vs used variants per `ui/*` primitive. Headline: **`default` Button used 7×, `outline` 84×** — primary CTA is effectively secondary. |
| 0.3 | [`phase0-scale-audit.md`](./phase0-scale-audit.md) | Type & spacing arbitrary values. Headline: **8 distinct sub-14px font sizes** (improvisation, not a scale); **184 atomic-pixel sizing classes** in canvas nodes are 2 reused values. |
| 0.4 | [`phase0-theme-parity.md`](./phase0-theme-parity.md) | `:root` vs `.dark` token analysis. Headline: **6 tokens collapse to one brand blue**, **3 tokens collapse to one soft surface** — system says less than it pretends to. `--ring` must split before any a11y work. |
| 0.5 | _deferred_ | Live Playwright re-capture across more routes (needs dev server). |
| 0.6 | _deferred_ | axe-core a11y baseline (needs dev server). |

Pre-existing: [`design-system-audit-20260427.md`](./design-system-audit-20260427.md) — live findings on home hero, login, 404, consent banner.

---

## Cross-cutting findings

### Finding 1 — The codebase has good taste; the public surfaces don't reflect it.
Source: live audit. Login is strong; home, 404, consent banner undersell the product. **Phase 2 priority.**

### Finding 2 — Drift is concentrated, not distributed.
- **70% of color drift** lives in chart/canvas surfaces consuming third-party libs (`TradeDrawer`, `CanvasMinimap`, `StrategyCanvas`).
- **70% of sizing drift** is two reused atomic values in canvas nodes.
- **One chart-theme adapter + two canvas wrapper components** would erase the majority of violations in two PRs.

### Finding 3 — The token system is structurally clean but semantically thin.
- All `:root` tokens have `.dark` counterparts. ✅
- But `--primary == --info == --ring == --chart-1 == --sidebar-primary == --sidebar-ring`. Six names, one intent. **Phase 1 must split before Phase 4 a11y work.**
- `--background == --card`. There's no surface elevation. Live audit's "no real layering" finding is structural, not stylistic.

### Finding 4 — Three documented sources of truth disagree.
- `docs/design_concept.json` (philosophy)
- `docs/design-system.json` (tokens, components)
- `frontend/src/app/globals.css` (runtime)

`globals.css` ships values that `design_concept.json` explicitly forbids (decorative gradients on body + hero). **Phase 1 must reconcile** — pick one authoritative, generate the others.

---

## Updated Phase 1 scope (informed by Phase 0)

The original plan said "Token Contract Hardening." Phase 0 sharpens it:

1. **Split aliases** — promote `--focus-ring`, `--surface-elevated`, `--text-subtle`, `--success-soft`/`-warning-soft`/`-destructive-soft` to first-class tokens.
2. **Delete decorative tokens** — body radial gradients (both themes), `.text-gradient-primary` utility.
3. **Reconcile sources of truth** — pick `design-system.json` or `globals.css` as authoritative; document a one-way generation path.
4. **Token aliasing audit** — for every multi-name → single-value cluster, decide: differentiate (give it real semantic distance) or collapse (drop the redundant name).

## Updated Phase 3 scope (informed by Phase 0)

Three tracks instead of one codemod:

1. **Codemod track** — ~15 mechanical color-token replacements (hex/hsl literals in TSX, arbitrary-class colors).
2. **Chart-theme adapter track** — introduce `lib/chart-theme.ts`, refactor 4 chart consumers (~36 violations).
3. **Canvas component track** — `<NodeSocket>` + `<NodeIcon>` wrappers replace 184 atomic-size classes.

---

## Live slice — to run when `pnpm dev` is up

### 0.5 — Playwright re-capture
- Routes to add to existing audit: `/dashboard`, `/strategies`, `/strategies/[id]` (canvas), `/strategies/[id]/backtest`, `/settings`, authenticated `/u/[handle]`.
- Use `waitUntil: 'domcontentloaded'` + 800ms delay (the `networkidle` timeout was a Next.js HMR socket quirk noted in the prior audit).
- Capture both themes at 320 / 768 / 1024 / 1440.

### 0.6 — axe-core baseline
- `@axe-core/playwright` per route, both themes.
- Output: `phase0-a11y-baseline.md` listing CRITICAL/SERIOUS/MODERATE counts and rules per route.

---

## Ready for Phase 1

Phase 0 has produced enough evidence to start Phase 1 (Token Contract Hardening). The live slice (0.5/0.6) is **not** a Phase 1 blocker — it informs Phase 4 (a11y) and Phase 5 (responsive).

**Next user decision:** approve Phase 1 kickoff, or run the live slice first.
