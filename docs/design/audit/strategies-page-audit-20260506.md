# Strategies Page Audit - 20260506

## Audit Health Score

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 3/4 | Mobile row controls use 16-32px targets, below the app's own touch target guidance. |
| Performance | 3/4 | Client-side filtering/sorting is fine now, but full table/card rendering has no pagination or virtualization. |
| Responsive | 3/4 | Mobile cards exist, but dense return-period metrics and tiny controls get cramped. |
| Theming | 2/4 | Hard-coded `green/red/yellow/blue/purple` classes bypass design tokens. |
| Anti-Patterns | 3/4 | Mostly clean product UI, but purple tags violate the "canvas colors stay on canvas" rule. |

Total: **14/20, Good**

## Anti-Patterns Verdict

This does not read as AI-generated overall. It is a conventional, task-focused product screen with sane table/mobile-card split, restrained layout, and useful bulk actions.

The main tell is color drift: tags use purple outside the canvas at `frontend/src/app/(app)/strategies/page.tsx:1056`, and monitor/success/warning states use raw Tailwind colors instead of the app's semantic tokens at `frontend/src/app/(app)/strategies/page.tsx:1050` and `frontend/src/app/(app)/strategies/page.tsx:770`. That weakens the product's "quiet instrument" feel.

## Findings

### [P1] Canvas Grammar Color Leak

**Location:** `frontend/src/app/(app)/strategies/page.tsx:1056`, `frontend/src/app/(app)/strategies/page.tsx:1174`

Tags use purple badges outside the strategy canvas, directly conflicting with the design rule that block-category colors are canvas-only. Use neutral outline badges or a tokenized tag style.

### [P2] Hard-Coded Status Colors Bypass Tokens

**Location:** `frontend/src/app/(app)/strategies/page.tsx:626`, `frontend/src/app/(app)/strategies/strategy-wizard.tsx:398`

Return colors and wizard errors use raw Tailwind color families instead of `success`, `destructive`, `warning`, or soft semantic tokens. This risks inconsistent dark-mode contrast and makes future theming harder.

### [P2] Mobile Touch Targets Are Too Small For Primary Row Controls

**Location:** `frontend/src/app/(app)/strategies/page.tsx:1147`, `frontend/src/app/(app)/strategies/page.tsx:1182`

The mobile checkbox is 16px and the actions button is 32px. The design system includes `icon-touch`/44px sizing for touch surfaces, and this page should use it where users repeatedly manage rows.

### [P2] Select Field Label Is Not Programmatically Connected

**Location:** `frontend/src/app/(app)/strategies/new-strategy-modal.tsx:130`

The `Timeframe` label visually precedes a Radix `SelectTrigger`, but the trigger has no matching `id`/accessible label. Add `id` plus labeling support, or an `aria-label`.

### [P3] Large Strategy Lists May Become Sluggish

**Location:** `frontend/src/app/(app)/strategies/page.tsx:309`, `frontend/src/app/(app)/strategies/page.tsx:1025`

Filtering and sorting are memoized, which is good, but every filtered item renders in both table/mobile branches depending on breakpoint. Add pagination, server-side filtering, or virtualization once users can exceed modest strategy counts.

## Positive Notes

The page has a strong functional base: skeleton loading, empty states, `aria-sort` on sortable columns, `aria-busy` during bulk actions, live status messaging, and a real mobile alternative instead of forcing the desktop table onto small screens.

I could not run a live browser or automated a11y check because `frontend/node_modules` is missing, so this is a code-level audit rather than a rendered verification pass.

## Recommended Follow-Up

1. `impeccable colorize` for token cleanup.
2. `impeccable adapt` for mobile targets.
3. `impeccable polish` after fixes.
