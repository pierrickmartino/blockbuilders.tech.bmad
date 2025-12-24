# PRD – Backtesting Engine & Runs (Epic 4)

File: `prd.backtesting_engine_and_runs.md`  
Epic: 4 – Backtesting Engine & Runs

---

## 1. Purpose & Scope

The goal of this PRD is to define the simplest possible backtesting system that:

- Takes a saved strategy (single asset, single timeframe).
- Runs a historical backtest on OHLCV candles.
- Stores summary + detailed results.
- Exposes a minimal API for creating runs and checking their status.

This PRD covers backend + worker behaviour for **creating, executing, and persisting backtest runs** (Epic 4: S4.1–S4.4). It does **not** cover UI details for charts or history pages (those are part of Epic 5).

---

## 2. Constraints & Key Principles

From the MVP spec:

- **Single asset per strategy** (e.g. `BTC/USDT`).
- **Single timeframe per strategy** (e.g. `1h`, `4h`).
- **OHLCV candles only**, no tick data.
- Limited initial set of pairs and timeframes.
- Simple fee and slippage model.
- Backtest for **1 year of hourly candles** should complete in **≤ 30 seconds** under typical load.
- System must be **transparent**: assumptions are clear and conservative.
- System must be **simple**: monolith backend + worker, Redis queue, Postgres & S3-like storage.

Backtests are **simulations only**, not investment advice.

---

## 3. Actors & High-Level Flow

### 3.1 Actors

- **End user** – creates strategies and triggers backtests via frontend.
- **API server (FastAPI)** – validates requests, writes `backtest_runs` records, enqueues jobs.
- **Worker** – consumes jobs, fetches candles, executes backtests, writes results.
- **Data vendor** – external OHLCV data source.

### 3.2 High-Level Flow

1. User clicks “Run backtest” on a strategy.
2. Frontend calls **POST `/backtests/`** with strategy and date range.
3. API:
   - Validates the strategy and parameters.
   - Creates a `backtest_runs` row with `status = "pending"`.
   - Pushes a job into the Redis-backed queue with `run_id`.
4. Worker:
   - Loads run config from DB.
   - Fetches required OHLCV candles (from DB/cache or vendor).
   - Executes backtest on candle stream.
   - Stores:
     - Summary metrics into `backtest_runs`.
     - Equity curve & trade list into object storage.
   - Marks run `status = "completed"` or `status = "failed"` with an error message.
5. Frontend polls **GET `/backtests/{run_id}`** to show status and summary.

---

## 4. Functional Requirements

### 4.1 Create a Backtest Run (S4.1)

**User story**  
As a user, I want to run a backtest for a given strategy and date range, so that I can see how it would have performed.

#### Endpoint: POST `/backtests/`

**Request body (JSON)**

- `strategy_id` (UUID or int) – required.
- `date_from` (ISO datetime, UTC) – required.
- `date_to` (ISO datetime, UTC) – required, must be > `date_from`.
- Optional overrides:
  - `fee_rate` (float, e.g. 0.001 for 0.1%).
  - `slippage_rate` (float, e.g. 0.0005 for 0.05%).

Fee & slippage default to **user settings** or global defaults if not supplied.

**Validation rules**

- User must be authenticated.
- `strategy_id` must:
  - Exist.
  - Belong to the current user.
  - Have at least one valid saved version (use latest version by default).
- Strategy must respect MVP constraints:
  - Single asset.
  - Single timeframe.
  - Long-only (MVP).
- `date_from` and `date_to` must fall within the range for which candles can reasonably be fetched (e.g. not older than max vendor history).
- Enforce any soft usage limits (e.g. backtests/day).

If validation fails, API returns **400** with a simple, human-readable error.

**Side effects**

- Insert into `backtest_runs` table:

  Minimal schema (simplified):

  - `id` – primary key (`run_id`).
  - `user_id`
  - `strategy_id`
  - `strategy_version_id`
  - `asset` (string, e.g. `"BTC/USDT"`)
  - `timeframe` (string, e.g. `"1h"`)
  - `date_from`, `date_to`
  - `fee_rate`, `slippage_rate`
  - `status` – `"pending" | "running" | "completed" | "failed"`
  - `summary` (JSON, nullable for pending/running)
  - `equity_curve_key` (string, nullable)
  - `trades_key` (string, nullable)
  - `error_message` (string, nullable)
  - `created_at`, `updated_at`

- Enqueue job on Redis-backed queue with at least:
  - `run_id`
  - `user_id` (for sanity checks/logging).

**Response (201)**

```json
{
  "run_id": "<id>",
  "status": "pending"
}
```

If queue enqueue fails, mark run as `status = "failed"` with `error_message` and return 500 + simple error.

---

### 4.2 Fetch Historical OHLCV Data (S4.2)

**User story**  
As a backtest engine, I need to fetch and cache OHLCV candles for supported pairs and timeframes, so that runs are fast and consistent.

This is entirely backend/worker behaviour; no direct public endpoint required.

#### Requirements

- **Supported assets & timeframes** are configured (e.g. in env or DB), and limited for MVP:
  - Assets: at least `BTC/USDT`, `ETH/USDT` (plus 3–5 more later).
  - Timeframes: `1h`, `4h`.
- Data is stored in `candles` table **and/or** Redis cache:

  Minimum fields per candle:

  - `asset`
  - `timeframe`
  - `timestamp` (UTC, start of candle)
  - `open`, `high`, `low`, `close`
  - `volume`

- Worker behaviour for required period `[date_from, date_to]`:

  1. Check local DB/cache for candles covering the period.
  2. For missing ranges, call vendor API in the simplest chunks possible.
  3. Insert fetched candles into DB and/or cache.
  4. Return candles to the backtest engine sorted by timestamp ascending.

- **Gaps handling** (simple rule):
  - If gaps are small (e.g. one or two missing candles), skip missing bars (no synthetic candles).
  - If gaps are large (configurable threshold), abort run with `status = "failed"` and a user-facing message like  
    `"Missing price data for 2024-05-01 to 2024-05-05. Please try a shorter period."`

- **Vendor errors**:
  - On vendor failure, mark run as `failed` with `"Data provider unavailable"` and log details for ops.

---

### 4.3 Execute Backtest & Store Results (S4.3)

**User story**  
As a user, I want the system to reliably execute my backtest and store the results, so that I can reopen them later without rerunning immediately.

#### Worker lifecycle for a run

1. Load `backtest_runs` row by `run_id`.
2. If `status` is not `"pending"` → log and exit (idempotency).
3. Set `status = "running"`.
4. Load strategy JSON definition for `strategy_version_id`.
5. Fetch candles (Section 4.2).
6. Build engine config:
   - Initial balance (e.g. fixed, like 10,000 USDT).
   - Fee rate & slippage rate.
   - Position sizing and risk parameters from strategy (fixed size % of equity, TP, SL).
7. Run the engine over candles.
8. Compute summary metrics.
9. Persist detailed results to object storage.
10. Update `backtest_runs` with summary + storage keys and set `status = "completed"`.

If any step fails, set `status = "failed"` with `error_message`.

#### Backtest execution model (simplified)

- **Signals:**
  - Strategy canvas produces:
    - `entry_long` signal (boolean series).
    - `exit_long` signal (boolean series).
  - No shorting in MVP.

- **Order model (simple, deterministic):**
  - When **flat** and `entry_long` is `true` on candle *i*:
    - Open a long position at candle *i+1 open* (or the same candle’s close – pick one simple convention and apply consistently).
  - When **in a long position**:
    - Apply TP/SL on candle movement:
      - If `high` hits TP price → exit at TP.
      - Else if `low` hits SL price → exit at SL.
      - Else if `exit_long` is `true` → exit at candle close.
  - Only one position at a time (no pyramiding).

- **Fees & slippage:**
  - Apply fee rate and slippage rate on **both entry and exit**:
    - Effective fill price = market price × (1 ± slippage) ± fees (simplified).
  - Values come from:
    - Overrides in request, or
    - User defaults, or
    - Global defaults.

- **Equity & PnL:**
  - Track:
    - Equity time series (per candle).
    - Per-trade PnL in quote currency.
  - No multi-currency FX adjustments in MVP.

#### Stored outputs

1. **Summary metrics** (in DB, `backtest_runs.summary` JSON):

   Minimum keys:

   - `initial_balance`
   - `final_balance`
   - `total_return_pct`
   - `cagr_pct`
   - `max_drawdown_pct`
   - `num_trades`
   - `win_rate_pct`
   - (Optional) `avg_r_multiple`

2. **Equity curve** (JSON in object storage):

   Simple array of:

   ```json
   [
     { "timestamp": "2024-01-01T00:00:00Z", "equity": 10000.0 },
     ...
   ]
   ```

3. **Trades list** (JSON in object storage):

   Simple array of:

   ```json
   [
     {
       "entry_time": "2024-02-01T12:00:00Z",
       "entry_price": 43000.0,
       "exit_time": "2024-02-02T08:00:00Z",
       "exit_price": 44000.0,
       "side": "long",
       "pnl": 150.25
     }
   ]
   ```

4. **Backtest_runs record update:**

   - `summary` = summary JSON.
   - `equity_curve_key` = storage key for curve file.
   - `trades_key` = storage key for trades file.
   - `status = "completed"`.

---

### 4.4 Backtest Status & Error Handling (S4.4)

**User story**  
As a user, I want to see whether my backtest is pending, running, completed, or failed, so that I know what’s happening.

#### Endpoint: GET `/backtests/{run_id}`

**Response (200)**

```json
{
  "run_id": "<id>",
  "strategy_id": "<strategy-id>",
  "status": "pending | running | completed | failed",
  "asset": "BTC/USDT",
  "timeframe": "1h",
  "date_from": "2024-01-01T00:00:00Z",
  "date_to": "2024-12-31T23:00:00Z",
  "summary": {
    "initial_balance": 10000,
    "final_balance": 11200,
    "total_return_pct": 12.0,
    "cagr_pct": 11.4,
    "max_drawdown_pct": -8.5,
    "num_trades": 42,
    "win_rate_pct": 57.1
  },
  "error_message": null
}
```

- For `status = "pending" | "running"`, `summary` may be `null`.
- For `status = "failed"`, `error_message` is a short, user-facing string.
- Endpoint must ensure the requesting user **owns** the run.

#### Errors

- `404` if `run_id` not found or not owned by the user.
- No stack traces or internal details leaked; just simple messages like:
  - `"Backtest failed due to invalid strategy configuration."`
  - `"Backtest failed due to missing market data."`

---

## 5. Non-Functional Requirements

Pulled from MVP spec and scoped specifically to backtests.

### 5.1 Performance

- Backtesting **1 year of hourly candles** on a typical strategy must complete in **≤ 30 seconds** under normal load.
- Candle fetching:
  - Cache aggressively to avoid repeated vendor calls for the same asset/timeframe/date ranges.
- API CRUD endpoints (e.g. POST /backtests, GET /backtests/{id}) target < 200–300 ms response time.

### 5.2 Reliability & Idempotency

- Each run:
  - Either **completes successfully and persists summary + details**, or
  - Fails with a clear error and `status = "failed"`.
- Worker must treat runs with `status != "pending"` as **no-ops** to avoid double-processing.
- Queued jobs must be retry-safe (no duplicate trades or duplicate runs).

### 5.3 Transparency

- All key assumptions are documented and available to the UI layer:
  - OHLCV-based execution.
  - Fee and slippage model (fixed percentage).
  - Single-asset, single-timeframe, long-only constraint.
- `summary` object should be simple enough to display assumptions or link to them.

### 5.4 Simplicity of Operations

- No microservices: **single backend image** that can run in API mode or worker mode via env flag.
- Redis is the only queue backend.
- One relational DB (Postgres), one object storage (S3-compatible).

---

## 6. Out of Scope (for This PRD)

These are explicitly **not** part of this Epic, even if mentioned elsewhere:

- Continuous, tick-level paper trading.
- Multi-asset, multi-timeframe portfolios.
- Complex order types (OCO, trailing stops, etc.).
- Advanced analytics (factor attribution, etc.).
- Any billing or quota enforcement beyond simple soft limits.

All of these remain out of scope for Epic 4 as per MVP spec.

---

## 7. Acceptance Criteria (Epic 4)

1. A logged-in user can trigger a backtest for a saved strategy and receive a `run_id`.
2. A worker process picks up the job, fetches historical candles, and executes the backtest according to the defined simple rules.
3. For valid strategies and available data:
   - Runs complete.
   - `backtest_runs` row is populated with summary metrics and storage keys.
   - Status is `"completed"`.
4. For invalid strategies or missing data:
   - Status becomes `"failed"`.
   - `error_message` is informative enough for a non-technical user.
5. Frontend (Epic 5) can:
   - Poll `/backtests/{run_id}` and see status transitions: `pending → running → completed/failed`.
   - Read summary metrics without needing to re-run the backtest.

If all criteria are met, Epic 4 – Backtesting Engine & Runs is considered implemented for the MVP.
