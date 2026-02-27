# Blockbuilders — Strategic Brainstorming Session (Revised)

**Facilitator:** Mary (BMAD Analyst Agent)
**Date:** February 26, 2026
**Product:** Blockbuilders — Web-based no-code crypto strategy builder
**Current State:** Post-MVP with significant feature breadth

---

## Founder-Defined Identity

> **Blockbuilders is a strategy lab for crypto swing traders.** It is built for average crypto users who don't want to buy and sell for random reasons — people looking for confidence that their approach has been tested, even knowing past performance doesn't guarantee future results.

**Deliberate constraints that define the product:**
- **Daily timeframe only.** This is not a day-trading tool. It's for people thinking in weeks and months, not hours.
- **Long positions only.** The user is someone who wants to buy crypto they believe in at the right time, hold with a plan, and exit with a rule — not someone running complex hedging or short strategies.
- **No live execution.** Blockbuilders is a lab, not a trading desk. It helps you build conviction before you act.

This positioning is actually powerful because it narrows the audience to a specific, underserved niche: **the thoughtful retail crypto holder who is tired of emotional trading and wants a rational framework.** These people aren't quants. They aren't day traders. They're the person who bought ETH "because Twitter said so," watched it drop 30%, panic-sold, and thought *"there has to be a better way."*

---

## Session Context

With the identity now locked, this brainstorming session re-evaluates all opportunities, risks, and priorities through the lens of: **Does this help an average crypto user gain confidence in a daily swing trading approach?**

Many features in the current product are excellent for this persona. Some are distractions. This session will sort them.

---

## Technique 1: Ideal Future State (12-Month Vision)

*"It's February 2027. Blockbuilders is the go-to strategy lab for swing traders. What does that look like?"*

### The Dream Scenario

**The User Story That Defines Success:**
A person named Alex holds BTC and ETH. They've been buying dips on gut feeling and selling when they panic. They discover Blockbuilders, open it on a Sunday afternoon, and within 20 minutes they've built a simple strategy: "Buy BTC when RSI drops below 30 and the price is above the 200-day moving average. Sell when RSI goes above 70 or if I lose 8%." They backtest it over 3 years of daily data and see that this approach — imperfect as it is — would have outperformed their emotional trading by a wide margin. They feel something they haven't felt before: *confidence in a plan.* They tweak parameters, test again, share the result with a friend. They come back next week to check how the strategy would have performed on this week's data. They eventually subscribe to Pro because they want to test across more assets and longer time horizons.

**That story should be frictionless by February 2027.**

### What "Winning" Looks Like

**Product Experience**
- Time from signup to first completed backtest: **under 8 minutes** for a new user using the wizard
- The wizard is the primary creation path, not a secondary option — it's what 70%+ of new users choose
- Every backtest result includes a plain-English verdict: "This strategy would have turned $10,000 into $14,200 over 3 years, with a worst drawdown of 18%. It beat simply holding BTC by 12 percentage points."
- The "aha moment" is unmistakable: seeing your strategy's equity curve compared to buy-and-hold, with a clear explanation of what happened and why

**Trust & Education**
- Users understand what backtesting can and cannot tell them — not because they read a glossary, but because the product actively teaches through the experience
- Overfitting warnings, data quality indicators, and honest limitation disclosures are integrated into every result — not hidden on a docs page
- Blockbuilders is known for being *honest*, not hype-y. "We'll show you the math, not sell you a dream."

**Community & Growth**
- 10,000+ registered users, 1,500+ monthly active
- Organic growth from shared backtest links, crypto Reddit/Twitter, and word-of-mouth: "I tested my strategy on Blockbuilders and here's what I found"
- A template library of 30+ community-contributed strategies with plain-English explanations that serve as both starting points and educational content
- Content marketing (blog, social) positioned as *education*, not product marketing: "3 swing trading mistakes backtesting would have caught"

**Revenue**
- $20K+ MRR from ~800 paid subscribers (blended ~$25 ARPU)
- Credit pack upsells contributing 10-15% on top
- Churn below 8% monthly — people stay because the weekly auto-update + alerts loop keeps them engaged

### What Must Be True

1. **The onboarding path must lead to an emotional "aha."** Not just a completed backtest, but the moment where the user sees their gut-feel approach compared to a tested one and thinks "I should have done this sooner."
2. **The product must teach, not just compute.** Tooltips and glossaries aren't enough. The backtest results themselves need to narrate the story: what the strategy did, when it struggled, why it outperformed or underperformed holding.
3. **Daily auto-updates must feel like a personal trading assistant.** "Your BTC RSI strategy just triggered an entry signal. Here's the current context." This is the retention hook.
4. **The free tier must deliver a complete experience** for 1-2 strategies. The upgrade trigger should be wanting to test *more ideas*, not being blocked from testing *any* idea.

---

## Technique 2: "What Could Go Wrong?" (Risk Mapping)

*Risks re-evaluated through the lens of the swing-trader strategy lab positioning.*

### Risk 1: The Onboarding → Aha Path Isn't Clear Enough (CRITICAL)

**The danger:** The product has 20 block types, 11 indicators, multiple page destinations (dashboard, strategies list, market overview, progress, alerts), and a rich canvas editor. For the target persona — someone who has *never* backtested anything and may not know what RSI stands for — this is paralyzing.

**Why it matters for this persona:** Average crypto users are not tool-builders. They don't want to "learn the canvas." They want to answer the question: "Would my approach have worked?" If the path from that question to an answer requires learning a visual programming interface, most will bounce.

**What happens:** High signup-to-first-backtest dropoff. Users who do complete a backtest may not understand the results well enough to find them valuable.

**Severity: CRITICAL.** This is the #1 risk to the entire product thesis.

**Mitigation:** The wizard must be front and center — not just an option, but the *default path*. Consider making the canvas editor a "power user" mode that users graduate into, rather than the primary interface.

### Risk 2: Feature Breadth Creates an "Expert Tool" Perception

**The danger:** The current feature set — Ichimoku Cloud, Fibonacci retracement, ADX, OBV, Stochastic oscillator, multi-level take profit ladders, max drawdown circuit breakers — reads like a quantitative trading platform. The target persona doesn't know what most of these are.

**Why it matters for this persona:** Seeing "Ichimoku Cloud" in a block palette doesn't make an average crypto user feel empowered. It makes them feel like this tool isn't for them.

**What happens:** The product attracts a small number of experienced traders (who may find it too limited compared to TradingView or QuantConnect) while repelling the large number of average users it's actually designed for.

**Severity: HIGH.** The product's feature set and its target persona are currently in tension.

**Mitigation:** Progressive disclosure. The default block palette should show 4-5 indicators (SMA, EMA, RSI, Bollinger Bands, MACD) with an "Advanced" toggle for the rest. The wizard should only use the simple ones. Label everything in plain English: "Moving Average" not "SMA," "Momentum" not "RSI," with the technical name as a subtitle.

### Risk 3: Backtest Results Don't Build Confidence — They Confuse

**The danger:** The product shows Sharpe ratio, Sortino ratio, Calmar ratio, alpha, beta, CAGR, max consecutive losses, MAE, MFE, R-multiple, and more. This is a professional quantitative analysis dashboard. The target persona doesn't know what a Sharpe ratio is and shouldn't need to.

**Why it matters for this persona:** Confidence comes from understanding, not from data volume. If a user sees 20 metrics they don't understand, they feel *less* confident, not more.

**What happens:** Users either ignore the metrics (rendering the backtest output superficial) or try to learn them all (turning a confidence-building tool into a homework assignment).

**Severity: HIGH.** The results page is the most important screen in the product, and it's currently designed for a different audience.

**Mitigation:** Lead with a "Results Summary" that tells a story in plain English. Show 4-5 core metrics with visual context (green/red, better/worse than holding). Move advanced metrics to an expandable "Detailed Analysis" section. The favorite metrics feature is good infrastructure — but the *defaults* for new users should be radically simple.

### Risk 4: No Analytics = No Learning (PERSISTENT)

**The danger:** There is no mention of product analytics, event tracking, or funnel instrumentation anywhere in the product documentation. Without data, every product decision — including the ones in this brainstorming session — is speculation.

**Severity: HIGH.** This is a foundational gap.

**Mitigation:** Instrument the critical path (signup → first strategy → first backtest → result viewed → second session) before building any new features.

### Risk 5: "Paper Trading" Positioning May Mislead

**The danger:** The scheduled re-backtest feature is described as "paper trading" in the docs and UI. But it's not paper trading in the traditional sense (simulating live trades with live data in real-time). It's automated historical re-backtesting. If users expect real paper trading and get historical re-runs, trust erodes.

**Why it matters for this persona:** This persona is looking for confidence. If they think they're paper trading and later realize it's just re-running history, they may feel misled — the opposite of confidence.

**Severity: MEDIUM.**

**Mitigation:** Rename to "Automated Daily Backtest" or "Strategy Monitor." Be explicit: "We re-run your strategy on the latest data each day so you can see how it would have performed." Honest labeling builds more trust than aspirational naming.

### Risk 6: Single Data Vendor + Data Quality for 10-Year Premium Tier

**The danger:** Premium users get 10 years of historical data from CryptoCompare. Many of the 24 supported assets didn't exist 10 years ago (SUI launched 2023, SEI launched 2023, TIA launched 2023, ARB launched 2023, APT launched 2022). Users paying $49/month for "10 years of data" may discover that most assets only have 1-3 years of history.

**Severity: MEDIUM.** Could cause churn among premium users who feel the tier's value doesn't match the promise.

**Mitigation:** Show actual data availability per asset clearly in the UI. Don't promise "10 years of data" — promise "full available history." Consider whether the premium tier's value proposition needs to be based on something other than historical depth.

---

## Technique 3: Reverse Brainstorming

*"What would make the target persona — an average crypto user seeking confidence — leave Blockbuilders?"*

### "I felt dumb using it."

This is the #1 killer for this persona. If they encounter jargon they don't understand, an interface that assumes technical knowledge, or results they can't interpret, they won't ask for help — they'll just close the tab. Every interaction must be designed assuming the user has *zero* trading vocabulary and *zero* backtesting experience.

**Antidote:** Ruthless plain-language editing across the entire product. User-test with people who have never backtested before. If they can't explain what their backtest result means in their own words, the UI has failed.

### "I backtested a strategy, it looked great, I tried it in real life, and I lost money."

This is inevitable — backtesting *will* produce strategies that fail in live markets. The question is whether Blockbuilders set appropriate expectations. If a user's first experience is "the tool told me this would work and it didn't," the trust is gone permanently.

**Antidote:** This is where the positioning *"even knowing past performance doesn't guarantee future results"* must be woven into the experience, not buried in a disclaimer. Specific ideas: show how the strategy performed in the worst year, highlight the maximum drawdown in visceral terms ("You would have watched your $10,000 drop to $7,400 before recovering"), and always present the backtest as a *stress test* not a *prediction.*

### "I signed up, couldn't figure out what to do, and left."

The current product has too many entry points: dashboard, strategies list, progress page, market overview, alerts, wizard. The target persona needs exactly one path: "Answer my question — would this approach have worked?"

**Antidote:** Post-signup, drop the user directly into the wizard. Don't show the full app until they've completed their first backtest. First-run experience should be: wizard → backtest → results → "Want to explore more?" → full app.

### "I kept coming back to check my strategy but nothing new ever happened."

Daily data on a swing trading timeframe means strategies trigger entries and exits infrequently. A user checking daily may see the same results for weeks. Without a reason to return, they stop.

**Antidote:** The auto-update + alert system is the right foundation. Enhance with a weekly email digest: "Here's what happened with your strategies this week." Even if nothing triggered, frame it positively: "Your BTC strategy is still in a holding pattern — no entry signals this week. Current RSI: 52." Make the *absence* of a signal feel like useful information.

### "I compared this to TradingView's Pine Script and Blockbuilders felt limited."

This will happen — and it's *fine*. TradingView's strategy tester is more powerful but requires programming. The key is that the user who leaves for TradingView was never your target persona. The risk is only if *your actual target persona* hits limitations that matter to them.

**Antidote:** Know where the boundary is and own it. For the target persona, the relevant limitations to address are: more indicator presets (not more indicators), clearer explanations (not more metrics), and better templates (not more block types).

---

## Synthesis: Revised Key Opportunities

*Reprioritized for the swing-trader strategy lab positioning.*

| # | Opportunity | Why It Matters for This Persona | Priority |
|---|------------|-------------------------------|----------|
| 1 | **Redesign onboarding as wizard-first** — Make the wizard the default path; canvas is "advanced mode" | Average users need a guided path, not a blank canvas | **P0** |
| 2 | **Instrument product analytics** — Event tracking for the signup → first backtest → retention funnel | Can't optimize the experience without data | **P0** |
| 3 | **Simplify the backtest results page** — Lead with a plain-English story, hide advanced metrics by default | Confidence comes from understanding, not from data volume | **P0** |
| 4 | **Progressive disclosure across the UI** — Default to simple indicator palette, simple metrics, simple language; expand on demand | Prevents "this isn't for me" perception | **P1** |
| 5 | **Weekly strategy digest emails** — "Here's what your strategies did this week" with actionable context | Primary retention mechanism for a daily-timeframe product | **P1** |
| 6 | **Rename "paper trading" to honest language** — "Daily Strategy Monitor" or "Automated Re-test" | Trust-building through honest labeling | **P1** |
| 7 | **Add overfitting and confidence warnings to results** — "This strategy only made 8 trades — results may not be reliable" | Prevents false confidence, which is worse than no confidence | **P1** |
| 8 | **Show actual data availability per asset** — Don't promise "10 years" when SUI has existed for 2 | Prevents premium churn from unmet expectations | **P2** |
| 9 | **Community templates as educational content** — Each template teaches a concept, not just provides a starting point | Templates become the learning path, not just shortcuts | **P2** |
| 10 | **Exchange integration via webhook** — For users who graduate to wanting to act on signals | Long-term retention for users who outgrow the lab | **P3** |

### What Gets Deprioritized

Given the target persona, the following existing or planned features are **lower priority** than they might otherwise seem:

- **Short selling.** The target persona buys crypto they believe in and wants a better entry/exit framework. They're not shorting.
- **Sub-daily timeframes (1h, 4h).** Daily is the right cadence for swing traders. 4h is already supported and fine to keep, but it's not a priority to add more.
- **Advanced indicators (Ichimoku, Fibonacci, ADX).** Keep them for power users, but don't surface them in the default experience.
- **Collaboration and team features.** The target persona is an individual making personal investment decisions.
- **Complex community features (follower system, comments).** Shared backtest links and templates are the right community features for this persona. Social networking features can wait.

---

## Assumptions to Validate

| # | Assumption | How to Validate |
|---|-----------|----------------|
| 1 | Average crypto users will use a visual strategy builder rather than wanting pre-made signals to follow | Track wizard completion rate vs. template clone rate. If 80%+ of users clone templates and never touch the canvas, the product is actually a signal marketplace. |
| 2 | Daily timeframe is sufficient for the target persona | Survey users about their trading frequency. Check if users request shorter timeframes. |
| 3 | Users can interpret backtest results well enough to build confidence | Post-backtest survey: "In one sentence, what did you learn from this backtest?" If answers are vague or confused, the results UI needs work. |
| 4 | The $19/mo Pro tier is justified by strategy/backtest limits, not by features | Track what triggers upgrades. If users upgrade for more strategies, the model works. If they hit limits and churn instead, the free tier may be too tight or the upgrade value unclear. |
| 5 | Shared backtest links will drive organic acquisition | Track how many shared links convert to signups. If the number is near zero, sharing isn't a growth channel. |
| 6 | Auto-updates + alerts create a retention loop | Measure weekly return rate for users with auto-updates enabled vs. disabled. |
| 7 | The target persona exists in sufficient numbers to build a business | Estimate TAM: how many people hold crypto, trade at least monthly, and would pay for backtesting? Even rough Fermi estimation helps. |

---

## Open Questions (Refined)

### Strategic
1. **How large is this persona?** Rough estimate: ~50M people worldwide hold crypto actively. Maybe 10% trade at least monthly (~5M). Maybe 5% of those would consider a backtesting tool (~250K). Maybe 10% of those would pay (~25K). Is 25K addressable paid users enough?
2. **What's the competitive moat?** The no-code visual builder is the differentiator, but the real moat may be *trust and education* — being the tool that tells you the honest truth about your strategy, not the one that hypes you up.
3. **Should Blockbuilders ever connect to exchanges?** Webhook-based signal export (P3 above) is a lightweight path. Full exchange integration is a different product. Where's the line?

### Product
4. **Should the wizard eventually replace the canvas for most users?** If the persona doesn't want to "build" visually, maybe the wizard + parameter tweaking is the core experience, and the canvas is a power-user tool.
5. **What's the right default set of metrics for a new user?** Proposal: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold. Everything else hidden by default.
6. **How should the product handle strategies with very few trades?** A 3-year backtest that produces 4 trades is statistically meaningless but may look good. Explicit warnings needed.

### Business
7. **What's the go-to-market?** Content marketing ("How I backtested my BTC strategy") feels right for this persona. Crypto YouTube, Reddit r/CryptoCurrency, Twitter/X crypto communities.
8. **Is annual pricing at the right discount?** 15-20% off isn't a strong incentive. Consider 2 months free (33% off) to lock in annual commitments early.

---

## Recommended Next Steps

1. **Lock the positioning statement:**
   > *"Blockbuilders is a strategy lab where everyday crypto holders test their trading ideas against real historical data — so they can invest with a plan instead of a gut feeling."*

2. **Instrument analytics.** Minimum: signup, first strategy created, first backtest completed, backtest result viewed, second-day return, seventh-day return.

3. **Run 5 user tests with the target persona.** Recruit people who hold crypto but have never backtested. Watch them go from signup to first backtest result. Note every point of confusion.

4. **Redesign the first-run experience.** Post-signup → wizard → backtest → plain-English result → "Here's what you just learned." No dashboard, no sidebar, no choices until after the first backtest.

5. **Simplify the default results view.** Lead with a narrative summary and 5 core metrics. Move everything else below the fold.

6. **Write the 90-day roadmap** around 3 themes:
   - **Theme 1: Confidence from First Touch** (onboarding, wizard-first, plain results)
   - **Theme 2: Confidence Over Time** (weekly digests, honest auto-update labeling, overfitting warnings)
   - **Theme 3: Confidence Through Community** (better templates with educational framing, shared results that teach)

---

*Session complete. The founder's positioning — daily timeframe, long-only, strategy lab for average crypto users seeking confidence — is a strong and defensible identity. The primary work ahead is aligning the product's complexity with the simplicity this persona requires.*