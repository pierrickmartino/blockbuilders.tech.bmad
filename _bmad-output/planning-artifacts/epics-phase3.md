---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/prd-phase3.md
  - docs/architectural-review-phase3.md
  - docs/brainstorming-report-phase3.md
  - docs/competitive-analysis-phase3.md
  - docs/adversarial-review-phase3.md
---

# Blockbuilders Phase 3 "Confidence Engine" - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Blockbuilders Phase 3 "Confidence Engine", decomposing the requirements from the PRD, Architectural Review, and supplementary analysis documents (Brainstorming, Competitive Analysis, Adversarial Review) into implementable stories. Phase 3 focuses on three themes: **Confidence from First Touch** (wizard-first onboarding, progressive disclosure, plain-English results), **Confidence Over Time** (weekly digests, honest strategy health warnings, improved auto-update labeling), and **Confidence Through Community** (educational templates, shareable results that teach).

## Requirements Inventory

### Functional Requirements

FR-01: Wizard-first post-signup flow — after signup, users land directly in the strategy wizard, not the dashboard
FR-02: Wizard generates a backtest automatically upon completion and navigates to results
FR-03: First-run guided overlay on results page explains the 5 core metrics in plain language
FR-04: "What you just learned" summary card after first backtest explaining the takeaway
FR-05: Skip-to-canvas escape hatch visible but de-emphasized during wizard flow
FR-06: Every backtest result leads with a narrative summary paragraph before any metrics
FR-07: Narrative includes: starting amount -> ending amount, best/worst period, number of trades, and comparison to buy-and-hold
FR-08: Narrative uses dollar amounts personalized to the user's initial balance
FR-09: Narrative highlights maximum drawdown in experiential terms
FR-10: Default results view shows exactly 5 metrics: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold
FR-11: "Show detailed analysis" expandable section contains all existing advanced metrics
FR-12: Users can customize which metrics appear in their default view via existing favorite metrics feature
FR-13: Block palette defaults to "Essentials" view showing 5 indicators: SMA, EMA, RSI, Bollinger Bands, MACD
FR-14: Indicator labels use plain English as primary label with technical name as subtitle
FR-15: Wizard uses only Essential indicators and plain-English question framing
FR-16: Low trade count warning when a backtest produces fewer than 10 trades
FR-17: Overfitting indicator when strategy return is >3x buy-and-hold with <15 trades
FR-18: Bear-market fragility warning when strategy loses money in every month where the asset dropped >10%
FR-19: Parameter sensitivity notice on results page linking to comparison view
FR-20: Weekly email digest sent every Monday summarizing all active auto-update strategies
FR-21: Digest includes: current signal status, whether entry/exit triggered that week, key metric changes
FR-22: "No signal" weeks framed positively
FR-23: Users can opt out of digest per strategy or globally in notification settings
FR-24: Rename "Paper Trading" to "Strategy Monitor" across all UI surfaces
FR-25: Strategy Monitor description explains it as "automated daily re-testing against latest data"
FR-26: Each template includes a "What this teaches" section explaining the underlying concept
FR-27: Templates ordered by conceptual difficulty: simple -> intermediate -> advanced
FR-28: Add 3 new templates targeted at the Alex persona: "Buy the Dip", "Trend Follower", "Safe Exit"
FR-29: Show actual available data range per asset in the backtest configuration UI
FR-30: Warn users before backtest if requested date range exceeds available data

### NonFunctional Requirements

NFR-01: Wizard-to-results flow completes in <=30 seconds including backtest execution (95th percentile, 1-year range, single asset)
NFR-02: Backtest narrative generation adds <=200ms to results page load (server-side template rendering time)
NFR-03: Weekly digest email batch for all active users completes within 2 hours
NFR-04: Email digest system handles 10,000 active users without degradation (no OOM or queue backpressure)
NFR-05: Progressive disclosure state does not increase API payload size (frontend-only toggle, no additional API calls)
NFR-06: Digest emails do not contain sensitive data (account balances, strategy definitions)
NFR-07: Shared backtest links continue to expose results only, never strategy logic
NFR-08: Strategy health warnings never block backtest completion (computed post-backtest, non-critical rendering)
NFR-09: All new UI elements meet WCAG 2.1 AA contrast ratios
NFR-10: All new features emit PostHog events for funnel analysis (wizard_first_run_started, narrative_viewed, digest_email_sent, health_warning_shown)
NFR-11: No regressions to existing backtest engine, strategy builder, or billing flows (full regression test suite passes)
NFR-12: Auto-update rename is cosmetic only — no changes to scheduling logic, database fields, or API contracts

### Additional Requirements

**From Architectural Review:**
- Add `has_completed_onboarding BOOLEAN DEFAULT false` column to `users` table (Epic 2)
- Backfill `has_completed_onboarding = true` for all existing users who have at least one backtest_run
- Consider dedicated RQ queue (`wizard_backtests`) for first-run latency isolation (Epic 2, NFR-01)
- Server-side narrative generation recommended in new module `backend/app/backtest/narrative.py` (Epic 3)
- Optional `narrative_text TEXT` column on `backtest_runs` for caching (Epic 3 — skip for MVP, add if needed)
- Add `digest_email_enabled BOOLEAN DEFAULT true` to both `users` and `strategies` tables (Epic 6)
- Add `teaches_description TEXT`, `difficulty VARCHAR`, `sort_order INT` to `strategy_templates` table (Epic 7)
- Verify if `data_quality_metrics` already stores earliest/latest candle dates; add columns if not (Epic 4)
- All migrations are additive (new nullable or defaulted columns) — zero downtime compatible
- No new external dependencies or infrastructure services required

**From Adversarial Review (UX/PM/Architect feedback):**
- Existing users who have strategies using non-Essential indicators should default to "All" palette mode (Epic 1)
- Consider inline explanations integrated into results page instead of overlay walkthrough for Story 2.3 (Epic 2)
- Loading state during wizard backtest should be engaging with progress messages, not just a spinner (Epic 2)
- Narrative copy must be user-tested with diverse backtest outputs (minimum 20-50 cases) before launch (Epic 3)
- Warning copy should use coaching tone ("Here's what to watch for"), not compliance tone (Epic 5)
- Consider auto-adjusting date picker to available data range instead of just warning (Epic 4)
- Template difficulty labels should avoid exclusionary language — consider "Start Here / Level Up / Deep Dive" (Epic 7)
- The "Paper Trading" -> "Strategy Monitor" rename should ship in Sprint 1 as a quick trust-building win (Epic 6)
- Build order revised from PRD: Epic 1 -> Epic 2 -> Epic 3 -> Epic 4 -> Epic 5 -> Epic 6 -> Epic 7

### FR Coverage Map

| FR | Epic | Story | Description |
|---|---|---|---|
| FR-01 | Epic 2 | 2.1 | Wizard-first post-signup flow |
| FR-02 | Epic 2 | 2.2 | Auto-backtest on wizard completion |
| FR-03 | Epic 2 | 2.3 | First-run guided metric explanations |
| FR-04 | Epic 2 | 2.4 | "What you just learned" summary card |
| FR-05 | Epic 2 | 2.5 | Skip-to-canvas escape hatch |
| FR-06 | Epic 3 | 3.1, 3.2 | Narrative summary paragraph on results |
| FR-07 | Epic 3 | 3.1 | Narrative data points (balance, trades, periods, buy-and-hold) |
| FR-08 | Epic 3 | 3.1 | Dollar amounts personalized to initial balance |
| FR-09 | Epic 3 | 3.1 | Experiential drawdown description |
| FR-10 | Epic 3 | 3.3 | Default 5-metric results view |
| FR-11 | Epic 3 | 3.3 | Expandable detailed analysis section |
| FR-12 | Epic 3 | 3.3 | Favorite metrics override default view |
| FR-13 | Epic 1 | 1.1 | Essentials-first block palette |
| FR-14 | Epic 1 | 1.2 | Plain-English indicator labels |
| FR-15 | Epic 1 | 1.3 | Wizard uses only Essential indicators |
| FR-16 | Epic 5 | 5.1 | Low trade count warning (MVP) |
| FR-17 | Epic 5 | — | Overfitting indicator (DEFERRED Phase 3.1) |
| FR-18 | Epic 5 | — | Bear-market fragility warning (DEFERRED Phase 3.1) |
| FR-19 | Epic 5 | — | Parameter sensitivity notice (DEFERRED Phase 3.1) |
| FR-20 | Epic 6 | — | Weekly digest email (DEFERRED Phase 3.1) |
| FR-21 | Epic 6 | — | Digest content details (DEFERRED Phase 3.1) |
| FR-22 | Epic 6 | — | No-signal positive framing (DEFERRED Phase 3.1) |
| FR-23 | Epic 6 | 6.2 | Digest opt-out controls (MVP) |
| FR-24 | Epic 6 | 6.1 | Rename Paper Trading to Strategy Monitor (MVP) |
| FR-25 | Epic 6 | 6.1 | Strategy Monitor description tooltip (MVP) |
| FR-26 | Epic 7 | 7.1 | "What this teaches" template section |
| FR-27 | Epic 7 | 7.1 | Templates ordered by difficulty |
| FR-28 | Epic 7 | 7.2 | 3 new Alex-persona templates |
| FR-29 | Epic 4 | 4.1 | Show data range per asset |
| FR-30 | Epic 4 | 4.1 | Warn when date range exceeds data |

| NFR | Epic(s) | Description |
|---|---|---|
| NFR-01 | Epic 2 | Wizard-to-results <=30s SLA |
| NFR-02 | Epic 3 | Narrative rendering <=200ms |
| NFR-03 | Epic 6 | Digest batch <=2 hours (DEFERRED Phase 3.1) |
| NFR-04 | Epic 6 | Digest handles 10K users (DEFERRED Phase 3.1) |
| NFR-05 | Epic 1 | Progressive disclosure frontend-only |
| NFR-06 | Epic 6 | No sensitive data in digest emails |
| NFR-07 | Epic 3 | Shared links expose results only |
| NFR-08 | Epic 5 | Warnings never block backtest |
| NFR-09 | All | WCAG 2.1 AA contrast |
| NFR-10 | All | PostHog events for all features |
| NFR-11 | All | No regressions |
| NFR-12 | Epic 6 | Rename is cosmetic only |

## Epic List

### Epic 1: Approachable Block Palette (Progressive Disclosure)
Users see only the most common, beginner-friendly indicators by default. The canvas feels approachable rather than overwhelming. Power users toggle to the full set with one click.
**FRs covered:** FR-13, FR-14, FR-15
**NFRs:** NFR-05, NFR-09, NFR-10
**Effort:** ~1 week | Frontend-only | Sprint 1

### Epic 2: Wizard-First Onboarding
New users are guided directly into a strategy wizard after signup, auto-backtest on completion, and see their first results with guided explanations — all within 5 minutes. Experienced users can skip to the canvas.
**FRs covered:** FR-01, FR-02, FR-03, FR-04, FR-05
**NFRs:** NFR-01, NFR-09, NFR-10, NFR-11
**Effort:** ~3 weeks | Frontend + backend | Sprint 2-3

### Epic 3: Plain-English Backtest Results
Every backtest result opens with a narrative paragraph telling the story of what happened in plain language and dollar amounts. The default view shows only 5 core metrics, with advanced metrics one click away.
**FRs covered:** FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12
**NFRs:** NFR-02, NFR-07, NFR-09, NFR-10, NFR-11
**Effort:** ~2-3 weeks | Backend narrative module + frontend results redesign | Sprint 4-5

### Epic 4: Data Transparency
Users see actual data availability per asset before running backtests. Date ranges auto-adjust or warn when requested data exceeds what's available — preventing confusion and Premium churn.
**FRs covered:** FR-29, FR-30
**NFRs:** NFR-09, NFR-11
**Effort:** ~0.5 weeks | Backend endpoint + frontend warning | Sprint 1

### Epic 5: Strategy Health Warnings
Backtest results include honest, coaching-toned warnings about statistical reliability. MVP ships low-trade-count warning only; overfitting and bear-market fragility warnings deferred to Phase 3.1.
**FRs covered:** FR-16 (MVP), FR-17 (deferred), FR-18 (deferred), FR-19 (deferred)
**NFRs:** NFR-08, NFR-09, NFR-10
**Effort:** ~0.5 weeks MVP | Slot alongside Epic 3 or 4

### Epic 6: Honest Labeling & Digest Preferences
"Paper Trading" is renamed to "Strategy Monitor" across all UI — building trust through honest terminology. Digest email opt-out controls are added at global and per-strategy level, preparing infrastructure for Phase 3.1 email delivery.
**FRs covered:** FR-23, FR-24, FR-25 (MVP); FR-20, FR-21, FR-22 (deferred Phase 3.1)
**NFRs:** NFR-06, NFR-12
**Effort:** ~0.5 weeks MVP | Sprint 1 (rename) + later sprint (opt-out)

### Epic 7: Educational Templates
Templates become learning tools — each includes a "What this teaches" section, templates are ordered by difficulty, and 3 new beginner-friendly templates are added. Engineering ships the container; content team fills it in parallel.
**FRs covered:** FR-26, FR-27, FR-28
**NFRs:** NFR-09, NFR-11
**Effort:** ~1 week engineering + content authoring in parallel

### Recommended Build Order

| Sprint | Epics | Total Effort | Rationale |
|--------|-------|-------------|-----------|
| Sprint 1 | Epic 1 + Epic 6 (rename) + Epic 4 | ~2 weeks | Frontend-heavy, low-risk, immediately visible |
| Sprint 2-3 | Epic 2 | ~3 weeks | Foundational onboarding experience |
| Sprint 4-5 | Epic 3 + Epic 5 | ~3 weeks | Core differentiator + honest warnings |
| Flex | Epic 6 (opt-out) + Epic 7 | ~1.5 weeks | Infrastructure + content work |

### Dependency Flow

```
Epic 1 (Palette) ──┐
Epic 4 (Data)   ───┤── Sprint 1 (independent, parallel)
Epic 6 (Rename) ───┘
                    │
                    ▼
              Epic 2 (Onboarding) ── depends on Epic 1 (wizard uses Essentials)
                    │
                    ▼
              Epic 3 (Narratives) ── depends on Epic 2 (first-run overlay references narrative)
                    │
              Epic 5 (Warnings) ── can run alongside Epic 3
              Epic 7 (Templates) ── independent, parallel content work
```

---

## Epic 1: Approachable Block Palette (Progressive Disclosure)

Users see only the most common, beginner-friendly indicators by default. The canvas feels approachable rather than overwhelming. Power users toggle to the full set with one click.

### Story 1.1: Essentials-First Block Palette Toggle

As a **new user opening the block palette**,
I want to see only the 5 most common indicators by default,
So that I'm not overwhelmed by options I don't understand.

**Acceptance Criteria:**

**Given** a user opens the block palette on the canvas
**When** the palette loads
**Then** the default view shows exactly 5 indicators: Moving Average (SMA), Exponential Moving Average (EMA), RSI, Bollinger Bands, MACD
**And** all other indicators (Stochastic, ADX, Ichimoku, OBV, Fibonacci, etc.) are hidden
**And** a "Show all indicators" toggle is present at the bottom of the indicator section

**Given** a user clicks "Show all indicators"
**When** the toggle activates
**Then** the full indicator set is revealed
**And** the user's toggle preference persists across sessions via localStorage

**Given** an existing user who has strategies using non-Essential indicators (e.g., Ichimoku, Fibonacci)
**When** they first load the palette after this change
**Then** the palette defaults to "All" mode (not Essentials)

**Given** the palette toggle state changes
**When** the UI updates
**Then** no additional API calls are made (NFR-05: frontend-only toggle)
**And** the PostHog event `palette_mode_changed` fires with property `mode: essentials|all`

### Story 1.2: Plain-English Indicator Labels

As a **non-technical user**,
I want indicator names in plain English so I can understand what they do before I use them.

**Acceptance Criteria:**

**Given** the block palette is in Essentials mode
**When** the user views indicator cards
**Then** each card shows a plain-English primary label with the technical name as subtitle:
- "Moving Average" / SMA
- "Exponential Moving Average" / EMA
- "Momentum Indicator" / RSI
- "Volatility Bands" / Bollinger Bands
- "Trend & Momentum" / MACD
**And** each card retains the existing hover tooltip with a 1-2 sentence explanation
**And** WCAG 2.1 AA contrast ratios are met for both label levels (NFR-09)

**Given** the palette is switched to "All" mode
**When** the user views indicator cards
**Then** non-Essential indicators display their existing technical names only (no plain-English rename needed)

### Story 1.3: Wizard Essentials-Only Constraint

As a **new user going through the strategy wizard**,
I want the wizard to present only Essential indicators with plain-English framing,
So that I can build a strategy without encountering unfamiliar technical terms.

**Acceptance Criteria:**

**Given** a user is in the strategy wizard
**When** they reach the indicator/strategy type selection step
**Then** only the 5 Essential indicators are presented as options
**And** options are labeled in plain English (e.g., "Use a Moving Average crossover", "Use momentum (RSI)")
**And** Ichimoku, Fibonacci, ADX, OBV, Stochastic are never presented as wizard options

**Given** a user completes the wizard and opens the resulting strategy in the canvas
**When** they view the block palette
**Then** the palette respects the user's current toggle state (Essentials by default for new users)

---

## Epic 2: Wizard-First Onboarding

New users are guided directly into a strategy wizard after signup, auto-backtest on completion, and see their first results with guided explanations — all within 5 minutes. Experienced users can skip to the canvas.

### Story 2.1: Wizard as Default Post-Signup Destination

As a **new user who just signed up**,
I want to be guided directly into the strategy wizard,
So that I don't have to figure out what to do first.

**Acceptance Criteria:**

**Given** a user has just completed signup (email/password or OAuth)
**When** the signup flow completes and the app loads
**Then** the user is routed to the strategy wizard (not the dashboard)
**And** a subtle "Skip to dashboard" link is visible but styled as secondary text
**And** the PostHog event `wizard_first_run_started` fires

**Given** a returning user who has already completed onboarding (`has_completed_onboarding = true`)
**When** they log in
**Then** they are routed to the dashboard as normal (not the wizard)

**Given** the database migration runs
**When** the `has_completed_onboarding` column is added to `users` with `DEFAULT false`
**Then** all existing users who have at least one `backtest_run` are backfilled to `has_completed_onboarding = true`
**And** existing users without backtests will see the wizard on next login

### Story 2.2: Auto-Backtest on Wizard Completion

As a **new user who just finished the wizard**,
I want my strategy to be backtested automatically,
So that I don't have to learn how to run a backtest.

**Acceptance Criteria:**

**Given** a user has completed all wizard steps and a valid strategy JSON is generated
**When** the user clicks "See how it would have performed" (final wizard CTA)
**Then** the strategy is saved automatically and a backtest is enqueued
**And** a loading state with engaging progress messages is shown (e.g., "Building your strategy...", "Running against 365 days of data...", "Calculating results...")
**And** results are displayed within 30 seconds (NFR-01)
**And** the user does not need to navigate to a separate backtest page

**Given** the wizard-generated backtest completes
**When** results are ready
**Then** the user is navigated directly to the results page
**And** the `has_completed_onboarding` flag is set to `true` on the user record

**Given** the backtest exceeds 30 seconds
**When** the timeout threshold approaches
**Then** the loading state shows "Almost there..." messaging (never an error for slow results)

### Story 2.3: First-Run Guided Metric Explanations

As a **new user seeing backtest results for the first time**,
I want key metrics explained in plain language,
So that I understand what I'm looking at.

**Acceptance Criteria:**

**Given** a user is viewing their first-ever backtest results (`has_completed_onboarding` was just set to `true`)
**When** the results page loads
**Then** each of the 5 default metrics (Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %) has a plain-language explanation displayed inline beneath it in smaller muted text
**And** explanations are 1-2 sentences each (e.g., Total Return: "This is how much your strategy would have made or lost overall. Green means profit, red means loss.")
**And** the PostHog event `first_run_overlay_completed` fires when the user scrolls past or interacts with results

**Given** the user views backtest results on subsequent visits
**When** the results page loads
**Then** the inline explanations are collapsed into "?" hover/click icons next to each metric
**And** the first-run state is tracked via localStorage or user record (shown only once as inline)

### Story 2.4: "What You Just Learned" Summary Card

As a **new user who just completed their first backtest**,
I want a summary card explaining the takeaway,
So that I understand the value of what I just did.

**Acceptance Criteria:**

**Given** a user has just completed their first-ever backtest
**When** the results page renders
**Then** a "What you just learned" card appears below the results
**And** the card summarizes in 1-2 sentences what the strategy did vs. buy-and-hold (e.g., "You just tested whether buying BTC when momentum is low would have outperformed simply holding. Your strategy beat buy-and-hold by 12 percentage points over 1 year.")

**Given** the user views results for their second or later backtests
**When** the results page renders
**Then** the "What you just learned" card does not appear

### Story 2.5: Canvas Escape Hatch from Wizard

As an **experienced user who signed up**,
I want to skip the wizard and go directly to the canvas.

**Acceptance Criteria:**

**Given** a user is in the wizard flow
**When** they click the "I want to build manually" link
**Then** they are navigated to an empty canvas strategy editor
**And** a new blank strategy is created for them
**And** the PostHog event `wizard_skipped` fires
**And** the `has_completed_onboarding` flag is set to `true`

---

## Epic 3: Plain-English Backtest Results

Every backtest result opens with a narrative paragraph telling the story of what happened in plain language and dollar amounts. The default view shows only 5 core metrics, with advanced metrics one click away.

### Story 3.1: Narrative Summary Generation (Backend)

As a **user who just ran a backtest**,
I want to read a plain-English paragraph explaining what happened,
So that I understand the result without studying metrics.

**Acceptance Criteria:**

**Given** a backtest has completed successfully with at least 1 trade
**When** the results are fetched via `GET /backtests/{id}`
**Then** the response includes a `narrative` string field containing a plain-English paragraph
**And** the narrative includes all 5 required data points: starting balance -> ending balance, best performing period, worst performing period (max drawdown in dollar terms), total number of trades, and comparison to buy-and-hold in percentage points
**And** dollar amounts are personalized to the user's configured initial balance (FR-08) (e.g., "$5,000 -> $7,100" not percentages only)
**And** maximum drawdown is described experientially (FR-09) (e.g., "You would have watched your $10,000 drop to $7,400 before recovering")

**Given** a backtest has completed with 0 trades
**When** the results are fetched
**Then** the narrative states: "Your strategy didn't trigger any entry signals during this period. This could mean your conditions are too strict, or the market didn't match your criteria. Try adjusting your thresholds or testing a different date range."

**Given** the narrative generation logic
**When** it renders for any backtest
**Then** the generation adds <=200ms to the response time (NFR-02)
**And** the narrative is generated server-side in `backend/app/backtest/narrative.py` using template-based text rendering from existing metric fields

### Story 3.2: Narrative Display on Results Page (Frontend)

As a **user viewing backtest results**,
I want the narrative paragraph displayed prominently before any metrics,
So that I get the story before the numbers.

**Acceptance Criteria:**

**Given** a backtest result with a `narrative` field
**When** the results page renders
**Then** the narrative paragraph appears as the first content element above all metrics and charts
**And** the narrative is styled distinctly (larger text, card container) to differentiate it from metric rows
**And** the PostHog event `narrative_viewed` fires when the narrative is visible in the viewport

**Given** a backtest result with 0 trades (zero-trade narrative)
**When** the results page renders
**Then** the narrative is displayed with a "Modify Strategy" CTA button
**And** no performance metrics are shown below the narrative

### Story 3.3: Simplified Default Metrics View

As a **user viewing backtest results**,
I want to see only the most important metrics by default,
So that I'm not overwhelmed.

**Acceptance Criteria:**

**Given** a user has not customized their favorite metrics
**When** they view any backtest result
**Then** exactly 5 metrics are visible by default: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %
**And** all other metrics (Sharpe, Sortino, Calmar, alpha, beta, CAGR, etc.) are hidden

**Given** the default 5-metric view is displayed
**When** the user clicks "Show detailed analysis"
**Then** all existing advanced metrics are revealed in an expandable section below
**And** the section is collapsed by default on every page load

**Given** a user has customized their favorite metrics via the existing pinning feature
**When** they view backtest results
**Then** their pinned/favorite metrics replace the 5-metric default (FR-12)
**And** "Show detailed analysis" still reveals the full set

---

## Epic 4: Data Transparency

Users see actual data availability per asset before running backtests. Date ranges auto-adjust or warn when requested data exceeds what's available — preventing confusion and Premium churn.

### Story 4.1: Data Availability Display and Date Range Warning

As a **user configuring a backtest**,
I want to see how much historical data is actually available for my chosen asset,
So that I don't request a date range that doesn't exist.

**Acceptance Criteria:**

**Given** a user is on the backtest configuration screen
**When** they select or change the asset
**Then** the UI displays "Data available: [earliest date] – Present" for the selected asset
**And** the date information is fetched from the existing `data_quality_metrics` table or computed from candle data

**Given** the user's selected date range starts before the earliest available data
**When** the date range is set
**Then** an inline warning appears: "Data for [asset] starts at [date]. Your backtest will use the available range."
**And** the start date auto-adjusts to the earliest available date (with the warning explaining the adjustment)

**Given** the user selects an asset with limited history (e.g., SUI, launched 2023)
**When** they attempt to configure a 5-year backtest
**Then** the warning clearly states the actual available range and adjusts accordingly
**And** the user is not blocked from running the backtest

**Given** the `data_quality_metrics` table
**When** it does not already have `earliest_candle_date` / `latest_candle_date` columns
**Then** these columns are added via migration and populated by the daily validation job

---

## Epic 5: Strategy Health Warnings

Backtest results include honest, coaching-toned warnings about statistical reliability. MVP ships low-trade-count warning only; overfitting and bear-market fragility warnings deferred to Phase 3.1.

### Story 5.1: Low Trade Count Warning

As a **user viewing backtest results**,
I want to be warned when my strategy produced too few trades to be statistically meaningful,
So that I don't draw false conclusions from insufficient data.

**Acceptance Criteria:**

**Given** a backtest has completed with fewer than 10 trades (and at least 1 trade)
**When** the results page renders
**Then** a yellow warning banner appears below the narrative (if present) or at the top of the metrics section
**And** the banner text uses a coaching tone: "Your strategy triggered [N] trades over this period. With so few trades, results can vary a lot — try a longer date range or looser entry conditions to get more data points."
**And** the PostHog event `health_warning_shown` fires with property `warning_type: low_trade_count`

**Given** a backtest has completed with 10 or more trades
**When** the results page renders
**Then** no low-trade-count warning is displayed

**Given** the warning computation
**When** it runs
**Then** it is a frontend conditional check on the `num_trades` field from the backtest result
**And** it never blocks or delays the backtest completion (NFR-08)
**And** the warning banner meets WCAG 2.1 AA contrast ratios (NFR-09)

---

## Epic 6: Honest Labeling & Digest Preferences

"Paper Trading" is renamed to "Strategy Monitor" across all UI — building trust through honest terminology. Digest email opt-out controls are added at global and per-strategy level, preparing infrastructure for Phase 3.1 email delivery.

### Story 6.1: Rename Paper Trading to Strategy Monitor

As a **user with active auto-update strategies**,
I want the feature to be labeled honestly as "Strategy Monitor",
So that I understand it re-tests my strategy against latest data (not simulated live trading).

**Acceptance Criteria:**

**Given** any UI surface that currently displays "Paper Trading" or "paper trading"
**When** the rename is applied
**Then** all instances read "Strategy Monitor" instead
**And** no instance of "paper trading" remains in the UI (API field names `auto_update` remain unchanged for backward compatibility — NFR-12)

**Given** the Strategy Monitor toggle on a strategy
**When** a user hovers or views the toggle area
**Then** a tooltip or subtitle explains: "Automated daily re-testing of your strategy against the latest market data"

**Given** any existing documentation, help text, or in-app copy referencing "paper trading"
**When** the rename is applied
**Then** all references are updated to "Strategy Monitor"

### Story 6.2: Digest Email Opt-Out Controls

As a **user**,
I want to control whether I receive weekly strategy digest emails,
So that I can opt out before the digest feature launches.

**Acceptance Criteria:**

**Given** the database migration runs
**When** `digest_email_enabled BOOLEAN DEFAULT true` is added to `users` table
**And** `digest_email_enabled BOOLEAN DEFAULT true` is added to `strategies` table
**Then** all existing users and strategies default to opted-in

**Given** a user navigates to their notification/profile settings
**When** they view digest preferences
**Then** they see a global "Weekly Strategy Digest" toggle (on by default)
**And** below it, a per-strategy list showing each strategy with its own digest toggle

**Given** a user toggles the global digest setting off
**When** the setting is saved
**Then** `users.digest_email_enabled` is set to `false`
**And** the change takes effect for the next scheduled digest (Phase 3.1)

**Given** a user toggles a specific strategy's digest setting off
**When** the setting is saved
**Then** `strategies.digest_email_enabled` is set to `false` for that strategy only

---

## Epic 7: Educational Templates

Templates become learning tools — each includes a "What this teaches" section, templates are ordered by difficulty, and 3 new beginner-friendly templates are added. Engineering ships the container; content team fills it in parallel.

### Story 7.1: Template Educational Fields and Difficulty Ordering

As a **user browsing templates**,
I want to understand the trading concept behind each template and see them ordered by difficulty,
So that I can learn progressively and pick templates appropriate to my level.

**Acceptance Criteria:**

**Given** the database migration runs
**When** `teaches_description TEXT`, `difficulty VARCHAR DEFAULT 'beginner'`, and `sort_order INT DEFAULT 0` columns are added to `strategy_templates`
**Then** existing templates are backfilled with appropriate difficulty labels and sort order

**Given** a user views the template list page
**When** the page renders
**Then** templates are ordered by `sort_order` (ascending), grouping by difficulty
**And** each template shows a difficulty label: "Start Here" (beginner), "Level Up" (intermediate), "Deep Dive" (advanced)
**And** the difficulty label is visually indicated with a subtle badge or tag

**Given** a user views a template detail page
**When** the page renders
**Then** a "What this teaches" section appears above the "Clone" button
**And** the section contains 2-3 plain-English sentences explaining the underlying trading concept
**And** if `teaches_description` is empty (content not yet authored), the section is hidden gracefully

### Story 7.2: New Alex-Persona Beginner Templates

As a **new user looking for simple strategy ideas**,
I want beginner-friendly templates that match my trading intuitions,
So that I can quickly test common ideas without building from scratch.

**Acceptance Criteria:**

**Given** the template seed migration runs
**When** 3 new templates are inserted
**Then** the following templates exist:
- "Buy the Dip" — RSI oversold entry, RSI recovery exit, with stop loss. Uses only Essential indicators. Difficulty: "Start Here".
- "Trend Follower" — EMA crossover entry with volume confirmation, EMA cross-back exit. Uses only Essential indicators. Difficulty: "Start Here".
- "Safe Exit" — Trailing stop + take profit combination. Uses only Essential indicators. Difficulty: "Start Here".
**And** each template includes a `teaches_description` explaining the concept:
- Buy the Dip: "This template tests the idea that prices tend to bounce back after sharp drops — a concept called mean reversion. It buys when momentum is very low and sells when it recovers."
- Trend Follower: "This template follows the crowd. It buys when a short-term trend crosses above a long-term trend, betting that momentum will continue."
- Safe Exit: "This template focuses on protecting your gains. It uses a trailing stop that follows the price up and locks in profits, combined with a fixed take-profit target."

**Given** a user clones one of the new templates
**When** the strategy opens in the canvas
**Then** all blocks use only Essential-tier indicators (SMA, EMA, RSI, Bollinger Bands, MACD)
**And** the strategy is fully functional and can be backtested immediately
