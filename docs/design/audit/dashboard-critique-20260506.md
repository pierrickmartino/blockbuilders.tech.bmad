# Dashboard Critique

Audited page: Dashboard (`/dashboard`)

## Design Health

Dashboard score: **24/40, Acceptable**. Solid foundation, but it feels more like a generic app dashboard than a precise strategy lab instrument.

| # | Heuristic | Score | Key Issue |
|---|---:|---|
| 1. System Status | 3 | Loading, success, error states exist, but clone feedback is transient and thin. |
| 2. Real World Match | 3 | Clear trading terms, but "recently viewed backtests" is less useful than strategy outcome/status. |
| 3. Control/Freedom | 2 | Clone has no undo or confirmation context. |
| 4. Consistency | 2 | Dashboard docs and implementation diverge; sidebar uses a banned active side stripe. |
| 5. Error Prevention | 2 | Low-risk page, but duplicate/clone flow lacks safeguards. |
| 6. Recognition | 3 | Main sections are discoverable; primary next action is too buried. |
| 7. Efficiency | 2 | Good recents, but no search, sort, run/backtest shortcut, or visible power-user path. |
| 8. Minimal Design | 2 | Clean, but the KPI row is generic and some elements are empty/noisy. |
| 9. Error Recovery | 3 | Retry exists for strategy load failure. |
| 10. Help | 2 | "Learn about assumptions" helps, but not contextual to dashboard decisions. |

## Anti-Patterns Verdict

This does not scream "AI made this," but it does have recognizable AI/product-template residue.

The biggest tells are the hero-plus-KPI-card structure in `frontend/src/app/(app)/dashboard/page.tsx`, the large metric cards, and the dark CTA card. It is calm, but not yet specific enough to Blockbuilders.

The deterministic scan could not run: `npx` is not available on PATH, `npm` is missing, and `frontend/node_modules` is absent. Browser/Pencil visual checks were also blocked, so no overlay tab was produced.

## What's Working

The page is restrained, readable, and avoids crypto-neon spectacle. That matches the product personality.

The async states are better than average: skeleton rows, retry on load failure, and clone success messaging are all present.

The strategy list has useful operational density: name, pair, timeframe, updated time, and clone action are scannable.

## Priority Issues

**[P1] The dashboard lacks a sharp primary job.**

Right now it greets the user, shows counts, and lists recents. For a strategy lab, the first question should be closer to: "What strategy needs attention?" or "What can I validate next?"

Fix: make the hero/action area about continuing work: last edited strategy, last backtest result, or "Run next backtest." Suggested command: `impeccable layout`.

**[P1] Generic KPI cards dilute product specificity.**

"Strategies" and "Recently viewed backtests" are counts, not insight. The third card is a CTA disguised as a metric card.

Fix: replace with decision-grade signals: draft strategies, last run return/drawdown, unvalidated strategies, alerts triggered, or data freshness. Suggested command: `impeccable distill`.

**[P2] Visual system violations in app chrome.**

The sidebar logo uses a decorative gradient, and the active nav uses `border-l-2`, which the skill explicitly bans.

Fix: use a flat mark and active background/text treatment instead. Suggested command: `impeccable polish`.

**[P2] Implementation/doc drift creates product ambiguity.**

Storybook documents "Recently Viewed Strategies," but the route does not render that section.

Fix: either restore the section or update the page story so design intent is trustworthy. Suggested command: `impeccable clarify`.

**[P3] Empty containers suggest unfinished composition.**

There are empty flex areas in the hero/action card region, which reads like removed UI without layout cleanup.

Fix: remove them or replace them with intentional actions. Suggested command: `impeccable polish`.

## Persona Red Flags

**Alex, power user:** No fast path to run a backtest, search strategies, sort the dashboard list, or jump to the most recent strategy outcome. The page is pleasant but not fast.

**Sam, accessibility-dependent user:** Nested `<main>` landmarks from app layout plus dashboard page can muddy screen-reader navigation. Color-coded returns include icons, good, but the absolute row link plus clone button pattern deserves keyboard testing.

**Jordan, first-timer:** "Your strategy workspace is ready" is friendly but vague. The first useful action is split between "Learn about assumptions," "New Strategy," and "View all," so the page does not clearly teach the first move.

## Questions

1. Should the dashboard become a **work-resume surface** or a **strategy health overview**?
2. Are the KPI cards meant to stay, or can they be replaced with more trading-specific signals?
3. Do you want a critique-to-plan next, or should this remain review-only for now?
