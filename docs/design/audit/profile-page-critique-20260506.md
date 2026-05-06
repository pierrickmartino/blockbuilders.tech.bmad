# Profile Page Critique

Date: 2026-05-06

## Summary

Anti-pattern verdict: it does **not** scream "AI-made," but it does feel like a settings backlog accumulated into one scroll. The visual language is restrained and mostly on-brand, yet the page lacks a strong information architecture.

I reviewed the implementation against `PRODUCT.md`, `DESIGN.md`, FEAT-064, FEAT-094, and the profile source. I could not run the deterministic `impeccable` scan or live browser overlay because this workspace shell has no `npx`/`npm` on PATH and `frontend/node_modules` is absent.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 3 | Save/error banners exist, but multiple independent banners fragment feedback. |
| 2 | Match System / Real World | 3 | Labels are clear; billing/credits/settings blend together. |
| 3 | User Control and Freedom | 3 | Good toggles/retry paths; public profile lacks preview-first flow. |
| 4 | Consistency and Standards | 2 | Native checkbox plus Radix checkbox, direct color classes, nested card patterns. |
| 5 | Error Prevention | 2 | Fee/slippage constrained, but paid actions are visually casual for high-stakes checkout. |
| 6 | Recognition Rather Than Recall | 2 | Eight jump links and many sections ask users to classify their intent. |
| 7 | Flexibility and Efficiency | 3 | Section nav helps, but missing Public Profile link/id undermines it. |
| 8 | Aesthetic and Minimalist Design | 2 | Too many equal-weight cards; weak prioritization. |
| 9 | Error Recovery | 3 | Retry/revert patterns are present. |
| 10 | Help and Documentation | 3 | Helper copy exists, though display/timezone could explain downstream effects better. |
| **Total** |  | **26/40** | **Solid but overgrown** |

## Priority Issues

### [P1] The page has no hierarchy beyond "card after card."

The main content is a uniform stack from Account through Billing: `frontend/src/app/(app)/profile/page.tsx:440`. This makes email privacy, public identity, usage limits, add-ons, and paid plans feel equally important.

Fix: group into 3 larger zones: `Account & Privacy`, `Trading Defaults & Display`, `Plan & Capacity`. Keep cards only inside those zones when they represent repeated items.

### [P1] The section nav is overloaded and incomplete.

The nav exposes 8 choices: `frontend/src/app/(app)/profile/page.tsx:420`, but the Public Profile section has no `id` and no nav item: `frontend/src/app/(app)/profile/page.tsx:787`. That is a trust issue because the most privacy-sensitive section is harder to locate.

Fix: either add `id="public-profile"` and a nav item, or collapse nav into broader groups.

### [P2] Nested cards weaken the design system.

Credits and usage place `Card` components inside `Card` sections: `frontend/src/app/(app)/profile/page.tsx:857`, `frontend/src/app/(app)/profile/page.tsx:1111`. The design system explicitly says nested cards are wrong.

Fix: make inner items bordered rows or flat list panels instead.

### [P2] Component vocabulary is inconsistent in Public Profile settings.

The public toggle uses a native checkbox: `frontend/src/app/(app)/profile/profile-settings-section.tsx:107`, while the visibility options use the shared `Checkbox`: `frontend/src/app/(app)/profile/profile-settings-section.tsx:180`. Messages also bypass semantic tokens with hard-coded green/red classes: `frontend/src/app/(app)/profile/profile-settings-section.tsx:97`.

Fix: use the same `Switch`/`Checkbox` and alert styling patterns as the rest of the page.

### [P3] Usage bars drift into decorative gradient language.

The gradient progress colors at `frontend/src/app/(app)/profile/page.tsx:1096` are not disastrous, but they feel louder than the page needs. Blockbuilders' product design is "well-designed instrument," not dashboard flourish.

Fix: use solid semantic fills with labels: normal primary, near warning, reached destructive.

## What's Working

The page respects the MVP spec shape from FEAT-064: stacked sections, simple controls, inline save feedback, and usage cards. The optimistic digest toggles with rollback are thoughtful interaction design. The copy is mostly direct and calm.

## Persona Red Flags

Alex, the focused trader: wants to change one operational setting fast. The 8-link nav plus repeated equal cards slows scanning.

Jordan, first-timer: may not understand whether "Credits," "Usage," and "Billing" are one billing concept or three separate concerns.

Privacy-conscious creator: the Public Profile controls are present, but the section is missing from nav and has no preview-before-public flow, which makes publishing feel less deliberate.

## Questions

1. Should the next pass prioritize **information architecture** (group sections), **design-system consistency** (remove nested cards and mixed controls), or **privacy/public-profile confidence**?
2. Should Profile remain one long settings page, or become grouped with sticky side navigation: `Account`, `Preferences`, `Plan`?
3. Scope-wise, do you want the top 3 fixes only, or a full profile polish pass?
