# Blockbuilders — Strategic Brainstorming Session

**Facilitator:** Mary (BMAD Analyst Agent)
**Date:** February 20, 2026
**Product:** Blockbuilders — Web-based no-code crypto strategy builder
**Current State:** Post-MVP with significant feature breadth (OAuth, subscriptions, strategy wizard, market data, alerts, public profiles, templates marketplace, mobile canvas, and more)

---

## Session Context

Blockbuilders has shipped a remarkable amount of functionality in roughly two months (initial docs December 28, 2025 → 25 database migrations, 20+ block types, 3-tier subscription model, Stripe billing, and a growing feature surface). This session examines where the product should go next and what strategic risks exist if the team continues building without stepping back to evaluate direction.

---

## Technique 1: Ideal Future State (12-Month Vision)

*"It's February 2026. Fast-forward to February 2027. What does a successful Blockbuilders look like?"*

### The Dream Scenario

Twelve months from now, Blockbuilders has become **the default starting point for retail crypto traders who want to test ideas before risking capital.** Here is what that looks like concretely:

**Users & Growth**
- 15,000+ registered accounts with 2,000+ monthly active users running backtests weekly
- A healthy conversion funnel: ~8% free-to-Pro, ~2% Pro-to-Premium
- Organic growth driven by shared backtest links, public profiles, and community templates
- A recognizable brand in the "learn crypto trading" space, not just the "tools" space

**Product Maturity**
- The visual builder is intuitive enough that a first-time user can build, backtest, and understand a simple RSI strategy in under 10 minutes — without the wizard
- Short selling and multi-asset strategies are supported (removing the two biggest MVP constraints)
- A community-contributed template marketplace with 50+ vetted strategies drives discoverability and retention
- Forward-testing / paper trading with live data is a premium differentiator that no free competitor matches
- Performance is fast — backtests return results in under 5 seconds for 1-year daily data

**Revenue & Business**
- Monthly recurring revenue of $30K+ (achievable at ~1,200 paid subscribers at blended $25/mo ARPU)
- Credit pack upsells contribute an additional 10-15% on top of subscription revenue
- Churn below 8% monthly on paid plans
- Operational costs remain lean: single-digit thousands per month for infrastructure

**Community & Ecosystem**
- Active Discord or forum community where users share strategies, give feedback, and help each other
- An API or webhook ecosystem that lets advanced users connect Blockbuilders outputs to external tools (trading bots, Notion, spreadsheets)
- Educational content (blog, YouTube) that drives SEO traffic and establishes thought leadership

### What Must Be True to Get There

1. **The onboarding → first-backtest flow must be frictionless.** Right now there are many features but the path from signup to "aha moment" may be unclear.
2. **Retention mechanics must exist beyond backtesting.** Scheduled re-backtests and alerts are good starts, but the product needs daily or weekly reasons to come back (market briefs, strategy performance digests, community activity).
3. **The free tier must be generous enough to hook users** but limited enough that serious traders naturally upgrade.
4. **Short selling must ship.** Long-only is a real constraint that makes strategies feel incomplete for anyone beyond absolute beginners.
5. **The template marketplace must be community-driven.** Team-curated templates (currently 3) won't scale or create network effects.

---

## Technique 2: "What Could Go Wrong?" (Risk Mapping)

*"What are the biggest risks if we keep building features without strategic direction?"*

### Risk 1: Feature Bloat Without Product-Market Fit Validation

**The danger:** Blockbuilders has ~70+ PRDs documented. The team has built an enormous surface area — from Fibonacci retracement blocks to market sentiment indicators to public profiles with badges. But there's no evidence in the documentation of user research, analytics instrumentation, or conversion funnel data.

**What happens:** You ship features nobody uses. The codebase becomes harder to maintain. New contributors face a steep learning curve. The product feels overwhelming to new users even though each individual feature is well-built.

**Severity: HIGH.** This is the most urgent risk.

### Risk 2: Monetization Model Is Untested at Scale

**The danger:** The pricing tiers ($0 / $19 / $49) look reasonable, but they're quantity-gated (strategy count, backtest count, data depth). If power users find workarounds — archiving strategies to stay under caps, or running fewer but longer backtests — revenue per user stays low. Meanwhile, the credit pack model ($15 for 50 backtests, $9 for 5 strategy slots) is a nice idea but may not generate meaningful upsell revenue if the free tier is already generous enough.

**What happens:** The product has users but can't sustain itself financially. Pressure builds to either raise prices (alienating early adopters) or add features behind a paywall (creating a worse free experience).

**Severity: MEDIUM-HIGH.**

### Risk 3: Single Data Vendor Dependency

**The danger:** CryptoCompare is the sole data provider. If their API degrades, pricing changes, or they discontinue the endpoints Blockbuilders uses, the entire backtest engine breaks. There's no fallback vendor configured.

**What happens:** A service disruption would mean zero backtests for all users. In crypto, where data vendors come and go, this is a real operational risk.

**Severity: MEDIUM.** Manageable but needs a mitigation plan.

### Risk 4: Technical Debt in the Monolith

**The danger:** The FastAPI monolith handles auth, strategies, backtesting, market data, alerts, notifications, billing, profiles, and progress tracking. The worker queue has a 5-minute timeout per job. The test suite covers backend financial calculations but has no frontend tests at all (explicitly noted in the docs). SQLite is used for test isolation, which can mask Postgres-specific behavior.

**What happens:** As the product scales, the monolith becomes a bottleneck. Backtest queue congestion during peak hours. Regressions in the frontend that aren't caught before production. Subtle Postgres bugs that pass in SQLite tests.

**Severity: MEDIUM.** Not urgent but compounds over time.

### Risk 5: Regulatory and Compliance Exposure

**The danger:** The product involves financial strategy creation and performance metrics. Terms like "paper trading," "alpha," and "benchmark return" could create an impression of financial advice. The shareable backtest links feature means strategy performance data could be shared publicly and used to market unverified trading strategies.

**What happens:** Depending on jurisdiction, there could be regulatory scrutiny. More practically, users who lose money following strategies they built on Blockbuilders could become vocal critics or pursue legal claims.

**Severity: MEDIUM.** Mitigated by disclaimers but needs legal review.

### Risk 6: Community Features Without a Community

**The danger:** Public profiles, follower counts, badges, published strategies, and a templates marketplace have been built — but these are community infrastructure without evidence of an existing community. Follower count is "a simple counter for v1 (no relationship table)," which suggests it's not even functional yet.

**What happens:** Empty public profiles and an unused marketplace create a "ghost town" effect that actually hurts perception. New users see zero followers, zero published strategies, and conclude the platform is abandoned.

**Severity: MEDIUM.** Better to delay community features than launch them empty.

---

## Technique 3: Reverse Brainstorming

*"What would make users leave Blockbuilders?"*

### "I built a strategy but I have no idea if the backtest results are realistic."

Without educational context about the limitations of backtesting (overfitting, survivorship bias, look-ahead bias), users will either over-trust results and lose money in live trading, or under-trust results and stop using the product. The "How Backtests Work" page exists but is buried. The execution model assumes next-candle-open fills, which is optimistic for volatile crypto assets.

**Antidote:** Surface backtest limitations prominently. Add overfitting warnings when strategies have few trades. Show confidence intervals or Monte Carlo simulations (even basic ones) to convey uncertainty.

### "I can only go long. This is a toy."

Long-only is the single biggest functional constraint. Any trader with even moderate experience will immediately notice this limitation. The 4h and 1d timeframes compound the issue — there's no intraday trading possible, which eliminates a huge segment of active crypto traders.

**Antidote:** Prioritize short selling as the next major engine feature. Consider adding 1h and 15m timeframes. These are table-stakes for credibility.

### "I built something that works in backtesting but I can't actually trade it."

Blockbuilders currently has no connection to any exchange or execution layer. The scheduled re-backtest feature is positioned as "paper trading" but it's really just automated historical backtesting with updated data. Users who graduate from strategy ideation to wanting to execute will leave for platforms that offer both.

**Antidote:** This is a strategic decision. Either (a) build toward exchange connectivity as a long-term differentiator, (b) integrate with existing trading bots via API/webhook, or (c) explicitly position Blockbuilders as "strategy lab only" and own that positioning. Option (b) is the most pragmatic near-term path.

### "The interface is overwhelming. I don't know where to start."

Twenty block types, 11 indicators, 5 logic blocks, multiple risk management options, strategy tags, templates, a wizard, a progress dashboard, a market overview with sentiment indicators — this is a lot for a "no-code" tool aimed at retail traders. The feature count has outpaced the UX simplification efforts.

**Antidote:** Invest in guided experiences. The wizard is a good start but it should be the default path, not a secondary option. Progressive disclosure should hide advanced features until users are ready for them.

### "My backtest takes too long and I've hit my daily limit."

A 5-minute timeout per backtest job with a 50/day free cap means a user who is iterating rapidly on a strategy will hit friction quickly. If the queue is congested (e.g., during the daily auto-update batch at 2 AM UTC), even paid users could experience delays.

**Antidote:** Optimize backtest performance (target sub-5s for standard runs). Separate the auto-update queue from manual backtest queue. Consider making the free tier limit more generous for short backtests and more restrictive for long historical periods.

### "I can't collaborate with anyone."

There's no team functionality, no strategy sharing between accounts (beyond import/export JSON files), and no commenting or review workflow. The public profile and published strategy features are one-directional (publish and forget). For serious traders who work in groups or want mentorship, this is a limitation.

**Antidote:** Not necessarily a priority for v1, but worth noting that collaboration is the natural evolution of community features. Strategy forking (like GitHub repos) could be a powerful differentiator.

---

## Synthesis: Key Opportunities

| # | Opportunity | Impact | Effort | Priority |
|---|------------|--------|--------|----------|
| 1 | **Nail the onboarding → first-backtest flow** — Measure time-to-first-backtest, identify dropoff points, simplify aggressively | Very High | Medium | **P0** |
| 2 | **Add short selling support** — Removes the most cited credibility gap | High | High | **P1** |
| 3 | **Instrument product analytics** — You can't improve what you don't measure. Event tracking, funnel analysis, feature usage data | Very High | Low-Medium | **P0** |
| 4 | **Build retention loops** — Weekly performance digest emails, strategy health scores, "your strategy triggered an entry today" push notifications | High | Medium | **P1** |
| 5 | **Exchange integration via webhook/API** — Let users connect backtest outputs to external trading bots (3Commas, Cornix, etc.) | High | Medium | **P2** |
| 6 | **Community-contributed templates with curation** — Turn the marketplace from team-curated (3 templates) to user-generated with approval workflow | Medium-High | Medium | **P2** |
| 7 | **Add 1h timeframe** — Opens up a much larger trader segment | Medium | Low | **P1** |
| 8 | **Backtest performance optimization** — Target sub-5s for standard runs, separate queues for manual vs auto | Medium | Medium | **P2** |

---

## Assumptions to Validate

These are beliefs embedded in the product that should be tested with real user data:

1. **"Retail crypto traders want a visual, no-code strategy builder."** Is this actually true for the target segment, or do they want pre-built signals they can just follow? The wizard and templates suggest the team may already sense this tension.

2. **"Users will pay $19-49/month for backtesting."** What is the willingness to pay? Are there enough users who run 50+ backtests/day to make the upgrade compelling? Or is the free tier too generous?

3. **"Visual block-based building is easier than code."** For simple strategies, yes. But the moment a user needs a complex multi-condition entry with AND/OR logic across multiple indicators, the canvas can become a tangled wire mess. Is the visual metaphor actually simpler than a text-based rule builder for non-trivial strategies?

4. **"Public profiles and community features will drive growth."** Network effects require a critical mass of users. With the current user base (unknown but likely small), publishing and following may feel hollow.

5. **"4h and 1d timeframes are sufficient."** This constrains the product to swing traders and position traders. Day traders and scalpers — arguably the most active segment — are excluded entirely.

6. **"CryptoCompare data is good enough."** Data quality and completeness directly affect backtest accuracy. Has the team validated that CryptoCompare's OHLCV data for all 24 supported pairs is complete and reliable across the full historical depth offered to premium users (10 years)?

7. **"Users understand what backtest results mean."** The metrics glossary and tooltips help, but backtest literacy is low among retail traders. Without explicit warnings about overfitting and curve-fitting, users may over-trust results.

---

## Open Questions

### Strategic
1. **What is the actual user base today?** How many registered accounts, MAU, paid subscribers? Without these numbers, every prioritization decision is speculative.
**Answer**: Pour l'instant, l'application est toujours dans sa phase de développement et même si elle est techniquement en production, personne ne la rejoint pour le moment. Je n'ai pas cherché à la partager donc le nombre d'utilisateurs est de 1 : moi.
2. **What's the competitive landscape?** How does Blockbuilders compare to TradingView's strategy tester, QuantConnect, Composer, Tuned, or Trality? What's the unique positioning?
**Answer**: Je ne connais que TradingView parmi la liste mais BlockBuilders doit être beaucoup plus simple et intuitif dans la création de stratégie. TradingView oblige à passer par son langage PineScript ce qui est très complexe et contraignant pour les novices ou les crypto-curieux qui ne sont pas forcément formés au développement.
3. **Is the vision "strategy lab" or "full trading platform"?** The current feature set suggests strategy lab, but scheduled re-backtests and alerts hint at wanting to be more. This is the most important strategic decision to make.
**Answer**: La vision doit clairement être orientée.
4. **Who is the primary persona?** A crypto-curious beginner learning to trade, a retail swing trader testing ideas before execution, or a semi-professional quantitative trader who needs a rapid prototyping tool?
**Answer**: L'utilisateur cible est un crypto-curieux, débutant ou quasi débutant, qui souhaite créer ou s'inspirer des stratégies existantes pour éviter de perdre ses quelques investissements en crypto, voir même de les faire fructifier. Le but est de développer en lui cette idée de pouvoir faire mieux que les autres et dégager un gain "sûr" au lieu de laisser le hasard faire les choses.

### Product
5. **What's the time-to-first-backtest for a new user today?** Has anyone measured this?
**Answer**: Je n'ai pas de mesures disponibles sur ce point précis.
6. **Which features get used and which don't?** Is there any analytics instrumentation?
**Answer**: Je n'ai pas de mesures disponibles sur ce point précis.
7. **What do users do after their first backtest?** Do they iterate? Do they come back? Do they share?
**Answer**: Je ne sais pas puisque je suis le seul utilisateur actif pour l'instant.
8. **Is the strategy wizard actually reducing friction, or do users skip it?**
**Answer**: Je ne sais pas puisque je suis le seul utilisateur actif pour l'instant.

### Technical
9. **What's the plan for data vendor redundancy?** Can a second vendor be added to mitigate CryptoCompare dependency?
**Answer**: 
10. **When does the monolith need to be decomposed?** At what user count does the single-queue architecture become a bottleneck?
**Answer**:
11. **What's the frontend test strategy?** The docs explicitly note no frontend tests. When does this become unacceptable?
**Answer**:

### Business
12. **What's the runway?** How long can development continue at the current pace before revenue must sustain operations?
**Answer**:
13. **Is there a go-to-market plan beyond organic/product-led growth?** Content marketing, partnerships with crypto educators, influencer outreach?
**Answer**:
14. **Has the pricing been A/B tested or benchmarked against competitor pricing?**
**Answer**:

---

## Recommended Next Steps

Based on this brainstorming session, Mary (Analyst) recommends the following immediate actions:

1. **Instrument analytics before building anything else.** Add event tracking for signup → first strategy → first backtest → second session. You need data to make decisions.

2. **Run 5-10 user interviews.** Watch real users try to build and backtest a strategy from scratch. Identify where they get stuck, confused, or give up.

3. **Define the primary persona and positioning statement.** "Blockbuilders is _______ for _______ who want to _______." Until this is crisp, feature prioritization will remain scattered.

4. **Audit feature usage.** Identify the top 5 features by usage and the bottom 10. Consider deprecating or hiding features that add complexity without usage.

5. **Create a 90-day roadmap with no more than 3 themes.** Suggested themes: (a) onboarding excellence, (b) backtest credibility (short selling, more timeframes, overfitting warnings), (c) retention mechanics (digests, alerts, community).

---

*Session complete. This document should be reviewed by the product owner and used as input to the next PRD planning cycle.*
