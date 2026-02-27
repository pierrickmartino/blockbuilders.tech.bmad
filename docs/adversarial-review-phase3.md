# BMAD Party Mode: Adversarial Review — Phase 3 "Confidence Engine"

**Date:** February 27, 2026  
**Inputs:** PRD v1.0 (Phase 3), Architectural Review (Phase 3), Brainstorming Report, Competitive Analysis, Product Documentation  
**Reviewers:** John (PM) · Archie (Architect) · Uma (UX Designer)

---

## Ground Rules

Each epic gets three lenses. Nobody gets to be polite. The goal is to find what breaks before the users do.

---

## Epic 4: Progressive Disclosure (RICE: 180)

### 🟦 John (PM): Is this the right priority?

**Verdict: Yes — and the RICE score is honest.**

This is the single highest-leverage change in the phase. The brainstorming report called out the "expert tool perception" as a HIGH severity risk, and the competitive analysis confirmed that no competitor is solving for the Alex persona. A frontend-only toggle that reduces cognitive load for 100% of canvas users, with 1 week of effort, is the definition of a quick win.

My one concern: the RICE score of 180 may actually *understate* the impact because it scores Impact as 2 (high) rather than 3 (massive). I'd argue that if progressive disclosure fails — if Alex still opens the palette and sees Ichimoku Cloud front and center — every downstream epic suffers. This is a load-bearing wall, not just a nice-to-have.

**Challenge to the team:** Ship this in Sprint 1, week 1. There is no excuse for delay. If this slips, it means we're prioritizing engineering comfort over user value.

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: Yes — 1 week is credible, possibly generous.**

This is purely frontend. No schema changes, no API changes, no backend work. The architectural review confirms: localStorage for the toggle, a frontend mapping layer for the plain-English labels, and filtering the existing indicator list by a "tier" tag. The React component library already renders these cards.

**One hidden cost the PRD glosses over:** Story 4.2 says "each card shows a plain-English primary label with the technical name as subtitle." Someone has to *write* those labels and decide which indicators are "Essentials" vs. "All." That's a product/content decision, not an engineering one, but it'll block the PR if it's not done in advance. Put the label mapping in the PRD as an appendix before sprint planning.

**No red flags.** This is one of the few epics where the estimate might be too high rather than too low.

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: Yes, with one critical design caveat.**

This is the most user-impactful epic in the phase. The brainstorming report nailed it: "Seeing 'Ichimoku Cloud' in a block palette doesn't make an average crypto user feel empowered. It makes them feel like this tool isn't for them." Progressive disclosure directly solves this.

**My concern is the default state.** The PRD says the toggle defaults to "Essentials" for all users, and existing power users toggle to "All." But what happens when an existing power user who's built strategies using Ichimoku logs in and their palette is suddenly filtered? Even if "All" is one click away, the perception is "you took my stuff away." 

**Recommendation:** Default new users to Essentials. Default existing users who have strategies using non-Essential indicators to "All." This requires checking the user's strategy history on first load — a trivial query — but it avoids a support ticket wave.

**Second concern:** The label "Essentials / All" is functional but cold. Consider "Simple / Everything" or "Beginner / Full Toolkit." The word "Essentials" implies the others are non-essential, which alienates power users. Test the label copy.

---

## Epic 2: Plain-English Results (RICE: 127)

### 🟦 John (PM): Is this the right priority?

**Verdict: Absolutely — this is the product's reason to exist.**

The competitive analysis is unambiguous: *no competitor does this.* TradingView shows Sharpe ratios without explanation. 3Commas shows profit tables. Composer shows equity curves. Nobody tells Alex: "Your strategy would have turned $5,000 into $7,100, but you'd have watched it drop to $3,800 in March before recovering."

This is the core differentiator. If we ship Phase 3 with every other epic but skip this one, we've failed. The RICE score of 127 is second only to Progressive Disclosure, and I'd argue this has higher *strategic* value even if the effort is larger.

**One prioritization challenge:** The PRD includes Story 2.3 (simplified default metrics view) in the MVP scope. This is really a progressive-disclosure story wearing a results-page costume. Consider building it as part of Epic 4's momentum — same design principle, adjacent UI surface.

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: 2 weeks is realistic for the MVP stories, but the narrative engine needs design time that isn't in the estimate.**

The architecture review says this is "template-based text rendering from existing backtest metrics" and recommends a server-side `narrative.py` module. Agreed. But the PRD's acceptance criteria are deceptively demanding:

- Story 2.1 requires: starting → ending balance, best period, worst period (drawdown in dollars), trade count, and buy-and-hold comparison. That's five data points stitched into natural-sounding prose. The "natural-sounding" part is the hard part. Template strings with variable substitution produce awkward text quickly — "Your strategy generated 47 trades and your best period was January 2024" reads like a mail merge.
- Story 2.2 requires a zero-trade fallback narrative and suppression of all metrics. Simple, but it's an entirely separate code path.
- Story 2.9 (FR-09) asks drawdown to be described "experientially" — "You would have watched your $10,000 drop to $X." This is the kind of copy work that takes three iterations to not sound robotic.

**Hidden complexity:** Edge cases. What about a backtest with 1 trade? With a 0% return? Where buy-and-hold also lost money? Where max drawdown is 0% (strategy was never in a losing position)? The PRD says "QA with ≥20 diverse backtest outputs" but I'd say 50 is the minimum to catch the narratives that read wrong.

**My estimate:** 2 weeks for the engineering, plus 1 week of copy iteration. Budget 3 weeks to be safe. The 2-week estimate assumes the narrative templates are handed to engineering fully written and edge-case-tested.

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: This is the most important thing we're building. But the execution has to be flawless or it backfires.**

A narrative that sounds robotic or gets the math subtly wrong is *worse* than no narrative at all. If Alex reads "Your strategy turned $5,000 into $5,000" with a bunch of metrics below, they think "this is just a sentence version of the number I can already see — why bother?" The narrative has to add *insight*, not just restate data.

**What makes this work:**
- Emotional anchoring: "You would have watched your investment drop 38% in March" — this connects to Alex's actual fear (panic selling)
- Comparison framing: "Your strategy beat buy-and-hold by 12 percentage points" — this answers the question Alex actually has
- Actionable edge: "Your strategy only triggered 4 trades in 3 years — consider whether your entry conditions are too strict" — this teaches

**What kills this:**
- Robotic prose that reads like a form letter
- Narrative that contradicts what the user sees in the metrics (rounding differences, etc.)
- Overly positive framing for bad results ("Your strategy lost 40% but here are some good things!")

**Recommendation:** Write 10 sample narratives across diverse backtest outcomes and user-test them with 5 Alex-persona people *before* engineering starts. If the narrative templates aren't right, no amount of code quality will save the feature.

---

## Epic 7: Data Transparency (RICE: 95)

### 🟦 John (PM): Is this the right priority?

**Verdict: Yes — and it's almost free.**

This is a 0.5-week effort that directly prevents Premium-tier churn. A user who pays $19/month, selects SUI (launched 2023), picks a 5-year backtest range, and gets confusing results or errors will churn. One inline message — "Data for SUI starts at May 2023" — prevents that entirely.

The RICE score of 95 might even be conservative. The Confidence score of 95% is the highest of any epic, and the Effort of 0.5 weeks is the lowest. This should be the first thing merged after Epic 4.

**No pushback. Ship it.**

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: Yes — 0.5 weeks is honest, possibly even padded.**

The `data_quality_metrics` table already exists (migration 009). The daily validation job already computes coverage. This is one API endpoint extension (or a new lightweight endpoint) plus a frontend warning component. The architectural review gives it a clean bill of health.

**One thing to verify before sprint planning:** Does `data_quality_metrics` already store `earliest_candle_date` and `latest_candle_date` explicitly, or does the daily job compute them and discard them? If they're not persisted, add two columns. If they are, this is even simpler than estimated.

**No hidden complexity. No red flags.**

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: Yes — but the warning copy matters.**

The acceptance criteria specify: "Data for [asset] starts at [date]. Your backtest will use the available range." This is good — it's informational, not blocking. The user isn't prevented from running the backtest; they're told what to expect.

**One UX improvement:** Instead of just warning, auto-adjust the date picker. If Alex selects "5 years" for SUI, snap the start date to May 2023 and show a toast: "Adjusted to match available data (May 2023–Present)." This is more helpful than a warning the user has to act on manually. The user might not know *what to do* with the warning otherwise.

**Minor concern:** Make sure the data availability info is visible *before* the user clicks "Run Backtest," not after. The PRD says it shows on asset selection, which is correct. Just don't let it drift to a post-run error state.

---

## Epic 1: Wizard-First Onboarding (RICE: 90)

### 🟦 John (PM): Is this the right priority?

**Verdict: Right priority, wrong RICE position.**

The brainstorming report called onboarding the #1 CRITICAL risk. The competitive analysis confirms no competitor solves the first-run experience well for non-technical users. This is the epic that determines whether Alex becomes a user or bounces.

So why is it fourth in the RICE ranking? Because the Effort is 3 weeks, which drags the score down. But RICE is a prioritization heuristic, not a religion. If Epic 1 fails, Epics 2, 3, 4, 6, and 7 don't matter — there's nobody left to use them.

**My challenge:** Build Epic 4 first (1 week, quick win, builds momentum). Then build Epic 1 immediately after — not after Epics 2 and 7. The RICE ordering of 4 → 2 → 7 → 1 is locally optimal but strategically wrong. A user who has a great onboarding experience but sees raw metrics is better off than a user who never gets past signup but would have loved the narrative.

**Proposed order:** Epic 4 → Epic 1 → Epic 2 → Epic 7 → Epic 3 → Epic 6 → Epic 5.

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: 3 weeks is realistic but tightly packed. I see one scheduling risk.**

The stories decompose cleanly:
- **1.1** (wizard as default): A Next.js routing change + the `has_completed_onboarding` flag. 2-3 days.
- **1.2** (auto-backtest): Wire wizard completion to existing `POST /backtests`. The loading state and 30-second SLA are the interesting parts. 3-4 days.
- **1.3** (guided overlay): Frontend-only tutorial overlay. 2-3 days.
- **1.4** (escape hatch): A link. Half a day.

That sums to ~9-10 working days, which fits in 2 weeks of pure engineering. The third week is buffer for the backtest SLA work and QA.

**The scheduling risk:** Story 1.2 depends on backtest performance. The architectural review flags the 30-second SLA and recommends a dedicated `wizard_backtests` RQ queue. That queue setup is a Docker Compose config change — trivial technically, but it needs to be decided and tested before Story 1.2 can pass QA. Don't leave this for "we'll figure it out in the sprint."

**The backfill migration** (set `has_completed_onboarding = true` for existing users with backtests) is also trivial but easily forgotten. Put it in the sprint plan explicitly.

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: This will work — if Story 1.3 (the guided overlay) doesn't feel like a tooltip tour.**

Wizard-first onboarding is exactly what Alex needs. The research is clear: guided paths outperform blank canvases for non-technical users. The "Skip to dashboard" escape hatch respects experienced users. Auto-backtesting on wizard completion is brilliant — it removes the scariest decision ("did I do this right?") and replaces it with results.

**My concern is Story 1.3.** "A guided overlay highlights each of the 5 default metrics with a 1-2 sentence plain-language explanation" — this sounds like a tooltip walkthrough. Users *hate* tooltip walkthroughs. They click "Next, Next, Next, Got it" without reading.

**Better pattern:** Instead of an overlay that pauses the experience, integrate the explanations *into* the results page permanently (for the first view). Put the plain-English explanation directly under each metric, in smaller grey text. The user reads them naturally while looking at their results. No modal, no overlay, no forced progression. On subsequent views, collapse the explanations into "?" hover icons.

If we must use an overlay, make it conversational, not clinical. "This number? It's how much your strategy would have made. Green is good." Not "Total Return % represents the percentage change in portfolio value over the backtest period."

**Second concern:** The 30-second SLA (NFR-01). If the backtest takes 28 seconds, Alex is staring at a loading spinner for half a minute right after their first interaction with the product. That loading state needs to be *engaging*, not just a spinner. Show progress: "Building your strategy... Running against 365 days of BTC data... Calculating results..." Make the wait feel productive.

---

## Epic 3: Strategy Health & Honesty (RICE: 48)

### 🟦 John (PM): Is this the right priority?

**Verdict: Yes for MVP scope (Story 3.1 only). The deferral of 3.2 and 3.3 is the right call.**

The low-trade-count warning is the single most important honesty feature. A 3-year backtest with 4 trades that shows +200% return will give Alex false confidence — which is the *opposite* of our product thesis. One warning banner that says "This strategy only triggered 4 trades — results may not be statistically meaningful" is the minimum viable honesty.

Stories 3.2 (overfitting) and 3.3 (bear-market fragility) are correctly deferred. The heuristics for overfitting detection are genuinely hard to get right, and a bad overfitting warning ("Your strategy might be overfitted" with no explanation of what that means) could confuse Alex more than it helps.

**The MVP scope is exactly right. Don't expand it.**

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: For Story 3.1, the 2-week estimate is way too generous. This is 2-3 days of work.**

The architectural review says it plainly: the MVP scope is `if num_trades < 10: show_warning()`. That's a frontend conditional and a warning banner component. There are no schema changes, no new endpoints, no backend logic. The `num_trades` column already exists on `backtest_runs`.

The 2-week estimate in the RICE score is for the entire epic (3.1 + 3.2 + 3.3). Since 3.2 and 3.3 are deferred, the actual MVP effort is a fraction of that. Recalculate the RICE score for MVP scope: Effort drops to ~0.3 weeks, pushing the score significantly higher. This should be slotted into any sprint with spare capacity — it's almost free.

**No architectural concerns whatsoever.**

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: Yes, but the framing is everything.**

The PRD's Risk R-03 identifies the danger: "Users see warnings and think 'my strategy is bad' instead of 'this is honest feedback.'" This is a real risk. Nobody likes being told their work might be wrong.

**What works:** "Your strategy triggered 4 trades over 3 years. With so few trades, results can vary a lot — try a longer date range or looser entry conditions to get more data points." This is coaching. It tells the user *what happened*, *why it matters*, and *what to do about it.*

**What doesn't work:** "⚠️ Warning: Low statistical significance. Results may not be reliable." This is a medical disclaimer. Alex doesn't know what statistical significance means and now feels less confident, not more.

**Recommendation:** Write the warning copy as if you're a patient trading mentor, not a compliance officer. User-test 3 variants of the copy before shipping.

---

## Epic 6: Educational Templates (RICE: 22)

### 🟦 John (PM): Is this the right priority?

**Verdict: Correctly deprioritized. Content work that can run in parallel.**

The RICE score of 22 is the second-lowest, which is appropriate. The templates infrastructure already exists. The "What this teaches" section (Story 6.1) and new Alex-persona templates (Story 6.2) are content work, not engineering work. The PRD correctly notes this can be done by a non-engineering team in parallel.

**My one pushback:** The PRD puts Epic 6 entirely out of MVP scope. I disagree partially. Story 6.1 ("What this teaches" section) requires a minor schema change and a frontend component, but the *content* — the actual educational descriptions — can be written in parallel. Ship the empty container (the UI component + schema) in the MVP, and fill the content in Phase 3.1. This way, when the content team finishes writing, it's a data insert, not a code deploy.

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: 1 week is right for the engineering. The content is the bottleneck.**

Two columns on `strategy_templates` (`teaches_description TEXT`, `difficulty VARCHAR`), one Alembic migration, one frontend component, and seed data for 3 new templates. The architectural review gives it a clean bill.

**The content is the unknown.** Writing 2-3 sentences that explain mean reversion to someone who's never heard the term, in a way that's accurate and approachable, is hard. It's not engineering-hard; it's copywriting-hard. Budget for content review cycles.

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: Potentially high-impact, but only if the templates are genuinely beginner-friendly.**

The existing templates (RSI Oversold Bounce, MA Crossover, Bollinger Breakout) are named for the *indicator*, not the *idea*. "RSI Oversold Bounce" means nothing to Alex. "Buy the Dip" means everything.

Story 6.2 gets this right — "Buy the Dip," "Trend Follower," "Safe Exit" are idea-first names. The "What this teaches" section (6.1) bridges the gap between the idea and the technical concept. This is good design.

**My concern:** The difficulty labels "Beginner / Intermediate / Advanced" might create a gate. If Alex sees "Intermediate" on a template, they might skip it even if they could handle it. Consider "Start Here / Level Up / Deep Dive" or just order by complexity without explicit labels that imply exclusion.

---

## Epic 5: Weekly Digest & Retention (RICE: 19)

### 🟦 John (PM): Is this the right priority?

**Verdict: Correctly last. The MVP scope is smart — defer the email, ship the plumbing.**

RICE score of 19 is right. Reach is 40% (only users with auto-update strategies), and we have no user base yet to send digests to. The PRD's decision to defer the actual email sending (Stories 5.1/5.2) to Phase 3.1 and only ship opt-out controls (5.3) plus the rename (FR-24/FR-25) is the right call.

The rename from "Paper Trading" to "Strategy Monitor" is high-trust-impact for near-zero effort. The brainstorming report flagged the misleading terminology as a P1 risk. Ship the rename with the first sprint — it's a UI label change with no backend work.

**One caution:** Don't over-invest in the opt-out UI for an email that doesn't exist yet. A simple toggle on the settings page is sufficient. Don't build a fancy per-strategy notification center for Phase 3 MVP.

### 🟧 Archie (Architect): Is the complexity estimate realistic?

**Verdict: For MVP scope (opt-out + rename), the 3-week estimate is wildly over-scoped. This is 3-4 days.**

The MVP scope is:
- Two boolean columns (`digest_email_enabled` on `users` and `strategies`). One migration. 30 minutes.
- A settings page toggle. 1 day.
- UI label rename ("Paper Trading" → "Strategy Monitor"). A few hours of find-and-replace in the frontend.

The 3-week estimate is for the full epic including batch email sending, email template design, and content writing. For MVP scope, this is measured in days, not weeks.

**Phase 3.1 risk flag:** When the actual email sending is built later, the batch job design needs to be right. The architectural review recommends chunked processing (100 users per batch). Agree. But that's a future-sprint concern, not a Phase 3 blocker.

### 🟩 Uma (UX): Will users actually use/understand this?

**Verdict: The rename is high-impact. The opt-out toggle is table stakes. Neither will excite anyone.**

Renaming "Paper Trading" to "Strategy Monitor" is quietly one of the most trust-building changes in the phase. The brainstorming report identified the current terminology as misleading — users might expect live simulated trading, not historical re-backtesting. "Strategy Monitor" is honest and sets correct expectations.

The opt-out toggle is infrastructure for a feature that doesn't exist yet. Users won't notice it, and that's fine. It's there so that when the digest launches in Phase 3.1, users already have control.

**No UX concerns for MVP scope.**

---

## Final Recommendations

### Build Order (Revised from PRD)

| Order | Epic | Effort (MVP) | Rationale |
|-------|------|-------------|-----------|
| 1 | **Epic 4: Progressive Disclosure** | 1 week | Highest RICE, frontend-only, unblocks everything. Sprint 1. |
| 2 | **Epic 1: Wizard-First Onboarding** | 3 weeks | #1 risk factor. If Alex bounces at signup, nothing else matters. Start Sprint 2. |
| 3 | **Epic 2: Plain-English Results** | 2-3 weeks | Core differentiator. Epic 1 creates the user; Epic 2 creates the "aha moment." |
| 4 | **Epic 7: Data Transparency** | 0.5 weeks | Quick win. Slot into any sprint with capacity. |
| 5 | **Epic 3: Strategy Health (3.1 only)** | 0.5 weeks | Near-free trust feature. Slot alongside Epic 7. |
| 6 | **Epic 5: Rename + Opt-out only** | 0.5 weeks | Label change + toggle. Slot into any sprint. |
| 7 | **Epic 6: Educational Templates** | 1 week eng + content | Ship the container in MVP, fill content in 3.1. |

### What to Build First

**Sprint 1:** Epic 4 (Progressive Disclosure) + Epic 5 rename (Paper Trading → Strategy Monitor) + Epic 7 (Data Transparency). Total: ~2 weeks. All frontend-heavy, low-risk, immediately visible. Ships three improvements users can feel on day one.

**Sprint 2-3:** Epic 1 (Wizard-First Onboarding). The foundational experience change. Dedicate full focus.

**Sprint 4-5:** Epic 2 (Plain-English Results). The differentiator. By now, users are arriving (Epic 1) and the canvas feels approachable (Epic 4). Results are the payoff.

### What to Defer

| Item | Defer to | Why |
|------|----------|-----|
| Stories 5.1/5.2 (digest email) | Phase 3.1 | No user base to email yet. Ship plumbing now, emails later. |
| Stories 3.2/3.3 (overfitting, bear-market warnings) | Phase 3.1 | Heuristics are hard. Ship low-trade-count warning, learn from analytics, then add sophistication. |
| Story 6.1/6.2 content | Phase 3.1 (content team) | Engineering ships the container; content team fills it in parallel. |

### What to Kill

**Nothing.** This is a well-scoped PRD. Every epic earns its place. The MVP scope decisions — what's in vs. what's deferred — are uniformly sound. The architectural review confirms zero new infrastructure requirements. The only thing to kill is the temptation to expand scope mid-sprint.

### Open Questions to Resolve Before Sprint Planning

1. **Which indicators are "Essentials" vs. "All"?** The PRD doesn't specify. Propose: SMA, EMA, RSI, MACD, Bollinger Bands as Essentials. Everything else is "All." Get PM sign-off before Sprint 1.
2. **Plain-English label mapping.** Who writes the indicator labels and narrative templates? If engineering, add 1 week. If a content person, they need to start now.
3. **Existing user default for progressive disclosure.** New users → Essentials. What about existing users? Recommend: check their strategy history, default to "All" if they've used non-Essential indicators.
4. **Guided overlay vs. inline explanations (Story 1.3).** The PRD specifies an overlay. Uma recommends inline. Decide before Sprint 2.
5. **Dedicated RQ queue for wizard backtests.** The architectural review recommends it. Decide before Story 1.2 enters development.

---

*Review complete. The PRD is strong. The architecture is clean. The prioritization needs a tweak (Epic 1 must come before Epic 2), but the scope is right. Ship it.*