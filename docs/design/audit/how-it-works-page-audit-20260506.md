# How-It-Works Page Audit

Date: 2026-05-06

## Audit Result

Audit Health Score: **13/20, Acceptable**

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 2/4 | Nested `<main>` landmark plus a light-theme contrast failure |
| Performance | 4/4 | Static, lean page, no obvious render cost |
| Responsive | 3/4 | Mostly fluid, but back link touch target is small |
| Theming | 2/4 | Warning state uses raw alpha classes and fails light contrast |
| Anti-Patterns | 2/4 | Card stack feels generic for a reference article |

## Anti-Patterns Verdict

This does not scream "AI-generated," but it does have a common AI-ish pattern: every content section is boxed into identical cards, even though the page is mostly explanatory reference text. It reads more like a component demo than a polished product help surface.

## Findings

### [P1] Nested main landmarks

Location: `frontend/src/app/(app)/layout.tsx:110`, `frontend/src/app/(app)/how-backtests-work/page.tsx:35`

The app shell already renders `<main id="main-content">`, and this page renders another `<main>` inside it. Screen reader landmark navigation can become confusing. Use a `<div>` or `<article>` for the page wrapper.

### [P1] Warning title fails contrast in light mode

Location: `frontend/src/app/(app)/how-backtests-work/page.tsx:133`

`text-warning` on `bg-warning/10` is about **1.97:1**, below WCAG AA. Use `text-foreground`, `text-warning-foreground` on a solid warning surface, or the existing `warning-soft` token pattern.

### [P1] "Back to backtests" points to a missing route

Location: `frontend/src/app/(app)/how-backtests-work/page.tsx:37`

There is no app route at `/backtests`; only shared backtest routes and strategy backtest routes exist. This likely 404s. Point it to a valid parent, probably `/dashboard`, `/strategies`, or remove the back link.

### [P2] Usage limits are hard-coded and incomplete

Location: `frontend/src/app/(app)/how-backtests-work/page.tsx:29`

The page states 10 strategies and 50 backtests/day, but backend plan logic supports plan tiers and beta bonuses. This can mislead beta/pro/premium users. Pull from user/profile limits or phrase as free-tier defaults.

### [P2] Numeric and date values ignore the Mono Data Rule

Location: `frontend/src/app/(app)/how-backtests-work/page.tsx:27`

Percentages, counts, UTC time, and `LAST_UPDATED` render in proportional text. The design system requires numeric/date values to use mono tabular styling.

### [P2] Back link touch target is below mobile guidance

Location: `frontend/src/app/(app)/how-backtests-work/page.tsx:36`

The inline text link is likely under 44px tall. Give it button-like padding or rely on the shell breadcrumb instead.

## Positive Findings

The page is simple, server-rendered, and tokenized in most places. It uses semantic headings, real lists, hidden decorative icon semantics, and reduced-motion is handled globally.

I couldn't run the rendered browser audit or lint because the dev server approval was declined and local `npm` is not available in PATH here.

## Recommended Actions

1. **[P1] `$impeccable harden how-backtests-work`**: fix landmarks, broken navigation, content accuracy, and numeric styling.
2. **[P1] `$impeccable colorize how-backtests-work`**: repair warning token usage and light/dark contrast.
3. **[P2] `$impeccable layout how-backtests-work`**: reduce the identical card stack and improve reference-page rhythm.
4. **[Final] `$impeccable polish how-backtests-work`**: recheck the finished surface.
