# PRD – Scheduled Re-Backtests (“Soft” Paper Trading)  
*Implements Epic 6: Scheduled Re-Backtests*  

---

## 1. Purpose & Goal

**Goal:**  
Allow a user to turn on **automatic daily re-backtests** for a strategy so they can see how it’s performing on the latest data **without manually clicking “Run backtest” every day**.

This is a **thin layer** on top of the existing backtest engine and runs:

- Reuse the existing **backtest run pipeline**.
- Add a **simple per-strategy toggle**.
- Add a **daily scheduler** in the worker.
- Surface **freshness information** in the UI.

No live tick-by-tick trading, no streaming PnL. This is just “run the same backtest again on updated OHLCV once per day.”

---

## 2. In Scope / Out of Scope

### 2.1 In Scope (Epic 6 MVP)

1. **Strategy-level auto-update flag**
   - Boolean toggle: “Auto-update daily”.
   - Optional horizon setting (e.g. “Lookback: last 365 days”) – defaulted.

2. **Scheduler worker**
   - Once per day job that:
     - Finds all strategies with auto-update enabled.
     - Enqueues backtests for them using the **existing backtest pipeline**.
   - Uses latest available OHLCV for that asset/timeframe.

3. **UI indicators for freshness**
   - Strategy list shows:
     - **Last auto-run date/time** for each strategy.
     - A badge: “Updated today” or “Needs update”.
   - Optional subtle highlight for “new since you last viewed”.

4. **Usage limit integration**
   - Auto-runs **count as backtests** against per-user daily limits (same as manual runs).
   - If limits would be exceeded, auto-runs are skipped with a clear reason stored.

### 2.2 Out of Scope (MVP)

- No intraday or “every X minutes” scheduling.
- No per-user cron configuration (time-of-day is global).
- No notifications by email / Telegram / etc. (can be added later).
- No real-time paper trading or live order simulation.
- No multi-asset or portfolio-level scheduling (strategies are still single asset/timeframe).

---

## 3. User Stories (Epic 6)

1. **S6.1 – Enable auto-update on a strategy**

> As a user, I want to turn on daily auto-updates for a strategy, so that I can track its performance over time without manually hitting run.

2. **S6.2 – Scheduler worker & periodic backtests**

> As the system, I want a scheduler that enqueues backtests for auto-update strategies, so that performance is refreshed in the background.

3. **S6.3 – UI indicator for freshness**

> As a user, I want to see whether a strategy’s latest backtest is up-to-date, so that I know if I should trust the current metrics.

---

## 4. Functional Requirements

### 4.1 Data Model

Extend the existing tables defined in the MVP data model.

#### 4.1.1 `strategies` table

Add:

- `auto_update_enabled` (bool, default `false`)
- `auto_update_lookback_days` (int, nullable, default `365`)
- `last_auto_run_at` (timestamp, nullable) – last **successful** scheduled run completion for this strategy.

(Keep it this simple. No separate schedule table.)

#### 4.1.2 `backtest_runs` table

Already exists; reuse as-is for scheduled runs.

Add:

- `triggered_by` (enum/string):
  - Values: `manual`, `auto`.
  - Default `manual`.
- Optional: `is_latest_for_strategy` (bool, default `false`) to mark the latest **successful** run per (strategy + version + trigger type). Not strictly required but convenient.

No new tables.

---

### 4.2 Backend API

Use existing `strategies` and `backtests` namespaces.

#### 4.2.1 Set auto-update flag on strategy

- **Endpoint:** `PATCH /strategies/{id}`
- **Auth:** User must own the strategy.
- **Body (relevant fields):**
  - `auto_update_enabled: bool`
  - `auto_update_lookback_days: int | null` (optional)
- **Behavior:**
  - Update fields on `strategies`.
  - If user is over their strategy/backtest limits, this still succeeds; limits apply when runs are triggered, not on toggling.
- **Validation:**
  - `auto_update_lookback_days` must be within a simple range (e.g. 30–730). If missing, default is 365.

This is the **only** new public API needed for this epic.

#### 4.2.2 Backtest API reuse

The scheduler reuses:

- `POST /backtests/` to create runs (internally via Python function, not via HTTP).
- `GET /backtests/{run_id}` / `GET /backtests?strategy_id=...` are unchanged.

---

### 4.3 Scheduler Worker Behavior

Runs inside the existing worker container.

#### 4.3.1 Schedule

- **Frequency:** once per day (e.g. 02:00 UTC).
- **Implementation:** 
  - Use the existing queue stack (e.g. RQ scheduler / Celery beat with Redis).
  - Single periodic task `auto_update_strategies_daily`.

#### 4.3.2 Daily task algorithm

Pseudocode-style (simple):

1. Fetch all `strategies` where `auto_update_enabled = true`.
2. For each strategy:
   - Resolve latest strategy version (same as manual backtest logic).
   - Determine date range:
     - `date_to = now (rounded to last completed candle)`.
     - `date_from = date_to - auto_update_lookback_days`.
   - Check **usage limits** for that strategy’s owner:
     - If daily backtest limit would be exceeded, **skip**:
       - Record a log entry and optional debug field (e.g. in `backtest_runs` as a `failed` run with reason `limit_exceeded` or store in logs only).
   - Otherwise:
     - Enqueue a backtest job **exactly as manual**: same code path, but:
       - `triggered_by = auto`.
       - Mark “auto-run” in the `backtest_runs` row.
3. Worker executes jobs as usual:
   - On success:
     - Update `strategies.last_auto_run_at = completed_at`.
     - Optionally mark this run as `is_latest_for_strategy = true` and clear previous `is_latest_for_strategy`.

#### 4.3.3 Failure handling

- If a scheduled job fails (invalid strategy, vendor outage):
  - `backtest_runs.status = failed` and store a human-readable `error_message`.
  - Do **not** update `last_auto_run_at`.
- Failures don’t disable `auto_update_enabled`. User can fix the strategy and rely on the next daily run.

---

### 4.4 Frontend Requirements

Using Next.js + Tailwind as in MVP.

#### 4.4.1 Strategy Detail Page – Auto-Update Toggle

- **UI elements:**
  - A simple switch:
    - Label: “Auto-update daily”
    - Helper text: “Re-run this strategy once per day on the latest data (counts towards your daily backtest limit).”
  - Optional dropdown / input:
    - “Lookback window” with options: 90, 180, 365 days (default 365).
- **Behavior:**
  - On change, call `PATCH /strategies/{id}` with `auto_update_enabled` and `auto_update_lookback_days`.
  - Show basic success/error toast.

#### 4.4.2 Strategy List – Freshness Indicator

Each row already shows name, asset, timeframe, last modified.

Extend row with:

- **Auto-update status:**
  - If `auto_update_enabled = true`:
    - Show a small pill: “Auto: On”.
  - If false: no pill or “Auto: Off”.
- **Freshness badge:**
  - Compute based on `last_auto_run_at` vs “today”.
  - States:
    - `last_auto_run_at` is today → badge: **“Updated today”**.
    - `last_auto_run_at` older than today OR null and `auto_update_enabled` true → badge: **“Needs update”**.
  - Tooltip explaining: “Based on last automatic run.”

Also display **Last auto-run** timestamp (e.g. `2025-01-10 02:17 UTC`) in a small text.

#### 4.4.3 Optional: Strategy Detail – Latest Auto-Run Summary

On the strategy detail page:

- Show a small “Latest auto-run” card:
  - Date/time.
  - Key metrics from the last auto-run (total return, max drawdown, # trades).
  - Button “View run” (links to backtest results page).
- Data is fetched via existing backtest history endpoint filtered by `triggered_by=auto` and `is_latest_for_strategy=true` or simply the latest run.

No new dedicated UI screens; just enhancements to existing ones.

---

## 5. Usage Limits & Guardrails

Leverage existing “soft usage limit” concept.

- **Auto-runs count towards the same per-user daily backtest limit** as manual runs.
  - Example: if the limit is 50 backtests/day and the scheduler would trigger 10, then the user can manually run up to 40 more.
- If a user has many auto-updated strategies and the limit is exceeded:
  - Scheduler **skips** excess strategies in a simple deterministic order:
    - e.g. newest strategies first, or sorted by `id`.
  - Log which were skipped for observability.
- There is **no separate “auto-run limit”** in MVP. Keep one total daily limit for simplicity.

---

## 6. Non-Functional Requirements (Specific to This Epic)

Building on global MVP NFRs.

1. **Performance**
   - Scheduler job must scan all auto-enabled strategies and enqueue runs in **< 1 minute** under expected load (small beta).
   - Individual backtests follow the existing SLA (e.g. ≤30s per 1y of 1h candles).

2. **Reliability**
   - A failure in one strategy’s auto-run must **not** stop others from being scheduled.
   - The scheduler task should be idempotent:
     - If accidentally run twice in a short window, avoid double-enqueue for the same strategy:
       - e.g. check if there is already a `backtest_runs` row with `triggered_by=auto` and `status in (pending, running)` for that strategy in the last N hours.

3. **Transparency**
   - UI clearly states:
     - “Auto-updates use the same simulated backtests as manual runs (OHLCV-based, with fees & slippage assumptions). This is not live trading or financial advice.”
   - The badge logic must be simple and predictable.

4. **Simplicity in Operations**
   - No new services.
   - Scheduler lives inside the existing worker process.
   - One additional periodic config (e.g. Celery beat entry) is enough.

---

## 7. Open Questions (OK to Defer, Choose Simple Defaults)

If we want to avoid decisions, choose the simplest default:

1. **Time-of-day for scheduler**
   - Default: 02:00 UTC.
   - Make it configurable via env var, not per user.

2. **Lookback window**
   - Default 365 days.
   - Optionally hide the UI selector and just always use 365 for MVP.

3. **Per-strategy vs per-user skipping on limit**
   - MVP: evaluate strategies in a fixed order and enqueue until the user hits the limit; remaining strategies are skipped.
   - No fancy fairness or priority system.

---

## 8. Summary

This PRD delivers **Epic 6: Scheduled Re-Backtests** by:

- Adding a **per-strategy auto-update toggle** and simple lookback.
- Implementing a **daily scheduler** that enqueues normal backtests for these strategies.
- Showing **freshness indicators** in the strategy list and strategy detail.
- Reusing existing backtest engine, data model, and UI surfaces **without introducing new complex systems**.
