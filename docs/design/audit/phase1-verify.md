# Phase 1 — Verification

**Date:** 2026-04-27
**Scope:** Token Contract Hardening — `globals.css`, `tailwind.config.ts`, `docs/design/tokens.md`.

---

## Headline result

| Metric | Phase 0 baseline | Phase 1 result | Δ |
|---|---:|---:|---:|
| axe `color-contrast` violations | 47 nodes / 15 routes | **3 nodes / 1 route** | **−94%** |
| Routes with violations (light) | 15 / 15 | **1 / 15** | −93% |
| Routes with violations (dark) | 0 / 15 | 0 / 15 | — |
| TypeScript errors (`tsc --noEmit`) | n/a | **0** | — |
| ESLint errors | 0 (18 warnings pre-existing) | 0 (18 warnings pre-existing) | — |
| Playwright capture failures | 0 / 120 | 0 / 120 | — |

**One token change** (`--primary` light: `204 65% 57%` → `204 75% 40%`) removed 44 of 47 a11y violation nodes.

---

## What's left — 3 nodes on `/`, deferred to Phase 2

```
Route: home (light)
  color-contrast | serious | nodes: 3
    li:nth-child(1) > .text-primary\/70.text-3xl.font-bold
    li:nth-child(2) > .text-primary\/70.text-3xl.font-bold
    li:nth-child(3) > .text-primary\/70.text-3xl.font-bold
```

**Cause:** decorative "01/02/03"-style numbered list items on the home hero use `text-primary/70` (primary color at 70% opacity). At 70% the new `--primary` (deeper blue) drops below 4.5:1 against white.

**Decision:** **defer to Phase 2** (home hero rewrite). The whole section is slated for replacement (asymmetric layout, real product imagery, no eyebrow pill) per the live-audit plan. Fixing this token in isolation would be churn before a delete.

**Quick fix path** if the home hero rewrite slips: replace `text-primary/70` with one of:
- `text-primary` (full opacity — passes AA)
- `text-foreground/60` (neutral decorative numbers)
- `text-subtle` (the new token we just introduced)

---

## Files changed in Phase 1

| File | Change |
|---|---|
| `frontend/src/app/globals.css` | Reorganized into commented sections; `--primary` light darkened; added `--surface-{base,elevated,overlay}`, `--text-subtle`, `--{success,warning,destructive,info}-soft`, `--focus-ring`; removed body radial gradients; React Flow hex → `hsl(var(--border))`. |
| `frontend/tailwind.config.ts` | Exposed new tokens as Tailwind colors (`surface-base`, `surface-elevated`, `surface-overlay`, `subtle`, `focus-ring`, plus `soft` keys on `destructive/success/warning/info`). |
| `docs/design/tokens.md` | New — token reference & usage rules. |

---

## Static-baseline checks (re-run, should be unchanged)

Color-token violations are not introduced by Phase 1 (the changes only added tokens, none removed):

```bash
# Hex literals
$ grep -rEn "#[0-9a-fA-F]{3,8}\b" frontend/src --include="*.tsx" --include="*.ts" \
    | grep -vE "^[^:]+:[0-9]+:\s*//" | wc -l
33   # unchanged from Phase 0
```

Phase 3 will drive these to zero.

---

## Verification command (re-runnable)

```bash
# 1. Start dev server
cd frontend && npm run dev &

# 2. Wait, then run audit
sleep 12 && cd /tmp/bb-audit && node audit-v2.mjs | tail -3
# Expected: "Total a11y violations across scans: 3" today,
# and "0" once Phase 2 home hero rewrite lands.

# 3. Static checks
cd frontend
npx tsc --noEmit --pretty false   # expect: clean
npm run lint                       # expect: 0 errors
```

---

## Status

| Sub-phase | Status |
|---|---|
| 1.1 Fix `--primary` contrast | ✅ |
| 1.2 Split `--focus-ring` | ✅ |
| 1.3 Surface elevation tokens | ✅ |
| 1.4 Soft-state tokens | ✅ |
| 1.5 Delete body radials | ✅ |
| 1.6 React Flow hex → token | ✅ |
| 1.7 Reorganize `globals.css` | ✅ |
| 1.8 `docs/design/tokens.md` | ✅ |
| 1.9 Verify | ✅ |

Phase 1 closed. Ready for Phase 2 (Public Surface Remediation — home hero rewrite, real `not-found.tsx`, mobile login brand strip, consent banner refinement).

The 3 remaining a11y nodes will resolve themselves when Phase 2's home hero is rewritten.
