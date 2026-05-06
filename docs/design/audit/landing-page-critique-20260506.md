# Landing Page Critique

Reviewed file: `frontend/src/app/page.tsx`

I reviewed `frontend/src/app/page.tsx` against the Impeccable rubric and the Blockbuilders product/design context. No files were edited during the critique.

Automated scan/browser note: `npx impeccable --json frontend\src\app\page.tsx` could not run because `npx`/`npm` are not available on PATH, and the frontend has no local `node_modules`, so I did not render the page live.

## Anti-Patterns Verdict

This does not look deeply broken or sloppy, but it does read like a competent SaaS landing template: icon grid, "How it works," abstract feature cards, final CTA card. It avoids the worst tells: no gradient text, no neon crypto styling, no glassmorphism, no hero metric cliche. The issue is not taste crime; it is under-commitment.

The biggest missed opportunity: Blockbuilders' actual differentiator is visual strategy construction, but the hero preview is hidden on mobile and decorative on desktop. The page talks about blocks more than it lets users see the product.

## Design Health

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 2 | Static page has clear CTAs, but no preview state beyond "ready." |
| 2 | Match System / Real World | 3 | Plain language, but "strategy makes sense" stays vague. |
| 3 | User Control and Freedom | 3 | Clear sign-in/signup paths. |
| 4 | Consistency and Standards | 3 | Consistent with app tokens and components. |
| 5 | Error Prevention | 2 | Trust/risk caveats are light for trading software. |
| 6 | Recognition Rather Than Recall | 3 | Steps and features are visible. |
| 7 | Flexibility and Efficiency | 2 | Only one funnel path; no demo/explore route. |
| 8 | Aesthetic and Minimalist Design | 2 | Clean, but too template-like and card-heavy. |
| 9 | Error Recovery | 1 | Mostly not applicable on a static page. |
| 10 | Help and Documentation | 2 | Footer links exist, but no visible "how backtests work" reassurance. |
| **Total** |  | **23/40** | **Acceptable, needs sharper product proof** |

Cognitive load: moderate, 2 checklist failures. The page is easy to scan, but the features section asks users to process five similar cards, and complexity is described broadly rather than revealed through a concrete example.

## What's Working

The page is calm and trustworthy. It respects the anti-reference: no Web3 hype, no fake terminal drama.

The accessibility foundation is decent: skip link, semantic sections, headings, real links/buttons, decorative icons marked hidden.

The CTA hierarchy is clear. "Start building free" wins over "Sign in," and the no-credit-card reassurance is useful.

## Priority Issues

### [P1] The hero undersells the product

The actual canvas preview starts at `frontend/src/app/page.tsx:174`, is hidden below `lg`, and is `aria-hidden`. For many users, the first viewport becomes pure claims with no product proof.

Fix: show a real or closer-to-real mini strategy canvas in the first viewport on all sizes. Use the block grammar, connections, a tiny equity/result panel, and readable labels.

### [P1] The copy is too generic for a trading strategy lab

"Build crypto strategies visually" and "Everything you need to test your ideas" are true, but interchangeable with many no-code tools.

Fix: make the landing page concrete: "Turn an EMA crossover idea into a backtest in minutes," "see drawdown before risking capital," "fees and slippage stay visible."

### [P2] Feature cards dilute the narrative

The five-card grid at `frontend/src/app/page.tsx:281` is the most template-like section. Equal cards make every feature feel equally important.

Fix: replace with a narrative product strip: build, test, inspect, monitor. Give the canvas/backtest result more visual weight than secondary monitoring.

### [P2] Trust needs more specificity

For retail crypto traders, "real historical data" is not enough. They need to know what assumptions exist before they trust results.

Fix: add a compact trust band for historical pairs, fees/slippage assumptions, drawdown visibility, and transparent trade lists.

### [P3] Final CTA is visually safe

The rounded CTA card at `frontend/src/app/page.tsx:305` is clean but conventional.

Fix: end with a small "first strategy" preview or checklist instead of another centered card.

## Persona Red Flags

Jordan, first-timer: understands the basic promise, but may not know what a "block" looks like because the key visual proof is hidden on mobile.

Riley, stress tester: will look for assumptions behind "real historical data" and "results immediately." The page does not surface enough transparency to satisfy them.

Casey, mobile user: gets the CTA, but misses the product preview entirely because the hero visual is desktop-only.

## Questions

1. Should the next pass prioritize product proof in the hero, sharper trading-specific copy, or trust/backtest assumptions?
2. Do you want this landing page to stay very restrained, or become more distinctive while still avoiding crypto-neon hype?
3. Scope-wise, should we tackle the top 3 issues only or redesign the full landing page flow?
