# BLOCKBUILDERS — Phase 2 Product Requirements Document

**The Strategy Lab for Learners**

| | |
|---|---|
| **Version** | 2.0 |
| **Date** | February 22, 2026 |
| **Author** | John (BMAD Product Manager Agent) |
| **Classification** | Internal — Confidential |
| **Inputs** | Product Documentation (Jan 3 2026), Brainstorming Report (Feb 20 2026), Competitive Analysis (Feb 22 2026) |

---

## 1. Executive Summary

Blockbuilders is a web-based, no-code strategy lab where retail crypto traders visually build, backtest, and iterate on trading strategies. After an aggressive MVP and post-MVP build phase that delivered 20+ block types, OAuth, subscriptions, strategy wizard, mobile canvas, public profiles, and a three-tier billing model, the product has significant technical breadth but zero validated users beyond the founder.

This PRD defines Phase 2: the transition from feature-rich prototype to validated, user-facing product. Rather than adding more surface area, Phase 2 focuses on three strategic themes that emerged from both the brainstorming session and competitive analysis:

- **Theme 1: Backtest Credibility & Education** — Transform raw metrics into guided learning experiences. No competitor does this. It is Blockbuilders' single largest differentiation opportunity.
- **Theme 2: Onboarding Excellence** — Reduce time-to-first-backtest to under 10 minutes with progressive disclosure and wizard-first defaults.
- **Theme 3: Engine Credibility** — Ship short selling support and the 1-hour timeframe. Long-only is the most-cited reason an intermediate trader would dismiss the product immediately.

Phase 2 explicitly deprioritizes community features (empty-room risk), exchange connectivity (stay in the strategy-lab lane), and new social features until analytics prove retention with the current feature set.

---

## 2. Vision Statement

> *Blockbuilders is the first destination for crypto-curious beginners who want to test trading ideas before risking capital. We don't assume you can code. We don't rush you to connect an exchange. We teach you to think in strategies — visually, interactively, and honestly — so that when you're ready to trade, you understand exactly what you're doing and why.*

**Phase 2 Success Criteria (90-day horizon):**

- Instrument product analytics and establish baseline funnel metrics (signup → first strategy → first backtest → second session).
- Achieve median time-to-first-backtest under 10 minutes for new users.
- Ship short selling and 1h timeframe to eliminate the two largest credibility gaps.
- Deliver educational backtest insights (overfitting warnings, metric explanations, confidence framing) for every completed backtest.
- Recruit 5–10 beta testers and conduct structured user interviews.

---

## 3. Functional Requirements

All requirements are testable, versioned, and scoped to Phase 2. Each is tagged with MoSCoW priority.

| ID | Requirement | Description & Acceptance Criteria | MoSCoW | Version |
|---|---|---|---|---|
| FR-01 | Product Analytics Instrumentation | System tracks signup, first strategy creation, first backtest, second session, feature usage events. Dashboard accessible to product owner. | Must | v2.0 |
| FR-02 | Educational Backtest Insights | Every completed backtest displays: plain-language metric explanations, an overfitting warning when trade count < 30, a confidence indicator (green/yellow/red), and a "What could go wrong" section. | Must | v2.0 |
| FR-03 | Short Selling Support | Users can create strategies that enter short positions. Engine calculates short P&L correctly including borrowing cost parameter. All existing risk blocks (SL, TP, trailing stop, max drawdown) function for short positions. | Must | v2.0 |
| FR-04 | 1-Hour Timeframe | Users can select 1h candle timeframe for strategies and backtests. Data fetching, caching, and gap detection work for 1h candles. | Must | v2.0 |
| FR-05 | Wizard-First Onboarding | New users land on the strategy wizard by default (not the empty canvas). Wizard includes a short-selling question. Canvas remains accessible via explicit "Advanced" toggle. | Must | v2.0 |
| FR-06 | Progressive Block Disclosure | Block library shows Level 1 blocks by default (RSI, SMA, EMA, basic logic, SL, TP). Level 2 blocks unlock after first completed backtest. Level 3 blocks unlock after 5 backtests. Users can override via settings. | Should | v2.0 |
| FR-07 | Strategy Sentence Summary | Canvas displays a human-readable sentence describing the strategy alongside the block diagram (e.g., "Buy BTC when RSI < 30, sell when RSI > 70, 5% stop loss"). Updated in real-time as blocks change. | Should | v2.0 |
| FR-08 | Regime Awareness in Results | Backtest results include a market regime overlay identifying bull/bear/sideways periods and per-regime performance breakdown. | Should | v2.1 |
| FR-09 | Second Data Vendor Fallback | System can fetch candle data from a secondary vendor (e.g., CoinGecko or Binance public API) when CryptoCompare is unavailable or returns errors. | Should | v2.1 |
| FR-10 | Onboarding Funnel Analytics | Dedicated funnel view showing conversion rates at each step: signup → wizard started → strategy saved → backtest run → results viewed → second session. | Must | v2.0 |
| FR-11 | Frontend Test Infrastructure | Jest + React Testing Library configured with minimum coverage targets for critical paths (auth flow, backtest runner, canvas serialization). | Should | v2.0 |
| FR-12 | Beta Tester Recruitment Flow | In-app mechanism to invite beta testers, collect structured feedback, and flag beta accounts for analytics segmentation. | Must | v2.0 |
| FR-13 | Weekly Performance Digest Email | Opted-in users receive a weekly email summarizing: strategy performance changes, new backtest results from auto-updates, and market highlights for their tracked assets. | Could | v2.1 |
| FR-14 | Block Complexity Tier Badge | Each block in the library shows a difficulty badge (Beginner / Intermediate / Advanced) to guide new users toward appropriate complexity. | Should | v2.0 |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | MoSCoW | Version |
|---|---|---|---|---|
| NFR-01 | Backtest Performance | Standard backtest (1-year daily, single asset) completes in < 5 seconds. 5-year daily completes in < 15 seconds. Measured at p95. | Must | v2.0 |
| NFR-02 | API Response Time | All non-backtest API endpoints respond in < 200ms at p95 under 100 concurrent users. | Must | v2.0 |
| NFR-03 | Availability | Application maintains 99.5% uptime measured monthly, excluding scheduled maintenance windows. | Must | v2.0 |
| NFR-04 | Data Vendor Resilience | If primary data vendor (CryptoCompare) returns errors for > 5 minutes, system logs the failure and surfaces a user-facing banner. Fallback vendor (FR-09) activates automatically when available. | Should | v2.1 |
| NFR-05 | Security — Auth | All passwords hashed with bcrypt (cost factor ≥ 12). JWT tokens expire in 7 days. OAuth state tokens expire in 10 minutes. Rate limiting on auth endpoints (max 10 attempts/minute/IP). | Must | v2.0 |
| NFR-06 | Security — Data | All API communication over HTTPS. No PII exposed in public profile endpoints. Backtest results in S3 accessible only via authenticated API. SQL injection prevention via parameterized queries. | Must | v2.0 |
| NFR-07 | Scalability — Workers | Worker queue architecture supports adding additional workers via Docker Compose without application changes. Auto-update queue separated from manual backtest queue. | Should | v2.0 |
| NFR-08 | Observability | Application logs structured JSON. Key events (backtest start/complete/fail, auth events, payment events) are logged with correlation IDs. Error rate alerting configured. | Must | v2.0 |
| NFR-09 | Browser Compatibility | Full functionality on Chrome 90+, Firefox 88+, Safari 14+. Mobile web responsive on iOS Safari and Chrome Android. | Must | v2.0 |
| NFR-10 | Accessibility | All interactive elements keyboard-navigable. Color contrast meets WCAG 2.1 AA. Screen reader labels on canvas actions. | Could | v2.1 |

---

## 5. Epics by Feature Area

### 5.1 Epic: Backtest Credibility & Education

**Goal:** Transform Blockbuilders from a tool that shows numbers into a tool that teaches understanding.

- **E-01: Educational Backtest Insights (FR-02)** — Plain-language metric explanations, overfitting detector, confidence indicator, "What could go wrong" section.
- **E-02: Market Regime Analysis (FR-08)** — Overlay bull/bear/sideways classification on equity curves with per-regime performance.
- **E-03: Short Selling Engine (FR-03)** — Short position support in interpreter, simulation, and risk management blocks.
- **E-04: 1-Hour Timeframe (FR-04)** — New timeframe option across data pipeline, UI selectors, and scheduled updates.

### 5.2 Epic: Onboarding Excellence

**Goal:** Get any new user from signup to their first "aha" backtest in under 10 minutes.

- **E-05: Wizard-First Default (FR-05)** — Redirect new users to wizard, add short selling question, make canvas an "Advanced" mode.
- **E-06: Progressive Block Disclosure (FR-06)** — Tiered block visibility tied to user milestones.
- **E-07: Strategy Sentence Summary (FR-07)** — Real-time human-readable strategy description on canvas.
- **E-08: Block Difficulty Badges (FR-14)** — Visual complexity indicator per block.

### 5.3 Epic: Measurement & Validation

**Goal:** Instrument the product to make every future decision data-driven.

- **E-09: Product Analytics (FR-01, FR-10)** — Event tracking, funnel dashboard, feature usage metrics.
- **E-10: Beta Recruitment (FR-12)** — Invite flow, feedback collection, analytics segmentation.
- **E-11: Frontend Testing (FR-11)** — Test infrastructure for critical user paths.

### 5.4 Epic: Infrastructure & Resilience

**Goal:** Harden the platform for real users.

- **E-12: Backtest Performance Optimization (NFR-01)** — Target sub-5s standard backtests, queue separation.
- **E-13: Data Vendor Fallback (FR-09, NFR-04)** — Secondary vendor integration with automatic failover.
- **E-14: Observability & Structured Logging (NFR-08)** — JSON logging, correlation IDs, error alerting.

### 5.5 Epic: Retention Foundations (Stretch)

**Goal:** Give users a reason to come back weekly.

- **E-15: Weekly Performance Digest (FR-13)** — Email summary of strategy performance and market highlights.

---

## 6. User Stories with Acceptance Criteria

### US-01: Educational Backtest Insights

**As a** crypto-curious beginner, **I want** my backtest results explained in plain language **so that** I understand whether my strategy is likely robust or just lucky.

**Epic:** E-01 | **Priority:** Must | **FR:** FR-02

**Acceptance Criteria:**

> **Given** a completed backtest with 12 trades over 2 years
> **When** I view the backtest results
> **Then** I see an amber overfitting warning: "Only 12 trades in 2 years. Results may reflect luck rather than a reliable pattern."

> **Given** a completed backtest with any number of trades
> **When** I view the results summary
> **Then** each metric (Sharpe, Max Drawdown, Win Rate, CAGR) has a tooltip with a 1-2 sentence plain-language explanation

> **Given** a completed backtest
> **When** I scroll to the "What Could Go Wrong" section
> **Then** I see 2-4 automatically generated warnings specific to my strategy characteristics (e.g., "This strategy only profits in trending markets")

---

### US-02: Short Selling Strategy

**As a** retail trader, **I want** to create strategies that can short assets **so that** I can test ideas for both rising and falling markets.

**Epic:** E-03 | **Priority:** Must | **FR:** FR-03

**Acceptance Criteria:**

> **Given** I am building a strategy in the canvas editor
> **When** I add an Entry Signal block
> **Then** I can set the position direction to "Long" or "Short"

> **Given** I run a backtest on a strategy with short entry signals
> **When** the backtest completes
> **Then** short trades show correct P&L (profit when price falls, loss when price rises), and all risk blocks (stop loss, take profit, trailing stop, max drawdown) function correctly for short positions

---

### US-03: Wizard-First Onboarding

**As a** new user with no trading experience, **I want** to be guided through strategy creation **so that** I don't feel overwhelmed by the blank canvas.

**Epic:** E-05 | **Priority:** Must | **FR:** FR-05

**Acceptance Criteria:**

> **Given** I have just created my account and have zero strategies
> **When** I navigate to the strategies page
> **Then** I am directed to the strategy wizard (not the empty canvas) and the wizard completes in 4-6 questions

> **Given** I have completed the wizard
> **When** I view my new strategy
> **Then** the strategy opens in the canvas with all blocks pre-placed and connected, and a prominent "Run Backtest" button is visible

---

### US-04: Progressive Block Discovery

**As a** beginner, **I want** to see only the blocks I can understand right now **so that** the builder feels approachable instead of overwhelming.

**Epic:** E-06 | **Priority:** Should | **FR:** FR-06

**Acceptance Criteria:**

> **Given** I am a new user with 0 completed backtests
> **When** I open the block library
> **Then** I see only Level 1 blocks (RSI, SMA, EMA, AND/OR, Entry/Exit Signal, Stop Loss, Take Profit, Position Size) and a locked section labeled "More blocks unlock after your first backtest"

> **Given** I have completed 5 backtests
> **When** I open the block library
> **Then** all blocks are visible including Level 3 (Fibonacci, Ichimoku, multi-condition combinations)

---

### US-05: Product Analytics Tracking

**As the** product owner, **I want** event-level analytics **so that** I can measure the onboarding funnel and identify where users drop off.

**Epic:** E-09 | **Priority:** Must | **FR:** FR-01, FR-10

**Acceptance Criteria:**

> **Given** a new user signs up and completes their first backtest
> **When** I check the analytics dashboard
> **Then** I can see timestamped events for: account_created, wizard_started, strategy_saved, backtest_started, backtest_completed, and I can calculate conversion rates between each step

---

### US-06: 1-Hour Timeframe

**As a** more active trader, **I want** to backtest strategies on 1-hour candles **so that** I can test shorter-term trading ideas.

**Epic:** E-04 | **Priority:** Must | **FR:** FR-04

**Acceptance Criteria:**

> **Given** I am creating or editing a strategy
> **When** I select the timeframe dropdown
> **Then** I see "1h" as an option alongside the existing 4h and 1d timeframes, and data quality indicators show coverage for the 1h timeframe

---

### US-07: Strategy Sentence Summary

**As a** beginner, **I want** to see a plain-English description of what my strategy does **so that** I can verify the blocks do what I intended.

**Epic:** E-07 | **Priority:** Should | **FR:** FR-07

**Acceptance Criteria:**

> **Given** I have a strategy with RSI < 30 entry, RSI > 70 exit, and 5% stop loss
> **When** I view the canvas
> **Then** a sentence reads: "Buy [asset] when RSI drops below 30. Sell when RSI rises above 70. Stop loss at 5%." and it updates in real-time as I modify blocks

---

### US-08: Backtest Performance Target

**As a** user iterating on a strategy, **I want** backtests to return results quickly **so that** I can test variations without losing focus.

**Epic:** E-12 | **Priority:** Must | **NFR:** NFR-01

**Acceptance Criteria:**

> **Given** I run a backtest on 1 year of daily candles for a single asset
> **When** the backtest is processed
> **Then** results are displayed within 5 seconds (p95) and the auto-update queue does not block my manual backtest

---

## 7. MVP Scope: In vs. Explicitly Out

This is an opinionated cut. Phase 2 must be completable in 90 days by a solo developer working part-time. Anything not directly serving the three strategic themes (Education, Onboarding, Engine Credibility) is deferred.

### 7.1 In Scope (Phase 2 MVP)

| Feature | Req ID | MoSCoW | Rationale |
|---|---|---|---|
| Product analytics instrumentation | FR-01, FR-10 | Must | P0 — Can't improve what you can't measure |
| Educational backtest insights | FR-02 | Must | Highest competitive differentiator; no competitor does this |
| Short selling engine | FR-03 | Must | Table stakes for credibility; #1 cited gap |
| 1-hour timeframe | FR-04 | Must | Low effort, opens large new user segment |
| Wizard-first onboarding | FR-05 | Must | Critical for time-to-first-backtest target |
| Beta tester recruitment | FR-12 | Must | Need real user feedback to validate everything else |
| Progressive block disclosure | FR-06 | Should | High UX impact, frontend-only change |
| Strategy sentence summary | FR-07 | Should | Reinforces educational positioning, frontend-only |
| Block difficulty badges | FR-14 | Should | Small effort, big UX clarity win |
| Frontend test infrastructure | FR-11 | Should | Technical debt paydown before user-facing launch |
| Backtest performance optimization | NFR-01 | Must | Sub-5s target for iterative workflows |
| Queue separation (manual vs auto) | NFR-07 | Should | Prevents auto-updates from blocking users |
| Structured logging & observability | NFR-08 | Must | Required for production troubleshooting |

### 7.2 Explicitly Out of Scope (Phase 2)

These are deliberate cuts, not oversights. Each is deferred for a specific reason.

| Feature | Reason for Deferral |
|---|---|
| Community-contributed templates | Empty-room problem. Only 1 user exists. Ship this when MAU > 100. |
| Exchange / webhook integration | Strategic decision: stay in strategy-lab lane. Revisit after validating core value prop. |
| Multi-asset portfolio strategies | Complexity explosion. Single-asset strategies are not yet validated with real users. |
| Walk-forward optimization / Monte Carlo | Advanced analytics for power users. Premature before beginner experience is proven. |
| Additional timeframes (15m, 5m, 1w) | 1h is the priority; sub-hour creates data volume and infrastructure cost concerns. |
| Mobile native apps | Mobile web is functional. Native apps are expensive with no validated demand. |
| Public profiles & social features expansion | Ghost-town risk. Freeze social features until there are users to socialize. |
| Team billing / collaboration | No B2B signal. Solo learner is the validated persona. |
| Export to Pine Script / other platforms | Integration features before core value is proven is premature optimization. |
| Regime awareness in results (FR-08) | Deferred to v2.1. Educational insights (FR-02) are the simpler, faster version of this. |
| Data vendor fallback (FR-09) | Deferred to v2.1. Monitoring + banner (NFR-04 partial) is sufficient for Phase 2 user volume. |
| Weekly digest email (FR-13) | Nice retention mechanic, but no users to retain yet. Ship after beta cohort is active. |
| i18n / Localization | Long-term opportunity but premature. English-first until product-market fit is clear. |

---

## 8. Prioritized Backlog (RICE Scoring)

RICE scoring adapted for a solo-developer context. Reach = estimated users impacted in 90 days (1-10 scale relative). Impact = 0.25 (minimal) to 3 (massive). Confidence = 50-100%. Effort = person-weeks.

| Feature | Epic | Reach | Impact | Conf. | Effort | RICE | Rank |
|---|---|---|---|---|---|---|---|
| Product Analytics | E-09 | 10 | 3 | 100% | 2 | 15.0 | 1 |
| Wizard-First Onboarding | E-05 | 10 | 3 | 90% | 2 | 13.5 | 2 |
| Short Selling Engine | E-03 | 8 | 3 | 90% | 3 | 7.2 | 3 |
| Educational Backtest Insights | E-01 | 8 | 3 | 80% | 3 | 6.4 | 4 |
| 1-Hour Timeframe | E-04 | 6 | 2 | 100% | 1 | 12.0 | 5 |
| Backtest Perf Optimization | E-12 | 8 | 2 | 80% | 2 | 6.4 | 6 |
| Beta Tester Recruitment | E-10 | 5 | 3 | 90% | 1 | 13.5 | 7 |
| Progressive Block Disclosure | E-06 | 8 | 2 | 70% | 1.5 | 7.5 | 8 |
| Structured Logging | E-14 | 10 | 1 | 100% | 1.5 | 6.7 | 9 |
| Strategy Sentence Summary | E-07 | 7 | 2 | 60% | 1.5 | 5.6 | 10 |
| Block Difficulty Badges | E-08 | 7 | 1 | 80% | 0.5 | 11.2 | 11 |
| Frontend Test Infra | E-11 | 3 | 1 | 90% | 2 | 1.4 | 12 |
| Queue Separation | E-12 | 6 | 1 | 80% | 1 | 4.8 | 13 |

**Recommended execution order:** Analytics first (week 1-2), then Wizard + Onboarding (week 3-4), then Short Selling + 1h Timeframe (week 5-7), then Educational Insights (week 8-10), then hardening and beta recruitment (week 11-13).

---

## 9. Dependencies & Risks

### 9.1 Technical Dependencies

| Feature | Dependency | Risk | Mitigation |
|---|---|---|---|
| Short Selling (FR-03) | Backtest engine interpreter refactor | High | Core engine changes affect all existing strategies. Must maintain backward compatibility with long-only strategies. |
| 1h Timeframe (FR-04) | CryptoCompare 1h endpoint support | Medium | Verify API availability and rate limits for 1h candles across all 24 supported pairs. |
| Analytics (FR-01) | Analytics provider selection | Low | Evaluate: self-hosted (Plausible/Umami) vs. cloud (PostHog/Mixpanel free tier). Must not add significant infrastructure cost. |
| Educational Insights (FR-02) | Backtest engine metric enrichment | Medium | Trade count, regime classification, and parameter sensitivity require additional computation during backtest processing. |
| Frontend Tests (FR-11) | Jest + RTL setup in Next.js 15 | Low | Standard setup but may require configuration for App Router and React 19. |

### 9.2 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Short selling breaks existing backtests | High | High | Comprehensive regression test suite for all existing block types. Feature flag for short selling during development. |
| R-02 | Solo developer capacity insufficient for 90-day scope | High | Medium | RICE-ordered backlog allows graceful scope reduction. "Should" items can be deferred without compromising core themes. |
| R-03 | CryptoCompare 1h data has gaps for some pairs | Medium | Medium | Validate 1h data availability for top 10 pairs before committing. Launch with subset if needed. |
| R-04 | No beta testers volunteer | Medium | Medium | Identify 3-5 candidates from crypto communities (Reddit r/algotrading, Discord groups) before launch. Offer free Pro tier for 3 months. |
| R-05 | Analytics instrumentation adds measurable latency | Low | Low | Use async event dispatch. Frontend analytics fire-and-forget. Backend events via Redis pub/sub. |
| R-06 | Educational insights feel patronizing to intermediate users | Medium | Low | Make insight detail level configurable (Beginner / Standard / Minimal). Default to Beginner for new accounts. |
| R-07 | Feature bloat perception persists despite progressive disclosure | Medium | Medium | User test with 5 beta testers specifically on first-time experience. Iterate based on feedback before wider launch. |
| R-08 | Single-threaded backtest engine cannot meet sub-5s target for 1h data over 1 year | Medium | Medium | Profile engine hotspots. Consider numpy vectorization for indicator computation. 1h/1yr is ~8,760 candles — should be tractable. |

---

## 10. Appendix

### 10.1 Glossary

- **Brownfield PRD:** A product requirements document for an existing, already-built product (as opposed to greenfield/new product).
- **MoSCoW:** Must / Should / Could / Won't prioritization framework.
- **RICE:** Reach × Impact × Confidence / Effort scoring framework.
- **Progressive Disclosure:** UX pattern that hides complexity until the user is ready for it.
- **Regime:** Market condition classification (bull/bear/sideways) based on price trend analysis.
- **Overfitting:** When a strategy appears profitable in backtesting but is actually tuned to historical noise rather than genuine patterns.

### 10.2 Reference Documents

- Product Documentation (Jan 3, 2026) — Comprehensive current-state feature documentation
- Brainstorming Report (Feb 20, 2026) — Strategic brainstorming session by Mary (BMAD Analyst Agent)
- Competitive Analysis (Feb 22, 2026) — Market landscape analysis by Mary (BMAD Analyst Agent)

### 10.3 Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 2.0 | 2026-02-22 | John (BMAD PM) | Initial Phase 2 PRD. Defines 14 functional requirements, 10 non-functional requirements, 15 epics, 8 user stories, RICE-prioritized backlog. |
