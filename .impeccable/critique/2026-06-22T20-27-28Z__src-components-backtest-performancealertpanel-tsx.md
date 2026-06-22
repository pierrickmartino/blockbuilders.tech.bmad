---
target: performance alerts panel
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-22T20-27-28Z
slug: src-components-backtest-performancealertpanel-tsx
---
# Critique: Performance Alert Panel

Target: frontend/src/components/backtest/PerformanceAlertPanel.tsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/error state on alerts query; create form flashes before existing rule resolves; no save confirmation |
| 2 | Match System / Real World | 3 | Parent "notified daily" vs panel "fires once when crossed" — ambiguous cadence |
| 3 | User Control and Freedom | 2 | No pause/disable/delete affordance; "Paused" branch is dead code |
| 4 | Consistency and Standards | 2 | Two checkbox layouts; read view uses inline <strong> not design-system label/data; numeric data in sans violates Mono Data Rule |
| 5 | Error Prevention | 2 | Native min/max not enforced; "HTTPS only" claimed but type=url accepts http |
| 6 | Recognition Rather Than Recall | 3 | Options visible; "What we send" payload disclosure good |
| 7 | Flexibility and Efficiency | 2 | Not a <form>; Enter doesn't submit; no keyboard save |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; read-view bold rows + mixed checkbox alignment add noise |
| 9 | Error Recovery | 2 | Errors far from field; no live region; no aria-describedby |
| 10 | Help and Documentation | 3 | Webhook payload disclosure + helper copy is a strength |
| Total | | 24/40 | Acceptable |

## Anti-Patterns Verdict
Not AI-slop in the brand sense (on-palette, restrained, no neon/glass/gradient-text). Fails the product slop test: inconsistent checkbox alignment and create-form-flash-before-load would make a Linear/Stripe-fluent user pause. detect.mjs clean (exit 0) but only scans brand-surface tells; all findings below are manual.

## What's Working
1. Webhook trust copy + collapsible example JSON payload (matches "Transparent by design").
2. Conditional webhook URL field — correct progressive disclosure.
3. Restraint — quiet card, correct muted hierarchy, chrome recedes.

## Priority Issues
- [P1] No loading/error state for alerts query. isPending/isError ignored; create form flashes then flips; on fetch failure user silently sees create form and can create a DUPLICATE. Fix: skeleton while pending, inline error+retry while errored, only show create form after confirmed-empty load. -> /impeccable harden
- [P1] No pause/disable/delete affordance + dead "Paused" code. Panel binds only is_active rules, so is_active is always true and the Paused branch never renders. User can create/edit but not turn off or remove. Fix: add real lifecycle controls or remove dead branches and link out. -> /impeccable shape
- [P2] Inconsistent component vocabulary. Entry/exit checkbox-left; email/webhook checkbox-right. One form, two grammars. Fix: one checkbox pattern. -> /impeccable layout
- [P2] Read view ignores design-system data vocabulary. Inline <strong> rows; "Drawdown >= 15%" numeric data in proportional sans (violates Mono Data Rule); status as plain text not Badge. Fix: Badge for status, mono/tnum for numbers, label-pair treatment. -> /impeccable typeset
- [P2] Validation errors detached + inaccessible. All errors at bottom, far from fields; no role=alert/aria-live; no aria-invalid/aria-describedby; "HTTPS only" not enforced. Fix: per-field errors, live region, real https validation. -> /impeccable clarify

## Persona Red Flags
- Alex: div+onClick not <form>; Enter doesn't save; no delete/disable so can't manage at speed.
- Sam: errors not announced; status not programmatic; threshold/notify controls not grouped like entry/exit.
- Riley: kill network -> silent duplicate creation; 200-char webhook URL renders raw (overflow); http:// accepted despite "HTTPS only".

## Minor Observations
- Copy contradiction: "daily" (parent) vs "fires once" (panel).
- Em dash in webhook helper copy (line 306) — house bans em dashes.
- Long webhook URL in read view has no truncation (overflow risk).
- No success toast; only implicit flip to read view.
- Threshold sits outside "Alert when" fieldset though validation treats it as a condition.

## Questions to Consider
- Why can a user create/edit but not disable/delete here?
- What if the layout treated the drawdown threshold as the alert condition it already is in validation?
- Is showing the create form the safe default before the list loads, given it can produce duplicates on failure?
