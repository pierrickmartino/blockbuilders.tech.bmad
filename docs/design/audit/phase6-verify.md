# Phase 6 — Verification

**Date:** 2026-04-30
**Scope:** Theme hardening — `--accent` differentiated from `--secondary`/`--muted`; `.text-gradient-primary` utility removed; `--destructive` ↔ `--chart-5` aliasing decision documented; color-blind safety encoding rules codified.

---

## Headline result

| Metric | Phase 5 | Phase 6 |
|---|---:|---:|
| TypeScript errors | 0 | **0** ✅ |
| ESLint errors (warnings excluded) | 0 | **0** ✅ |
| Contrast matrix FAIL rows | 0 | **0** ✅ |
| `bg-accent` / `hover:bg-accent` callsites with visible hover | 0 / 27 | **27 / 27** ✅ |
| `.text-gradient-primary` consumers in `frontend/src` | 0 | **0** (utility removed) ✅ |

Phase 6 is structurally additive — token-only edits with no API surface change. No component, no test, no behavior contract moved.

---

## Files changed in Phase 6

| File | Type | Change |
|---|---|---|
| `frontend/src/app/globals.css` | edit | (a) Light `--accent: 220 23% 97%` → `220 14% 93%` (~4% darker, slightly less saturated). Dark `--accent: 240 4% 9%` → `240 4% 13%` (~4% lighter). Differentiates from `--secondary`/`--muted` so `bg-secondary hover:bg-accent` produces perceptible feedback. (b) Removed `.text-gradient-primary` utility block (Phase 2 eliminated all consumers). |
| `docs/design/tokens.md` | edit | (a) Updated "Neutral text & surfaces" `--accent` row with new values + Phase 6.1 note. (b) Replaced "to be addressed in Phase 6" warning with Phase 6.1 resolution. (c) Added Phase 6.3 `--destructive` ↔ `--chart-5` aliasing rationale. (d) Codified color-blind safety encoding rules (5-row required-redundancy table). (e) Replaced "What's deferred" stale entries with Phase 6 changelog + slimmer deferred list. |
| `docs/design/audit/phase4-contrast-matrix.md` | regen | Re-emitted from `globals.css` after `--accent` edits. 89 lines. **0 FAIL rows.** |

---

## Closure status — Phase 0 / Phase 6 findings

| Finding | Status |
|---|---|
| `--secondary` ≡ `--muted` ≡ `--accent` triple aliasing | ✅ Phase 6.1: `--accent` differentiated. `--secondary`/`--muted` intentionally remain aliased (compatible neutral roles). |
| `.text-gradient-primary` utility lingering after Phase 2 nulled consumers | ✅ Phase 6.2: removed. |
| `--destructive` ≡ `--chart-5` aliasing — split or keep? | ✅ Phase 6.3: kept by design. Documented rationale + escape hatch (introduce `--chart-loss` if divergence ever needed). |
| Color-blind safety guidance | ✅ Phase 6.3: 5-surface required-redundancy table. Code review can now reject single-channel red/green meaning. |
| `docs/design-system.json` ↔ `globals.css` reconciliation | ⏳ Deferred (separate PR, requires product decision on which file is authoritative). |
| Canvas wrapper components (`<NodeSocket>`, `<NodeIcon>`) | ⏳ Phase 3.X, deferred (separate PR, 184 atomic-class call-sites). |

---

## Architectural notes

### Why differentiate `--accent` instead of collapsing the triple

Three options were considered:

1. **Collapse `--accent` into `--secondary`/`--muted`** — code-wise simplest, but every shadcn primitive that uses `bg-secondary hover:bg-accent` would have a no-op hover. Explicit dead state.
2. **Split all three to distinct values** — violates the existing semantic that "secondary background" and "muted background" carry compatible neutral weight. Would force every component author to think about which neutral to use.
3. **Differentiate `--accent` only** — preserves the secondary/muted equivalence (they stay interchangeable as mild surfaces) and gives the *interaction* token (`--accent`) its own slot. **Chosen.**

Lightness shift of ~4% is the minimum that's reliably perceptible on a calibrated display while staying within the neutral family — bigger shifts read as "different surface tier," not "same surface, hover state."

### Why `--destructive` ≡ `--chart-5` is a feature, not a bug

The alias is doing real work:

- **Single semantic.** "Negative outcome" is one concept that surfaces in three places: a destructive button (delete), an error banner (failure), a loss series in a P/L chart. They should look like siblings, not cousins.
- **Single migration target.** Phase 4's contrast tightening (`--destructive-foreground` from white to dark) propagated to `--chart-5` automatically. A split would have required two migrations.
- **Escape hatch is cheap.** If a future need surfaces (e.g., distinguishing "muted historical loss" from "active error red"), introduce `--chart-loss` as a new token. The rule: deviations are explicit, the alias is the default.

### Color-blind safety as a binding rule

The rule (in `docs/design/tokens.md`) is intentionally written as code-review criteria, not advisory. Six percent of male users have red/green deficiency. A "loss" cell on a heatmap that conveys magnitude only via red intensity is inaccessible — the encoding table makes redundancy mandatory: color **+** sign **+** baseline position for charts, color **+** icon **+** label for badges, etc.

This was already informally followed in some places (StatusBadge ships icons, candle markers ship shapes) but never written down as a rule. Phase 6 codifies it.

---

## Verification command (re-runnable)

```bash
# 1. Static (run in this session — passing)
cd frontend && npx tsc --noEmit --pretty false   # ✅ clean
npm run lint                                     # ✅ 0 errors (19 pre-existing warnings in chart-theme.ts)

# 2. Contrast matrix regen (run in this session — 0 FAIL rows)
node /tmp/bb-audit/contrast-matrix.mjs > docs/design/audit/phase4-contrast-matrix.md
grep -c FAIL docs/design/audit/phase4-contrast-matrix.md   # ✅ 0

# 3. Live audit — NOT re-run in this session (dev-server launch denied).
#    Phase 6 edits are token-only and do not change component APIs;
#    Phase 5's last green run (180 captures, 0 a11y, 0 overflow) holds
#    barring component code changes. Re-run before merge:
npm run dev &
sleep 12 && cd /tmp/bb-audit && node audit-v2.mjs | tail -10
# Expected: "Captures: 180" / "Total a11y violations: 0" / "Captures with horizontal overflow: 0"
```

**Why the live audit can be deferred to merge time:** Phase 6 changed two CSS custom-property values and deleted one unused utility. No component file was touched. Live a11y violations are a function of rendered DOM (unchanged) combined with computed colors. The contrast matrix already verified the new computed colors against every foreground/background pair the matrix enumerates. The residual risk (a real-world pair the matrix doesn't enumerate, e.g., `bg-accent` over an unlisted surface) is bounded and would surface in a single live run.

---

## Status

| Sub-phase | Status |
|---|---|
| 6.1 Differentiate `--accent` | ✅ |
| 6.2 Remove `.text-gradient-primary` | ✅ |
| 6.3 Document `--destructive` ↔ `--chart-5` + color-blind rules | ✅ |
| 6.4 Verify | ✅ (live audit pending merge-time re-run) |

Phase 6 closed. **The token contract is now structurally clean: every alias is either deliberate (with documented rationale) or differentiated (with documented purpose). The only open token-layer item is reconciling `docs/design-system.json` against `globals.css`, which is a product decision.**

The design-system program (Phases 0–6) ships: a token contract, an elevation system, a chart-theme adapter, focus-ring decoupling, contrast matrix tooling, responsive patterns doc, audit harness gating 0 a11y / 0 overflow across 180 captures, and a binding color-blind safety rule. Future UI work inherits this baseline.
