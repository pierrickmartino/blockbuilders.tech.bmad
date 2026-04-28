# Phase 2 — Verification

**Date:** 2026-04-28
**Scope:** Public Surface Remediation — home hero rewrite, real `not-found.tsx`, login mobile brand strip, consent banner refinement, primary-CTA reconciliation.

---

## Headline result

| Metric | Phase 1 result | Phase 2 result | Δ from Phase 0 baseline |
|---|---:|---:|---:|
| axe `color-contrast` violations | 3 nodes / 1 route | **0 nodes / 0 routes** | **47 → 0 (−100%)** |
| TypeScript errors | 0 | **0** | — |
| ESLint errors | 0 (18 warnings pre-existing) | 0 (18 warnings unchanged) | — |
| Playwright capture failures | 0 / 120 | 0 / 120 | — |

**Two follow-up token tweaks** during the verify cycle drove the last 3 → 0:
- `--text-subtle` light: `0 0% 45%` → `0 0% 38%` (≈4.6:1 → ≈6.3:1 against white).
- Consent banner privacy-policy link: `text-primary` → `text-foreground` (avoid blue-on-blue-tint fragility).

These are documented in `docs/design/tokens.md` under "Neutral text".

---

## Files changed in Phase 2

| File | Type | Change |
|---|---|---|
| `frontend/src/app/page.tsx` | rewrite | Asymmetric hero (lg+ split with stylized canvas preview); dropped eyebrow Badge; `text-gradient-primary` span → italic emphasis; `text-primary/70` step numbers → mono `text-subtle`; removed decorative `bg-primary/{5,8}` blobs; ad-hoc tints (`bg-primary/{5,10}`, `border-primary/{20,30}`) → `bg-info-soft` / `bg-surface-elevated` / `border-border`; `focus:ring-ring` → `focus:ring-focus-ring`. |
| `frontend/src/app/not-found.tsx` | new | Branded 404 with chrome (header logo + sign-in), eyebrow `404 · Not found`, headline + body, primary "Back to home" + outline "Sign in" CTAs. Resolves the live audit's "no design treatment, no chrome, no return path" finding. |
| `frontend/src/app/login/page.tsx` | edit | Removed decorative `bg-primary/{3,5}` blobs; mobile brand strip now carries the value-prop headline (one-line summary instead of just logo + tag); error banner `bg-destructive/5` → `bg-destructive-soft` token; `AuthSkeleton` `bg-primary/5` → `bg-surface-elevated`; added `role="alert"` on error region. |
| `frontend/src/components/ConsentBanner.tsx` | rewrite | Hardcoded `blue-{50..950}` Tailwind palette → `bg-info-soft` / `text-foreground` / `border-border` tokens (zero token drift); **route suppression** via `usePathname()` on `/login`, `/forgot-password`, `/reset-password`, `/auth`, `/share` prefixes (resolves "banner overlaps primary CTA on first paint" finding); tighter mobile padding (`py-3 sm:py-4`); `focus:ring-ring` → `focus:ring-focus-ring`. |
| `frontend/src/app/globals.css` | edit | `--text-subtle` light tightened from `0 0% 45%` to `0 0% 38%` to clear axe AA threshold for small text. |
| `docs/design/tokens.md` | edit | Reflect new `--text-subtle` value + Phase 2 rationale. |

---

## Live-audit findings — closure status

| Finding (Phase 0 live) | Severity | Status |
|---|---|---|
| `/pricing` returns Next.js default 404 (no chrome, no return path) | CRITICAL | ✅ Resolved — `not-found.tsx` ships brand chrome and back-affordances. (Note: `/pricing` itself remains a 404 by design until a pricing page is shipped.) |
| Home hero scores high on AI-template patterns | CRITICAL | ✅ Resolved — eyebrow pill removed, gradient-on-word replaced with italic emphasis, asymmetric layout introduced, decorative blobs removed. |
| Cookie banner overlays primary CTAs on `/` and `/login` | HIGH | ✅ Resolved — route suppression on auth/share routes; tightened mobile height. |
| Home hero has unjustified vertical voids at 1440 | HIGH | ✅ Resolved — section padding compressed (pt-24/pb-24 → pt-16/pb-20 mobile, pt-20/pb-24 desktop); right column now carries weight. |
| Inconsistent primary-button blue across home vs login | HIGH | ✅ Resolved — Phase 1's `--primary` darken made both flows consume the same token; no `bg-` overrides on Buttons. |
| Login mobile (≤lg) shows unbranded form | MEDIUM | ✅ Resolved — mobile brand strip now includes value-prop headline. |
| Dark-mode body radial gradients invisible | MEDIUM | ✅ Resolved in Phase 1. |
| `/metrics-glossary` & app routes redirect to `/login` | MEDIUM | Out of scope (auth-design decision). |
| Login form is the model to scale up from | LOW (positive) | ✓ Preserved — no regressions. |

---

## Static-grep delta

Hardcoded color-token drift in `frontend/src` is unchanged in count (Phase 2 didn't introduce new violations and didn't drive existing ones to zero — that's Phase 3's job):

```bash
$ grep -rEn "#[0-9a-fA-F]{3,8}\b" frontend/src --include="*.tsx" --include="*.ts" \
    | grep -vE "^[^:]+:[0-9]+:\s*//" | wc -l
33
```

**However** — `bg-primary/{3,5,8,10}` and `bg-destructive/5` ad-hoc tint patterns dropped meaningfully on `page.tsx`, `login/page.tsx`, and `ConsentBanner.tsx`. Phase 3 codemod scope is now slightly smaller.

---

## Verification command (re-runnable)

```bash
cd frontend && npm run dev &
sleep 12 && cd /tmp/bb-audit && node audit-v2.mjs | tail -3
# Expected: "Total a11y violations across scans: 0"

cd frontend
npx tsc --noEmit --pretty false   # expect: clean
npm run lint                       # expect: 0 errors (18 pre-existing warnings)
```

---

## Status

| Sub-phase | Status |
|---|---|
| 2.1 Home hero rewrite | ✅ |
| 2.2 Real `not-found.tsx` | ✅ |
| 2.3 Reconcile primary CTAs | ✅ (achieved largely via Phase 1 `--primary` darken) |
| 2.4 Mobile login brand strip | ✅ |
| 2.5 Consent banner refinement | ✅ |
| 2.6 Verify | ✅ |

Phase 2 closed. **0 a11y violations. 0 capture failures. 0 type errors. 0 lint errors.**

The codebase has gone from a **64/100 design-system score** (per the original audit) to a state where every public-surface CRITICAL/HIGH finding is closed.

---

## Ready for Phase 3

Phase 3 — Component-Variant Reconciliation — is the highest-leverage remaining track:
- Codemod 33 hex literals + remaining ad-hoc tint patterns.
- Introduce chart-theme adapter (`lib/chart-theme.ts`) to unify the chart/canvas surfaces.
- Ship `<NodeSocket>` / `<NodeIcon>` wrappers to erase 184 atomic-pixel sizing classes.
- Add `Card` elevation variants consuming `--surface-elevated`.
- Add `Badge` `success`/`warning`/`info` variants and migrate `StatusBadge` consumers.
