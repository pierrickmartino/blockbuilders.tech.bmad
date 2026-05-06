# How-it-Works Critique

Reviewed file: `frontend/src/app/page.tsx`

Reviewed section: `How it works`

## Anti-Patterns Verdict

The How-it-Works section is clean, readable, and not embarrassing. It also feels like the default SaaS answer: heading, one-line subcopy, three equal cards. The product is a visual strategy lab, but this section does not visually demonstrate a strategy being built. It describes a workflow that should be shown.

Automated scan: I could not run `npx impeccable --json frontend\src\app\page.tsx` because `npx` is not available on PATH. No browser overlay was produced.

## Design Health

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 2 | Steps are clear, but no visible "progress through workflow" feeling. |
| 2 | Match System / Real World | 3 | Language is understandable for traders. |
| 3 | User Control and Freedom | 2 | Static section, no alternate path to demo or inspect. |
| 4 | Consistency and Standards | 3 | Uses existing card/token vocabulary well. |
| 5 | Error Prevention | 2 | No mention of assumptions, fees, slippage, or risk while describing backtesting. |
| 6 | Recognition Rather Than Recall | 3 | Three-step model is easy to scan. |
| 7 | Flexibility and Efficiency | 1 | Only one linear beginner path. |
| 8 | Aesthetic and Minimalist Design | 2 | Minimal, but generic and card-heavy. |
| 9 | Error Recovery | 1 | Mostly not applicable here. |
| 10 | Help and Documentation | 2 | "How it works" explains process, not trust details. |
| **Total** |  | **21/40** | **Acceptable, but underpowered** |

Cognitive load: low to moderate. The three cards are easy to parse, but the section fails progressive disclosure: it compresses a distinctive visual workflow into generic prose.

## What's Working

The section has a clear sequence: pick, connect, run. That maps well to how a first-timer expects a no-code builder to work.

The copy is restrained and approachable. It avoids crypto hype, terminal cosplay, and fake complexity.

The semantic structure is solid: `section`, `ol`, `li`, headings, and screen-reader step labels are all sensible.

## Priority Issues

### [P1] The section tells instead of shows

The three cards explain the product, but a visual strategy builder should make the workflow visible.

Fix: replace or augment the equal cards with a horizontal mini flow: block picker -> canvas connection -> backtest result. Use the actual block grammar, not abstract cards.

Suggested command: `impeccable layout`

### [P1] Step 3 skips the trust moment

"Run & iterate" says to review equity curve and metrics, but does not mention what matters for trading trust: fees, slippage, pair/date range, drawdown, trade list.

Fix: make the third step show a tiny result panel with assumptions visible. This would reinforce Blockbuilders' "transparent by design" principle.

Suggested command: `impeccable clarify`

### [P2] The three cards have equal weight

Pick blocks, configure logic, and backtest results are not equally persuasive. The result is the payoff, but visually it gets the same treatment as setup.

Fix: give the final step more visual consequence: wider column, embedded mini chart, or stronger "backtest output" artifact.

Suggested command: `impeccable layout`

### [P2] Copy is too generic

"Pick your blocks," "Connect & configure," and "Run & iterate" could belong to any no-code tool.

Fix: anchor it in a concrete strategy example: EMA crossover, RSI threshold, stop-loss, BTC/USDT backtest.

Suggested command: `impeccable clarify`

## Persona Red Flags

Jordan, first-timer: understands the three steps, but still may not know what a "block" looks like from this section alone.

Riley, stress tester: will want proof that backtests are transparent. This section currently hides the assumptions that would earn trust.

Casey, mobile user: gets a readable three-card stack, but misses the product's most distinctive visual behavior.

## Best Next Move

Run `impeccable layout` on the How-it-Works section first, then `impeccable clarify` for sharper trading-specific copy. The goal should be: "I can see an EMA crossover idea becoming a backtest," not just "I read three steps."
