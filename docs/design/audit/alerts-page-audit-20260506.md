# Alerts Page Audit

Date: 2026-05-06
Page: Alerts (`/alerts`)

## Review Findings

### Finding 1: [P1] Select labels are not bound

Location: `frontend/src/app/(app)/alerts/create-price-alert-modal.tsx:125-148`

The visible labels use `htmlFor`, but the Radix Select triggers do not have matching ids or `aria-labelledby`, so screen reader users may hear only the current value rather than the field purpose. Bind each `SelectTrigger` to the label or add explicit `aria-label` values.

### Finding 2: [P1] Webhook URL input is placeholder-only

Location: `frontend/src/app/(app)/alerts/create-price-alert-modal.tsx:194-200`

When webhook notifications are enabled, the URL field has no visible or programmatic label. Placeholders are not labels, and this makes the conditional field harder to understand and announce. Add a label and connect validation errors to the input.

### Finding 3: [P1] Bulk actions operate on hidden selected alerts

Location: `frontend/src/app/(app)/alerts/page.tsx:228-259`

The toolbar displays a global `selectedIds` count and bulk update/delete uses all selected ids, even when filters hide some of them. A user can filter the table, see one set of rows, then delete or deactivate alerts that are no longer visible. Scope bulk actions to `visibleSelectedIds` or make hidden selections explicit.

### Finding 4: [P2] Error scrolling ignores reduced motion

Location: `frontend/src/app/(app)/alerts/page.tsx:133-137`

`scrollIntoView` always uses smooth behavior when an error appears. Users who prefer reduced motion should get instant scrolling or no programmatic motion. Gate this behind `prefers-reduced-motion`.

### Finding 5: [P2] Alerts Storybook page documents the wrong product

Location: `frontend/src/stories/pages/Alerts.mdx:11-87`

The page docs still describe the old notification center and `/notifications` endpoints, while the route now manages price and performance alert rules. This will mislead QA and future implementation work.

## Audit Health

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 2/4 | Modal form labeling has real gaps |
| Performance | 3/4 | Lean page, no major render hazards found |
| Responsive | 3/4 | Mobile cards exist; small checkbox targets remain |
| Theming | 2/4 | Mostly tokenized, but native checkboxes use hard-coded gray |
| Anti-Patterns | 3/4 | Calm product UI, no obvious AI slop |
| **Total** | **13/20** | **Acceptable, needs focused cleanup** |

## Anti-Patterns Verdict

Pass, mostly. The page does not read as AI-generated: it uses familiar product patterns, restrained color, tables on desktop, cards on mobile, and semantic badges. The weakest visual/system smell is inconsistency: the create modal mixes native checkboxes with the design-system checkbox, and the Storybook docs describe an entirely different screen.

## Top Issues

- P1: Form accessibility in `create-price-alert-modal.tsx`, especially unbound Select labels and the unlabeled webhook URL field.
- P1: Bulk actions can affect filtered-out alerts, which is risky for destructive actions.
- P1: Feature completeness gap: FEAT-063 says users can edit price alerts, but the page only supports create, toggle, and delete.
- P2: Error auto-scroll ignores reduced-motion preference.
- P2: Storybook documentation is stale and points to `/notifications` behavior, not alert rules.

## Positive Findings

Loading uses skeletons plus an `aria-live` status, table/mobile layouts are separated cleanly, destructive actions require confirmation, and numeric values mostly use `data-text`, matching the product's mono-data rule.

## Verification Note

Could not run `npm run lint`: `npm` is not on PATH, and `frontend/node_modules` is missing, so this audit is static code inspection rather than a live/browser pass.
