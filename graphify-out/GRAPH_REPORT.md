# Graph Report - .  (2026-04-19)

## Corpus Check
- Large corpus: 598 files · ~539,090 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 2567 nodes · 5470 edges · 160 communities detected
- Extraction: 56% EXTRACTED · 44% INFERRED · 0% AMBIGUOUS · INFERRED: 2384 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `User` - 169 edges
2. `Candle` - 162 edges
3. `UserTier` - 86 edges
4. `PlanTier` - 80 edges
5. `Strategy` - 74 edges
6. `TakeProfitLevel` - 67 edges
7. `StrategySignals` - 67 edges
8. `BacktestRun` - 60 edges
9. `TPLevelState` - 56 edges
10. `Trade` - 56 edges

## Surprising Connections (you probably didn't know these)
- `Authentication Setup Guide` --references--> `oauth_callback()`  [EXTRACTED]
  AUTHENTICATION_SETUP.md → backend/app/api/auth.py
- `Rationale: Prevent account takeover via OAuth` --rationale_for--> `oauth_callback()`  [EXTRACTED]
  AUTHENTICATION_SETUP.md → backend/app/api/auth.py
- `PRD: Inspector Panel for Block Parameters` --semantically_similar_to--> `Properties Panel`  [INFERRED] [semantically similar]
  docs/prd-inspector-panel-block-parameters.md → STRATEGY_GUIDE.md
- `Original CLAUDE.md (archived)` --semantically_similar_to--> `Project CLAUDE.md (Project Instructions)`  [INFERRED] [semantically similar]
  CLAUDE.original.md → CLAUDE.md
- `Tremor Design System Unification Implementation Plan` --semantically_similar_to--> `tasks/todo.md (empty task tracker)`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-04-19-tremor-design-system-unification.md → tasks/todo.md

## Hyperedges (group relationships)
- **Backtest Creation/Execution Flow** — backtest_post_endpoint, backtest_worker, backtest_runs_table, candles_table, backtest_get_endpoint [EXTRACTED 0.90]
- **OAuth Authentication Flow** — auth_google_oauth, auth_github_oauth, auth_oauth_callback, auth_state_token_redis, auth_migration_007 [EXTRACTED 0.90]
- **GDPR-Respecting Analytics Pipeline** — analytics_posthog, analytics_consent_banner, analytics_posthog_bootstrap, analytics_tracked_events, analytics_consent_flow [EXTRACTED 0.90]
- **Wizard onboarding completion flow** —  [EXTRACTED 1.00]
- **Backtest results surface (comparison/export/benchmark)** —  [EXTRACTED 1.00]
- **Tiered plan limits + beta grandfathering** —  [EXTRACTED 1.00]
- **** —  [INFERRED 0.85]
- **** —  [INFERRED 0.90]
- **** —  [INFERRED 0.75]
- **Essentials Mode Ecosystem** —  [INFERRED 0.90]
- **Strategy Management Epic 2 Family** —  [INFERRED 0.90]
- **Template Discovery & Education** —  [INFERRED 0.88]
- **Phase 3 confidence engine: wizard-first onboarding + plain-English narrative + Alex persona** — prd-phase3, persona-alex, concept-wizard-first-onboarding, concept-plain-english-narrative, brainstorming-report-phase3 [EXTRACTED 1.00]
- **Backtest results analytics suite: drawer, distribution, equity curve, benchmark, favorite metrics** — prd-backtest-trade-details-drawer, tst-trade-distribution-analysis, tst-backtest-results-equity-curve-chart, prd-benchmark-comparison, prd-favorite-metrics-backtest-summary [INFERRED 0.85]
- **Canvas editing affordances: copy/paste blocks, inline popover, notes, keyboard shortcuts** — prd-copy-paste-blocks-subgraphs, prd-inline-parameter-popover-on-block-tap, tst-strategy-notes-annotations, tst-keyboard-shortcuts [INFERRED 0.80]
- **** — theme_backtest_credibility_education, prd_low_trade_count_warning, prd_seasonality_analysis [INFERRED 0.80]
- **** — concept_nextjs_16, concept_fastapi_0_129, concept_python_312 [EXTRACTED 1.00]
- **** — concept_smartcanvas_component, concept_strategy_canvas_component, concept_posthog_feature_flags [EXTRACTED 1.00]
- **Mobile UX cluster** —  [INFERRED 0.80]
- **Backtest analytics cluster** —  [INFERRED 0.80]
- **Monetization/limits cluster** —  [INFERRED 0.85]
- **** —  [INFERRED 0.85]
- **** —  [EXTRACTED 0.95]
- **** —  [EXTRACTED 0.90]
- **Canvas redesign multi-viewpoint analysis** —  [EXTRACTED 0.90]
- **Synthesis feeds PRD + architecture review** —  [INFERRED 0.85]
- **Canvas UX feedback trio** —  [INFERRED 0.80]

## Communities

### Community 0 - "Frontend UI Components"
Cohesion: 0.01
Nodes (59): ApiError, apiFetch(), apiFetchVoid(), fetchDataAvailability(), fetchDataCompleteness(), fetchDataQuality(), fetchWithAuth(), getApiBase() (+51 more)

### Community 1 - "Strategy & Template Schemas"
Cohesion: 0.05
Nodes (128): Add strategy_templates table for curated strategy library  Revision ID: 017 Revi, AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate, evaluate_alerts_for_run(), _is_same_date(), _parse_timestamp(), Alert evaluation service for performance alerts.  Alerts are evaluated only for (+120 more)

### Community 2 - "Backtest Engine & Metrics"
Cohesion: 0.05
Nodes (124): Candle, BacktestResult, compute_benchmark_curve(), compute_benchmark_metrics(), compute_risk_metrics(), _create_trade(), Core backtest simulation engine., Create a Trade record and compute PnL.     Returns (Trade, pnl) tuple. (+116 more)

### Community 3 - "Billing & Subscriptions"
Cohesion: 0.04
Nodes (107): CheckoutSessionRequest, CheckoutSessionResponse, create_checkout_session(), create_credit_pack_checkout(), create_portal_session(), CreditPackCheckoutRequest, _handle_credit_pack_purchase(), _handle_subscription_checkout() (+99 more)

### Community 4 - "Indicator Test Suite"
Cohesion: 0.02
Nodes (78): Tests for technical indicator calculations., EMA of empty list should return empty list., Tests for Relative Strength Index., RSI should be 100 when all changes are positive., RSI should be 0 when all changes are negative., RSI should return None for warmup period., RSI should always be between 0 and 100., RSI of list shorter than 2 should return all None. (+70 more)

### Community 5 - "Backtest API Schemas"
Cohesion: 0.09
Nodes (98): BacktestCompareRequest, BacktestCompareResponse, BacktestCompareRun, BacktestCreateRequest, BacktestCreateResponse, BacktestListItem, BacktestListPage, BacktestStatusResponse (+90 more)

### Community 6 - "Authentication & OAuth"
Cohesion: 0.03
Nodes (80): BMAD Adversarial Review Phase 3, GitHub OAuth Provider, Google OAuth 2.0 Provider, POST /auth/login Endpoint, Migration 007_add_auth_fields, Rationale: CSRF protection via state token, Authentication Setup Guide, POST /auth/signup Endpoint (+72 more)

### Community 7 - "Phase 2-3 Planning"
Cohesion: 0.03
Nodes (69): Phase 3 Architectural Review, Brainstorm Phase 2, Canvas Autosave, Average Hold Time Metric, Side-by-side Backtest Comparison, Backtest Results Page, Bottom Sheet UX Pattern, 768px Breakpoint (+61 more)

### Community 8 - "Data Quality Metrics"
Cohesion: 0.07
Nodes (55): check_has_issues(), compute_completeness_metrics(), compute_daily_metrics(), DataQualityMetric, query_metrics_for_range(), Data quality validation service., Query metrics table for date range.      Returns all matching DataQualityMetric, Compute completeness metrics for asset/timeframe.      Returns dict with:     - (+47 more)

### Community 9 - "PostHog Analytics & Consent"
Cohesion: 0.05
Nodes (49): ConsentBanner Component, GDPR Consent Flow (bb.analytics.consent), PostHog (Product Analytics Tool), PostHogBootstrap Initializer, Rationale: autocapture off for privacy, PostHog Analytics Setup, Tracked Events (page_view, signup_completed, backtest_* ...), Backend CLAUDE.md (+41 more)

### Community 10 - "Competitive & Market Analysis"
Cohesion: 0.04
Nodes (49): Competitive Analysis Phase 3, Competitor: 3Commas, Competitors: Bitsgap, Gainium, Cryptohopper, Streak, Competitor: Composer.trade, Competitor: Jesse (open-source Python framework), Competitor: StrategyQuant X, Competitor: TradingView Strategy Tester, Alex persona (retail crypto holder, panic-sold ETH) (+41 more)

### Community 11 - "Security & Token Tests"
Cohesion: 0.04
Nodes (27): Tests for authentication and security functions., Empty token should return None., Different users should get different tokens., Tests for password reset token generation and validation., Reset token should be a non-empty string., Each generated token should be unique., Reset token should be URL-safe (no special URL characters)., Valid token within expiry should return True. (+19 more)

### Community 12 - "Analytics Client Helpers"
Cohesion: 0.06
Nodes (28): flush_backend_events(), _get_client(), getConsent(), initPostHog(), Backend analytics helper for PostHog server-side event tracking., Lazy-initialize the PostHog client singleton., Fire-and-forget backend event dispatch to PostHog.      Safe no-op when PostHog, Flush queued backend analytics events.      Safe no-op when client is not initia (+20 more)

### Community 13 - "Auth Frontend & Reset"
Cohesion: 0.15
Nodes (39): AuthResponse, BacktestUsageItem, _build_user_response(), _check_rate_limit(), _get_redis(), _get_redis_client(), login(), LoginRequest (+31 more)

### Community 14 - "Trade Explanations"
Cohesion: 0.14
Nodes (26): EntryExplanation, ExitExplanation, IndicatorSeries, Single indicator series for chart overlay., Entry explanation text., Exit explanation text., _BlockEvaluator, _build_block_evaluator() (+18 more)

### Community 15 - "Backtest Comparison & Benchmarks"
Cohesion: 0.07
Nodes (32): Phase 3 Strategic Brainstorming Report, Goal: under 8 minutes from signup to first backtest, Alpha & Beta metrics, POST /backtests/compare (2-4 runs), GET /backtests/{run_id}/benchmark-equity-curve, Benchmark equity curve (buy-and-hold), Buy-and-hold equity curve (same asset/timeframe), Metrics comparison table (Return, CAGR, Sharpe, Sortino, etc.) (+24 more)

### Community 16 - "Chart Components"
Cohesion: 0.09
Nodes (11): formatDateTime(), formatDuration(), formatMoney(), formatNumber(), formatPercent(), formatPrice(), formatQuantity(), formatRelativeTime() (+3 more)

### Community 17 - "Phase 2 Architecture"
Cohesion: 0.07
Nodes (30): 1-hour timeframe, Deprioritize community/exchange/social features, E-03 Short Selling as foundational prerequisite, FastAPI monolith + Postgres + Redis/RQ + MinIO, users.has_completed_onboarding flag, Store insights in MinIO result payload, Month/Quarter/Day-of-week performance breakdown, OR semantics for entry/exit signals (+22 more)

### Community 18 - "Structured Logging Tests"
Cohesion: 0.09
Nodes (16): _capture_json_log(), Tests for structured logging and correlation ID propagation., logger.exception() produces JSON with a traceback field., Integration tests for the correlation ID middleware., Request without X-Correlation-ID header gets a generated one in logs., Request with X-Correlation-ID header propagates it., Verify structlog contextvars appear in logs and can be cleaned up., Helper: emit a log via log_func and return parsed JSON from stdout. (+8 more)

### Community 19 - "Narrative Summary Tests"
Cohesion: 0.11
Nodes (14): make_summary(), Tests for backtest narrative summary generation., Drawdown is expressed as a percentage from peak equity., Zero drawdown should not produce odd text., Factory for BacktestSummary with sensible defaults., Alpha near zero should use 'on par' language., If narrative generation throws, return fallback., PRD requires character-for-character match. (+6 more)

### Community 20 - "Technical Indicators"
Cohesion: 0.09
Nodes (23): adx(), bollinger(), ema(), fibonacci_retracements(), ichimoku(), macd(), obv(), price_variation_pct() (+15 more)

### Community 21 - "Block Explanation Generator"
Cohesion: 0.19
Nodes (20): findInputPhrase(), formatAdxBlock(), formatAndBlock(), formatAtrBlock(), formatBollingerBlock(), formatCompareBlock(), formatCrossoverBlock(), formatEmaBlock() (+12 more)

### Community 22 - "Backtest PRDs"
Cohesion: 0.13
Nodes (19): Concept: Backtest Results, Concept: Design System (Tremor/Dark Mode), Concept: Market Data & Warnings, Concept: Metrics & Education, PRD: Backtest Results Equity Curve Chart, PRD: Metrics Glossary, PRD: Remove Sentiment Backtest Results, PRD: Trade Distribution Analysis (+11 more)

### Community 23 - "Profile Badges & Reputation"
Cohesion: 0.2
Nodes (14): compute_badges(), Compute badges based on current counts.     Badges are computed on-read, not sto, Badge, Contributions, ProfileSettingsResponse, ProfileUpdateRequest, PublicProfileResponse, PublishedStrategy (+6 more)

### Community 24 - "Alerts & Multi-Period Batch"
Cohesion: 0.12
Nodes (17): Price Alert CRUD (per asset pair), Batch Queueing with batch_id/run_id, Daily Backtest Quota Accounting per Period, Notification Channels (in-app/email/webhook), Tier-Gated Period Checkboxes (2y/3y premium only), MVP Plan, PRD: Data Completeness Indicators, PRD: Multi-Period Batch Backtesting (+9 more)

### Community 25 - "Candle Fetching Service"
Cohesion: 0.2
Nodes (14): _aggregate_to_4h(), _detect_gaps(), fetch_candles(), _fetch_from_vendor(), _merge_candles(), Candle fetching service: DB cache + CryptoCompare vendor., Call CryptoCompare API, return raw candle dicts., Aggregate hourly candles to 4-hour candles. (+6 more)

### Community 26 - "Backtest Results UI"
Cohesion: 0.14
Nodes (16): Backtest KPI Strip (Net PnL / Return / Trades / Sharpe), BTC EMA Crossover Daily run header (data availability, run status bar), Backtest Results Dashboard Screen, Badge pill color semantics (green/red/blue/amber), Dataset metadata line (19,824 candles / 100% coverage / Binance OHLCV / last sync 2 min ago), READY status badge (green), Data Availability Row Component, Feedback State Color Design Pattern (+8 more)

### Community 27 - "Strategy & Asset Constraints"
Cohesion: 0.13
Nodes (15): Strategy Asset Picker UI, Curated Asset List (Single-Asset Constraint), Flat Many-to-Many Tags (no hierarchy), OHLCV Data Ingestion, Single-Asset Single-Timeframe MVP Constraint, Strategy Archive Flag (is_archived), Strategy Versioning (JSON per save), Tag Filter with OR Logic (+7 more)

### Community 28 - "Strategy Monitor Freshness"
Cohesion: 0.14
Nodes (14): Automated daily re-testing, Per-strategy auto-update toggle, Daily scheduler worker, Updated today / Needs update freshness badge, Period columns 30d/60d/90d/1y (+2y/3y premium), At-a-glance portfolio-level overview, Strategy list metric preview (table/grid), Strategy Monitor label (+6 more)

### Community 29 - "Canvas Indicator UX"
Cohesion: 0.14
Nodes (14): ADX indicator, strategyClipboard localStorage payload, Reduce new-user cognitive load, Essentials indicator mode (top 5), Fibonacci retracements, Ichimoku Cloud indicator, localStorage persistence, Multi-select + marquee/lasso (+6 more)

### Community 30 - "Plan Limits & Pricing"
Cohesion: 0.18
Nodes (12): apply_beta_bonuses(), get_effective_limits(), get_plan_limits(), get_plan_pricing(), PlanLimits, Plan limits and subscription tier configuration., Get limits for a given plan tier.      Args:         plan_tier: The plan tier (", Apply beta user bonuses to plan limits.      Args:         limits: Base plan lim (+4 more)

### Community 31 - "Notifications API"
Cohesion: 0.24
Nodes (9): NotificationItem, NotificationListResponse, acknowledge_all_notifications(), acknowledge_notification(), list_notifications(), API endpoints for notifications., List notifications for current user, unread first then newest., Mark a single notification as read. (+1 more)

### Community 32 - "Tremor Design System"
Cohesion: 0.19
Nodes (13): Canvas-category palette (input=purple, indicator=blue, logic=amber, signal=green, risk=red), Chart wrapper layer at src/components/charts/ (CurrencyChart, PercentChart, SeriesColors), Branch design-system/signal-theme (single big-bang PR), frontend/CLAUDE.md (frontend agent rules), lightweight-charts ZoomableChart stays untouched (candlesticks), Remove recharts dependency after migration, Preserve shadcn/ui primitives for forms, dialogs, menus, tables, Storybook parity: default / dark / loading / empty variants per migrated comp (+5 more)

### Community 33 - "S3/MinIO Storage"
Cohesion: 0.23
Nodes (11): download_json(), ensure_bucket_exists(), generate_results_key(), get_s3_client(), S3/MinIO storage client for backtest results., Create boto3 S3 client configured for MinIO., Create bucket if it doesn't exist., Generate storage key: backtests/{run_id}/{filename} (+3 more)

### Community 34 - "Backtest API Tests"
Cohesion: 0.39
Nodes (11): client_fixture(), _create_strategy_with_version(), _create_user(), engine_fixture(), _login_and_get_token(), session_fixture(), test_backtest_enqueue_forwards_request_correlation_id(), test_batch_backtest_all_skipped_returns_null_batch_id() (+3 more)

### Community 35 - "Inline Popover Feature Flag"
Cohesion: 0.17
Nodes (12): <=100ms compact-label update latency, <=200ms Client-Side Re-Evaluation, Entry/Exit/Risk Completeness Segments, Feature Flag Gating (canvas_flag_health_bar), Feature flag: Inline Popovers, Floating UI / Radix positioning primitives, Inline Parameter Popover (vs Inspector Panel), Real-Time Compact Node Label Update (~100ms) (+4 more)

### Community 36 - "Trade Detail Drawer"
Cohesion: 0.17
Nodes (12): Condition candle highlighting, Context chart window: 10d before/after, min 90d, Duration distribution buckets (1, 2-3, 4-7, 8-14, 15-30, >30), Indicator overlays (EMA/SMA/Bollinger/RSI/MACD), MAE/MFE, R-multiple excursion metrics, Return histogram buckets (0-5,5-10,10-20,>20 and mirror), Skew callout (wins vs losses asymmetry), Trade detail payload fields (entry_conditions, exit_trigger, indicator_overlays, condition_events) (+4 more)

### Community 37 - "Dashboard UI Elements"
Cohesion: 0.17
Nodes (12): Dashboard home screen (Welcome back, Pierrick Martino), Backtest row (pair dot + ETH/USDT, date range, 1d timeframe chip, percentage return), KPI summary cards (15 Strategies, 3 Recently Viewed Backtests, New Strategy CTA), Draft · not validated status indicator on strategy rows (tet, BTX fdshgfds), +10 more strategies paginator link, Positive-return trend arrow + green percentage styling (+27.32%, +71.30%, +75.11%), Platform sidebar (Dashboard, Market, Progress, Strategies, Alerts, Resources), Recent backtests dashboard card (3 entries, View all) (+4 more)

### Community 38 - "Backend Endpoint Tests"
Cohesion: 0.22
Nodes (3): _mock_market_dependencies(), test_market_sentiment_endpoint_returns_valid_payload(), test_market_tickers_includes_as_of_and_volatility_fields()

### Community 39 - "Canvas Redesign Reports"
Cohesion: 0.31
Nodes (11): Canvas Redesign Architecture Review, Canvas Redesign Brainstorming Report, Canvas Redesign Design Thinking Report, Canvas Redesign Party Mode Synthesis, Canvas Redesign PRD: Canvas Editor Redesign, Canvas Redesign Problem-Solving Report, Canvas Redesign Product Brief, PRD Storybook Framework Component UX/UI (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (7): DataAvailabilitySection(), formatAvailabilitySource(), formatLocalDate(), formatNumber(), formatRelativeDate(), getAvailableCandleCount(), timeframeToMs()

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (9): calculate_atr_pct(), calculate_log_returns(), calculate_stddev_volatility(), calculate_volatility_percentile(), Volatility calculations for market data., Calculate standard deviation of log returns over window.      Args:         clos, Calculate ATR as percentage of current price.      Args:         highs: List of, Calculate log returns from close prices.      Returns: ln(close_t / close_{t-1}) (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.2
Nodes (10): Bell icon + unread badge, correlation_id analytics property, Global weekly digest toggle, Initial notification types (backtest_completed, usage_limit_reached, etc.), Per-strategy digest toggle, PostHog lifecycle events (started/completed/failed), PRD: Digest Email Opt-Out Controls, PRD: In-App Notifications (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.2
Nodes (10): Difficulty Badges (Start Here/Level Up/Deep Dive), Seed Templates (RSI oversold, MA crossover, Bollinger breakout), Template sort_order Ordering, What This Teaches Section, Template Clone Action, PRD: Strategy Templates Marketplace, PRD: Template Educational Fields & Difficulty Ordering, TST: Strategy Templates Marketplace (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.39
Nodes (7): downloadFile(), exportEquityToCSV(), exportEquityToJSON(), exportMetricsToCSV(), exportMetricsToJSON(), exportTradesToCSV(), exportTradesToJSON()

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (2): evaluateHealthBar(), getSignalConnectivity()

### Community 46 - "Community 46"
Cohesion: 0.31
Nodes (4): createSnapshot(), deepCopy(), pushSnapshot(), resetHistory()

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (4): generate_reset_token(), is_reset_token_valid(), Generate a secure random token for password reset., Check if the reset token is valid and not expired.      Uses constant-time compa

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (9): Core data model & migrations (S0.2), docker-compose local dev stack, FastAPI 0.129.x, One monolith + worker + DB + cache, Next.js 16.x, Python 3.12, Smoke test: OAuth / strategy creation / backtest, Foundation & Environment (Epic 0) (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (2): _mock_backtest_storage(), test_backtest_endpoints()

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (8): 5-10 beta testers priority lens, Patronizing risk in educational insights, No-code visual strategy lab, Retail crypto tinkerer persona, Simplicity-first design principle, Solo dev 20-25 person-weeks capacity, BMAD Party Mode: Adversarial Review (Phase 2), MVP Specification

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (8): Larger tap targets / simplified palette, Minimap viewport indicator, Mobile bottom action bar (Pan/Zoom/Fit/Undo/Redo), Entry/Exit/Risk quick-jump shortcuts, Tap-based block connections, PRD: Canvas Minimap with Section Shortcuts, PRD: Mobile-Optimized Canvas, TST: Canvas Bottom Action Bar (Mobile Tools)

### Community 52 - "Community 52"
Cohesion: 0.43
Nodes (6): make_descending_candles(), Tests for strategy interpreter signal wiring and evaluation., Create candles with monotonically decreasing closes (RSI approaches 0)., test_compare_supports_left_right_ports_for_entry_signal(), test_compare_supports_legacy_a_b_ports_for_entry_signal(), test_compare_supports_legacy_word_operator_below_for_entry_signal()

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (7): Alternative.me Fear & Greed Provider, Binance Futures Funding Rates Provider, Binance Futures Long/Short Ratio Provider, GET /market/sentiment Endpoint, Rationale: Graceful partial-failure handling, Redis Sentiment Cache (15m TTL), Sentiment API Setup Guide

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (7): Bulk actions dropdown (Archive/Tag/Delete), Checkbox row selection + select-all, Frontend-only (no backend changes), Local clipboard JSON payload, Multi-select blocks on canvas, PRD: Bulk Strategy Actions (Archive, Tag, Delete), PRD: Copy/Paste Blocks & Subgraphs

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (7): PRD: Display Formatting Consistency, PRD: Plain-English Indicator Labels, PRD: Simplified Default Metrics View, PRD: What You Just Learned Summary Card, TST: Expanded Indicator Palette (Price Variation Input), TST: Simplified Default Metrics View, TST: What You Just Learned Summary Card

### Community 56 - "Community 56"
Cohesion: 0.47
Nodes (5): _fmt_pct(), _fmt_usd(), generate_narrative(), Template-based narrative summary for completed backtests., Return a plain-English paragraph summarising backtest results.      Never raises

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (6): Deterministic narrative template, Plain-English backtest summary, Trades table (entry/exit/P&L), PRD: Backtest Results Trades Section, PRD: Backtest Narrative Summary Generation (Backend), WHY: Reduce cognitive load reading metrics

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (6): Storybook component coverage, Shared Tailwind + design tokens in Storybook, Tremor Card/Callout/chart shells, PRD: Tremor Design System Unification (referenced), TST: Storybook Framework for Components, TST: Tremor Design System Unification

### Community 59 - "Community 59"
Cohesion: 0.4
Nodes (6): 5 Essentials Indicators (SMA/EMA/RSI/BB/MACD), Essentials Mode Indicator Label Mapping (SMA/EMA/RSI/BB/MACD), WCAG 2.1 AA Contrast (NFR-09), Wizard Exclusions (Ichimoku, Fibonacci, ADX, OBV, Stochastic), PRD: Wizard Essentials-Only Constraint, TST: Plain-English Indicator Labels

### Community 60 - "Community 60"
Cohesion: 0.8
Nodes (4): _create_strategy_templates_table(), _make_engine(), test_seed_initial_templates_handles_pre_029_schema(), test_seed_initial_templates_populates_educational_fields_when_available()

### Community 61 - "Community 61"
Cohesion: 0.4
Nodes (1): Tests for backend analytics helpers.

### Community 62 - "Community 62"
Cohesion: 0.4
Nodes (5): POST /strategies/bulk/{archive,tag,delete}, strategy_tags & strategy_tag_links tables, Multi-select tag filter (OR logic), TST: Bulk Strategy Actions (Archive, Tag, Delete), TST: Strategy Groups & Tags

### Community 63 - "Community 63"
Cohesion: 0.4
Nodes (5): Auto-arrange button (Left→Right / Top→Bottom), DAG topological layout heuristic, Tidy connections action, PRD: Canvas Auto-Layout & Connection Tidying, TST: Canvas Auto-Layout & Connection Tidying

### Community 64 - "Community 64"
Cohesion: 0.4
Nodes (5): Canvas Toolbar with Disabled States, Frontend-Only History Stack (capped), Standard Undo/Redo Keyboard Shortcuts (Cmd/Ctrl+Z, +Shift+Z, +Y), PRD: Canvas Undo/Redo, TST: Canvas Undo/Redo

### Community 65 - "Community 65"
Cohesion: 0.4
Nodes (5): Fear & Greed Index Gauge, Funding Rate Sparkline, Long/Short Ratio Sparkline, Sentiment During Backtest Context Strip, PRD: Market Sentiment Indicators

### Community 66 - "Community 66"
Cohesion: 0.4
Nodes (5): Autosave Status Indicator (10s debounce), History Panel/Drawer via Icon, Overflow Menu for Secondary Actions, Single Primary CTA in Top Bar (Backtest/Run), PRD: Simplified Top Bar with Autosave (Mobile)

### Community 67 - "Community 67"
Cohesion: 0.4
Nodes (5): Maximum consecutive losses metric, Pin & reorder summary metrics per user, Sharpe, Sortino, Calmar ratios (annualized, risk-free=0), PRD: Favorite Metrics (Backtest Summary), TST: Risk Metrics Expansion

### Community 68 - "Community 68"
Cohesion: 0.4
Nodes (5): Client-side session history tracking, Consolidated single Profile surface, Usage/quotas display (strategies, backtests), Profile Page (Settings + Usage Limits), Recently Viewed Dashboard Shortcuts

### Community 69 - "Community 69"
Cohesion: 0.4
Nodes (5): Explicit Validation, JSON-only Import/Export, One-click Strategy Duplication, PRD: Quick Strategy Clone, PRD: Strategy Import/Export

### Community 70 - "Community 70"
Cohesion: 0.5
Nodes (5): App Dashboard Home (Welcome back Pierrick Martino), Dark New Strategy CTA card with Build with blocks tagline, Primary actions (New strategy, Open templates), Stat cards (Strategies 15 +3 this week / Recently viewed backtests 3 / Start something new CTA), Top bar with breadcrumb, strategy search (cmd+K), notifications bell

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (5): Got it dismiss action on educational banner, Graduation cap icon signaling educational content, Insight pill tag on educational banner, What you just learned insight banner (Insight tag variant) — BTC/USDT lagged buy-and-hold by 50.3pp over 3-year window, What you just learned insight banner (plain variant) — buy-and-hold comparison, 50.3pp lag over 2023-04-18 → 2026-04-17

### Community 72 - "Community 72"
Cohesion: 0.4
Nodes (5): Backtest Trades Table, LONG/SHORT Side Badges (green/red), Search / Filter (All) / CSV Export controls, Table Pagination (25 rows, 15 pages, 72 total), Trade Row (# / Side / Entry / Exit / Duration / P&L / P&L% / Costs)

### Community 73 - "Community 73"
Cohesion: 0.4
Nodes (5): Max Drawdown KPI (-12.40%, 19 days, recovered), Sharpe Ratio KPI (1.84, Sortino 2.31, Calmar 1.42), Total Return KPI (+47.82%, vs B&H +31.10%, delta +16.7), Win Rate / Total Trades / Avg Hold KPIs (58.3%, 72, 3.2d), Backtest KPI Cards Row

### Community 74 - "Community 74"
Cohesion: 0.4
Nodes (5): Failed Run with Retry Action and Data Gap Reason, Run Card Row (date, window, duration, return, Sharpe), Multi-Select Checkbox Compare UX, Run Status Badges (Completed / Running / Queued / Failed), Recent Runs Panel (24 total, select to compare)

### Community 75 - "Community 75"
Cohesion: 0.5
Nodes (3): BaseSettings, Config, Settings

### Community 76 - "Community 76"
Cohesion: 0.5
Nodes (3): get_error_message(), Plain-language error messages for strategy validation.  Maps error codes to user, Get user-friendly error message and help link for an error code.      Args:

### Community 77 - "Community 77"
Cohesion: 0.5
Nodes (1): Add favorite_metrics to users for personalized backtest summary  Revision ID: 01

### Community 78 - "Community 78"
Cohesion: 0.5
Nodes (1): Add benchmark metrics to backtest_runs  Revision ID: 008 Revises: 007 Create Dat

### Community 79 - "Community 79"
Cohesion: 0.5
Nodes (1): Add timezone_preference to users for Profile page  Revision ID: 006 Revises: 005

### Community 80 - "Community 80"
Cohesion: 0.5
Nodes (1): Add alert_rules table  Revision ID: 011 Revises: 010 Create Date: 2026-01-04

### Community 81 - "Community 81"
Cohesion: 0.5
Nodes (1): Fix strategy template connections and remove orphan blocks  Fixes: - Compare blo

### Community 82 - "Community 82"
Cohesion: 0.5
Nodes (1): Add credit packs fields to users table  Revision ID: 014 Revises: 013 Create Dat

### Community 83 - "Community 83"
Cohesion: 0.5
Nodes (1): Add transaction cost analysis fields  Revision ID: 023 Revises: 022 Create Date:

### Community 84 - "Community 84"
Cohesion: 0.5
Nodes (1): Initial schema - create core tables  Revision ID: 001 Revises: Create Date: 2024

### Community 85 - "Community 85"
Cohesion: 0.5
Nodes (1): Add data quality metrics table  Revision ID: 009 Revises: 008 Create Date: 2026-

### Community 86 - "Community 86"
Cohesion: 0.5
Nodes (1): Add new fields to backtest_runs for Epic 4  Revision ID: 003 Revises: 002 Create

### Community 87 - "Community 87"
Cohesion: 0.5
Nodes (1): Add strategy_tags and strategy_tag_links tables  Revision ID: 012 Revises: 011 C

### Community 88 - "Community 88"
Cohesion: 0.5
Nodes (1): Add scheduled re-backtest fields for Epic 6  Revision ID: 004 Revises: 003 Creat

### Community 89 - "Community 89"
Cohesion: 0.5
Nodes (1): Add has_completed_onboarding to users with backfill  Revision ID: 028 Revises: 0

### Community 90 - "Community 90"
Cohesion: 0.5
Nodes (1): Add educational fields to strategy_templates  Revision ID: 029 Revises: 028 Crea

### Community 91 - "Community 91"
Cohesion: 0.5
Nodes (1): Add risk metrics to backtest_runs  Revision ID: 022 Revises: 021 Create Date: 20

### Community 92 - "Community 92"
Cohesion: 0.5
Nodes (1): Add digest_email_enabled to users and strategies  Revision ID: 027 Revises: 026

### Community 93 - "Community 93"
Cohesion: 0.5
Nodes (1): Add price alert fields to alert_rules  Revision ID: 019 Revises: 018 Create Date

### Community 94 - "Community 94"
Cohesion: 0.5
Nodes (1): Add shared_backtest_links table  Revision ID: 021 Revises: 020 Create Date: 2026

### Community 95 - "Community 95"
Cohesion: 0.5
Nodes (1): Add user_tier to users  Revision ID: 020 Revises: 019 Create Date: 2026-01-24

### Community 96 - "Community 96"
Cohesion: 0.5
Nodes (1): Add Stripe webhook events table  Revision ID: 015 Revises: 014 Create Date: 2026

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (1): Add unique constraint on strategy_versions (strategy_id, version_number)  Revisi

### Community 98 - "Community 98"
Cohesion: 0.5
Nodes (1): Add started_at to backtest_runs for elapsed time tracking  Revision ID: 032 Revi

### Community 99 - "Community 99"
Cohesion: 0.5
Nodes (1): Add batch_id and period_key to backtest_runs  Revision ID: 031 Revises: 030 Crea

### Community 100 - "Community 100"
Cohesion: 0.5
Nodes (1): Add notifications table  Revision ID: 010 Revises: 009 Create Date: 2026-01-02

### Community 101 - "Community 101"
Cohesion: 0.5
Nodes (1): Add max_strategies to users for Epic 7 usage limits  Revision ID: 005 Revises: 0

### Community 102 - "Community 102"
Cohesion: 0.5
Nodes (1): Add password reset and OAuth fields to users table  Revision ID: 007 Revises: 00

### Community 103 - "Community 103"
Cohesion: 0.5
Nodes (1): Add profile fields for user profiles and reputation  Revision ID: 024 Revises: 0

### Community 104 - "Community 104"
Cohesion: 0.5
Nodes (1): Add theme_preference to users  Revision ID: 018 Revises: 017 Create Date: 2026-0

### Community 105 - "Community 105"
Cohesion: 0.5
Nodes (1): Add subscription fields to users table  Revision ID: 013 Revises: 012 Create Dat

### Community 106 - "Community 106"
Cohesion: 0.5
Nodes (1): Add earliest/latest candle date columns to data_quality_metrics  Revision ID: 02

### Community 107 - "Community 107"
Cohesion: 0.5
Nodes (1): Add performance indexes for common query patterns  Revision ID: 025 Revises: 024

### Community 108 - "Community 108"
Cohesion: 0.5
Nodes (4): Block categories: Indicators, Logic, Risk, Signals, Data, Bottom sheet block library UI, Recents & favorites (client-side storage), TST: Block Library Bottom Sheet with Search

### Community 109 - "Community 109"
Cohesion: 0.5
Nodes (4): Annual plan with 15-20% discount, Separate Stripe annual price IDs, PRD: Annual Subscription Discounts, WHY: Cashflow, churn reduction, LTV

### Community 110 - "Community 110"
Cohesion: 0.5
Nodes (4): CSF3 Story Format, Storybook Components/ Category (shared custom), Storybook UI/ Category (shadcn/ui primitives), Storybook Guide

### Community 111 - "Community 111"
Cohesion: 0.5
Nodes (4): Auto-Awarded Badges (deterministic thresholds), Opt-In Public Profile (/u/{handle}), Privacy Toggles for Profile Sections, PRD: User Profiles & Reputation

### Community 112 - "Community 112"
Cohesion: 0.5
Nodes (4): Optional Link Expiration, Public Results View Hiding Strategy Logic, Token-Based Read-Only Share Link, PRD: Shareable Backtest Result Links

### Community 113 - "Community 113"
Cohesion: 0.5
Nodes (4): Currency as suffix (e.g., 12,345.67 USDT), Intl.NumberFormat for all numbers, Single locale per session (navigator.language, en-US fallback), TST: Display Formatting Consistency

### Community 114 - "Community 114"
Cohesion: 0.5
Nodes (4): Public /share/backtests/{token} endpoint (no auth), Share response excludes strategy definition, trades, user info, Share link with 32+ char unguessable token, TST: Shareable Backtest Result Links

### Community 115 - "Community 115"
Cohesion: 0.5
Nodes (4): Cmd/Ctrl+R run backtest shortcut, Cmd/Ctrl+S save strategy shortcut, Suppress shortcuts inside inputs/textareas/contenteditable, TST: Keyboard Shortcuts & Reference

### Community 116 - "Community 116"
Cohesion: 0.5
Nodes (4): Mobile-first, accessible auth form, OAuth (Google, GitHub), Password reset flow, PRD: Auth UX/UI Improvements (Sign-in/Sign-up)

### Community 117 - "Community 117"
Cohesion: 0.5
Nodes (4): Tiered Subscription Plans, Usage Limits Transparency, Test Checklist: Epic 7 Usage Limits Transparency, Test Checklist: Simple Tiered Subscription Plans

### Community 118 - "Community 118"
Cohesion: 0.83
Nodes (4): Concept: Navigation Shortcuts, PRD: Keyboard Shortcuts, TST: Canvas Minimap Section Shortcuts, TST: Recently Viewed Dashboard Shortcuts

### Community 119 - "Community 119"
Cohesion: 0.5
Nodes (4): Stacked cost breakdown bar (Fees 62.5%, Slippage 31.3%, Spread 6.2%), Gross return → Costs → Net return arithmetic row (+11,705.60 − 2,174.59 = +9,531.00 USDT), TCA metric tiles (Fees, Slippage, Spread, Avg per trade), Transaction cost analysis card (44 fills, 18.58% cost drag)

### Community 120 - "Community 120"
Cohesion: 0.5
Nodes (4): Backtest results header (LIVE STRATEGY status, v12, Updated 2 min ago, BTC Mean-reversion Edge title), Backtest parameter chips (BTC/USDT pair, 1H timeframe, Jan 1 2024 → Apr 1 2026 range, Seed 42), LIVE STRATEGY green status dot (activity indicator), Strategy version label (v12)

### Community 121 - "Community 121"
Cohesion: 0.5
Nodes (4): Blue-scale Histogram Bars (frequency intensity), Hold-Time Buckets (<1h, 1-6h, 6-24h, 1-3d, 3-7d, 7-14d, >14d), Trades Count Pill (72 TRADES), Duration Distribution Chart (hold-time buckets)

### Community 122 - "Community 122"
Cohesion: 0.5
Nodes (4): Diverging Red-Green Heatmap Scale (<-5% to >+5%), Year Grid (2025 full, 2026 Jan-Apr) with monthly return tiles, Period Toggle (Month / Quarter / Weekday), Seasonality Heatmap (returns by calendar period)

### Community 123 - "Community 123"
Cohesion: 0.5
Nodes (4): Cost Breakdown (Fees, Slippage, Spread, Total Costs, Avg/Trade), Cost % of Gross Return (18.58%) with Info Tooltip, Gross vs Net Return Callout (+11,705.60 vs +9,531.00 USDT), Transaction Cost Analysis Panel

### Community 124 - "Community 124"
Cohesion: 0.5
Nodes (4): Dark Hover Tooltip (date, value, % change), Series Legend (Strategy blue / Buy & hold gray), Linear / Log Scale Toggle + Expand Button, Equity Curve Chart (Strategy vs Buy & Hold)

### Community 125 - "Community 125"
Cohesion: 0.5
Nodes (4): Skew Indicator Pill (+0.34), Red-Green Diverging Histogram Bars by Return Bucket, X-Axis Range -10% to +15% (P&L buckets), Return Distribution Histogram (trade P&L %)

### Community 126 - "Community 126"
Cohesion: 0.67
Nodes (3): Strategy Export JSON Schema v1, Rationale: Exclude backtest runs & user data from export, TST: Strategy Import/Export

### Community 127 - "Community 127"
Cohesion: 0.67
Nodes (3): React Flow Note Node (type: note), Rationale: Notes ignored by backtest interpreter, PRD: Strategy Notes & Annotations

### Community 128 - "Community 128"
Cohesion: 0.67
Nodes (3): Future: multi-asset / multi-timeframe portfolios, Future: short-selling & hedging, Possible Next Iterations (Out-of-Scope)

### Community 129 - "Community 129"
Cohesion: 0.67
Nodes (3): Canvas block error/warning highlight, PRD: Visual Strategy Validation Feedback, WHY: Reduce time hunting errors in side panel

### Community 130 - "Community 130"
Cohesion: 0.67
Nodes (3): data_quality_metrics table (gap/outlier/volume), has_issues quality flag, TST: Data Quality Indicators

### Community 131 - "Community 131"
Cohesion: 0.67
Nodes (3): Month/Quarter/Weekday seasonality heatmap, Ideas backlog (sentiment, metrics, timeframes), TST: Seasonality Analysis

### Community 132 - "Community 132"
Cohesion: 0.67
Nodes (3): P&L Color Coding (green/red), Backtest Trades Table (entry/exit/P&L), TST: Backtest Results Trades Section

### Community 133 - "Community 133"
Cohesion: 0.67
Nodes (3): Note 280-character limit, Yellow sticky note cards on canvas, TST: Strategy Notes & Annotations

### Community 134 - "Community 134"
Cohesion: 0.67
Nodes (3): Backtest defaults: fee (0-5%) and slippage, Rename Settings to Profile; /settings redirects to /profile, TST: Profile Page (Settings + Usage Limits)

### Community 135 - "Community 135"
Cohesion: 0.67
Nodes (3): Docker Compose stack (frontend, api, worker, db, redis, storage), Worker uses same API image, worker-mode entrypoint, TST: Epic 0 Foundation & Environment

### Community 136 - "Community 136"
Cohesion: 0.67
Nodes (3): Essentials mode: SMA, EMA, RSI, Bollinger, MACD, localStorage palette_indicator_mode key, TST: Essentials-First Block Palette Toggle

### Community 137 - "Community 137"
Cohesion: 0.67
Nodes (3): Market Overview page, Periodic polling refresh, Real-Time Price Tickers

### Community 138 - "Community 138"
Cohesion: 0.67
Nodes (3): Tailwind CSS styling, user.theme_preference field (system/light/dark), Dark Mode (Theme Preference)

### Community 139 - "Community 139"
Cohesion: 0.67
Nodes (3): Bell icon + unread badge, Notification dropdown/panel, Test Checklist: In-App Notifications

### Community 140 - "Community 140"
Cohesion: 0.67
Nodes (3): Permanent perks (higher limits + discount), user_tier field (beta marker), Grandfathered Beta User Benefits

### Community 141 - "Community 141"
Cohesion: 0.67
Nodes (3): Indicator tooltips (SMA/EMA/RSI/MACD/BB/ATR), Logic/signal/risk block tooltips, TST: Contextual Help & Tooltips

### Community 142 - "Community 142"
Cohesion: 0.67
Nodes (3): Backtest Lifecycle Events, Structured Logging / Analytics, PRD: Backend Event Tracking for Backtest Lifecycle

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (3): Concept: Billing & Monetization, TST: Annual Subscription Discounts, TST: One-Time Credit Packs

### Community 144 - "Community 144"
Cohesion: 0.67
Nodes (3): Concept: Observability, TST: Digest Email Opt-Out Controls, TST: Structured Logging Correlation IDs

### Community 145 - "Community 145"
Cohesion: 0.67
Nodes (3): PRD: Canvas Bottom Action Bar, PRD: Strategy Canvas Nodes (TP Ladder/Yesterday Close/Max Drawdown), TST: Strategy Canvas Nodes (TP Ladder/Yesterday Close/Max Drawdown)

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (3): Audit 2026-04-19 1015, PRD Epic 1: Authentication and Accounts, PRD Epic 7: Usage Limits Transparency

### Community 147 - "Community 147"
Cohesion: 0.67
Nodes (3): Date range badge (2023-04-18 → 2026-04-17) in narrative card header, Plain-language narrative sentence summarizing backtest outcome (10,000 → 19,531 over 44 trades, 38.4% drawdown, 50.4pp vs HODL), Strategy Narrative card (equity growth, trades, max DD, buy-and-hold comparison)

### Community 148 - "Community 148"
Cohesion: 0.67
Nodes (3): Position analysis card (how long positions are held and sized), Insight footer (Short average hold favors mean-reversion. Consider tighter TP on fast exits.), 2x2 metrics grid (Avg Hold 3.2d, Longest 11.2d, Shortest 0.17d stop-out, Avg Size $2,420 at 24.2% of equity)

### Community 149 - "Community 149"
Cohesion: 0.67
Nodes (3): Narrative vs Buy-and-Hold Comparison ('underperformed by 50.4 pts'), Plain-Language Result Summary Pattern, Strategy Narrative Block (plain-language backtest summary)

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (2): Progress lessons milestones (x/4), TST: Progress Dashboard

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (2): Preserve Market Overview sentiment; remove only from backtest results, TST: Remove Sentiment from Backtest Results

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (2): Strategy Monitor (renamed from Paper Trading), Test Checklist: Rename Paper Trading to Strategy Monitor

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (2): PRD: Data Quality Indicators, TST: Data Completeness Indicators

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (1): TST: Improved Error Messages

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (0): 

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (0): 

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (0): 

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (0): 

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (1): Validate fields based on alert type.

## Ambiguous Edges - Review These
- `TST: Digest Email Opt-Out Controls` → `Concept: Observability`  [AMBIGUOUS]
  docs/tst-digest-email-opt-out-controls.md · relation: conceptually_related_to
- `TST: Improved Error Messages` → `TST: Improved Error Messages`  [AMBIGUOUS]
  docs/tst-improved-error-messages.md · relation: references

## Knowledge Gaps
- **646 isolated node(s):** `Bind a correlation ID to every request and log request completion.`, `Structured JSON logging configuration for API and worker processes.`, `Inject correlation_id from contextvars into every log event.`, `Generate a new correlation ID (UUID4 hex string).`, `Configure structlog + stdlib for JSON output to stdout.      Safe to call multip` (+641 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 150`** (2 nodes): `Progress lessons milestones (x/4)`, `TST: Progress Dashboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `Preserve Market Overview sentiment; remove only from backtest results`, `TST: Remove Sentiment from Backtest Results`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `Strategy Monitor (renamed from Paper Trading)`, `Test Checklist: Rename Paper Trading to Strategy Monitor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (2 nodes): `PRD: Data Quality Indicators`, `TST: Data Completeness Indicators`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `TST: Improved Error Messages`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `Validate fields based on alert type.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `TST: Digest Email Opt-Out Controls` and `Concept: Observability`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `TST: Improved Error Messages` and `TST: Improved Error Messages`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Candle` connect `Backtest Engine & Metrics` to `Strategy & Template Schemas`, `Billing & Subscriptions`, `Backtest API Schemas`, `Data Quality Metrics`, `Trade Explanations`, `Community 52`, `Candle Fetching Service`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `oauth_callback()` connect `Auth Frontend & Reset` to `Authentication & OAuth`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Authentication Setup Guide` connect `Authentication & OAuth` to `Auth Frontend & Reset`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 167 inferred relationships involving `User` (e.g. with `Generate a secure random token for password reset.` and `Check if the reset token is valid and not expired.      Uses constant-time compa`) actually correct?**
  _`User` has 167 INFERRED edges - model-reasoned connections that need verification._
- **Are the 160 inferred relationships involving `Candle` (e.g. with `Candle fetching service: DB cache + CryptoCompare vendor.` and `Fetch candles from DB, fill gaps from vendor, return sorted list.     When force`) actually correct?**
  _`Candle` has 160 INFERRED edges - model-reasoned connections that need verification._