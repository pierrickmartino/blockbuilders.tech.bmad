# Alerts Page Critique

Date: 2026-05-06
Page: Alerts (`/alerts`)

## Anti-Patterns Verdict

The alerts page does **not** look like crypto/Web3 slop. It is calm, table-first, restrained, and mostly aligned with Blockbuilders' "instrument, not terminal" direction. The bigger issue is trust-by-clarity: the page behaves like generic alert-rule CRUD, when alerts are emotionally higher stakes. Users need to know what is active, what fired, what is stale, and what they should do next.

Deterministic scan could not run: `npx` is not available on PATH, so there are no automated detector results or browser overlays.

## Design Health

| # | Heuristic | Score | Key Issue |
|---|---:|---|
| 1 Visibility of status | 2 | Pending states exist, but no clear "alerts are healthy/current" overview |
| 2 Real-world match | 3 | Plain enough, but "performance alerts" need more context |
| 3 Control/freedom | 2 | Bulk actions can affect hidden selected rows |
| 4 Consistency | 2 | Modal uses native checkboxes while the page uses design-system controls |
| 5 Error prevention | 2 | Destructive confirmations exist, but hidden bulk selection is risky |
| 6 Recognition | 2 | Icon-only row actions and channel icons rely on labels/tooltips |
| 7 Efficiency | 2 | Bulk actions exist, but no edit flow for price alerts |
| 8 Minimal design | 3 | Clean and calm, but too flat in priority hierarchy |
| 9 Error recovery | 2 | Errors are mostly global, not field-local |
| 10 Help/documentation | 1 | Little contextual guidance for alert behavior |
| **Total** | **21/40** | **Acceptable, needs focused UX hardening** |

Cognitive load: **3 failures, moderate**. The page is grouped well, but it fails on visual hierarchy, progressive disclosure in the create modal, and working-memory support around hidden selections.

## What's Working

The desktop table plus mobile cards pattern is appropriate for a product surface. Numeric values use `data-text` in key places, which matches the mono-data rule.

The empty states are functional and point users toward the next action, especially "No price alerts" and "Go to Strategies."

The visual tone is restrained. No neon, no gradient text, no decorative spectacle. Good.

## Priority Issues

### [P1] The page lacks alert triage

The header at `frontend/src/app/(app)/alerts/page.tsx:374` says "Manage price and performance alerts," but the first viewport does not answer: how many are active, what fired recently, what expired, or whether anything needs attention.

Fix: add a compact status band above tabs: `Active`, `Triggered recently`, `Expired`, `Delivery issues` if available. Make "Triggered" and "Expired" actionable filters.

Suggested command: `impeccable layout alerts page`

### [P1] Bulk actions can touch hidden selections

`handleBulkSetActive` and delete use all `selectedIds`, not visible selections, at `frontend/src/app/(app)/alerts/page.tsx:228`. That is especially dangerous for destructive alert management.

Fix: either scope actions to visible selections or show explicit copy: "3 selected, 1 hidden by filters."

Suggested command: `impeccable harden alerts page`

### [P1] Create alert flow asks too much at once

The modal starts with asset, condition, threshold, notifications, webhook, expiration, and submit in one vertical stack at `frontend/src/app/(app)/alerts/create-price-alert-modal.tsx:114`. For a high-stakes notification rule, that feels under-explained.

Fix: group into three clear sections: `Trigger`, `Delivery`, `Lifetime`. Add a generated sentence preview: "Notify me when BTC/USDT goes above 50,000 USDT."

Suggested command: `impeccable clarify alerts create modal`

### [P2] Performance alerts feel second-class

The performance tab tells users to go elsewhere at `frontend/src/app/(app)/alerts/page.tsx:696`. That may be architecturally true, but visually it makes the tab feel like a dead end.

Fix: make each row a management entry point with stronger strategy context and a primary "Edit in strategy settings" action.

Suggested command: `impeccable distill performance alerts`

### [P2] Form accessibility weakens trust

The create modal has unbound select labels at `frontend/src/app/(app)/alerts/create-price-alert-modal.tsx:129`, and the webhook URL field is placeholder-only after `frontend/src/app/(app)/alerts/create-price-alert-modal.tsx:173`.

Fix: bind labels, use the shared Checkbox component, and put validation next to the field.

Suggested command: `impeccable harden alerts create modal`

## Persona Red Flags

Alex, power user: bulk actions exist, but no edit flow and no sort/search means repeated alert maintenance becomes slow.

Jordan, first-timer: "Performance alerts are configured per strategy" explains where, but not why. They may not understand the difference between price and performance alerts.

Sam, accessibility-dependent user: modal select labels and webhook field labeling need repair before this feels dependable with screen readers.

## Questions

Which direction should the next pass prioritize?

1. Triage clarity: make the page immediately show active, triggered, expired, and risky alerts.
2. Creation clarity: make the "New alert" flow easier and safer.
3. Hardening: fix bulk-selection behavior and accessibility first.
