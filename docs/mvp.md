# Blockbuilders – MVP Specification (`mvp.md`)

## 1. Product Overview

**Status**

Shipped (MVP baseline). Do not edit except for errata.

**One-line pitch**

Blockbuilders is a **web-based, no-code strategy lab** where retail crypto traders can visually build, backtest, and iterate on trading ideas **without writing code**.

**Core promise**

> A non-technical trader can visually build a simple strategy for a major crypto pair, run a trustworthy backtest in under a minute, and see clear results that help them decide whether to keep exploring.

Simplicity is the primary design principle. Every feature, architecture choice, and UI element must be justified against this question:

> “Does this make it **easier** for a non-technical trader to try, understand, and iterate on a strategy?”

If not, it doesn’t belong in the MVP.

---

## 2. Target Users & Use Cases

### 2.1. Primary user: Retail crypto tinkerer

- Retail trader, not a professional quant.
- Has basic understanding of indicators (e.g. RSI, MA) but **no coding skills**.
- Wants to:
  - Explore ideas like “RSI oversold + MA trend filter.”
  - Quickly see “would this have worked historically?”
  - Compare a few variations of a strategy over time.

### 2.2. Secondary (future) users

- Educators / community leaders who may share pre-built strategies with their followers.
- More advanced users looking for a friendlier prototyping environment.

For the **MVP**, the **single-player retail tinkerer** is the design driver.  
Educators and advanced features are **Phase 2+**.

---

## 3. MVP Scope

### 3.1. In-scope (MVP)

1. **Strategy Canvas (Visual Builder)**
   - Visual, block-based interface.
   - Constrained model:
     - **Single asset per strategy** (e.g. BTC/USDT).
     - **Single timeframe per strategy** (e.g. 1h candles).
   - Initial block palette:
     - **Inputs**: Price (OHLCV), Volume.
     - **Indicators** (approx. 5–8):
       - Moving Average (SMA), Exponential Moving Average (EMA)
       - RSI
       - MACD
       - Bollinger Bands
       - ATR (optional)
     - **Logic / Signal blocks**:
       - Comparisons: `>`, `<`, `>=`, `<=`
       - Crossovers: e.g. “Price crosses above MA”
       - Boolean: AND, OR, NOT
     - **Position & risk blocks**:
       - Fixed position size (e.g. % of virtual balance).
       - Simple risk limits:
         - Take Profit (TP)
         - Stop Loss (SL)
   - User actions:
     - Create, edit, duplicate strategy.
     - Validate strategy (basic sanity checks).
     - Save strategy and its versions.

2. **Backtesting**
   - Run backtest for a strategy over a chosen period (e.g. last 1–3 years).
   - Based on **OHLCV candles only**, no order book / tick simulation.
   - Supported at launch:
     - 1–2 timeframes (e.g. 1h, 4h).
     - Limited set of popular pairs (e.g. BTC/USDT, ETH/USDT, +3–5 more).
   - Execution assumptions (transparent & conservative):
     - Use candle data as the underlying price stream.
     - Fee model: fixed taker fee (e.g. 0.1%, user-adjustable within sensible bounds).
     - Slippage model: simple configurable “extra cost” per trade.
   - Non-functional:
     - Target: **1 year of hourly data** backtest completes in **≤30 seconds** under typical load.
   - Results:
     - Equity curve over time.
     - Key metrics:
       - Total return, annualized return (CAGR)
       - Max drawdown
       - Number of trades
       - Win rate
       - Average R-multiple / risk-reward (optional)
     - Trade list (simplified):
       - Entry time/price, exit time/price
       - P&L per trade

3. **Strategy & Result History**
   - Per-user:
     - List of strategies with:
       - Name, asset, timeframe, last modified date.
     - List of backtests:
       - Strategy, run date, period, summary metrics.
   - Ability to:
     - Open past run and view details.
     - Re-run a backtest with updated data (refresh).

4. **Basic “Paper Trading” via Scheduled Re-Backtests**
   - Instead of streaming live simulation:
     - User can enable a **schedule** on a saved strategy:
       - Example: “Re-run this strategy daily on the latest data.”
     - System:
       - Periodically fetches new candles.
       - Re-runs backtest for latest period.
       - Updates equity curve and metrics.
   - Notification (MVP level):
     - In-app indication that latest run is newer than the one the user last saw.
     - Email notifications can be deferred or kept minimal (e.g. optional simple alerts).

5. **Authentication & Accounts**
   - Standard email/password login.
   - Session-based or JWT-based auth.
   - Each user’s strategies and results are private.

6. **Soft Usage Limits**
   - Minimal, “beta-friendly” constraints, e.g.:
     - Max strategies per user (e.g. 10).
     - Max backtests per day (e.g. 50).
   - Limits can be adjusted manually in the backend (no complex billing logic initially).

---

## 4. Out-of-Scope (for MVP)

These are explicitly **not** part of the MVP and will be considered in later phases:

1. **True Continuous Paper Trading**
   - No tick-by-tick or order-by-order live simulation connected to real-time price feeds.
   - No complex order routing, streaming websockets, or real-time PnL updates.

2. **Multi-Asset & Multi-Timeframe Strategies**
   - No strategies that:
     - Trade multiple assets simultaneously.
     - Use more than one timeframe within a single strategy.
   - No portfolio-level optimization or allocation logic in MVP.

3. **Strategy Marketplace & Monetization for Educators**
   - No built-in revenue sharing, marketplace listing, or white-label flows.
   - No complex sharing permissions beyond simple link-based, read-only sharing (if included).

4. **Complex Pricing & Billing**
   - No multi-tier metered billing, complex usage-based pricing, or multiple plans.
   - If payment exists at all: **single simple plan**, or **invite-only free beta**.

5. **Microservices & Heavy Cloud-Native Stack**
   - No Kubernetes/ECS, no microservice splitting of auth, backtest service, analytics, etc.
   - No gRPC unless needed much later.

6. **Ultra-Complex Analytics & Reporting**
   - No factor attribution, risk parity, multi-currency accounting, etc.
   - Only essential metrics and charts.

---

## 5. Functional Requirements (MVP)

### 5.1. Strategy Canvas

- **Create** a new strategy:
  - Choose asset & timeframe.
  - Start from blank or from a small set of templates (optional).
- **Edit** strategy via drag-and-drop:
  - Add indicators and logic blocks.
  - Connect blocks in a linear or simple branching fashion.
- **Validate** strategy:
  - Check required fields are set.
  - Detect obvious errors (e.g. unconnected blocks, missing signals).
- **Save & version**:
  - Each save creates a new version with timestamp.
  - Show basic version history (latest first).

### 5.2. Backtest Flow

- From a strategy:
  - Select date range (with safe defaults, e.g. “Last 1 year”).
  - Press “Run backtest”.
- System:
  - Validates the strategy.
  - Enqueues a job.
  - Returns a **run ID** and status.
- User:
  - Sees status: `Pending → Running → Completed / Failed`.
  - On completion, can open detailed results.

### 5.3. Backtest Results UI

- **Overview card**:
  - Main metrics (CAGR, max drawdown, total return, # trades, win rate).
- **Equity curve chart**:
  - Time vs equity.
- **Drawdown chart** (optional but strongly desirable if simple).
- **Trades table**:
  - Entry time, entry price.
  - Exit time, exit price.
  - P&L per trade, side (long/short if applicable).

### 5.4. Scheduled Re-Backtests

- For each strategy, user can toggle:
  - “Auto-update daily” (or hourly, depending on infra comfort).
- System:
  - Uses a background worker schedule to:
    - Fetch latest candles for relevant pairs.
    - Run backtests for enabled strategies.
    - Update the “latest run” record per strategy.
- UI:
  - Strategy list shows last run timestamp and key metrics.
  - Optional simple tag: “Updated today” / “Needs update”.

---

## 6. Non-Functional Requirements

1. **Performance**
   - 1 year of hourly candles backtest: <= 30 seconds for typical strategies.
   - API endpoints for regular CRUD should respond in <200–300 ms under typical conditions.

2. **Reliability**
   - Backtests must either:
     - Complete successfully and persist results, or
     - Fail clearly with an error message; no partial/ambiguous results.
   - Jobs should be idempotent where reasonable (retries safe).

3. **Transparency**
   - Execution assumptions (fees, slippage, OHLCV granularity) are clearly documented in the UI.
   - Users must understand that this is a **simulation**, not a guarantee.

4. **Simplicity in Operations**
   - One backend deployable unit (API + worker image).
   - No dependency on Kubernetes or similar complex orchestration for MVP.
   - Logs and basic health checks sufficient to debug most failures.

---

## 7. Technical Architecture (MVP)

### 7.1. High-Level Architecture

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind.
- **Backend**: FastAPI monolith (Python).
- **Worker**: Same codebase as backend in “worker mode” (handles backtest jobs and schedules).
- **Database**: Postgres (Supabase or managed Postgres).
- **Cache / Queue**: Redis.
- **Object Storage**: S3-compatible bucket.

#### Data flow (simplified)

1. User builds strategy in frontend → saves via REST API (FastAPI) → Postgres.
2. User triggers backtest → backend enqueues job in Redis → worker consumes job.
3. Worker:
   - Fetches historical price data (from DB or vendor + cache).
   - Runs backtest, computes metrics.
   - Stores summary in Postgres + full results (curve, trades) in object storage.
4. Frontend polls or refetches run status & results via API.

---

### 7.2. Frontend (Next.js)

- **Tech stack**
  - Next.js (latest stable with App Router).
  - TypeScript.
  - Tailwind CSS for styling.
- **Deployment**
  - Vercel (or equivalent) for easy, zero-devops deployment.
- **Responsibilities**
  - Strategy canvas UI:
    - Visual block builder.
    - Simple validation messages.
  - Authentication:
    - Login/signup forms, token management.
  - Results visualization:
    - Equity curve chart.
    - Tables for metrics and trades.
  - Strategy & run list views.

---

### 7.3. Backend (FastAPI Monolith)

- **Modules (folders/namespaces)**:
  - `auth`: Login, signup, token verification.
  - `users`: Profile & simple settings (e.g. default fee rate).
  - `strategies`: CRUD, versioning.
  - `backtests`: Create run, get status, list runs.
  - `jobs`: Queue integration (enqueue, status fetch).
  - `data`: Price data access (candles) + external vendor integration.
- **Deployment**
  - Single Docker image with:
    - FastAPI app (served by Uvicorn / Gunicorn).
    - Configuration toggling worker mode vs API mode via env var.
  - Deployed to a simple platform:
    - Render, Railway, Fly.io, or a single VPS with Docker Compose.

---

### 7.4. Worker & Scheduling

- **Queue system**
  - Candidate: RQ, Celery, or Dramatiq (any simple Redis-backed queue).
- **Responsibilities**
  - Consume backtest jobs and execute backtesting engine.
  - Persist results.
  - Execute schedule:
    - Periodically scan strategies with auto-update enabled.
    - Enqueue batch backtests for them.

---

### 7.5. Data Layer

1. **Postgres**
   - Tables:
     - `users`
     - `strategies`
     - `strategy_versions`
     - `backtest_runs` (id, user_id, strategy_version_id, status, summary metrics, storage key)
     - `usage_limits` (optional)
     - `candles` (if storing locally: asset, timeframe, timestamp, open/high/low/close, volume)
   - Use Supabase or similar for:
     - Managed Postgres.
     - Optional built-in auth if desired.

2. **Redis**
   - Job queue backend.
   - Caching historical candles for popular pairs/timeframes.

3. **Object Storage (S3-compatible)**
   - Store:
     - Equity curve data.
     - Detailed trade logs per run.
   - Backend only stores references/keys in Postgres.

4. **Market Data Strategy**
   - MVP:
     - Fetch OHLCV from a vendor API for supported pairs/timeframes.
     - Cache results locally (Redis and/or Postgres `candles` table).
   - No heavy ingestion pipeline or tick data.

---

## 8. Roadmap (High-Level)

### Phase 0 – Internal Prototype

- Very minimal:
  - Hardcoded user or simple login.
  - One asset/timeframe.
  - A few indicators.
- Goal: validate:
  - Canvas UX feels intuitive.
  - Backtest engine correctness & performance.

### Phase 1 – MVP / Closed Beta

- Features as defined in this `mvp.md`:
  - Full auth.
  - Strategy management.
  - Backtests + basic scheduling.
- Small, invited group of users.
- Manual or extremely simple usage limits.
- This is the “Blockbuilders v1” as defined here.

### Phase 2 – Post-MVP Enhancements

Potential directions (evaluated based on user feedback):

- **Product**
  - Multi-timeframe strategies.
  - More indicators & risk blocks.
  - Improved analytics (drawdown analysis, trade tagging).
- **Operations**
  - Introduce payments (single plan → multiple plans).
  - More robust alerts (email, perhaps Telegram/Discord bots).
- **Community**
  - Link-based sharing of strategies.
  - Educator-friendly features (templates, read-only sharing).
- **Architecture (only if truly needed)**
  - Gradual extraction into separate services.
  - More sophisticated data infra (e.g. dedicated time-series DB).

---

## 9. Simplicity Principles (Design Guardrails)

To keep the project aligned with the original intent:

1. **Limit initial options.**  
   Fewer assets, fewer timeframes, fewer indicators – but polished.

2. **Prefer one simple system over three complex ones.**  
   - Monolith over microservices.
   - Single queue over multiple job systems.
   - One DB type over polyglot persistence (at least for MVP).

3. **Make trade-offs explicit.**  
   - Use OHLCV instead of tick data.
   - Use conservative assumptions instead of overly complex models.

4. **Ship small, learn fast.**  
   - Prioritize getting real users on the simplest end-to-end flow:
     - Build → Backtest → Inspect → Tweak.

5. **Every feature must earn its place.**  
   If a feature:
   - Confuses non-technical users, or
   - Adds a lot of complexity for marginal value,  
   it should be postponed.

---

This document (`mvp.md`) defines the **first real version of Blockbuilders** you aim to ship: small, focused, and realistic – but still modern, honest, and genuinely useful for your target retail trad

