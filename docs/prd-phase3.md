# Blockbuilders — Phase 3 PRD: "Confidence Engine"

**Author:** John (BMAD Product Manager Agent)
**Status:** Draft v1.0
**Date:** February 26, 2026
**Product:** Blockbuilders — Web-based no-code crypto strategy lab
**Phase:** 3 (Brownfield — extends existing post-MVP product)
**Prior Art:** Product Documentation (2026-02-24), Strategic Brainstorming Session, Competitive Analysis

---

## 1. Vision Statement

**Phase 3 transforms Blockbuilders from a feature-rich strategy builder into a confidence engine for everyday crypto holders.**

The product has achieved significant technical breadth — 20 block types, advanced risk management, scheduled re-backtests, analytics instrumentation, and a mature visual canvas. But the brainstorming session and competitive analysis surfaced a critical misalignment: *the product's complexity repels the very persona it was built for.*

Phase 3 corrects this. The north star is the "Alex story" — a retail crypto holder who, within 20 minutes of signing up, builds a simple strategy, backtests it, and feels something new: confidence in a plan. Every feature in this phase either shortens the path to that moment, deepens the understanding it produces, or gives Alex a reason to come back next week.

**Phase 3 in one sentence:** Make the product as simple as the persona needs it to be, as honest as the positioning demands, and as sticky as the business requires.

**Three themes:**

1. **Confidence from First Touch** — Wizard-first onboarding, progressive disclosure, plain-English results
2. **Confidence Over Time** — Weekly digests, honest strategy health warnings, improved auto-update labeling
3. **Confidence Through Community** — Educational templates, shareable results that teach

---

## 2. Target Persona (Unchanged, Reinforced)

**"Alex"** — A retail crypto holder (25-45) who bought BTC or ETH based on social media hype, experienced losses from emotional trading, and wants a rational framework. Alex does not know what a Sharpe ratio is, has never written code, and will leave if the product feels like it's "not for them." Alex is willing to pay $19/month if the product reliably helps them make better decisions.

**Deliberate product constraints (reaffirmed):**
- Daily timeframe only (swing trading, not day trading)
- Long positions only (no shorting)
- No live execution (lab, not trading desk)

---

## 3. Functional Requirements

All requirements are testable and scoped to Phase 3. Version: `v3.0`.

### 3.1. Onboarding & First-Run Experience

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-01 | Wizard-first post-signup flow: after signup, users land directly in the strategy wizard — not the dashboard | Must | New users see wizard as first screen after email verification; dashboard is not shown until first backtest completes |
| FR-02 | Wizard generates a backtest automatically upon completion and navigates to results | Must | Completing wizard triggers backtest without manual "Run" step; user sees results within 30 seconds of wizard completion |
| FR-03 | First-run guided overlay on results page explains the 5 core metrics in plain language | Must | Overlay appears on first backtest results view; each metric has a ≤2 sentence explanation; user can dismiss and it does not reappear |
| FR-04 | "What you just learned" summary card after first backtest explaining the takeaway | Should | Card appears below results on first backtest; summarizes in 1-2 sentences what the strategy did vs. buy-and-hold |
| FR-05 | Skip-to-canvas escape hatch visible but de-emphasized during wizard flow | Must | "I want to build manually" link is present but styled as secondary text; clicking navigates to empty canvas |

### 3.2. Plain-English Backtest Narratives

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-06 | Every backtest result leads with a narrative summary paragraph before any metrics | Must | Narrative appears as the first element on the results page; generated from template using backtest output data |
| FR-07 | Narrative includes: starting amount → ending amount, best/worst period, number of trades, and comparison to buy-and-hold | Must | All five data points present in the narrative text for every completed backtest |
| FR-08 | Narrative uses dollar amounts personalized to the user's initial balance | Should | If user set $5,000 initial balance, narrative says "$5,000 → $7,100" not percentages only |
| FR-09 | Narrative highlights maximum drawdown in experiential terms | Should | Drawdown described as "You would have watched your $10,000 drop to $X before recovering" |

### 3.3. Simplified Default Results View

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-10 | Default results view shows exactly 5 metrics: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold | Must | New users see only these 5 metrics by default; no Sharpe/Sortino/Calmar visible without expanding |
| FR-11 | "Show detailed analysis" expandable section contains all existing advanced metrics | Must | All current metrics remain accessible; section is collapsed by default |
| FR-12 | Users can customize which metrics appear in their default view via existing favorite metrics feature | Should | Favorite metrics pinning overrides the 5-metric default for users who have set preferences |

### 3.4. Progressive Disclosure

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-13 | Block palette defaults to "Essentials" view showing 5 indicators: SMA, EMA, RSI, Bollinger Bands, MACD | Must | New users see only 5 indicators in palette; toggle labeled "Show all indicators" reveals the full set |
| FR-14 | Indicator labels use plain English as primary label with technical name as subtitle | Should | Palette shows "Moving Average (SMA)" not "SMA" alone; applies to Essentials view |
| FR-15 | Wizard uses only Essential indicators and plain-English question framing | Must | Wizard never presents Ichimoku, Fibonacci, ADX, OBV, or Stochastic as options |

### 3.5. Strategy Health Warnings

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-16 | Low trade count warning when a backtest produces fewer than 10 trades | Must | Warning banner appears on results page stating trade count is insufficient for statistical confidence |
| FR-17 | Overfitting indicator when strategy return is >3x buy-and-hold with <15 trades | Should | Yellow warning banner explains that exceptional results with few trades may not repeat |
| FR-18 | Bear-market fragility warning when strategy loses money in every month where the asset dropped >10% | Should | Warning identifies the pattern and states the strategy may only work in bull markets |
| FR-19 | Parameter sensitivity notice on results page linking to comparison view | Could | Suggests user test with slightly different parameters to check robustness |

### 3.6. Weekly Strategy Digest Email

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-20 | Weekly email digest sent every Monday summarizing all active auto-update strategies | Must | Email delivered via existing Resend integration; includes per-strategy status |
| FR-21 | Digest includes: current signal status, whether entry/exit triggered that week, key metric changes | Must | Each strategy section shows signal state, any triggers, and return change since last week |
| FR-22 | "No signal" weeks framed positively: "Your BTC strategy is holding — no entry signals. Current RSI: 52" | Should | Absence of activity is presented as useful information, not emptiness |
| FR-23 | Users can opt out of digest per strategy or globally in notification settings | Must | Toggle in profile settings and per-strategy settings; respects existing notification preferences |

### 3.7. Honest Auto-Update Labeling

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-24 | Rename "Paper Trading" to "Strategy Monitor" across all UI surfaces | Must | No instance of "paper trading" remains in the UI; API field names may remain for backward compatibility |
| FR-25 | Strategy Monitor description explains it as "automated daily re-testing against latest data" | Must | Tooltip or subtitle on the Strategy Monitor toggle explains what it actually does |

### 3.8. Educational Templates Enhancement

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-26 | Each template includes a "What this teaches" section explaining the underlying concept | Should | Template detail view has a dedicated section before the "Clone" button explaining the trading concept |
| FR-27 | Templates ordered by conceptual difficulty: simple (MA crossover) → intermediate (RSI + trend filter) → advanced | Should | Template list displays in pedagogical order with difficulty labels |
| FR-28 | Add 3 new templates targeted at the Alex persona: "Buy the Dip" (RSI oversold), "Trend Follower" (EMA crossover + volume), "Safe Exit" (trailing stop + take profit) | Should | Three new templates seeded via migration; all use only Essential indicators |

### 3.9. Data Availability Transparency

| ID | Requirement | Priority (MoSCoW) | Acceptance Criteria |
|---|---|---|---|
| FR-29 | Show actual available data range per asset in the backtest configuration UI | Must | Date picker or asset selector displays "Data available: Jan 2021 – Present" per asset |
| FR-30 | Warn users before backtest if requested date range exceeds available data | Must | Inline warning appears if date_from predates the earliest available candle for the selected asset |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | Metric | Priority |
|---|---|---|---|---|
| NFR-01 | Performance | Wizard-to-results flow completes in ≤30 seconds including backtest execution | 95th percentile latency for wizard-generated backtests (1 year range, single asset) | Must |
| NFR-02 | Performance | Backtest narrative generation adds ≤200ms to results page load | Server-side template rendering time | Must |
| NFR-03 | Performance | Weekly digest email batch for all active users completes within 2 hours | Total batch processing time at current user base | Should |
| NFR-04 | Scalability | Email digest system handles 10,000 active users without degradation | No OOM errors or queue backpressure at 10K users | Should |
| NFR-05 | Scalability | Progressive disclosure state does not increase API payload size | Palette mode is a frontend-only toggle; no additional API calls | Must |
| NFR-06 | Security | Digest emails do not contain sensitive data (account balances, strategy definitions) | Email content review — only public metrics and status shown | Must |
| NFR-07 | Security | Shared backtest links continue to expose results only, never strategy logic | Existing token-based sharing mechanism audited for Phase 3 changes | Must |
| NFR-08 | Reliability | Strategy health warnings never block backtest completion | Warnings are computed post-backtest as a non-critical rendering step | Must |
| NFR-09 | Accessibility | All new UI elements meet WCAG 2.1 AA contrast ratios | Automated contrast check on warning banners and narrative text | Should |
| NFR-10 | Observability | All new features emit PostHog events for funnel analysis | Events: `wizard_first_run_started`, `narrative_viewed`, `digest_email_sent`, `health_warning_shown` | Must |
| NFR-11 | Compatibility | No regressions to existing backtest engine, strategy builder, or billing flows | Full regression test suite passes | Must |
| NFR-12 | Data Integrity | Auto-update rename is cosmetic only — no changes to scheduling logic, database fields, or API contracts | Migration is UI-label-only; existing `auto_update` fields unchanged | Must |

---

## 5. Epics

### Epic 1: Wizard-First Onboarding (FR-01 through FR-05)
**Feature area:** Onboarding & Activation
**Goal:** Reduce signup-to-first-backtest time to under 5 minutes; eliminate blank-canvas paralysis.
**RICE Score:** Reach: 100% of new users | Impact: 3 (massive) | Confidence: 90% | Effort: 3 weeks → **Score: 90**

### Epic 2: Plain-English Results (FR-06 through FR-12)
**Feature area:** Backtest Results & Understanding
**Goal:** Make every backtest result immediately understandable to someone who has never seen a backtest before.
**RICE Score:** Reach: 100% of backtest users | Impact: 3 (massive) | Confidence: 85% | Effort: 2 weeks → **Score: 127**

### Epic 3: Strategy Health & Honesty (FR-16 through FR-19)
**Feature area:** Trust & Accuracy
**Goal:** Prevent false confidence by surfacing honest warnings about statistical reliability.
**RICE Score:** Reach: 60% of backtest results | Impact: 2 (high) | Confidence: 80% | Effort: 2 weeks → **Score: 48**

### Epic 4: Progressive Disclosure (FR-13 through FR-15)
**Feature area:** Visual Builder UX
**Goal:** Make the block palette and wizard feel approachable rather than overwhelming.
**RICE Score:** Reach: 100% of canvas users | Impact: 2 (high) | Confidence: 90% | Effort: 1 week → **Score: 180**

### Epic 5: Weekly Digest & Retention (FR-20 through FR-25)
**Feature area:** Retention & Engagement
**Goal:** Give users a reason to return weekly even when their strategies aren't triggering signals.
**RICE Score:** Reach: 40% of users (those with auto-update) | Impact: 2 (high) | Confidence: 70% | Effort: 3 weeks → **Score: 19**

### Epic 6: Educational Templates (FR-26 through FR-28)
**Feature area:** Content & Learning
**Goal:** Turn templates from shortcuts into learning paths that teach trading concepts.
**RICE Score:** Reach: 30% of new users | Impact: 1 (medium) | Confidence: 75% | Effort: 1 week → **Score: 22**

### Epic 7: Data Transparency (FR-29 through FR-30)
**Feature area:** Trust & Accuracy
**Goal:** Prevent user frustration from requesting data ranges that don't exist.
**RICE Score:** Reach: 50% of backtest attempts | Impact: 1 (medium) | Confidence: 95% | Effort: 0.5 weeks → **Score: 95**

### Recommended Build Order (by RICE)

1. **Epic 4: Progressive Disclosure** (RICE: 180) — Highest value-to-effort; frontend-only
2. **Epic 2: Plain-English Results** (RICE: 127) — Core differentiator; defines the product category
3. **Epic 7: Data Transparency** (RICE: 95) — Quick win; prevents Premium churn
4. **Epic 1: Wizard-First Onboarding** (RICE: 90) — Critical but larger effort
5. **Epic 3: Strategy Health & Honesty** (RICE: 48) — Trust-building; differentiator vs. all competitors
6. **Epic 6: Educational Templates** (RICE: 22) — Content work; can parallelize
7. **Epic 5: Weekly Digest & Retention** (RICE: 19) — Important but lower reach until user base grows

---

## 6. User Stories with Acceptance Criteria

### Epic 1: Wizard-First Onboarding

**Story 1.1: Wizard as default post-signup destination**
*As a new user who just signed up, I want to be guided directly into the strategy wizard so I don't have to figure out what to do first.*

**Given** a user has just completed signup (email/password or OAuth)
**When** the signup flow completes and the app loads
**Then** the user is routed to the strategy wizard (not the dashboard)
**And** a subtle "Skip to dashboard" link is visible but de-emphasized
**And** the PostHog event `wizard_first_run_started` fires

**Story 1.2: Auto-backtest on wizard completion**
*As a new user who just finished the wizard, I want my strategy to be backtested automatically so I don't have to learn how to run a backtest.*

**Given** a user has completed all wizard steps and a valid strategy JSON is generated
**When** the user clicks "See how it would have performed" (final wizard CTA)
**Then** the strategy is saved automatically and a backtest is enqueued
**And** a loading state with progress indicator is shown
**And** results are displayed within 30 seconds (NFR-01)
**And** the user does not need to navigate to a separate backtest page

**Story 1.3: First-run results guided overlay**
*As a new user seeing backtest results for the first time, I want key metrics explained so I understand what I'm looking at.*

**Given** a user is viewing their first-ever backtest results
**When** the results page loads
**Then** a guided overlay highlights each of the 5 default metrics with a 1-2 sentence plain-language explanation
**And** the overlay has "Next" / "Got it" progression
**And** the overlay is shown only once (tracked via localStorage or user record)
**And** the PostHog event `first_run_overlay_completed` fires on dismissal

**Story 1.4: Canvas escape hatch from wizard**
*As an experienced user who signed up, I want to skip the wizard and go directly to the canvas.*

**Given** a user is in the wizard flow
**When** they click the "I want to build manually" link
**Then** they are navigated to an empty canvas strategy editor
**And** a new blank strategy is created for them
**And** the PostHog event `wizard_skipped` fires

---

### Epic 2: Plain-English Results

**Story 2.1: Narrative summary generation**
*As a user who just ran a backtest, I want to read a plain-English paragraph explaining what happened so I understand the result without studying metrics.*

**Given** a backtest has completed successfully with at least 1 trade
**When** the results page renders
**Then** a narrative paragraph appears as the first content element above all metrics
**And** the narrative includes: starting balance → ending balance, best performing period, worst performing period (max drawdown in dollar terms), total number of trades, and comparison to buy-and-hold in percentage points
**And** dollar amounts match the user's configured initial balance

**Story 2.2: Zero-trade narrative fallback**
*As a user whose backtest produced zero trades, I want a clear explanation rather than confusing empty metrics.*

**Given** a backtest has completed with 0 trades
**When** the results page renders
**Then** the narrative states: "Your strategy didn't trigger any entry signals during this period. This could mean your conditions are too strict, or the market didn't match your criteria. Try adjusting your thresholds or testing a different date range."
**And** no performance metrics are shown (only the narrative and a "Modify Strategy" CTA)

**Story 2.3: Simplified default metrics view**
*As a user viewing backtest results, I want to see only the most important metrics by default so I'm not overwhelmed.*

**Given** a user has not customized their favorite metrics
**When** they view any backtest result
**Then** exactly 5 metrics are visible: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %
**And** a "Show detailed analysis" link/button expands to show all existing metrics
**And** the expanded section is collapsed by default

---

### Epic 3: Strategy Health & Honesty

**Story 3.1: Low trade count warning**
*As a user viewing backtest results, I want to be warned when my strategy produced too few trades to be statistically meaningful.*

**Given** a backtest has completed with fewer than 10 trades
**When** the results page renders
**Then** a yellow warning banner appears below the narrative
**And** the banner text states: "⚠️ This strategy only triggered [N] trades. That's not enough data to draw reliable conclusions. Consider testing a longer date range or relaxing your entry conditions."
**And** the PostHog event `health_warning_shown` fires with property `warning_type: low_trade_count`

**Story 3.2: Overfitting indicator**
*As a user viewing backtest results, I want to be warned when results look too good relative to the number of trades.*

**Given** a backtest has completed where total return is >3× the buy-and-hold return AND trade count is <15
**When** the results page renders
**Then** a yellow warning banner states: "⚠️ These results significantly outperformed the market with very few trades. This pattern sometimes indicates the strategy is fitted to specific past events rather than a repeatable edge. Test with different date ranges to check."

**Story 3.3: Bear-market fragility warning**
*As a user viewing backtest results, I want to know if my strategy only works in bull markets.*

**Given** a backtest spans a period containing at least 2 months where the asset price dropped >10%
**And** the strategy lost money in every one of those months
**When** the results page renders
**Then** a warning banner states: "⚠️ This strategy lost money in every month where [asset] dropped more than 10%. It may only perform well in rising markets."

---

### Epic 4: Progressive Disclosure

**Story 4.1: Essentials-first block palette**
*As a new user opening the block palette, I want to see only the most common indicators so I'm not overwhelmed by options I don't understand.*

**Given** a user opens the block palette on the canvas
**When** the palette loads
**Then** the default view shows 5 indicators: Moving Average (SMA), Exponential Moving Average (EMA), RSI, Bollinger Bands, MACD
**And** a "Show all indicators" toggle is present at the bottom of the indicator section
**And** toggling reveals the full indicator set (Stochastic, ADX, Ichimoku, OBV, Fibonacci, etc.)
**And** the user's toggle preference persists across sessions

**Story 4.2: Plain-English indicator labels**
*As a non-technical user, I want indicator names in plain English so I can understand what they do before I use them.*

**Given** the block palette is in Essentials mode
**When** the user views indicator cards
**Then** each card shows a plain-English primary label (e.g., "Momentum Indicator") with the technical name as subtitle (e.g., "RSI")
**And** the existing hover tooltip provides a 1-2 sentence explanation

---

### Epic 5: Weekly Digest & Retention

**Story 5.1: Weekly digest email delivery**
*As a user with active Strategy Monitors, I want a weekly email summarizing what happened with my strategies.*

**Given** a user has at least one strategy with Strategy Monitor enabled
**And** the user has not opted out of digest emails
**When** Monday at 08:00 UTC arrives
**Then** a digest email is sent via Resend containing a section per active strategy
**And** each section includes: strategy name, asset, current signal status (in position / watching), whether an entry or exit triggered that week, and the key metric change (return % delta since last week)

**Story 5.2: No-signal positive framing**
*As a user whose strategies didn't trigger any signals this week, I want the digest to feel useful rather than empty.*

**Given** a strategy had no entry or exit triggers during the week
**When** the digest section for that strategy renders
**Then** the section text states: "[Strategy name] is holding — no new signals this week. Current [primary indicator]: [value]."
**And** the tone is informational, not apologetic

**Story 5.3: Digest opt-out controls**
*As a user, I want to control which strategies send me digest emails.*

**Given** a user navigates to notification settings
**When** they view the digest preferences
**Then** they see a global digest on/off toggle and per-strategy overrides
**And** changes take effect for the next scheduled digest

---

### Epic 6: Educational Templates

**Story 6.1: "What this teaches" section on templates**
*As a user browsing templates, I want to understand the trading concept behind each template before I clone it.*

**Given** a user is viewing a template detail page
**When** the page renders
**Then** a "What this teaches" section appears above the clone button
**And** the section explains the underlying concept in 2-3 plain-English sentences (e.g., "This template tests the idea that prices tend to bounce back when they've dropped sharply relative to their recent range — a concept called mean reversion.")

**Story 6.2: New Alex-persona templates**
*As a new user, I want to find templates that match my simple trading ideas.*

**Given** a user navigates to the templates page
**When** the page loads
**Then** at least 3 new beginner-targeted templates are available: "Buy the Dip", "Trend Follower", "Safe Exit"
**And** each uses only Essential-tier indicators
**And** templates are ordered by difficulty with labels: Beginner / Intermediate / Advanced

---

### Epic 7: Data Transparency

**Story 7.1: Show data availability per asset**
*As a user configuring a backtest, I want to see how much historical data is actually available for my chosen asset.*

**Given** a user is on the backtest configuration screen
**When** they select or change the asset
**Then** the UI displays "Data available: [earliest date] – Present" for the selected asset
**And** if the user's selected date range exceeds available data, a warning appears: "Data for [asset] starts at [date]. Your backtest will use the available range."

---

## 7. MVP Scope

### In Scope (Phase 3 MVP)

| Epic | Stories | Rationale |
|---|---|---|
| Epic 1: Wizard-First Onboarding | 1.1, 1.2, 1.3, 1.4 | Critical path — #1 risk identified in brainstorming is onboarding dropoff |
| Epic 2: Plain-English Results | 2.1, 2.2, 2.3 | Core differentiator — no competitor does this; defines the product category |
| Epic 3: Strategy Health (Must items) | 3.1 (low trade count) | Highest-impact warning; prevents the most common false-confidence scenario |
| Epic 4: Progressive Disclosure | 4.1, 4.2 | Highest RICE score; frontend-only; directly addresses "expert tool" perception risk |
| Epic 5: Digest & Labeling | 5.3 (opt-out controls), plus FR-24/FR-25 (rename Paper Trading) | Renaming is cosmetic but high-trust-impact; opt-out is table stakes before sending emails |
| Epic 7: Data Transparency | 7.1 | Quick win; prevents Premium-tier churn from unmet data expectations |

### Explicitly Out of Scope (Phase 3)

| Item | Rationale |
|---|---|
| **Full weekly digest email (Stories 5.1, 5.2)** | Requires email template design, batch processing infrastructure, and content writing. Deferred to Phase 3.1 after opt-out controls and rename are in place. |
| **Overfitting indicator (Story 3.2)** and **bear-market fragility warning (Story 3.3)** | Higher implementation complexity (heuristic design); ship low-trade-count warning first, learn from analytics, then add |
| **Educational templates content (Stories 6.1, 6.2)** | Content-heavy; can be done in parallel by non-engineering team. Templates infrastructure already exists. |
| **Parameter sensitivity notice (FR-19)** | Requires UX for parameter variation testing; deferred to Phase 4 |
| **Short selling support** | Contra to product identity — long-only positioning is deliberate |
| **Sub-daily timeframes (1h, 15m, 5m)** | Daily-only is a deliberate constraint; 4h already supported for edge cases |
| **Exchange integration / webhooks** | Lab positioning is a moat — connecting to exchanges makes Blockbuilders a worse version of every bot platform |
| **Live trading / execution** | Out of product identity entirely |
| **Multi-asset portfolio strategies** | Complexity explosion; deferred indefinitely |
| **Walk-forward optimization / Monte Carlo** | Power-user features that conflict with simplicity goal |
| **Mobile native apps** | Mobile web is sufficient; native adds maintenance burden with no clear persona benefit |
| **AI-generated strategies** | Philosophically opposed to product identity — Blockbuilders helps you test *your* ideas, not generate ideas for you |
| **Strategy marketplace with monetization** | Community features are premature at current scale |
| **Advanced order types (limit, stop-limit)** | Not relevant to daily swing trading use case |

### Opinionated Cuts — Things the Brainstorm Suggested That I'm Killing

1. **Full community sharing and social features** — The product has <1,000 users. Social features with no network are ghost towns. Shareable backtest links (already built) are sufficient.
2. **Webhook-based signal export to execution platforms** — This is a Phase 5+ consideration. Building the bridge to 3Commas before the lab experience is excellent is premature optimization of the funnel.
3. **"Wizard replaces canvas" experiment** — The brainstorm floated the idea that the wizard should be the primary UX permanently. I disagree. The canvas is the power of the product. Wizard-first onboarding funnels users *through* the wizard *to* the canvas when they're ready. Don't remove the ceiling.
4. **Expanded annual discount (33% off)** — Pricing changes are a business decision, not a product feature. The current 15-20% is fine until there's data showing annual conversion is a bottleneck.

---

## 8. Dependencies

| Dependency | Type | Affects | Risk |
|---|---|---|---|
| **Existing wizard implementation** | Internal (code) | Epic 1 | LOW — Wizard exists and generates valid strategy JSON. Needs routing changes, not rebuilding. |
| **Backtest engine performance** | Internal (infra) | Epic 1 (FR-02, NFR-01) | MEDIUM — Wizard-generated backtests must complete in ≤30s. Current engine is single-threaded; may need query optimization for 1-year range fast path. |
| **Resend email API** | External (vendor) | Epic 5 | LOW — Already integrated for password reset. Digest emails are a new template, not a new integration. |
| **PostHog analytics** | Internal (instrumentation) | NFR-10 | LOW — PostHog is already instrumented with consent gating. New events follow existing patterns. |
| **CryptoCompare data availability metadata** | External (vendor) | Epic 7 | MEDIUM — Need an endpoint or local cache that maps asset → earliest available candle date. May require a one-time data audit. |
| **Existing favorite metrics feature** | Internal (code) | FR-12 | LOW — Already implemented. Simplified default view layers on top. |
| **Strategy templates infrastructure** | Internal (code) | Epic 6 | LOW — Template model, API, and frontend exist. New templates are seed data. |
| **Frontend routing (Next.js App Router)** | Internal (code) | Epic 1 | LOW — Post-signup redirect is a route change. No architectural changes. |

---

## 9. Risks & Mitigations

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R-01 | **Wizard-first flow alienates returning users** — Experienced users forced through wizard on every signup | Medium | Low | Wizard-first applies only to first-ever login (tracked by a `has_completed_onboarding` flag). Returning users always go to dashboard. |
| R-02 | **Narrative generation produces awkward or incorrect text** — Template-based text fails on edge cases (e.g., 0 trades, negative balance, 1-day range) | High | Medium | Define explicit fallback templates for edge cases (Story 2.2 covers zero-trade). QA with ≥20 diverse backtest outputs before launch. |
| R-03 | **Strategy health warnings discourage users** — Users see warnings and think "my strategy is bad" instead of "this is honest feedback" | Medium | Medium | Frame warnings as coaching, not criticism. Use language like "Here's what to watch for" not "This strategy is unreliable." User test copy with 5 target-persona participants. |
| R-04 | **Progressive disclosure hides power features permanently** — Advanced users never find Ichimoku/Fibonacci | Low | Low | "Show all indicators" toggle persists. Advanced indicators are always one click away. No features are removed. |
| R-05 | **Backtest ≤30s SLA fails for some assets/ranges** | Medium | Medium | Wizard constrains date range to 1 year for first backtest (matching free tier limit). Optimize the hot path for the 5 most common assets. Add timeout fallback that shows partial results with "still processing" state. |
| R-06 | **Email digest deliverability issues** — Emails land in spam | Medium | Medium | Use existing Resend sender domain (already configured for password reset). Follow email best practices: plain-text fallback, unsubscribe header, low image ratio. Monitor bounce rate in Resend dashboard. |
| R-07 | **Data availability metadata is inaccurate** — Displayed data range doesn't match actual candle coverage | High | Low | Pre-compute data availability from the candle cache table; update on each data fetch. Include a "Last verified" timestamp. |
| R-08 | **Scope creep from "just one more warning"** — Strategy health epic expands with every new heuristic idea | Medium | High | Phase 3 MVP ships only the low-trade-count warning. Additional warnings require separate PRD amendments with analytics justification. |

---

## 10. Success Metrics

| Metric | Current Baseline | Phase 3 Target | Measurement |
|---|---|---|---|
| Signup → First Backtest Completion | Unknown (no analytics before PostHog) | ≥60% of new signups complete a backtest within first session | PostHog funnel |
| Time to First Backtest | Unknown | ≤5 minutes from signup | PostHog event timestamps |
| Backtest Results Viewed Rate | Unknown | ≥90% of completed backtests have results viewed | PostHog `results_viewed` / `backtest_completed` |
| Week 1 Retention (Second Session) | Unknown | ≥30% of new users return within 7 days | PostHog `second_session` event |
| NPS / Qualitative Feedback | No baseline | Positive sentiment on "I understood my results" in user interviews | Manual — 5 user interviews post-launch |

---

## Appendix A: Feature Priority Summary (MoSCoW)

| Priority | Features |
|---|---|
| **Must Have** | FR-01, FR-02, FR-03, FR-05, FR-06, FR-07, FR-10, FR-11, FR-13, FR-15, FR-16, FR-20, FR-21, FR-23, FR-24, FR-25, FR-29, FR-30 |
| **Should Have** | FR-04, FR-08, FR-09, FR-12, FR-14, FR-17, FR-18, FR-22, FR-26, FR-27, FR-28 |
| **Could Have** | FR-19 |
| **Won't Have (this phase)** | Short selling, sub-daily timeframes, exchange integration, live trading, AI strategy generation, full marketplace, native mobile apps |

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| Strategy Monitor | Renamed from "Paper Trading." Automated daily re-testing of a strategy against the latest market data. |
| Essentials View | The simplified block palette showing only SMA, EMA, RSI, Bollinger Bands, and MACD. |
| Narrative Summary | A template-generated plain-English paragraph describing backtest results in experiential terms. |
| Strategy Health Warning | A contextual banner on backtest results that flags potential statistical or structural issues. |
| Alex Persona | The target user: a retail crypto holder who wants confidence in a trading plan, not a quantitative toolkit. |

---

*End of PRD. This document should be used as input for Architecture and Epic/Story creation workflows.*