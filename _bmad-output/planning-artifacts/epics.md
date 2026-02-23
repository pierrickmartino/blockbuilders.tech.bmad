---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/prd-phase2.md
  - docs/architecture-delta-phase2.md
  - docs/adversarial-review-phase2.md
  - docs/tech-stack-brainstorm-phase2.md
---

# Blockbuilders Phase 2 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Blockbuilders Phase 2, decomposing the requirements from the PRD, Architecture Delta, Adversarial Review, and Tech Stack Brainstorm into implementable stories. Phase 2 focuses on three strategic themes: **Backtest Credibility & Education**, **Onboarding Excellence**, and **Engine Credibility**, with the overarching goal of getting 5-10 real beta testers using the product within 90 days.

## Requirements Inventory

### Functional Requirements

FR-01: Product Analytics Instrumentation — System tracks signup, first strategy creation, first backtest, second session, feature usage events. Dashboard accessible to product owner. [BUILD - P0]

FR-02: Educational Backtest Insights — Every completed backtest displays: plain-language metric explanations, overfitting warning when trade count < 30, confidence indicator (green/yellow/red), and a "What could go wrong" section. Single verbosity level aimed at beginner persona (no configurable detail levels per adversarial review). [BUILD]

FR-03: Short Selling Support — Users can create strategies that enter short positions. Engine calculates short P&L correctly including borrowing cost parameter. All existing risk blocks (SL, TP, trailing stop, max drawdown) function for short positions. [BUILD - PREREQUISITE EPIC]

FR-04: 1-Hour Timeframe — Users can select 1h candle timeframe for strategies and backtests. Data fetching, caching, and gap detection work for 1h candles. Lazy backfill with caching for v2.0. [BUILD]

FR-05: Wizard-First Onboarding — New users land on the strategy wizard by default (not empty canvas). Wizard includes short-selling question. Canvas accessible via "Advanced" toggle. Maximum 4 wizard questions (per adversarial review). [BUILD]

FR-06: Progressive Block Disclosure — Block library shows Level 1 blocks by default, Level 2 after first backtest, Level 3 after 5 backtests. Users can override via settings. [DEFER - wizard handles simplification for now]

FR-07: Strategy Sentence Summary — Canvas displays human-readable sentence describing the strategy, updated real-time as blocks change. [DEFER - post-beta polish feature]

FR-08: Regime Awareness in Results — Backtest results include market regime overlay identifying bull/bear/sideways periods and per-regime performance breakdown. [DEFER - v2.1]

FR-09: Second Data Vendor Fallback — System can fetch candle data from secondary vendor when CryptoCompare is unavailable. [DEFER - v2.1]

FR-10: Onboarding Funnel Analytics — Dedicated funnel view: signup -> wizard started -> strategy saved -> backtest run -> results viewed -> second session. [BUILD - bundled with FR-01]

FR-11: Frontend Test Infrastructure — Jest + React Testing Library configured with minimum coverage targets. [KILL - zero user impact at current scale, Phase 3]

FR-12: Beta Tester Recruitment Flow — In-app invite mechanism, structured feedback collection, analytics segmentation for beta accounts. In-product "Give Feedback" button on every page (per adversarial review). [BUILD]

FR-13: Weekly Performance Digest Email — Opted-in users receive weekly email summarizing strategy performance. [KILL - no users to email yet, Phase 3]

FR-14: Block Complexity Tier Badge — Each block shows difficulty badge (Beginner/Intermediate/Advanced). [BUILD - 0.5 week, slot into any gap]

### NonFunctional Requirements

NFR-01: Backtest Performance — Standard backtest (1yr daily, single asset) < 5s. 5yr daily < 15s. Measured at p95. [BUILD - profiling + targeted fixes, 1.5 weeks]

NFR-02: API Response Time — All non-backtest API endpoints respond < 200ms at p95 under 100 concurrent users. [MUST - existing]

NFR-03: Availability — Application maintains 99.5% uptime monthly, excluding scheduled maintenance. [MUST - existing]

NFR-04: Data Vendor Resilience — If CryptoCompare returns errors > 5 min, log failure and surface user-facing banner. Fallback vendor deferred to v2.1. [PARTIAL BUILD - monitoring + banner only]

NFR-05: Security Auth — Passwords hashed bcrypt cost >= 12. JWT 7-day expiry. OAuth state tokens 10-min expiry. Rate limiting 10 attempts/min/IP on auth endpoints. [MUST - existing]

NFR-06: Security Data — All API over HTTPS. No PII in public profile endpoints. S3 auth-only access. SQL injection prevention via parameterized queries. [MUST - existing]

NFR-07: Scalability Workers — Queue separation (manual vs auto-update queues) via Docker Compose. [DEFER - not needed at beta scale per adversarial review]

NFR-08: Observability — Structured JSON logging via structlog, correlation IDs on backtest jobs and requests via FastAPI middleware, error logging to stdout. Skip alerting infrastructure (per adversarial review). [BUILD - 1 week scoped down]

NFR-09: Browser Compatibility — Chrome 90+, Firefox 88+, Safari 14+. Mobile responsive on iOS Safari and Chrome Android. [MUST - existing]

NFR-10: Accessibility — Keyboard navigable, WCAG 2.1 AA color contrast, screen reader labels on canvas actions. [DEFER - v2.1]

### Additional Requirements

**Architecture Requirements:**
- E-03 (Short Selling) is a PREREQUISITE EPIC with regression gate: ~20 scenarios must pass before E-01 begins
- Strategy definition_json needs schema_version field (version 2 for short selling support)
- Existing strategies without direction field default to long (backward compatibility)
- Educational insights stored in MinIO result payload (not DB columns)
- 1h candle data: lazy backfill with caching for v2.0 (fetch on demand, not scheduled)
- PostHog Cloud free tier recommended for analytics (~20 lines frontend code, zero infra)
- Beta invites: leverage existing user_tier field rather than adding new boolean
- Observability: structlog + correlation IDs via FastAPI middleware
- Schema migrations needed: 2-3 total (backtest_runs.has_short_positions, beta_invites table)
- Monolith architecture is correct for Phase 2 (no decomposition needed)
- PostgreSQL handles 1h data volume fine (~1M rows for 24 pairs over 5 years)

**Tech Stack Upgrade Requirements:**
- HIGH: Upgrade Next.js 15 -> 16 (security patches + routing performance, 1-2 days)
- MEDIUM: Upgrade FastAPI to 0.129.x (0.5 day)
- MEDIUM: Upgrade Python 3.11 -> 3.12 (1 day)
- MEDIUM-LOW: Upgrade PostgreSQL 15 -> 17 (0.5 day)
- Add cookie/consent consideration for PostHog analytics (GDPR compliance)

**Adversarial Review Adjustments:**
- Total budget: ~15.5 weeks (down from 22.5), leaving 5-7 weeks buffer
- Short Selling budgeted at 4 weeks (not 3) due to engine surgery risk
- Wizard capped at 4 questions maximum
- Educational insights: single verbosity level, no configuration UI
- Observability: skip alerting, structlog + correlation IDs only
- Progressive Block Disclosure: DEFERRED (wizard provides guardrails)
- Frontend Testing: KILLED for Phase 2
- Weekly Digest: KILLED for Phase 2
- Queue Separation: DEFERRED

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR-01 | Epic 1 | Product analytics instrumentation (PostHog) |
| FR-02 | Epic 5 | Educational backtest insights |
| FR-03 | Epic 3 | Short selling engine support |
| FR-04 | Epic 4 | 1-hour timeframe support |
| FR-05 | Epic 2 | Wizard-first onboarding default |
| FR-06 | DEFERRED | Progressive block disclosure (wizard provides guardrails) |
| FR-07 | DEFERRED | Strategy sentence summary (post-beta polish) |
| FR-08 | DEFERRED | Regime awareness (v2.1) |
| FR-09 | DEFERRED | Data vendor fallback (v2.1) |
| FR-10 | Epic 1 | Onboarding funnel analytics |
| FR-11 | KILLED | Frontend test infrastructure (Phase 3) |
| FR-12 | Epic 7 | Beta tester recruitment flow |
| FR-13 | KILLED | Weekly performance digest (Phase 3) |
| FR-14 | Epic 2 | Block complexity tier badges |

| NFR | Epic | Description |
|---|---|---|
| NFR-01 | Epic 6 | Backtest performance optimization |
| NFR-04 | Epic 6 | Data vendor monitoring + user banner |
| NFR-08 | Epic 1 | Structured logging + correlation IDs |

## Epic List

### Epic 1: Measurement & Observability Foundation
Product owner can track every user action, measure the onboarding funnel, and debug production issues with structured logs. Tech stack upgrades (Next.js 16 security patches, FastAPI, Python 3.12) ship alongside to establish a secure, modern baseline.
**FRs covered:** FR-01, FR-10
**NFRs covered:** NFR-08
**Additional:** Next.js 16 upgrade, FastAPI upgrade, Python 3.12 upgrade, PostHog integration, cookie/consent (GDPR), structlog + correlation IDs
**Schedule:** Weeks 1-2

### Epic 2: Guided Onboarding Experience
New users land on a guided wizard that gets them from signup to first backtest in under 10 minutes. Block difficulty badges help users pick appropriate complexity. The canvas becomes "Advanced Mode" for experienced users.
**FRs covered:** FR-05, FR-14
**Schedule:** Weeks 3-4

### Epic 3: Short Selling Engine (PREREQUISITE EPIC)
Users can create and backtest strategies that enter short positions. All risk management blocks (SL, TP, trailing stop, max drawdown) work correctly for shorts. Strategy JSON schema versioned for forward compatibility. Regression gate: ~20 scenarios must pass before educational insights can be built.
**FRs covered:** FR-03
**Additional:** Schema versioning (definition_json schema_version field), backward compatibility for existing long-only strategies
**Schedule:** Weeks 5-8 (4 weeks)

### Epic 4: Expanded Timeframe Support
Active traders can backtest strategies on 1-hour candles, opening the product to shorter-term trading ideas alongside existing 4h and 1d timeframes.
**FRs covered:** FR-04
**Additional:** Lazy backfill with caching, data quality validation for top pairs
**Schedule:** Week 9

### Epic 5: Educational Backtest Insights
Every completed backtest explains results in plain language — overfitting warnings, metric explanations, confidence indicators, and "What could go wrong" sections. This is the key competitive differentiator no other tool offers.
**FRs covered:** FR-02
**Dependency:** Requires Epic 3 (Short Selling) regression gate to be green
**Schedule:** Weeks 10-12

### Epic 6: Backtest Performance & Reliability
Users get fast backtest results (sub-5s for standard backtests) and clear communication when data issues occur. Profiling and targeted optimization of engine hotspots.
**NFRs covered:** NFR-01, NFR-04
**Schedule:** Weeks 12-13

### Epic 7: Beta Program Launch
Real users can join the product via invite codes, provide in-context feedback via an in-product button, and are segmented in analytics for cohort analysis. Free Pro tier incentive for beta testers.
**FRs covered:** FR-12
**Additional:** In-product feedback button, beta analytics segmentation, invite code flow
**Schedule:** Week 10 (parallel with Epic 5)

### Dependency Flow

```
Epic 1 (Measurement) --> Epic 2 (Onboarding) --> Epic 3 (Short Selling) --GATE--> Epic 5 (Education)
                                                       |
                                                       +---> Epic 4 (1h Timeframe)

Epic 7 (Beta) runs parallel with Epic 5
Epic 6 (Performance) runs last
```

---

## Epic 1: Measurement & Observability Foundation

Product owner can track every user action, measure the onboarding funnel, and debug production issues with structured logs. Tech stack upgrades ship alongside to establish a secure, modern baseline.

### Story 1.1: Upgrade Tech Stack to Secure Baseline

As a **product owner**,
I want the platform running on the latest secure versions of Next.js, FastAPI, and Python,
So that security vulnerabilities are patched and the foundation is stable for all Phase 2 development.

**Acceptance Criteria:**

**Given** the current stack runs Next.js 15, FastAPI (older), Python 3.11
**When** the upgrade is applied
**Then** Next.js 16.x is running with all security patches applied, FastAPI is at 0.129.x, and Python is at 3.12
**And** OAuth callback flow, shared result links, and all existing routes work correctly
**And** all existing functionality passes smoke testing (login, strategy creation, backtest run)

### Story 1.2: Integrate PostHog Analytics with Privacy Consent

As a **product owner**,
I want event-level analytics tracking user actions across the product,
So that I can measure engagement and identify where users drop off.

**Acceptance Criteria:**

**Given** PostHog Cloud (free tier) is configured
**When** a user visits the application
**Then** a minimal cookie/consent banner is displayed for GDPR compliance
**And** analytics events fire for: `page_view`, `signup_completed`, `login_completed`
**And** events are visible in the PostHog dashboard

**Given** a user interacts with key product features
**When** they create a strategy, open the wizard, run a backtest, or view results
**Then** events fire for: `wizard_started`, `strategy_created`, `strategy_saved`, `backtest_started`, `backtest_completed`, `results_viewed`
**And** each event includes user ID and timestamp

### Story 1.3: Backend Event Tracking for Backtest Lifecycle

As a **product owner**,
I want server-side analytics events for backtest lifecycle events,
So that I can track events that don't originate from the frontend (scheduled backtests, worker events).

**Acceptance Criteria:**

**Given** the PostHog server-side SDK is integrated in FastAPI
**When** a backtest job starts, completes, or fails in the worker
**Then** events `backtest_job_started`, `backtest_job_completed`, `backtest_job_failed` are emitted with correlation ID, user ID, strategy ID, and duration
**And** events are dispatched asynchronously (fire-and-forget) so they don't impact backtest performance

### Story 1.4: Onboarding Funnel Dashboard

As a **product owner**,
I want a dedicated funnel view showing conversion rates at each step of the user journey,
So that I can identify exactly where users drop off and prioritize improvements.

**Acceptance Criteria:**

**Given** analytics events are being tracked (Story 1.2, 1.3)
**When** I open the PostHog funnel dashboard
**Then** I can see a configured funnel with steps: `signup_completed` -> `wizard_started` -> `strategy_saved` -> `backtest_started` -> `backtest_completed` -> `results_viewed` -> `second_session`
**And** conversion rates between each step are displayed
**And** I can filter by date range and user cohort

### Story 1.5: Structured Logging with Correlation IDs

As a **developer**,
I want structured JSON logging with correlation IDs on all requests and backtest jobs,
So that I can quickly diagnose issues when beta testers report problems.

**Acceptance Criteria:**

**Given** structlog is configured in the FastAPI application
**When** any API request is processed
**Then** a unique correlation ID is generated and attached to all log entries for that request
**And** logs are output as structured JSON to stdout

**Given** a backtest job is processed by the worker
**When** the job starts, progresses, or fails
**Then** all log entries include the job's correlation ID, user ID, and strategy ID
**And** error logs include the full exception traceback in structured format

**Given** a developer needs to debug an issue
**When** they search Docker logs with `docker compose logs | jq`
**Then** they can filter by correlation ID to see all related log entries for a single request or job

---

## Epic 2: Guided Onboarding Experience

New users land on a guided wizard that gets them from signup to first backtest in under 10 minutes. Block difficulty badges help users pick appropriate complexity. The canvas becomes "Advanced Mode" for experienced users.

### Story 2.1: Wizard-First Default for New Users

As a **new user with no trading experience**,
I want to be directed to the strategy wizard when I first sign up,
So that I'm guided through strategy creation instead of facing a blank canvas.

**Acceptance Criteria:**

**Given** I have just created my account and have zero strategies
**When** I navigate to the strategies page or click "Create Strategy"
**Then** I am directed to the strategy wizard (not the empty canvas)

**Given** I am an existing user with one or more strategies
**When** I navigate to the strategies page
**Then** I see my strategy list as normal and am NOT redirected to the wizard

**Given** I am on the wizard
**When** I want to use the canvas directly
**Then** I can access it via an explicit "Advanced Mode" toggle/link

### Story 2.2: Streamlined 4-Question Wizard with Short Selling Option

As a **new user**,
I want a brief wizard that asks only essential questions to build my first strategy,
So that I can get to my first backtest in under 5 minutes.

**Acceptance Criteria:**

**Given** I start the strategy wizard
**When** I complete the wizard flow
**Then** the wizard asks a maximum of 4 questions covering: asset selection, indicator/strategy type, position direction (long/short), and risk management (stop loss/take profit)
**And** the wizard completes in under 3 minutes for an average user

**Given** I am on the position direction question
**When** I see the options
**Then** "Long" is the default selection with a brief explanation, and "Short" is available with a tooltip explaining what short selling means

**Given** I have completed the wizard
**When** the strategy is generated
**Then** the strategy opens in the canvas with all blocks pre-placed and connected
**And** a prominent "Run Backtest" button is visible
**And** analytics event `wizard_completed` fires with wizard answers

### Story 2.3: Block Difficulty Badges

As a **beginner**,
I want to see difficulty indicators on each block in the library,
So that I know which blocks are appropriate for my experience level.

**Acceptance Criteria:**

**Given** I open the block library/palette
**When** I view the available blocks
**Then** each block shows a difficulty badge: green "Beginner" (RSI, SMA, EMA, basic logic, SL, TP), yellow "Intermediate" (MACD, Bollinger, ATR, trailing stop), or red "Advanced" (Fibonacci, Ichimoku, multi-condition)
**And** the badge is visible without hovering or clicking

**Given** I drag a block with an "Advanced" badge onto the canvas
**When** I place it
**Then** the block functions normally (badges are informational, not gatekeeping)

---

## Epic 3: Short Selling Engine (PREREQUISITE EPIC)

Users can create and backtest strategies that enter short positions. All risk management blocks work correctly for shorts. Strategy JSON schema versioned for forward compatibility. Regression gate: ~20 scenarios must pass before Epic 5 begins.

### Story 3.1: Strategy Schema Versioning and Short Direction Field

As a **developer**,
I want strategy definitions to include a schema version and position direction field,
So that the system can distinguish between legacy long-only strategies and new strategies with short selling support.

**Acceptance Criteria:**

**Given** a new strategy is created via the canvas or wizard
**When** the strategy definition JSON is saved
**Then** it includes `"schema_version": 2` at the top level
**And** Entry Signal blocks include a `"direction"` field set to `"long"` or `"short"`

**Given** an existing strategy created before Phase 2 (no `schema_version` field)
**When** the strategy is loaded by the interpreter
**Then** it defaults to `schema_version: 1` and all Entry Signal blocks default to `direction: "long"`
**And** the strategy produces identical backtest results as before the change

**Given** the canvas UI for Entry Signal blocks
**When** a user configures an Entry Signal
**Then** they see a "Position Direction" selector with "Long" (default) and "Short" options
**And** short entry blocks have a distinct visual indicator (color or icon) so they're immediately distinguishable from long entries

### Story 3.2: Short Position P&L Calculation in Backtest Engine

As a **retail trader**,
I want short positions to calculate profit and loss correctly,
So that I can trust that my short-selling backtests reflect reality.

**Acceptance Criteria:**

**Given** a strategy with a short entry signal (e.g., "Short BTC when RSI > 70")
**When** the backtest engine opens a short position at price $50,000
**And** the price falls to $45,000
**Then** the position shows a profit of $5,000 (10%) per unit

**Given** a short position opened at $50,000
**When** the price rises to $55,000
**Then** the position shows a loss of $5,000 (10%) per unit

**Given** a short position
**When** borrowing cost parameter is configured (e.g., 0.1% daily)
**Then** the P&L calculation deducts the cumulative borrowing cost for the holding period

**Given** a short position held through the end of the backtest period
**When** the backtest completes
**Then** the position is closed at the last available price and P&L is calculated correctly

### Story 3.3: Risk Management Blocks for Short Positions

As a **retail trader**,
I want stop loss, take profit, trailing stop, and max drawdown blocks to work correctly for short positions,
So that risk management protects my short trades the same way it protects longs.

**Acceptance Criteria:**

**Given** a short position with a 5% stop loss
**When** the price RISES 5% from entry
**Then** the stop loss triggers and closes the position at a loss

**Given** a short position with a 10% take profit
**When** the price FALLS 10% from entry
**Then** the take profit triggers and closes the position at a profit

**Given** a short position with a trailing stop of 3%
**When** the price falls (favorable for shorts) and then reverses upward by 3% from the lowest point
**Then** the trailing stop triggers and closes the position

**Given** a short position with a take-profit ladder (e.g., cover 50% at +5%, 25% at +10%)
**When** the price falls 5% from entry
**Then** 50% of the short position is covered (closed) at profit
**And** the remaining position continues with the next ladder target

**Given** a strategy with max drawdown protection at 15%
**When** short position losses cause the portfolio to reach 15% drawdown
**Then** all short positions are closed

### Story 3.4: Short Selling Regression Test Suite

As a **developer**,
I want a comprehensive regression test suite covering all short selling scenarios,
So that I can verify correctness before building educational insights on top of the engine.

**Acceptance Criteria:**

**Given** the regression test suite
**When** all tests are run
**Then** the following scenarios pass:
- All 20+ existing block types produce identical results for strategies without `direction` field (backward compatibility)
- Short position: correct P&L in trending-down market
- Short position: correct P&L in trending-up market (loss)
- Short position: stop loss triggers on price rise
- Short position: take profit triggers on price fall
- Short position: trailing stop with correct directional logic
- Short position: take-profit ladder covers positions correctly
- Short position: max drawdown triggers correctly
- Short position: held through end of backtest period
- Short position: borrowing cost deducted correctly
- Mixed long/short strategy: both position types in same backtest
- Edge case: short position opened and closed in same candle
- Edge case: short entry signal with no exit condition (closes at end)

**Given** this regression suite
**When** it is run against the current codebase (before short selling)
**Then** all backward-compatibility tests pass (existing strategies unaffected)

### Story 3.5: Short Position Display in Backtest Results

As a **retail trader**,
I want backtest results to clearly distinguish between long and short trades,
So that I can understand the performance of each position type.

**Acceptance Criteria:**

**Given** a completed backtest with both long and short positions
**When** I view the trade list
**Then** each trade shows its direction (Long/Short) with a visual indicator
**And** the summary metrics include: total trades, long trades, short trades, win rate per direction

**Given** a completed backtest with short positions
**When** I view the equity curve
**Then** short trade periods are visually distinguishable from long trade periods (e.g., different shading or markers)

**Given** a backtest run with `has_short_positions = true`
**When** the results are stored
**Then** the `backtest_runs` table records `has_short_positions = true`
**And** the DB migration (026) adds this column with `DEFAULT false`

---

## Epic 4: Expanded Timeframe Support

Active traders can backtest strategies on 1-hour candles, opening the product to shorter-term trading ideas alongside existing 4h and 1d timeframes.

### Story 4.1: 1-Hour Timeframe Selection and Data Pipeline

As a **more active trader**,
I want to select 1-hour candles when creating or editing a strategy,
So that I can test shorter-term trading ideas.

**Acceptance Criteria:**

**Given** I am creating or editing a strategy
**When** I select the timeframe dropdown
**Then** I see "1h" as an option alongside "4h" and "1d"

**Given** I select "1h" timeframe and run a backtest
**When** the system needs 1h candle data for the selected asset and period
**Then** the system fetches 1h candles from CryptoCompare on demand (lazy backfill)
**And** fetched candles are cached in PostgreSQL for future backtests
**And** the backtest executes using the 1h candle data

**Given** 1h candle data was previously fetched and cached for an asset/period
**When** I run another backtest for the same asset/period
**Then** the system uses the cached data without re-fetching from CryptoCompare

### Story 4.2: 1-Hour Data Quality Validation

As a **trader**,
I want to see data quality indicators for the 1h timeframe,
So that I know if there are gaps or issues with the data before I trust my backtest results.

**Acceptance Criteria:**

**Given** I select the 1h timeframe for a strategy
**When** data is fetched for the selected asset and period
**Then** the system detects and logs any gaps in the 1h candle data (missing hours)
**And** data quality indicators show coverage percentage for the selected period

**Given** 1h data has gaps for a specific asset/period
**When** I view the backtest configuration
**Then** a warning is displayed: "1h data has gaps for [asset] in [period]. Results may be less reliable."

**Given** the top 5 trading pairs (BTC/USDT, ETH/USDT, etc.)
**When** 1h data is validated
**Then** these pairs have sufficient data coverage (>95%) for at least 1 year of history

---

## Epic 5: Educational Backtest Insights

Every completed backtest explains results in plain language — overfitting warnings, metric explanations, confidence indicators, and "What could go wrong" sections. This is the key competitive differentiator no other tool offers. Requires Epic 3 regression gate to be green.

### Story 5.1: Plain-Language Metric Explanations

As a **crypto-curious beginner**,
I want each backtest metric explained in plain language,
So that I understand what the numbers mean without Googling financial jargon.

**Acceptance Criteria:**

**Given** a completed backtest
**When** I view the results summary
**Then** each metric (Sharpe Ratio, Max Drawdown, Win Rate, CAGR, Total Return) has a tooltip with a 1-2 sentence plain-language explanation
**And** explanations use everyday language (e.g., Sharpe Ratio: "How much return you get for the risk you're taking. Above 1.0 is decent, above 2.0 is strong.")

**Given** a completed backtest with short positions
**When** I view the metric explanations
**Then** explanations account for short selling context where relevant (e.g., Max Drawdown explanation mentions that short positions carry higher theoretical risk)

### Story 5.2: Overfitting Warning and Confidence Indicator

As a **beginner**,
I want to be warned when my backtest results might be unreliable,
So that I don't mistake luck for skill.

**Acceptance Criteria:**

**Given** a completed backtest with fewer than 30 trades
**When** I view the backtest results
**Then** I see an amber overfitting warning: "Only [N] trades in [period]. Results may reflect luck rather than a reliable pattern. Try a longer time period or more active strategy to get more trades."

**Given** a completed backtest with 30 or more trades
**When** I view the results
**Then** no overfitting warning is displayed

**Given** any completed backtest
**When** I view the results summary
**Then** I see a confidence indicator: green (>50 trades, positive metrics), yellow (30-50 trades or mixed metrics), or red (<30 trades or extreme metrics)
**And** the indicator includes a one-line explanation of why it's that color

### Story 5.3: "What Could Go Wrong" Section

As a **beginner**,
I want to see potential risks and weaknesses specific to my strategy,
So that I understand the limitations before considering real trading.

**Acceptance Criteria:**

**Given** a completed backtest
**When** I scroll to the "What Could Go Wrong" section
**Then** I see 2-4 automatically generated warnings specific to my strategy characteristics

**Given** a strategy that only profits in trending markets (e.g., moving average crossover)
**When** the "What Could Go Wrong" section is generated
**Then** one warning reads something like: "This strategy relies on price trends. In sideways or choppy markets, it may generate many small losses."

**Given** a strategy with high win rate but low average profit per trade
**When** the section is generated
**Then** a warning notes: "Your strategy wins often but gains are small. A few large losing trades could erase many wins."

**Given** a short-selling strategy
**When** the section is generated
**Then** a warning includes: "Short positions carry theoretically unlimited loss potential if the price rises significantly."

**Given** the computed insights (metric explanations, overfitting warning, confidence indicator, warnings)
**When** backtest results are stored
**Then** the insights are saved in the MinIO result payload as a JSON object alongside the equity curve data
**And** existing backtests without insights show "Run a new backtest to see insights" instead of empty sections

---

## Epic 6: Backtest Performance & Reliability

Users get fast backtest results (sub-5s for standard backtests) and clear communication when data issues occur. Profiling and targeted optimization of engine hotspots.

### Story 6.1: Backtest Engine Performance Profiling and Optimization

As a **user iterating on a strategy**,
I want backtests to return results quickly,
So that I can test variations without losing focus.

**Acceptance Criteria:**

**Given** a standard backtest (1-year daily candles, single asset)
**When** the backtest is processed
**Then** results are displayed within 5 seconds at p95

**Given** a 5-year daily backtest (single asset)
**When** the backtest is processed
**Then** results are displayed within 15 seconds at p95

**Given** a 1-year 1h backtest (~8,760 candles, single asset)
**When** the backtest is processed
**Then** results are displayed within 10 seconds at p95

**Given** the backtest engine code
**When** performance profiling is conducted
**Then** hotspots are identified and documented
**And** targeted optimizations are applied (e.g., numpy vectorization for indicator computation, reduced redundant DB queries)
**And** before/after benchmark results are recorded

### Story 6.2: Data Vendor Monitoring and User Banner

As a **user**,
I want to know when market data is temporarily unavailable,
So that I understand why my backtest might fail or return incomplete results.

**Acceptance Criteria:**

**Given** the CryptoCompare API returns errors for more than 5 consecutive minutes
**When** the system detects the prolonged failure
**Then** a structured log entry is created with error details and duration
**And** a user-facing banner is displayed across the application: "Market data is temporarily unavailable. Backtests using fresh data may be affected. Previously cached data is still available."

**Given** the CryptoCompare API recovers after a failure period
**When** the system detects successful responses
**Then** the user-facing banner is automatically dismissed
**And** a structured log entry records the recovery time and total outage duration

---

## Epic 7: Beta Program Launch

Real users can join the product via invite codes, provide in-context feedback via an in-product button, and are segmented in analytics for cohort analysis. Free Pro tier incentive for beta testers.

### Story 7.1: Beta Invite Code System

As a **product owner**,
I want to generate invite codes and send them to potential beta testers,
So that I can recruit real users in a controlled manner.

**Acceptance Criteria:**

**Given** the product owner accesses the beta management interface
**When** they generate invite codes
**Then** unique invite codes are created and stored in a new `beta_invites` table (id, code, email, status, created_at, accepted_at)
**And** invite emails are sent via the existing Resend API integration with the code and a link to sign up

**Given** a new user receives an invite code
**When** they sign up using the invite code
**Then** their account is created with `user_tier` set to the beta/Pro tier (leveraging existing field)
**And** the invite record is updated to status "accepted" with timestamp
**And** analytics event `beta_invite_accepted` fires

**Given** an invite code has already been used
**When** someone tries to use it again
**Then** they see a clear message: "This invite code has already been used."

### Story 7.2: In-Product Feedback Button

As a **beta tester**,
I want to easily share feedback while I'm using the product,
So that I can report issues and suggestions in the moment I encounter them.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I view any page in the application
**Then** I see a small, unobtrusive "Give Feedback" button (e.g., bottom-right corner)

**Given** I click the "Give Feedback" button
**When** the feedback form opens
**Then** I see a simple text box with an optional category selector (Bug, Suggestion, Question, Other) and a submit button

**Given** I submit feedback
**When** the form is submitted
**Then** the feedback is stored in a `beta_feedback` table (id, user_id, category, content, page_url, created_at)
**And** analytics event `feedback_submitted` fires with category
**And** I see a confirmation: "Thanks for your feedback! It helps us improve."

### Story 7.3: Beta Cohort Analytics Segmentation

As a **product owner**,
I want beta testers automatically segmented in analytics,
So that I can analyze their behavior separately from any other users.

**Acceptance Criteria:**

**Given** a user signs up via a beta invite code
**When** their PostHog profile is created/updated
**Then** they are tagged with a `user_tier: beta` property in PostHog

**Given** the PostHog dashboard
**When** I create funnels or reports
**Then** I can filter by `user_tier = beta` to see only beta tester behavior
**And** I can compare beta tester metrics against overall metrics

**Given** the founder's existing account
**When** the beta system is deployed
**Then** the founder's account is pre-flagged as beta tier (not forced through invite flow)
