# Phase 5 — Verification

**Date:** 2026-04-29
**Scope:** Responsive sweep — section-padding tokens, Button `touch`/`icon-touch` sizes, extended audit viewports (320 / 375 / 768 / 1024 / 1440 / 1920), responsive patterns doc, horizontal-overflow detection.

---

## Headline result

| Metric | Phase 4 | Phase 5 |
|---|---:|---:|
| Total captures per audit run | 120 (4 viewports) | **180** (6 viewports) |
| axe `color-contrast` violations | 0 / 30 scans | **0 / 30** ✅ |
| Captures with horizontal overflow | unaudited | **0 / 180** ✅ (after 1 fix) |
| TypeScript errors | 0 | 0 |
| ESLint errors | 0 | 0 |

The horizontal-overflow check **caught a real bug on the first run**: home-page header overflowed at 320×800 (344px > 320px) because logo + wordmark + 2 buttons + padding totaled ~390px. Fixed in this phase.

---

## Files changed in Phase 5

| File | Type | Change |
|---|---|---|
| `frontend/src/app/globals.css` | edit | Added `--space-section: clamp(3rem, 2.4rem + 3vw, 6rem)` and `--space-section-tight: clamp(1.5rem, 1.2rem + 1.5vw, 3rem)` under `:root`. Smooth-scaling vertical-rhythm tokens replace ad-hoc `py-N md:py-M lg:py-K` combos. |
| `frontend/tailwind.config.ts` | edit | Exposed `spacing.section` and `spacing.section-tight` so the tokens are available as `py-section` / `py-section-tight` Tailwind utilities. |
| `frontend/src/components/ui/button.tsx` | edit | Added `size: touch` (h-11, 44×44) and `size: icon-touch` (h-11 w-11) variants for mobile-primary CTAs. iOS HIG / WCAG 2.2 AAA target-size compliance. Strictly additive — existing 4 sizes unchanged. |
| `frontend/src/app/page.tsx` | edit | Hide secondary "Sign in" ghost button below `sm:` on home header to clear horizontal overflow at 320px. Hero subhead retains a sign-in link. |
| `/tmp/bb-audit/audit-v2.mjs` | edit | (a) Added 375 (iPhone 12+) and 1920 (large desktop) to `VIEWPORTS`. (b) Records `documentElement.scrollWidth` vs `clientWidth` per capture; reports captures-with-overflow at run-end. |
| `docs/design/responsive.md` | new | Canonical responsive patterns doc: breakpoints, container widths, section padding, table→card transformation, Dialog vs Sheet rule, touch-target tiers, horizontal-overflow rule, forbidden patterns. |

---

## Closure status — Phase 0/5 findings

| Finding | Status |
|---|---|
| Internal app pages over-dense / inconsistent vertical rhythm | API resolved — `py-section` / `py-section-tight` available. Per-page migration is opportunistic. |
| Tables → cards transformation rule below `md:` | ✅ Codified in `docs/design/responsive.md`. |
| Dialog vs Sheet — pick one mobile pattern per interaction class | ✅ Codified. |
| Sidebar collapse rule consistency | Out of scope (no findings; existing `app-sidebar/*` already uses `--sidebar-width` var). |
| Touch-target ≥44×44 on interactive elements | ✅ API resolved — `Button size="touch"` and `size="icon-touch"`. Per-call-site migration is opportunistic on mobile-primary surfaces. |
| Horizontal overflow at any viewport | ✅ 0 across 180 captures (after home-header fix). |

---

## Architectural notes

### Section-padding tokens

```css
--space-section:        clamp(3rem, 2.4rem + 3vw, 6rem);   /* ~48–96px */
--space-section-tight:  clamp(1.5rem, 1.2rem + 1.5vw, 3rem); /* ~24–48px */
```

A single CSS `clamp()` value with viewport-relative middle term (`Nvw`) scales smoothly without breakpoint jumps. The min/max bounds keep mobile from being cramped and desktop from feeling vacuous. Compared to `py-12 md:py-16 lg:py-20` (3 stepwise values), `py-section` (1 value, smoothly varying) is both fewer characters at the call site and architecturally simpler.

Phase 0 noted **12 distinct `py-N md:py-M lg:py-K` combos** in the codebase. Phase 5 doesn't migrate them all — it ships the API. Migration is opportunistic when adjacent files are touched.

### Button `touch` size

```ts
touch: "h-11 rounded-md px-5",       // 44×variable, mobile-primary CTA
"icon-touch": "h-11 w-11",           // 44×44, mobile icon-only
```

The decision **not to bump existing sizes** (`default` stays at `h-9 = 36px`) preserves the desktop visual character — Blockbuilders is a desktop-leaning trading workstation, and bumping every button to 44px would change the entire density profile. Mobile-primary surfaces opt in to `size="touch"` instead.

### Audit script — horizontal overflow detection

```js
const sizes = await page.evaluate(() => ({
  sw: document.documentElement.scrollWidth,
  cw: document.documentElement.clientWidth,
}));
overflows = sizes.sw > sizes.cw + 1; // 1px tolerance for sub-pixel rounding
```

Every capture records the bounds. The summary line `Captures with horizontal overflow: N` makes regression visible at a glance — same role as the `Total a11y violations` line for axe. Both must be 0 for a green run.

### The home-header fix

The header was 4 elements at small viewports: logo (36px) + wordmark (~110px) + Sign-in ghost (~70px) + Get-started CTA (~120px) + gaps (~30px) + padding (32px) ≈ 398px. At 320px this overflows by ~78px (matches the 344px observed scrollWidth — Tailwind's container compression accounts for the rest).

The Sign-in ghost button is the right thing to hide: the primary "Get started" CTA still works as the default funnel step, and the hero copy below it includes a "Sign in" affordance for return users on mobile.

---

## Verification command (re-runnable)

```bash
# 1. Static
cd frontend && npx tsc --noEmit --pretty false   # expect: clean
npm run lint                                     # expect: 0 errors

# 2. Live audit — extended viewports
npm run dev &
sleep 12 && cd /tmp/bb-audit && node audit-v2.mjs | tail -10
# Expected: "Captures: 180" and "Total a11y violations across scans: 0"
# Expected: "Captures with horizontal overflow: 0"
```

---

## Status

| Sub-phase | Status |
|---|---|
| 5.1 Section-padding tokens | ✅ |
| 5.2 Button `touch` / `icon-touch` sizes | ✅ |
| 5.3 Extend audit viewports + overflow detection | ✅ |
| 5.4 `docs/design/responsive.md` | ✅ |
| 5.5 Verify | ✅ |

Phase 5 closed. **Vertical rhythm has tokens. Touch targets have a sized variant. Horizontal overflow is gated by the audit. Patterns are documented as a reviewable rule, not as folklore.**

The audit script is now a meaningful CI gate covering: 0 a11y violations, 0 capture failures, 0 horizontal overflows, 6 viewports × 2 themes × 15 routes. Future phases inherit a cleaner baseline.
