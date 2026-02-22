# 🎯 BMAD Party Mode: Adversarial Review

**Blockbuilders Phase 2 PRD + Architecture Delta**

**Reviewers:**
- 🎩 **John (PM):** Is this the right priority?
- 🏗️ **Archie (Architect):** Is the complexity estimate realistic?
- 🎨 **Uma (UX Designer):** Will users actually use/understand this?

**Date:** February 22, 2026

---

## Context Check: The Elephant in the Room

Before we go epic-by-epic, all three of us need to say it.

> **🎩 John:** This product has exactly one user — the founder. Every RICE score in this PRD has a Reach number that is, by definition, fictional. We're scoring "8 out of 10 users impacted" when there are zero users. The entire Phase 2 must be viewed through a single lens: *what is the minimum viable set of changes that gets us to 5–10 real beta testers giving real feedback?* Anything that doesn't serve that goal is vanity work.

> **🏗️ Archie:** Agreed. The architecture delta is clean — the stack can handle all of this. But "can build" ≠ "should build." A solo developer working part-time for 90 days has roughly 20–25 effective person-weeks. The PRD scopes 22.5 person-weeks for in-scope items alone, leaving zero buffer for debugging, yak-shaving, and the inevitable short-selling regression rabbit holes. Something has to give.

> **🎨 Uma:** And from the user side: we're designing for a persona we've literally never talked to. Every UX decision in this PRD — progressive disclosure thresholds, insight verbosity levels, wizard question count — is an educated guess. The single most valuable thing Phase 2 can do is get real humans using this product so we can replace guesses with data. I'd sacrifice half these features for five user interviews.

---

## Epic-by-Epic Review

---

### E-01: Educational Backtest Insights
**PRD Priority: Must | RICE Rank: #4 | Effort: 3 weeks**

**🎩 John — Priority: ✅ Correct, but sequence matters.**
This is the single biggest competitive differentiator. No competitor does this. The competitive analysis confirms it unanimously. *However*, it depends on E-03 (Short Selling) being stable first — Archie's architecture review correctly flags that educational insights confidently explaining wrong numbers is worse than no insights at all. The PRD's week 8–10 timing is right. Don't touch this until the engine is solid.

**🏗️ Archie — Complexity: ⚠️ 3 weeks is tight but achievable — IF scoped tightly.**
The computation is trivial (trade count checks, heuristics). The real work is in the UX copy and the edge cases: What does the overfitting detector say for a strategy with 200 trades but all in one market regime? What about a strategy that only ever holds one position? The "2–4 automatically generated warnings" acceptance criterion is deceptively open-ended. Every warning needs testing across strategy archetypes. I'd budget 2 weeks for the engine-side work and flag the remaining week as at-risk for UX iteration.

**🎨 Uma — User value: ⚠️ High potential, high patronizing risk.**
This is the feature that *could* make Blockbuilders special or *could* make users feel talked down to. The PRD acknowledges this (R-06: "Educational insights feel patronizing to intermediate users") but the mitigation — configurable detail levels — adds implementation scope. **My recommendation:** Ship V1 with a single, well-crafted verbosity level aimed squarely at the beginner persona. Don't build the configuration UI. If beta testers complain it's too basic, *that's signal you have intermediate users* — a good problem. If they don't complain, you saved a week of work.

**Verdict: BUILD — but only after E-03, and cut the configurable detail levels.**

---

### E-02: Market Regime Analysis
**PRD Priority: Deferred to v2.1 | RICE Rank: Not scored | Effort: ~2 weeks**

**🎩 John — Priority: ✅ Correctly deferred.**
Already deferred in the PRD. I agree. E-01 (plain-language insights) delivers 80% of the educational value at a fraction of the complexity. Regime overlays on equity curves are cool for intermediate users but confusing for beginners who don't yet know what a "regime" is.

**🏗️ Archie — Complexity: N/A (deferred).**
Architecturally clean when we get to it. No concerns.

**🎨 Uma — User value: 🔴 Beginners won't understand this.**
"Bull/bear/sideways classification" — these are concepts our target persona doesn't have yet. If a beginner runs their first backtest and sees colored zones labeled "Sideways Regime: -3.2% return," they'll be confused, not educated. This belongs in Phase 3 after users have run multiple backtests and developed some literacy.

**Verdict: DEFER — correctly scoped to v2.1.**

---

### E-03: Short Selling Engine
**PRD Priority: Must | RICE Rank: #3 | Effort: 3 weeks**

**🎩 John — Priority: ✅ Absolutely Must.**
The competitive analysis is unambiguous: every competitor supports short positions. Long-only is the single fastest way to get dismissed by anyone with even basic trading knowledge. If a beta tester tries to create a "short BTC when RSI > 70" strategy and can't, they'll close the tab. This is table stakes, not a feature.

**🏗️ Archie — Complexity: 🔴 3 weeks is optimistic. Budget 4.**
This is the riskiest change in the entire PRD. It touches the core backtest interpreter, simulation loop, and *every* risk management block. The architecture review I already wrote lays this out: stop-loss triggers invert for shorts (price rises to SL), trailing stops need directional logic, P&L calculation flips, max drawdown calculation must account for unlimited theoretical loss on shorts. The regression test suite alone (~20 scenarios covering backward compat + short-specific + mixed) needs a full week. And here's the hidden complexity the PRD doesn't address: **what about the take-profit ladder?** The existing TP ladder (sell 50% at +5%, 25% at +10%, etc.) needs to work in reverse for shorts. That's not trivial to test.

I'm elevating my original recommendation: **E-03 is a prerequisite epic with a regression gate.** No other backtest-touching epic begins until this passes. And I'd budget 4 weeks, not 3.

**🎨 Uma — User value: ✅ Clear and necessary.**
The UX is straightforward — a "Long/Short" toggle on Entry Signal blocks. Users who want short selling will immediately understand it. Users who don't want it can ignore it. The wizard (E-05) adds a question about shorting which is the right way to introduce it gently. One UX concern: the canvas needs clear visual differentiation between long and short entry blocks. A beginner glancing at their strategy should instantly see "this is a short trade" without reading labels. Color coding or an icon is essential.

**Verdict: BUILD FIRST — as a prerequisite epic. Budget 4 weeks, not 3. Gate E-01 behind it.**

---

### E-04: 1-Hour Timeframe
**PRD Priority: Must | RICE Rank: #5 | Effort: 1 week**

**🎩 John — Priority: ✅ Quick win, high credibility impact.**
Low effort, opens a new user segment (active/swing traders), and removes a "this tool is too basic" objection. The 1-week estimate makes this one of the best ROI items in the entire backlog.

**🏗️ Archie — Complexity: ⚠️ 1 week is realistic for the feature, but watch the data.**
Schema is already timeframe-agnostic — no changes needed. The real work is the scheduler (hourly fetching job) and validating data quality across 24 pairs. Here's the hidden cost: 1h candles are 24x more data than daily. Over 5 years for 24 pairs, that's ~1M rows vs ~44K for daily. PostgreSQL handles this fine at beta scale, but the *initial backfill* for 1h historical data could be slow depending on CryptoCompare rate limits. **Recommendation:** Validate 1h data availability for the top 5 pairs before committing to all 24. Launch with a subset if needed.

**🎨 Uma — User value: ✅ Simple and expected.**
Users see "1h" in a dropdown alongside "4h" and "1d." There's nothing to explain. The only UX risk is if 1h backtests are noticeably slower than daily — 8,760 candles vs 365 over one year. If a 1h backtest takes 15 seconds instead of 3, that breaks the iteration flow. This links directly to E-12 (Performance Optimization).

**Verdict: BUILD — validate data availability first, launch with top 5 pairs if needed.**

---

### E-05: Wizard-First Onboarding
**PRD Priority: Must | RICE Rank: #2 | Effort: 2 weeks**

**🎩 John — Priority: ✅ Critical path to the 10-minute target.**
The "time-to-first-backtest under 10 minutes" success criterion lives or dies on this epic. The wizard already exists from post-MVP. This epic makes it the *default* path for new users instead of an option. High leverage, reasonable effort.

**🏗️ Archie — Complexity: ✅ 2 weeks is realistic.**
This is primarily frontend routing logic and wizard flow updates. The architecture delta confirms: no schema changes (maybe one column for `onboarding_completed`), no new services, no migrations. The short-selling question in the wizard is the only dependency on E-03, but that's just a UI question — it doesn't need the engine to be complete, just the concept to be defined.

**🎨 Uma — User value: ✅ This is the most important UX change in the entire PRD.**
The blank canvas is a conversion killer. I've seen this pattern in every creative tool: Figma, Canva, Notion — they all learned that new users need a guided path, not a blank slate. Making the wizard the default and the canvas "Advanced Mode" is exactly right. **One pushback:** the acceptance criterion says "4–6 questions." I'd push for 4 maximum. Every additional wizard question is a dropout point. The goal is to get to a running backtest, not to build the perfect strategy. A mediocre strategy that runs in 3 minutes teaches more than a perfect strategy that takes 15 minutes to configure.

**Verdict: BUILD — week 3–4 as scheduled. Cap wizard at 4 questions.**

---

### E-06: Progressive Block Disclosure
**PRD Priority: Should | RICE Rank: #8 | Effort: 1.5 weeks**

**🎩 John — Priority: ⚠️ Should, but could be deferred without losing the narrative.**
The competitive analysis says progressive disclosure is "existential" for the visual builder. I agree in principle. But with 20+ block types already built and zero users, do we actually know *which* blocks confuse beginners? We're guessing at the tier assignments (Level 1: RSI, SMA, EMA; Level 2: Fibonacci, Bollinger; Level 3: Ichimoku). **Counter-proposal:** Ship the wizard-first experience (E-05) which naturally limits block exposure for new users. Observe what beta testers do. *Then* implement progressive disclosure based on actual confusion data. The wizard already provides the "guardrails" this epic aims for.

**🏗️ Archie — Complexity: ✅ 1.5 weeks is accurate.**
Frontend-only. No schema changes, no backend work. The block metadata (difficulty tier) can be hardcoded in the frontend initially. If we need to make it dynamic later, that's a simple backend addition.

**🎨 Uma — User value: ⚠️ Right idea, wrong timing.**
I love progressive disclosure in principle. But the unlock thresholds in the PRD (0 backtests → Level 1, 5 backtests → all blocks) are arbitrary. What if a user's first backtest uses RSI and they want to try Bollinger next? They've completed 1 backtest — do they see it or not? This creates frustrating moments where users *know* a feature exists but can't access it. That's worse than showing everything. **My recommendation:** If we build this, use a "show all / show basics" toggle instead of milestone-based unlocking. Let users choose their complexity level rather than gating it.

**Verdict: DEFER — let the wizard (E-05) handle initial simplification. Revisit after beta feedback.**

---

### E-07: Strategy Sentence Summary
**PRD Priority: Should | RICE Rank: #10 | Effort: 1.5 weeks**

**🎩 John — Priority: ⚠️ Nice-to-have, not critical for beta.**
"Buy [asset] when RSI drops below 30. Sell when RSI rises above 70. Stop loss at 5%." — this is lovely and reinforces the educational positioning. But is it what gets us to beta? No. It's a polish feature for an experience that doesn't yet have users. The 60% confidence score in the RICE table reflects this uncertainty.

**🏗️ Archie — Complexity: ⚠️ 1.5 weeks might be low.**
Natural language generation from block configurations is straightforward for simple strategies (single indicator + single exit). It gets messy fast with AND/OR combinators, nested conditions, and multi-indicator setups. "Buy BTC when RSI < 30 AND SMA(20) crosses above SMA(50), but only if MACD histogram is positive, sell when..." — generating a readable sentence from this requires real NLG work. Either we scope it to simple strategies only (which is fine for V1) or we're looking at 2–3 weeks.

**🎨 Uma — User value: ✅ Actually quite high for confidence-building.**
This is the feature that tells a beginner "yes, your blocks do what you think they do." That's incredibly valuable for a user who isn't sure they connected things correctly. It's a live validation mechanism. **But** — only if it works well. A bad sentence summary ("Buy when condition_1 AND condition_2 where condition_1 = RSI(14) < 30...") is worse than no summary.

**Verdict: DEFER to post-beta — or build a minimal version (simple strategies only) in 0.5 weeks if there's slack in the schedule.**

---

### E-08: Block Difficulty Badges
**PRD Priority: Should | RICE Rank: #11 | Effort: 0.5 weeks**

**🎩 John — Priority: ✅ Tiny effort, clear signal.**
Half a week for visual complexity indicators on blocks. This is the definition of a low-risk, low-effort UX improvement. Ship it whenever there's a spare afternoon.

**🏗️ Archie — Complexity: ✅ 0.5 weeks is accurate.**
Frontend-only. Hardcoded metadata. Trivial.

**🎨 Uma — User value: ✅ Small but meaningful.**
A green "Beginner" badge on RSI and a yellow "Intermediate" badge on Ichimoku tells users what they're getting into before they drag it onto the canvas. It's wayfinding, not gatekeeping. Pairs well with E-06 if that ships, but stands alone just fine.

**Verdict: BUILD — slot it into any gap. Afternoon project.**

---

### E-09: Product Analytics
**PRD Priority: Must | RICE Rank: #1 | Effort: 2 weeks**

**🎩 John — Priority: ✅ P0. Non-negotiable.**
"Can't improve what you can't measure." This is rank #1 for a reason. Without analytics, every other feature in this PRD is a shot in the dark. We need to know: Do users complete the wizard? Where do they drop off? Do they run a second backtest? Do they come back? Without this data, Phase 3 planning is guesswork.

**🏗️ Archie — Complexity: ✅ 2 weeks is realistic.**
PostHog free tier, JS snippet on the frontend, optional server SDK for backend events. The architecture decision (self-hosted vs. SaaS) has long-term implications, but PostHog SaaS is the right call for beta: zero infrastructure overhead, generous free tier, and migration to self-hosted later is well-documented. The 2-week estimate covers event taxonomy design, frontend instrumentation, backend event emission via Redis pub/sub, and basic dashboard setup.

**🎨 Uma — User value: Invisible to users (which is correct).**
Users shouldn't notice analytics. The only UX concern is consent: GDPR/cookie banner for EU users. The PRD doesn't mention this, but PostHog tracks by default. Add a minimal cookie notice or configure PostHog for cookieless mode. Don't let a compliance gap block the beta launch.

**Verdict: BUILD FIRST — weeks 1–2 as scheduled. Add cookie/consent consideration.**

---

### E-10: Beta Recruitment
**PRD Priority: Must | RICE Rank: #7 | Effort: 1 week**

**🎩 John — Priority: ✅ The whole point of Phase 2.**
Without beta testers, none of this matters. The invite flow, feedback collection mechanism, and analytics segmentation by beta cohort are what turn Phase 2 from "building features" into "learning from users." 1 week is well-spent.

**🏗️ Archie — Complexity: ✅ 1 week is fine.**
One new table (`beta_invites` or similar), a simple invite code flow, and a feedback form (could be as simple as a Typeform link). The analytics segmentation (tagging beta users in PostHog) is straightforward.

**🎨 Uma — User value: ✅ Direct.**
Beta testers need to feel valued, not like guinea pigs. The invite flow should communicate "you're an early partner, not a test subject." The free Pro tier offer mentioned in the risk register is the right incentive. **Add:** A clear feedback mechanism *inside* the product (not just external surveys). A small "Give Feedback" button on every page that opens a simple text box. This captures in-context reactions, which are 10x more valuable than retrospective surveys.

**Verdict: BUILD — week 11–12. Add in-product feedback button.**

---

### E-11: Frontend Testing
**PRD Priority: Should | RICE Rank: #12 | Effort: 2 weeks**

**🎩 John — Priority: 🔴 Not now.**
This is technical debt reduction, not user value. With zero users, the cost of a frontend bug is zero — the founder finds it and fixes it. After beta? Different story. But 2 weeks of testing infrastructure during a capacity-constrained 90-day window that's already tight? No. This is a Phase 3 item.

**🏗️ Archie — Complexity: ✅ Estimate is fair.**
Jest + RTL in Next.js 15 with App Router is standard but not trivial to configure. The 2-week estimate is honest.

**🎨 Uma — User value: Zero (it's infrastructure).**
Users don't see tests. They see bugs. The question is: would 2 weeks of testing prevent more user-facing bugs than 2 weeks of feature development? At 5–10 beta users, probably not.

**Verdict: KILL for Phase 2. Revisit when preparing for wider launch.**

---

### E-12: Backtest Performance Optimization
**PRD Priority: Must | RICE Rank: #6 + #13 (Queue Separation) | Effort: 2 + 1 = 3 weeks total**

**🎩 John — Priority: ⚠️ Split this into two decisions.**
Sub-5s performance (Must) and queue separation (Should) are bundled in one epic but are very different priorities. Sub-5s matters for the iterative workflow — if backtests take 15 seconds, users lose flow state and stop experimenting. Queue separation only matters when multiple users are running backtests simultaneously. With 5–10 beta users, that's unlikely to be a real problem. **My call:** Performance profiling and optimization: Must. Queue separation: Defer unless beta testers report blocking.

**🏗️ Archie — Complexity: ⚠️ Performance is unpredictable.**
Profiling is easy (1–2 days). Fixing hotspots depends on what we find. The PRD suspects numpy vectorization for indicator computation — which is probably right, but could be a rabbit hole. I'd budget 1.5 weeks for performance profiling + targeted fixes, and defer the queue separation (second Docker worker container) to Phase 3. The queue separation is a 1-day change when we need it.

**🎨 Uma — User value: ✅ Critical for the "iterative experimentation" loop.**
The entire product thesis is "build, test, learn, iterate." If "test" takes 15 seconds instead of 3, the loop breaks. Users will run one backtest, wait, get distracted, and never come back. Sub-5s is a hard UX requirement. But this is most critical for 1h timeframe backtests (8,760 candles) — daily backtests on 1 year (365 candles) are probably already fast enough.

**Verdict: BUILD performance optimization (1.5 weeks). DEFER queue separation.**

---

### E-13: Data Vendor Fallback
**PRD Priority: Deferred to v2.1 | Not scored**

**🎩 John:** ✅ Correctly deferred. At 5–10 beta users, a CryptoCompare outage is a Slack message saying "data is down, back soon," not a production incident.

**🏗️ Archie:** Agreed. Monitoring + banner is sufficient.

**🎨 Uma:** Users won't notice or care at this scale.

**Verdict: DEFER — correctly scoped.**

---

### E-14: Observability & Structured Logging
**PRD Priority: Must | RICE Rank: #9 | Effort: 1.5 weeks**

**🎩 John — Priority: ⚠️ Must for production, but scope it down.**
Structured logging and correlation IDs are essential for debugging when real users hit real issues. But "error rate alerting configured" (the NFR-08 spec) implies PagerDuty/OpsGenie-style alerting, which is overkill for a solo developer with 5 beta users. **Scope to:** structlog setup, correlation IDs on backtest jobs, and basic error logging to stdout. Skip alerting infrastructure.

**🏗️ Archie — Complexity: ✅ 1 week if scoped down, 1.5 weeks with alerting.**
`pip install structlog`, add middleware, add correlation IDs to the backtest worker. This is a well-trodden path. Alerting is the scope creep risk.

**🎨 Uma — User value: Indirect but real.**
Users don't see logs. But when a beta tester says "my backtest failed and I don't know why," the developer needs structured logs to diagnose it in minutes, not hours. This is a support-quality investment.

**Verdict: BUILD — 1 week, scoped to structlog + correlation IDs. Skip alerting.**

---

### E-15: Weekly Performance Digest
**PRD Priority: Stretch | Not scored**

**🎩 John:** ✅ Correctly flagged as stretch. No users to retain yet.

**🏗️ Archie:** Trivial when needed. Not now.

**🎨 Uma:** Retention emails to an empty user base is sending newsletters to nobody.

**Verdict: KILL for Phase 2.**

---

## Cross-Cutting Concerns

### The 90-Day Budget

Let's do the math on what we're recommending:

| Epic | Recommended | Weeks | Schedule |
|------|------------|-------|----------|
| E-09 Analytics | ✅ Build | 2.0 | Weeks 1–2 |
| E-05 Wizard-First | ✅ Build | 2.0 | Weeks 3–4 |
| E-03 Short Selling | ✅ Build (prerequisite) | 4.0 | Weeks 5–8 |
| E-04 1h Timeframe | ✅ Build | 1.0 | Week 9 |
| E-01 Educ. Insights | ✅ Build (post E-03) | 2.5 | Weeks 10–12 |
| E-12 Perf Optimization | ✅ Build (no queue sep) | 1.5 | Week 12–13 |
| E-14 Observability | ✅ Build (scoped down) | 1.0 | Week 2 (parallel) |
| E-10 Beta Recruitment | ✅ Build | 1.0 | Week 10 |
| E-08 Block Badges | ✅ Build | 0.5 | Any gap |
| **Total** | | **15.5 weeks** | |

**Buffer remaining: ~5–7 weeks** (depending on part-time hours). This is healthy. The PRD's original scope was ~22.5 weeks with zero buffer. Our cut gives back 30% to account for reality: debugging E-03, data validation for E-04, iteration on E-01 copy, and the inevitable unknowns.

---

## Final Recommendation

### 🟢 BUILD (in order)

1. **E-09: Product Analytics** — The foundation. Everything else is guessing without it.
2. **E-14: Observability** (scoped down) — Do alongside analytics. 1 week.
3. **E-05: Wizard-First Onboarding** — The conversion gate. 4 questions max.
4. **E-03: Short Selling Engine** — The credibility gate. 4 weeks with regression gate. No other engine work starts until this passes.
5. **E-04: 1-Hour Timeframe** — Quick win after engine stabilizes.
6. **E-01: Educational Insights** — The differentiator. Ships after E-03 is green. Single verbosity level, no configuration UI.
7. **E-10: Beta Recruitment** — Start outreach in parallel with E-01 development.
8. **E-12: Performance Optimization** — Profile and fix hotspots. Skip queue separation.
9. **E-08: Block Difficulty Badges** — Slot into any gap.

### 🟡 DEFER (to post-beta / Phase 3)

- **E-06: Progressive Block Disclosure** — Let the wizard handle simplification for now. Build based on beta feedback.
- **E-07: Strategy Sentence Summary** — Polish feature. Build a minimal version if there's schedule slack.
- **E-02: Market Regime Analysis** — Already deferred in PRD. Confirmed.
- **E-12 (Queue Separation)** — Not needed at beta scale.
- **E-13: Data Vendor Fallback** — Already deferred. Confirmed.

### 🔴 KILL (for Phase 2)

- **E-11: Frontend Testing** — Technical debt reduction with zero user impact at current scale. Phase 3.
- **E-15: Weekly Digest** — No users to email. Phase 3.

### Key Disagreements with the PRD

| PRD Says | We Say | Why |
|----------|--------|-----|
| E-03 is 3 weeks | Budget 4 weeks | Engine surgery + regression suite is the riskiest work in Phase 2 |
| E-01 has configurable detail levels | Ship single verbosity | Saves a week; config UI is premature without user data |
| E-06 is Should (in scope) | Defer | Wizard already provides guardrails; milestone-based gating is arbitrary without data |
| E-11 is Should (in scope) | Kill | 2 weeks of testing infra at zero users is misallocated capacity |
| E-14 includes alerting | Skip alerting | Solo dev doesn't need PagerDuty for 5 beta users |
| RICE ranks drive execution order | Partially override | RICE ranks don't capture the E-03→E-01 hard dependency correctly |

### The One Thing That Matters

> **All three of us agree:** The single most important outcome of Phase 2 is not any individual feature — it's getting 5–10 real humans using Blockbuilders and telling us what they think. Every decision above is in service of that goal. If we ship analytics + wizard + short selling + educational insights and recruit beta testers, Phase 2 is a success regardless of what else falls off. If we ship all 15 epics but have zero beta testers, Phase 2 is a failure.

---

*— John 🎩, Archie 🏗️, Uma 🎨*
