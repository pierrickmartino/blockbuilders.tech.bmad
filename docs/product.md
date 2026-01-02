# Blockbuilders – Product Documentation

**Status:** Current Product Truth
**Last Updated:** 2026-01-01
**Purpose:** Comprehensive documentation of all implemented features

---

## 1. Overview

Blockbuilders is a **web-based, no-code strategy lab** where retail crypto traders can visually build, backtest, and iterate on trading strategies without writing code.

**Current State:** Fully functional MVP with post-MVP enhancements (OAuth, scheduled updates, advanced risk management, strategy building wizard, in-app notifications).

**Architecture:**
- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) monolith
- **Database:** PostgreSQL
- **Queue:** Redis + RQ
- **Storage:** MinIO (S3-compatible)
- **Deployment:** Docker Compose

---

## 2. Authentication & Account Management

### 2.1. Email/Password Authentication

**Sign Up** (`POST /auth/signup`)
- Create account with email + password
- Password hashing with bcrypt
- Returns JWT token (7-day expiration)

**Login** (`POST /auth/login`)
- Email + password validation
- JWT token generation (HS256 algorithm)
- Token stored client-side for API authentication

**Password Reset Flow**
- Request reset: `POST /auth/password-reset-request`
  - Sends reset email via Resend API
  - Token expires in 1 hour (configurable)
- Confirm reset: `POST /auth/password-reset-confirm`
  - Validates token and sets new password

### 2.2. OAuth Integration

**Providers Supported:**
- Google OAuth (`/auth/oauth/google/start`)
- GitHub OAuth (`/auth/oauth/github/start`)

**OAuth Flow:**
1. User clicks "Continue with Google/GitHub"
2. Redirected to provider for authorization
3. Callback handler processes token
4. User lookup by provider ID (prevents account takeover)
5. New user created if email not found
6. JWT token returned to frontend

**Security:**
- OAuth state stored in Redis (10-minute TTL)
- State parameter validation on callback

### 2.3. User Profile & Settings

**Profile Management** (`GET/PUT /users/me`)
- Email display (read-only)
- Default backtest settings:
  - Fee rate (default 0.1%)
  - Slippage rate (default 0.05%)
- Display preferences:
  - Timezone (local or UTC)
  - Applied to all timestamps in UI

**User Model Fields:**
- id, email, password_hash (nullable for OAuth)
- default_fee_percent, default_slippage_percent
- timezone_preference (enum: local/utc)
- auth_provider, provider_user_id (OAuth fields)
- reset_token, reset_token_expires_at
- max_strategies, max_backtests_per_day
- created_at, updated_at

**Implementation:** `backend/app/models/user.py`, `backend/app/api/auth.py`

---

## 3. Strategy Management

### 3.1. Strategy CRUD Operations

**Create Strategy** (`POST /strategies`)
- Required: name, asset, timeframe
- Optional: is_archived, auto_update settings
- Returns strategy with generated UUID

**List Strategies** (`GET /strategies`)
- Query parameters:
  - `search`: filter by name (case-insensitive)
  - `include_archived`: show archived strategies (default: false)
- Returns array of strategies with latest run metrics

**Get Strategy** (`GET /strategies/{id}`)
- Returns full strategy metadata
- Includes latest version definition

**Update Strategy** (`PATCH /strategies/{id}`)
- Editable fields: name, asset, timeframe, archive status, auto_update settings
- Partial updates supported

**Duplicate Strategy** (`POST /strategies/{id}/duplicate`)
- Creates new strategy with latest version definition
- Appends " (Copy)" to name

**Delete Strategy** (`DELETE /strategies/{id}`)
- Soft delete (sets is_archived=true)
- Preserves all versions and backtest history

### 3.2. Strategy Versioning

**Save Version** (`POST /strategies/{id}/versions`)
- Stores complete block definition as JSON
- Auto-increments version_number
- Versions are immutable (read-only after creation)

**List Versions** (`GET /strategies/{id}/versions`)
- Ordered by version_number descending
- Includes creation timestamps

**Get Version** (`GET /strategies/{id}/versions/{version_number}`)
- Returns full definition_json
- Used for backtest execution

**Version Model:**
- id, strategy_id, version_number (unique per strategy)
- definition_json (PostgreSQL JSON type)
- created_at

### 3.3. Strategy Validation

**Validate Endpoint** (`POST /strategies/{id}/validate`)
- Validates definition without saving
- Returns errors or success status

**Validation Rules:**
- Must have **at least one** entry_signal block
- Must have **at least one** exit condition block (exit_signal, time_exit, trailing_stop, stop_loss, take_profit, max_drawdown)
- Entry/exit signals must have input connections
- At most one of each risk/exit block (position_size, take_profit, stop_loss, trailing_stop, time_exit, max_drawdown)
- All connections reference existing blocks
- Block parameter ranges:
  - SMA/EMA period: 1-500
  - RSI period: 2-100
  - MACD fast: 1-50, slow: 1-200, signal: 1-50
  - Position size: 1-100%
  - Stop loss: 0.1-100%
  - Take profit levels: 1-3, profit_pct ascending, close_pct total ≤100%

**Implementation:** `backend/app/api/strategies.py`, `backend/app/backtest/interpreter.py`

### 3.4. Supported Assets & Timeframes

**Assets:**
- BTC/USDT
- ETH/USDT
- ADA/USDT
- SOL/USDT
- MATIC/USDT
- LINK/USDT
- DOT/USDT
- XRP/USDT
- DOGE/USDT
- AVAX/USDT
- LTC/USDT
- BCH/USDT
- ATOM/USDT
- NEAR/USDT
- FIL/USDT
- APT/USDT
- OP/USDT
- ARB/USDT
- INJ/USDT
- UNI/USDT
- AAVE/USDT
- SUI/USDT
- SEI/USDT
- TIA/USDT

**Notes:**
- This is a curated list targeting the top 20–30 assets.
- Additional pairs are added based on user requests and data vendor availability/cost.

**Timeframes:**
- 4h (4-hour)
- 1d (daily)

**Note:** Each strategy supports **one asset** and **one timeframe** only (MVP constraint).

**Implementation Notes:**
- Asset selection UI uses HTML5 datalist for search/filter functionality
- All assets validated against ALLOWED_ASSETS constant (backend: `app/schemas/strategy.py`, frontend: `types/strategy.ts`)
- CryptoCompare API dynamically supports all listed pairs
- No database schema changes required (asset stored as string)

### 3.5. Strategy Import/Export (Planned)

**Purpose:** Allow users to export a strategy as a JSON file and import it later to create a new strategy. This supports backup, sharing outside the platform, and account migration.

**Planned Behavior:**
- Export downloads a JSON file containing strategy metadata + latest definition JSON.
- Import accepts a JSON file, validates it, and creates a new strategy + version.
- Imported strategies always create a new record (never overwrite).

---

## 4. Visual Strategy Builder

### 4.1. Canvas Architecture

**Technology:**
- React Flow (XyFlow) for visual editing
- Drag-and-drop block placement
- Connection-based signal flow
- Mobile-responsive with drawer UI

**Components:**
- `StrategyCanvas`: Main visual editor (`frontend/src/components/canvas/StrategyCanvas.tsx`)
- `BlockPalette`: Draggable block library
- `PropertiesPanel`: Parameter editing for selected block
- `StrategyTabs`: Version switcher and metadata editor

### 4.2. Block Types (20 Total)

#### Input Blocks (4)

**Price** (`price`)
- Outputs OHLCV price array
- Parameter: source (open, high, low, close)

**Volume** (`volume`)
- Outputs volume array
- No parameters

**Constant** (`constant`)
- Outputs fixed numeric value
- Parameter: value (-1,000,000 to 1,000,000)

**Yesterday Close** (`yesterday_close`)
- Outputs previous candle's close price
- No parameters

#### Indicator Blocks (6)

**SMA** (`sma`)
- Simple Moving Average
- Parameters: period (1-500)
- Input: price array
- Output: SMA array

**EMA** (`ema`)
- Exponential Moving Average
- Parameters: period (1-500)
- Input: price array
- Output: EMA array

**RSI** (`rsi`)
- Relative Strength Index
- Parameters: period (2-100)
- Input: price array
- Output: RSI array (0-100 range)

**MACD** (`macd`)
- Moving Average Convergence Divergence
- Parameters: fast (1-50), slow (1-200), signal (1-50)
- Input: price array
- Outputs: macd_line, signal_line, histogram

**Bollinger Bands** (`bbands`)
- Parameters: period (1-500), stddev_multiplier
- Input: price array
- Outputs: upper, middle, lower bands

**ATR** (`atr`)
- Average True Range
- Parameters: period (1-500)
- Input: price array
- Output: ATR array

#### Logic Blocks (5)

**Compare** (`compare`)
- Comparison operators: >, <, >=, <=
- Inputs: two numeric arrays
- Output: boolean array

**Crossover** (`crossover`)
- Direction: crosses_above, crosses_below
- Inputs: two numeric arrays
- Output: boolean array (true on crossover candle)

**AND** (`and`)
- Logical AND
- Inputs: two boolean arrays
- Output: boolean array

**OR** (`or`)
- Logical OR
- Inputs: two boolean arrays
- Output: boolean array

**NOT** (`not`)
- Logical negation
- Input: boolean array
- Output: inverted boolean array

#### Signal Blocks (2)

**Entry Signal** (`entry_signal`)
- Defines entry conditions
- Input: boolean array
- At least one required for valid strategy (multiple allowed)

**Exit Signal** (`exit_signal`)
- Defines exit conditions
- Input: boolean array
- Optional (multiple allowed when combined with other exit conditions)

#### Exit Rule Blocks (2)

**Time Exit** (`time_exit`)
- Exits after N candles in a position
- Parameter: bars (integer, >= 1)

**Trailing Stop** (`trailing_stop`)
- Exits when price falls by a trailing percentage from the highest close since entry
- Parameter: trail_pct (0.1–100%)

#### Risk Management Blocks (4)

**Position Size** (`position_size`)
- Type: percentage_of_equity
- Parameter: percentage (1-100%)
- Determines trade size as % of current equity

**Take Profit** (`take_profit`)
- Ladder system with 1-3 levels
- Each level:
  - profit_pct: profit threshold (must be ascending)
  - close_pct: % of position to close (1-100%, total ≤100%)
- Example: [{"profit_pct": 2, "close_pct": 50}, {"profit_pct": 5, "close_pct": 50}]

**Stop Loss** (`stop_loss`)
- Parameter: percentage (0.1-100%)
- Closes position if loss exceeds threshold

**Max Drawdown** (`max_drawdown`)
- Parameter: percentage (0.1-100%)
- Portfolio-level circuit breaker
- Stops all trading if equity drawdown exceeds threshold

### 4.3. Block Definition Format

**JSON Structure:**
```json
{
  "blocks": [
    {
      "id": "block_uuid",
      "type": "sma",
      "params": {"period": 20}
    }
  ],
  "connections": [
    {
      "from": {
        "block_id": "block_uuid",
        "port": "output_name"
      },
      "to": {
        "block_id": "target_uuid",
        "port": "input_name"
      }
    }
  ]
}
```

**Implementation:** `frontend/src/types/canvas.ts`, `backend/app/backtest/interpreter.py`

### 4.4. Strategy Building Wizard (Beginner Flow)

**Purpose:** Guided, front-end-only wizard that asks simple questions and generates a starter strategy definition JSON. The generated strategy opens on the canvas and is fully editable.

**Entry Points:**
- Strategy list empty state (“Create with wizard”)
- New strategy modal (“Use wizard”)

**Wizard Characteristics:**
- 4–6 questions max, single-column layout
- Copy explains in plain language (no trading jargon when possible)
- Uses existing block types (no new backend fields)
- Produces the same definition JSON used by the canvas

**Implementation Notes:**
- Generates blocks + connections locally in the frontend
- Uses existing canvas utilities for JSON conversion where possible
- No API changes required

### 4.5. Contextual Help & Tooltips

**Purpose:** Provide quick explanations for indicators, logic blocks, and metrics without leaving the app.

**Planned Behavior:**
- Info icons next to technical terms with hover tooltips on indicator cards, logic blocks, and performance metrics.
- Definitions appear directly in the tooltip (no links to a glossary page).
- Copy is short (1–2 sentences), focused on plain-language meaning and usage.

**Implementation Notes:**
- Prefer existing UI components or native tooltips (no new libraries).
- No backend changes required.
  
### 4.6. Metrics Glossary

**Purpose:** A dedicated, searchable reference page explaining every performance metric shown in backtests.

**Planned Behavior:**
- Simple static page with metric definitions, formulas, and plain-language interpretation.
- “Good” vs “bad” ranges and example scenarios for each metric.
- Client-side search input filters metrics in place.

**Implementation Notes:**
- No backend changes required.
- Reuse existing typography/layout patterns.

### 4.7. Strategy Notes & Annotations

**Purpose:** Let users add text notes directly on the canvas to document intent or add reminders.

**Behavior:**
- Notes **float freely** on the canvas and can be dragged to any position.
- Notes are plain text (no rich formatting).
- Notes have a 280 character limit with visual feedback.
- Notes are stored as React Flow nodes (type "note") in the strategy definition.

**Implementation:**
- Notes are stored alongside blocks in the strategy version JSON.
- Validation and backtest interpreter ignore note nodes entirely.
- No new backend endpoints or block types needed.
- Simple yellow sticky note UI with inline editing.

### 4.8. Strategy Explanation Generator (Planned)

**Purpose:** Auto-generate a plain-English explanation of what a strategy does based on its canvas blocks.

**Planned Behavior:**
- Generates a readable summary such as: “This strategy enters long when price crosses above the 20-day SMA and RSI is below 30…”
- Uses deterministic, template-based text generation from the strategy JSON.
- Helps users document and share strategies without manually writing descriptions.

**Implementation Notes:**
- Explanation is derived from block definitions + connections (no AI).
- Output is read-only and can be regenerated at any time.
- If stored, explanation lives under `metadata.explanation` in the strategy version JSON.


--- 

## 5. Backtesting Engine

### 5.1. Backtest Execution

**Create Backtest** (`POST /backtests`)
- Required: strategy_id, date_from, date_to
- Optional: initial_balance, fee_rate, slippage_rate
- Returns run_id and status (pending)
- Enqueued to Redis for processing (5-minute timeout)

**Daily Limit Enforcement:**
- Max 50 backtests per user per day (resets at 00:00 UTC)
- Returns 429 error if limit exceeded

**Get Backtest** (`GET /backtests/{run_id}`)
- Returns status and summary metrics
- Statuses: pending, running, completed, failed

### 5.2. Backtest Processing Pipeline

1. **Load Strategy**
   - Fetch strategy and version definition
   - Validate definition structure

2. **Fetch OHLCV Data**
   - Check database candles table first
   - If missing >5% of expected candles:
     - Fetch from CryptoCompare API
     - Store in database for future use
   - Raises DataUnavailableError if large gaps exist

3. **Interpret Strategy**
   - Parse block definition
   - Compute indicator arrays
   - Generate entry/exit signal arrays

4. **Run Simulation**
   - Execute trades based on signals
   - Apply position sizing, TP/SL, max drawdown
   - Track equity curve and trade details

5. **Store Results**
   - Upload equity curve and trades to S3/MinIO
   - Update backtest_run record with summary metrics

### 5.3. Execution Model

**Assumptions (Transparent & Conservative):**
- **Data:** OHLCV candles only (no tick/order book)
- **Fees:** Default 0.1% per trade (user-adjustable)
- **Slippage:** Default 0.05% per trade (user-adjustable)
- **Execution:** Trades execute at next candle open after signal

**Position Management:**
- Only long positions supported (no short selling)
- One position per strategy at a time
- Position ladder for multiple take profit levels
- Entry is triggered when **any** entry_signal block is true
- Exit can be triggered by **any** exit condition (exit_signal, time_exit, trailing_stop, stop_loss, take_profit, max_drawdown, end_of_data)

**Stop Loss:**
- Checked every candle
- Executes at next candle open if loss threshold crossed

**Take Profit:**
- Supports 1-3 levels with partial closes
- Example: Close 50% at 2% profit, remaining 50% at 5% profit
- Levels checked in order; partial closes tracked

**Max Drawdown:**
- Portfolio-level circuit breaker
- Stops all trading if equity drawdown exceeds threshold
- Drawdown calculated from peak equity

**Initial Balance:**
- Default: $10,000 (configurable)

### 5.4. Summary Metrics

**Calculated Metrics:**
- **Total Return %:** (final_equity - initial_balance) / initial_balance * 100
- **CAGR %:** Compound annual growth rate
- **Max Drawdown %:** Peak-to-trough equity decline
- **Number of Trades:** Total trades executed
- **Win Rate %:** Profitable trades / total trades * 100
- **Benchmark Return %:** Buy-and-hold return for the same asset and period
- **Alpha:** Strategy return minus benchmark return
- **Beta:** Strategy return sensitivity vs benchmark returns

**Stored in:** `backtest_runs` table (total_return, cagr, max_drawdown, num_trades, win_rate, benchmark_return, alpha, beta)

### 5.5. Backtest Results

**Equity Curve** (`GET /backtests/{run_id}/equity-curve`)
- Array of {timestamp, equity} points
- Stored in S3/MinIO as JSON
- Retrieved via presigned URL or direct fetch

**Benchmark Equity Curve** (`GET /backtests/{run_id}/benchmark-equity-curve`)
- Array of {timestamp, equity} points for buy-and-hold
- Stored alongside the strategy curve

**Trades List** (`GET /backtests/{run_id}/trades`)
- Array of trade objects with:
  - entry_time, entry_price, exit_time, exit_price
  - side (always "long" in current implementation)
  - pnl (USD), pnl_pct (%)
  - qty (quantity traded)
  - stop_loss_price, take_profit_price (at entry)
  - exit_reason (tp, sl, trailing_stop, time_exit, signal, max_drawdown, end_of_data)
  - mae (max adverse excursion in USD and %)
  - mfe (max favorable excursion in USD and %)
  - r_multiple (risk/reward ratio)
  - peak_price, trough_price, peak_time, trough_time
  - duration (seconds)

**Trade Detail** (`GET /backtests/{run_id}/trades/{trade_idx}`)
- Full trade object
- Surrounding candles (90-day minimum window)
- Used for detailed trade analysis

**Implementation:** `backend/app/backtest/engine.py`, `backend/app/backtest/indicators.py`, `backend/app/backtest/interpreter.py`

---

## 6. Data Management

### 6.1. Candle Data Storage

**Database Table:** `candles`
- Columns: id, asset, timeframe, timestamp, open, high, low, close, volume, created_at
- Unique constraint: (asset, timeframe, timestamp)
- Indexes: asset, timeframe, timestamp (fast range queries)

**Caching Strategy:**
- Check database first
- If missing candles, fetch from vendor
- Store vendor data in database (upsert)

### 6.2. Market Data Vendor

**Provider:** CryptoCompare API
- Endpoint: https://min-api.cryptocompare.com
- API key configured via environment variable
- Rate limits handled by vendor

**Fetch Logic:**
1. Calculate expected number of candles for date range
2. Query database for existing candles
3. If gap >5%, fetch from vendor
4. Store new candles in database
5. Raise error if large gaps remain

**Gap Detection:**
- Validates continuity of candle timestamps
- Raises `DataUnavailableError` if critical data missing

**Implementation:** `backend/app/backtest/candles.py`

### 6.3. Object Storage (S3/MinIO)

**Storage Service:** MinIO (S3-compatible)
- Endpoint: http://localhost:9000 (local), configurable for production
- Bucket: "blockbuilders" (auto-created on startup)
- Region: us-east-1 (default)

**Stored Objects:**
- Equity curve: `backtests/{run_id}/equity_curve.json`
- Trades list: `backtests/{run_id}/trades.json`

**Retrieval:**
- Presigned URLs (not yet implemented)
- Direct fetch via boto3 client

**Configuration:**
- S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY
- S3_BUCKET_NAME, S3_REGION

**Implementation:** `backend/app/backtest/storage.py`

### 6.4. Data Quality Indicators

**Purpose:** Surface data quality metrics (gap %, outlier count, volume consistency) per asset/timeframe and warn users when a backtest period overlaps known issues.

**Planned Behavior:**
- Daily validation job computes metrics for each asset/timeframe and stores quality metadata.
- Backtest UI shows a compact quality summary for the selected asset/timeframe.
- Backtest date range selector warns if the period overlaps known data issues.

**Implementation Notes:**
- Use existing candle data (no extra vendor calls).
- Store quality metadata in a simple table keyed by asset, timeframe, and date range.

---

## 7. Scheduled Re-Backtests (Paper Trading)

### 7.1. Auto-Update Feature

**Strategy Settings:**
- `auto_update_enabled`: boolean (enable/disable daily updates)
- `auto_update_lookback_days`: integer (default 365)
- `last_auto_run_at`: timestamp (tracks last auto-run)

**User Flow:**
1. Edit strategy settings
2. Toggle "Auto-update daily" checkbox
3. Set lookback period (default 1 year)
4. Save settings

### 7.2. Daily Scheduler Job

**Job:** `auto_update_strategies_daily`
- Runs at cron schedule: `0 {hour} * * *` (default 02:00 UTC)
- Configurable via SCHEDULER_HOUR environment variable

**Process:**
1. Query all strategies with `auto_update_enabled=true`
2. For each strategy:
   - Check user's daily backtest limit
   - Skip if limit exceeded
   - Check for existing pending/running auto-runs
   - Skip if already running (idempotency)
   - Create BacktestRun with `triggered_by='auto'`
   - Calculate date range: now - lookback_days to now
   - Enqueue job to Redis
   - Update `last_auto_run_at` timestamp

**Status Indication:**
- Strategy list shows "Updated today" / "Needs update"
- Based on `last_auto_run_at` timestamp

### 7.3. Worker Infrastructure

**Queue:** Redis Queue (RQ)
- Job storage in Redis
- 5-minute timeout per job

**Services:**
- **API:** Enqueues jobs
- **Worker:** Processes jobs from queue
- **Scheduler:** Manages cron jobs (rq-scheduler)

**Docker Services:**
- `api`: FastAPI application
- `worker`: RQ worker process
- `scheduler`: RQ scheduler process (optional, controlled by SCHEDULER_ENABLED)

**Configuration:**
- REDIS_URL: Redis connection string
- SCHEDULER_ENABLED: boolean (enable/disable scheduler)
- SCHEDULER_HOUR: hour of day for daily job (0-23)

**Implementation:** `backend/app/worker/jobs.py`, `backend/app/worker/scheduler.py`

---

## 8. Usage Limits & Transparency

### 8.1. Soft Usage Caps

**Per-User Limits:**
- **Max Strategies:** 10 (active/non-archived)
- **Max Backtests Per Day:** 50 (resets at 00:00 UTC)

**Defaults:** Configurable via environment variables
- DEFAULT_MAX_STRATEGIES
- DEFAULT_MAX_BACKTESTS_PER_DAY

**Stored in:** `users` table (max_strategies, max_backtests_per_day)

### 8.2. Usage Tracking

**Endpoint:** `GET /usage/me`
- Returns current usage and limits:
  - strategies_used / max_strategies
  - backtests_today / max_backtests_per_day
  - resets_at_utc (midnight UTC tomorrow)

**Bundled Response:** `GET /users/me`
- User profile
- Usage bundle (strategies, backtests_today)
- Settings (default fees, slippage, timezone)

**Frontend Display:**
- Profile page shows usage progress bars
- Strategy count: X / 10
- Daily backtests: X / 50 (resets at midnight UTC)

### 8.3. Limit Enforcement

**Strategy Creation:**
- Check `strategies_used < max_strategies`
- Return 403 if limit exceeded

**Backtest Creation:**
- Check `backtests_today < max_backtests_per_day`
- Return 429 if limit exceeded
- Auto-update jobs also respect limit

**Daily Reset:**
- UTC midnight calculation in `get_usage_for_user()`
- Uses `created_at` timestamp on backtest_runs

**Implementation:** `backend/app/api/usage.py`

---

## 9. Frontend Application

### 9.1. Application Structure

**Framework:** Next.js 15 with App Router
- React 19
- TypeScript strict mode
- Tailwind CSS for styling

**Route Structure:**
```
/                          → Login/signup (public)
/forgot-password           → Password reset request (public)
/reset-password?token=...  → Password reset confirm (public)
/auth/callback             → OAuth callback handler (public)

/dashboard                 → Multi-strategy dashboard (protected)
/strategies                → Strategy list (protected)
/strategies/[id]           → Strategy editor (protected)
/strategies/[id]/backtest  → Backtest runner (protected)
/profile                   → User settings (protected)
/how-backtests-work        → Documentation (protected)
```

### 9.2. Authentication Pages

**Login/Signup** (`/`)
- Toggle between sign in and create account modes
- Email + password inputs with validation
- OAuth buttons: "Continue with Google", "Continue with GitHub"
- "Forgot password?" link

**Password Reset Request** (`/forgot-password`)
- Email input
- Sends reset email via Resend API
- Confirmation message (even if email not found)

**Password Reset Confirm** (`/reset-password?token={token}`)
- Token validation
- New password input
- Redirects to login on success

**OAuth Callback** (`/auth/callback`)
- Processes OAuth token from provider
- Exchanges for JWT
- Redirects to dashboard

**Components:** `frontend/src/app/(auth)/`

### 9.3. Strategy Management Pages

**Dashboard** (`/dashboard`)
- Multi-Strategy Dashboard with all strategies in a table/grid
- Latest performance metrics per strategy (preview)
- Sort and filter by performance, last run date, asset
- Quick actions: Open, Duplicate, Archive, Create new strategy

**Strategy List** (`/strategies`)
- Enhanced version of the dashboard list for full management
- Search bar (filter by name)
- Sort and filter by performance, last run date, asset
- Table/grid rows with:
  - Name, asset, timeframe
  - Latest backtest metrics preview
  - Last run timestamp
  - Actions: Open, Duplicate, Archive
- Empty state + create menu offer “Strategy Building Wizard” for guided creation

**Strategy Editor** (`/strategies/[id]`)
- Visual canvas with drag-drop blocks
- Block palette drawer (mobile-responsive)
- Properties panel for selected block
- Version tabs and switcher
- Save button (creates new version)
- Validate button

**Components:**
- `frontend/src/app/(app)/strategies/page.tsx`
- `frontend/src/app/(app)/strategies/[id]/page.tsx`
- `frontend/src/components/canvas/StrategyCanvas.tsx`
- `frontend/src/components/canvas/BlockPalette.tsx`
- `frontend/src/components/canvas/PropertiesPanel.tsx`

### 9.4. Backtest Pages

**Backtest Runner** (`/strategies/[id]/backtest`)
- Date range picker (from/to)
- Advanced settings (initial balance, fees, slippage)
- "Run Backtest" button
- Status badge (pending/running/completed/failed)

**Backtest Results** (same page after completion)
- Summary metrics cards:
  - Total return, CAGR, max drawdown
  - Number of trades, win rate
- Equity curve chart (Recharts line chart)
- Trades table with sorting and pagination
- Trade detail drawer with surrounding candles

**Components:**
- `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx`
- `frontend/src/components/BacktestResults.tsx`
- `frontend/src/components/TradeDetail.tsx`

### 9.5. Profile & Settings

**Profile Page** (`/profile`)
- Account section: email display
- Backtest Defaults:
  - Fee rate input (0.01-5%)
  - Slippage rate input (0.01-2%)
- Display Preferences:
  - Timezone toggle (local or UTC)
- Usage section:
  - Strategies progress bar (X / 10)
  - Daily backtests progress bar (X / 50)
  - Reset time display

**Components:** `frontend/src/app/(app)/profile/page.tsx`

### 9.6. Context Providers

**AuthContext** (`frontend/src/context/auth.tsx`)
- Manages JWT token in localStorage
- User state (email, settings, usage)
- Auth methods: login, signup, logout
- OAuth flow handling
- Auto-fetch user on mount

**DisplayContext** (`frontend/src/context/display.tsx`)
- Manages timezone preference (local/UTC)
- Applied to all timestamp displays
- Persists to user profile

### 9.7. Utilities & Libraries

**API Client** (`frontend/src/lib/api.ts`)
- apiFetch wrapper for fetch API
- JWT token injection (Authorization header)
- Error handling (401 → logout, 403/429 → error message)
- JSON request/response handling

**Formatters** (`frontend/src/lib/formatters.ts`)
- formatPrice: currency formatting ($1,234.56)
- formatPercent: percentage formatting (12.34%)
- formatDate/formatTime: timezone-aware date/time
- formatDuration: seconds → "2d 3h 45m"

**Canvas Utilities** (`frontend/src/lib/canvas-utils.ts`)
- Convert React Flow format ↔ strategy definition JSON
- Block type mappings
- Parameter validation helpers

**Dependencies:**
- next, react, react-dom
- typescript, @types/node, @types/react
- tailwindcss, autoprefixer, postcss
- xyflow/react (React Flow)
- recharts (charting)
- date-fns (date formatting)

### 9.8. In-App Notifications

**Header UI:**
- Bell icon in the main app header
- Unread count badge (hidden when 0)
- Dropdown panel listing newest notifications first

**Notification Events:**
- Backtest completed
- Usage limit reached (daily backtests or strategy cap)
- New follower
- Strategy commented on
- Other important system events (as needed)

**Behavior:**
- Notifications persist until acknowledged (user clicks “mark read” or opens detail)
- Each item includes a short message, timestamp, and optional deep link
- Simple empty state when no notifications

---

## 10. Backend API Reference

### 10.1. API Architecture

**Framework:** FastAPI
- Python 3.11+
- Async support (async/await)
- Automatic OpenAPI/Swagger docs at `/docs`

**Middleware:**
- CORS: configurable origins (default: http://localhost:3000)
- Request ID tracking
- Error handling middleware

**Authentication:**
- JWT token-based (Bearer token in Authorization header)
- Dependency injection via `get_current_user()`
- Protected routes require valid token

### 10.2. API Routers

**Auth Router** (`/auth`)
- POST /signup: Create account
- POST /login: Get JWT token
- POST /password-reset-request: Send reset email
- POST /password-reset-confirm: Confirm new password
- GET /oauth/google/start: Initiate Google OAuth
- GET /oauth/google/callback: Handle Google callback
- GET /oauth/github/start: Initiate GitHub OAuth
- GET /oauth/github/callback: Handle GitHub callback

**Users Router** (`/users`)
- GET /me: Get current user profile + usage
- PUT /me: Update settings (fees, slippage, timezone)

**Usage Router** (`/usage`)
- GET /me: Get usage limits and counts

**Notifications Router** (`/notifications`)
- GET /: List notifications (default: unread first)
- POST /{id}/acknowledge: Mark notification as read
- POST /acknowledge-all: Mark all notifications as read

**Strategies Router** (`/strategies`)
- GET /: List strategies (search, include_archived)
- POST /: Create strategy
- GET /{id}: Get strategy details
- PATCH /{id}: Update strategy
- DELETE /{id}: Archive strategy
- POST /{id}/duplicate: Clone strategy
- POST /{id}/validate: Validate definition
- POST /{id}/versions: Save new version
- GET /{id}/versions: List versions
- GET /{id}/versions/{version_number}: Get version

**Backtests Router** (`/backtests`)
- POST /: Create and enqueue backtest
- GET /{id}: Get backtest status/summary
- GET /{id}/equity-curve: Get equity curve data
- GET /{id}/benchmark-equity-curve: Get buy-and-hold equity curve data
- GET /{id}/trades: Get trades list
- GET /{id}/trades/{trade_idx}: Get trade detail

**Health Router** (`/health`)
- GET /: Health check (returns 200 OK)

**Implementation:** `backend/app/api/`

### 10.3. Request/Response Schemas

**Pydantic Models:** `backend/app/schemas/`
- User schemas: UserCreate, UserUpdate, UserResponse
- Strategy schemas: StrategyCreate, StrategyUpdate, StrategyResponse
- Backtest schemas: BacktestCreate, BacktestResponse, TradeResponse
- Auth schemas: LoginRequest, TokenResponse, PasswordResetRequest
- Notification schemas: NotificationResponse, NotificationListResponse

**Validation:**
- Automatic via Pydantic
- Type coercion and error messages
- Field constraints (min/max, regex, etc.)

### 10.4. Database Models

**SQLModel ORM:** `backend/app/models/`
- User: id, email, password_hash, settings, limits, OAuth fields
- Strategy: id, user_id, name, asset, timeframe, auto_update settings
- StrategyVersion: id, strategy_id, version_number, definition_json
- BacktestRun: id, user_id, strategy_id, status, metrics, storage keys
- Notification: id, user_id, type, title, body, link_url, is_read, created_at, acknowledged_at
- Candle: id, asset, timeframe, timestamp, ohlcv

**Foreign Keys:**
- strategy.user_id → user.id
- strategy_version.strategy_id → strategy.id
- backtest_run.user_id → user.id
- backtest_run.strategy_id → strategy.id
- backtest_run.strategy_version_id → strategy_version.id
- notification.user_id → user.id

**Indexes:**
- users.email (unique)
- strategies.user_id
- backtest_runs.user_id, strategy_id
- notifications.user_id, is_read, created_at
- candles.asset, timeframe, timestamp
- candles unique constraint: (asset, timeframe, timestamp)

### 10.5. Core Modules

**Config** (`backend/app/core/config.py`)
- Settings class with environment variable loading
- Database URL, Redis URL, JWT secret, S3 credentials, etc.
- Pydantic BaseSettings for validation

**Database** (`backend/app/core/database.py`)
- SQLModel engine and session factory
- Connection pooling
- Async session support (not yet used)

**Security** (`backend/app/core/security.py`)
- Password hashing: bcrypt with salt
- JWT token creation: HS256 algorithm, 7-day expiration
- JWT token validation: decode and verify signature
- get_current_user dependency: extract user from token

**Implementation:** `backend/app/core/`

---

## 11. Database Schema

### 11.1. Tables Overview

**users**
- id (UUID, PK)
- email (VARCHAR, unique)
- password_hash (VARCHAR, nullable)
- default_fee_percent (FLOAT, nullable)
- default_slippage_percent (FLOAT, nullable)
- max_strategies (INT, default 10)
- max_backtests_per_day (INT, default 50)
- timezone_preference (ENUM: local/utc, default local)
- reset_token (VARCHAR, nullable)
- reset_token_expires_at (TIMESTAMP, nullable)
- auth_provider (VARCHAR, nullable)
- provider_user_id (VARCHAR, nullable)
- created_at, updated_at (TIMESTAMP)

**strategies**
- id (UUID, PK)
- user_id (UUID, FK to users)
- name (VARCHAR)
- asset (VARCHAR)
- timeframe (VARCHAR)
- is_archived (BOOLEAN, default false)
- auto_update_enabled (BOOLEAN, default false)
- auto_update_lookback_days (INT, default 365)
- last_auto_run_at (TIMESTAMP, nullable)
- created_at, updated_at (TIMESTAMP)

**strategy_versions**
- id (UUID, PK)
- strategy_id (UUID, FK to strategies)
- version_number (INT)
- definition_json (JSON)
- created_at (TIMESTAMP)
- Unique constraint: (strategy_id, version_number)

**backtest_runs**
- id (UUID, PK)
- user_id (UUID, FK to users)
- strategy_id (UUID, FK to strategies)
- strategy_version_id (UUID, FK to strategy_versions)
- status (ENUM: pending/running/completed/failed)
- asset (VARCHAR, snapshot)
- timeframe (VARCHAR, snapshot)
- date_from, date_to (TIMESTAMP)
- initial_balance (FLOAT)
- fee_rate (FLOAT)
- slippage_rate (FLOAT)
- total_return (FLOAT, nullable)
- benchmark_return (FLOAT, nullable)
- alpha (FLOAT, nullable)
- beta (FLOAT, nullable)
- cagr (FLOAT, nullable)
- max_drawdown (FLOAT, nullable)
- num_trades (INT, nullable)
- win_rate (FLOAT, nullable)
- equity_curve_key (VARCHAR, nullable)
- trades_key (VARCHAR, nullable)
- error_message (TEXT, nullable)
- triggered_by (ENUM: manual/auto, default manual)
- created_at, updated_at (TIMESTAMP)

**notifications**
- id (UUID, PK)
- user_id (UUID, FK to users)
- type (VARCHAR)
- title (VARCHAR)
- body (TEXT)
- link_url (VARCHAR, nullable)
- is_read (BOOLEAN, default false)
- created_at (TIMESTAMP)
- acknowledged_at (TIMESTAMP, nullable)
- Indexes: user_id, is_read, created_at

**candles**
- id (UUID, PK)
- asset (VARCHAR)
- timeframe (VARCHAR)
- timestamp (TIMESTAMP)
- open, high, low, close, volume (FLOAT)
- created_at (TIMESTAMP)
- Unique constraint: (asset, timeframe, timestamp)
- Indexes: asset, timeframe, timestamp

### 11.2. Migrations

**Alembic Migrations:** `backend/alembic/versions/`
1. `001_initial_schema` - Core tables
2. `002_strategy_version_unique` - Unique constraint on (strategy_id, version_number)
3. `003_backtest_run_fields` - Additional backtest fields
4. `004_scheduled_rebacktest_fields` - Auto-update fields on strategies
5. `005_usage_limits` - Usage limit fields on users
6. `006_add_timezone_preference` - Timezone preference on users
7. `007_add_auth_fields` - OAuth and password reset fields
8. `008_add_benchmark_metrics` - Benchmark metrics on backtest runs
9. `009_add_data_quality_metrics_table` - Data quality metrics table
10. `010_add_notifications_table` - Notifications table

**Migration Commands:**
- `alembic upgrade head` - Apply all pending migrations
- `alembic downgrade -1` - Rollback last migration
- `alembic revision --autogenerate -m "message"` - Create new migration

---

## 12. Deployment & Infrastructure

### 12.1. Docker Services

**Frontend** (Next.js)
- Port: 3000
- Build: npm install && npm run build
- Start: npm start
- Health check: http://localhost:3000/health

**API** (FastAPI)
- Port: 8000
- Build: pip install -r requirements.txt
- Start: uvicorn app.main:app --host 0.0.0.0 --port 8000
- Health check: http://localhost:8000/health

**Worker** (RQ)
- No exposed port
- Start: python -m app.worker.worker
- Processes jobs from Redis queue

**Scheduler** (RQ Scheduler)
- No exposed port
- Start: python -m app.worker.scheduler
- Conditional: SCHEDULER_ENABLED=true

**PostgreSQL**
- Port: 5432 (internal)
- Image: postgres:15
- Volume: postgres_data

**Redis**
- Port: 6379
- Image: redis:7-alpine
- Volume: redis_data

**MinIO**
- Port: 9000 (API), 9001 (console)
- Image: minio/minio
- Volume: minio_data
- Auto-create bucket: blockbuilders

**Nginx** (optional, for production)
- Port: 80
- Reverse proxy for frontend and API
- SSL termination (production)

### 12.2. Environment Variables

**Required:**
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection string
- JWT_SECRET_KEY: Secret for JWT signing
- S3_ENDPOINT_URL: MinIO/S3 endpoint
- S3_ACCESS_KEY, S3_SECRET_KEY: MinIO/S3 credentials
- CRYPTOCOMPARE_API_KEY: Market data vendor API key

**Optional:**
- CORS_ORIGINS: Comma-separated allowed origins (default: http://localhost:3000)
- S3_BUCKET_NAME: Bucket name (default: blockbuilders)
- S3_REGION: AWS region (default: us-east-1)
- DEFAULT_MAX_STRATEGIES: Per-user strategy limit (default: 10)
- DEFAULT_MAX_BACKTESTS_PER_DAY: Daily backtest limit (default: 50)
- RESEND_API_KEY: Email service for password reset
- RESET_TOKEN_EXPIRE_HOURS: Reset token TTL (default: 1)
- FRONTEND_URL: Frontend URL for OAuth redirects (default: http://localhost:3000)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: Google OAuth
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET: GitHub OAuth
- SCHEDULER_ENABLED: Enable daily scheduler (default: true)
- SCHEDULER_HOUR: Hour of day for daily job (default: 2)

**Files:**
- `.env.example`: Template with all variables
- `.env`: Local development (gitignored)
- `.env.production`: Production template (gitignored)

### 12.3. Production Considerations

**Security:**
- Use strong JWT_SECRET_KEY (32+ characters)
- Rotate secrets regularly
- Enable SSL/TLS (HTTPS)
- Configure firewall rules

**Backup:**
- PostgreSQL volume backups (pg_dump)
- MinIO bucket backups (s3 sync)
- Automated daily backups to remote storage

**Monitoring:**
- Health check endpoints (GET /health)
- Docker logs (docker compose logs -f)
- Redis queue monitoring (RQ dashboard)
- PostgreSQL query monitoring

**Scaling:**
- Horizontal: Multiple worker instances for job processing
- Vertical: Increase container resources (CPU, RAM)
- Database: Read replicas for analytics queries
- Object storage: S3/CloudFlare R2 for production

---

## 13. Feature Coverage Summary

| Feature Area | Status | Details |
|---|---|---|
| **Authentication** | ✅ Complete | Email/password, OAuth (Google, GitHub), password reset |
| **Account Management** | ✅ Complete | Profile, settings (fees, slippage, timezone), usage tracking |
| **Strategy Management** | ✅ Complete | CRUD, versioning, validation, duplication, archiving |
| **Visual Builder** | ✅ Complete | 20 block types, drag-drop, parameter editing, mobile-responsive |
| **Strategy Building Wizard** | ✅ Complete | Guided Q&A that generates editable strategy JSON |
| **Backtesting** | ✅ Complete | Full engine with TP ladder, SL, max drawdown, equity curves, trade detail |
| **Data Management** | ✅ Complete | Candle DB cache, CryptoCompare integration, S3/MinIO storage |
| **Data Quality Indicators** | ✅ Complete | Gap %, outlier count, volume consistency, backtest warnings |
| **Scheduled Updates** | ✅ Complete | Daily scheduler for auto-update strategies (paper trading) |
| **Usage Limits** | ✅ Complete | Soft caps (10 strategies, 50 backtests/day) with transparent tracking |
| **In-App Notifications** | ✅ Complete | Bell icon with unread count, notifications for key events |
| **Frontend UI** | ✅ Complete | Multi-strategy dashboard, strategy list/editor, backtest runner/results, profile |
| **Contextual Help & Tooltips** | ✅ Complete | Hover tooltips for indicators, logic blocks, metrics |
| **Metrics Glossary** | ✅ Complete | Dedicated searchable page explaining backtest metrics |
| **Strategy Notes & Annotations** | ✅ Complete | Floating text notes on canvas (280 char limit), drag to position |
| **Strategy Explanation Generator** | ⏳ Planned | Template-based plain-English explanation from strategy JSON |
| **Strategy Import/Export** | ⏳ Planned | JSON export/download + import/upload with validation |
| **Worker Infrastructure** | ✅ Complete | RQ job queue, scheduler, background processing |
| **API** | ✅ Complete | RESTful endpoints, JWT auth, OpenAPI docs |
| **Database** | ✅ Complete | PostgreSQL with 8 migrations, indexed queries |
| **Deployment** | ✅ Complete | Docker Compose stack (6 services) |

**Current State:** Fully functional MVP with post-MVP enhancements (OAuth, scheduled updates, advanced risk management, timezone support, strategy building wizard, in-app notifications).

---

## 14. Known Limitations & Constraints

### 14.1. MVP Constraints (By Design)

**Single Asset/Timeframe:**
- Each strategy supports exactly one asset and one timeframe
- No multi-asset or multi-timeframe strategies
- No portfolio-level allocation

**Long-Only Positions:**
- No short selling support
- Only long entry signals allowed
- One position per strategy at a time

**Limited Asset Coverage (Curated List):**
- Supported pairs focus on the top 20–30 crypto assets (see Section 3.4)
- Timeframes: 4h and 1d only
- Additional pairs added based on user requests and data vendor availability/cost

**OHLCV-Based Execution:**
- No tick or order book data
- Trades execute at next candle open (not mid-candle)
- No intra-candle price movement simulation

### 14.2. Out-of-Scope Features

**Not Implemented (Intentionally):**
- Real-time trading or brokerage integration
- Strategy marketplace or public sharing links (manual file export/import is allowed)
- Billing/subscription system (soft limits only)
- Email/SMS alerts (only in-app notifications supported)
- Full social feeds or discovery features
- Advanced analytics (factor models, Monte Carlo, walk-forward)
- Webhooks or external integrations
- Mobile native apps
- Export to Pine Script or other platforms

### 14.3. Technical Limitations

**Performance:**
- Backtest engine is single-threaded (no parallel processing)
- Large date ranges (5+ years) may timeout
- S3 upload for large result sets may be slow

**Data Availability:**
- Dependent on CryptoCompare API uptime
- Historical data gaps may cause backtest failures
- No fallback vendor if CryptoCompare unavailable
- No explicit data quality indicators or warnings in UI (planned)

**Scalability:**
- Single PostgreSQL instance (no sharding)
- Single Redis instance (no cluster)
- Worker scaling requires manual Docker Compose edits

**Browser Compatibility:**
- Requires modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- No IE11 support
- Mobile web only (no native app)

---

## 15. Future Roadmap

### 15.1. Phase 2 Enhancements (Proposed)

**Completed:**
- ✅ OAuth integration (Google, GitHub)
- ✅ Password reset flow
- ✅ Timezone preference
- ✅ Take profit ladder (multiple levels)
- ✅ Max drawdown risk management
- ✅ Scheduled re-backtests (paper trading)
- ✅ In-app notifications

**Proposed (Not Yet Implemented):**
- Multi-timeframe strategies (Phase 2+)
- More indicators (Stochastic, CCI, ADX)
- Short selling support
- Advanced order types (limit, stop-limit)
- Strategy templates and presets
- Data quality indicators with backtest-period warnings
- Improved analytics (drawdown analysis, trade tagging)
- Email notifications for auto-updates
- Strategy sharing (read-only links)

### 15.2. Post-MVP Considerations

**Product:**
- Expand asset coverage (more pairs, stocks, forex)
- Add more timeframes (15m, 5m, 1w)
- Multi-asset portfolio strategies
- Walk-forward optimization
- Monte Carlo simulation

**Operations:**
- Introduce payments (single plan → multiple tiers)
- Metered usage billing
- Email/SMS alerts for backtest completion
- Telegram/Discord bot integrations

**Architecture (Only If Needed):**
- Horizontal worker scaling (Kubernetes)
- Read replicas for PostgreSQL
- Separate analytics database (TimescaleDB)
- CDN for static assets
- Multi-region deployment

---

## 16. Development Guide

### 16.1. Local Setup

**Prerequisites:**
- Docker and Docker Compose
- Git

**Quick Start:**
```bash
git clone <repo-url>
cd blockbuilders
docker compose up --build
docker compose exec api alembic upgrade head
```

**Access:**
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

### 16.2. Development Workflow

**Frontend Development:**
```bash
cd frontend
npm install
npm run dev        # Start dev server with hot reload
npm run lint       # Run ESLint
npm run build      # Production build
npm run type-check # TypeScript type checking
```

**Backend Development:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # Start dev server with auto-reload
pytest                         # Run tests
alembic revision --autogenerate -m "message"  # Create migration
```

**Database Migrations:**
```bash
docker compose exec api alembic upgrade head      # Apply migrations
docker compose exec api alembic downgrade -1      # Rollback
docker compose exec api alembic current           # Show current version
```

### 16.3. Key File Locations

**Frontend:**
- Pages: `frontend/src/app/(auth)/` and `frontend/src/app/(app)/`
- Components: `frontend/src/components/`
- Context: `frontend/src/context/`
- Types: `frontend/src/types/`
- API Client: `frontend/src/lib/api.ts`
- Canvas: `frontend/src/components/canvas/`

**Backend:**
- Main: `backend/app/main.py`
- API Routes: `backend/app/api/`
- Models: `backend/app/models/`
- Schemas: `backend/app/schemas/`
- Backtest Engine: `backend/app/backtest/`
- Worker: `backend/app/worker/`
- Core: `backend/app/core/`
- Migrations: `backend/alembic/versions/`

**Deployment:**
- `docker-compose.yml` - Service orchestration
- `.env.example` - Environment template
- `frontend/Dockerfile` - Frontend image
- `backend/Dockerfile` - Backend/worker image

### 16.4. Testing

**Frontend Tests:**
```bash
cd frontend
npm test              # Run Jest tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Backend Tests:**
```bash
cd backend
pytest                  # Run all tests
pytest tests/test_api/  # Run specific test directory
pytest -v               # Verbose output
pytest --cov            # Coverage report
```

**Note:** Test coverage is currently minimal. Focus on critical paths (backtest engine, strategy validation).

---

## 17. Support & Resources

### 17.1. Documentation

**Internal Docs:**
- `docs/mvp.md` - MVP specification (baseline)
- `docs/phase2.md` - Auth UX improvements spec
- `docs/prd-strategy-building-wizard.md` - Strategy building wizard PRD
- `docs/prd-contextual-help-tooltips.md` - Contextual help & tooltips PRD
- `docs/prd-data-quality-indicators.md` - Data quality indicators PRD
- `docs/prd-metrics-glossary.md` - Metrics glossary PRD
- `docs/prd-strategy-notes-annotations.md` - Strategy notes & annotations PRD
- `docs/prd-strategy-explanation-generator.md` - Strategy explanation generator PRD
- `docs/prd-strategy-import-export.md` - Strategy import/export PRD
- `docs/prd-in-app-notifications.md` - In-app notifications PRD
- `docs/prd-multi-strategy-dashboard.md` - Multi-strategy dashboard PRD
- `docs/product.md` - This document (current product truth)
- `CLAUDE.md` - Instructions for Claude Code
- `README.md` - Quick start guide

**External Resources:**
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- React Flow: https://reactflow.dev
- SQLModel: https://sqlmodel.tiangolo.com
- Alembic: https://alembic.sqlalchemy.org

### 17.2. API Documentation

**Interactive Docs:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

### 17.3. Troubleshooting

**Common Issues:**

**Docker build fails:**
- Run `docker compose down -v` to remove volumes
- Run `docker compose up --build --force-recreate`

**Database connection error:**
- Check `DATABASE_URL` in environment
- Verify PostgreSQL service is running: `docker compose ps`

**Frontend can't reach API:**
- Check `CORS_ORIGINS` includes frontend URL
- Verify API is running: curl http://localhost:8000/health

**Backtest jobs not processing:**
- Check worker logs: `docker compose logs -f worker`
- Verify Redis is running: `docker compose ps redis`
- Check job status in Redis (use redis-cli)

**Missing environment variables:**
- Copy `.env.example` to `.env`
- Fill in required values (JWT_SECRET_KEY, CRYPTOCOMPARE_API_KEY, etc.)

---

## 18. Changelog

**2025-12-30** - Strategy building wizard
- Added beginner wizard to generate editable strategy JSON

**2025-12-28** - Initial product documentation
- Documented all implemented features
- 20 block types in visual builder
- OAuth integration (Google, GitHub)
- Password reset flow
- Timezone preference
- Take profit ladder
- Max drawdown risk management
- Scheduled re-backtests (paper trading)
- Usage limits and tracking
- Full API reference
- Database schema with 7 migrations
- Deployment guide

---

**End of Product Documentation**
