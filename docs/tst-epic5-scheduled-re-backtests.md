# Test Checklist – Scheduled Re-Backtests (Epic 5 / Epic 6)

> Source PRD: `prd-epic5-scheduled-re-backtests.md`

---

## 1. Auto-Update Toggle (S6.1)

### 1.1 API Tests – `PATCH /strategies/{id}` (Auto-Update Fields)

- [ ] Setting `auto_update_enabled = true` updates the strategy successfully
- [ ] Setting `auto_update_enabled = false` updates the strategy successfully
- [ ] Setting `auto_update_lookback_days` to a valid value (e.g., 90, 180, 365) updates successfully
- [ ] `auto_update_lookback_days` defaults to 365 when not provided
- [ ] `auto_update_lookback_days` below minimum (e.g., < 30) returns a validation error
- [ ] `auto_update_lookback_days` above maximum (e.g., > 730) returns a validation error
- [ ] User must own the strategy; updating another user's strategy returns 404
- [ ] Unauthenticated request returns 401
- [ ] Enabling auto-update when user is over backtest/strategy limits still succeeds (limits apply at run time, not toggle time)

### 1.2 UI Tests – Auto-Update Toggle

- [ ] Strategy detail page displays a "Auto-update daily" switch
- [ ] Helper text is shown: "Re-run this strategy once per day on the latest data (counts towards your daily backtest limit)."
- [ ] Toggling the switch calls `PATCH /strategies/{id}` with the correct body
- [ ] Success toast is shown after toggling
- [ ] Error toast is shown if the API call fails
- [ ] (Optional) Lookback window dropdown/input is available with options: 90, 180, 365 days

---

## 2. Scheduler Worker (S6.2)

### 2.1 Daily Task Algorithm

- [ ] Scheduler runs once per day at the configured time (default 02:00 UTC)
- [ ] Scheduler finds all strategies with `auto_update_enabled = true`
- [ ] For each auto-enabled strategy, the latest strategy version is resolved
- [ ] Date range is computed: `date_to = now (rounded to last completed candle)`, `date_from = date_to - auto_update_lookback_days`
- [ ] A backtest job is enqueued using the same code path as manual backtests
- [ ] Enqueued run has `triggered_by = "auto"` in the `backtest_runs` record
- [ ] On successful completion, `strategies.last_auto_run_at` is updated to the completion timestamp
- [ ] (Optional) `is_latest_for_strategy` flag is set on the new run and cleared on the previous one

### 2.2 Usage Limit Integration

- [ ] Auto-runs count towards the same per-user daily backtest limit as manual runs
- [ ] When a user's daily limit would be exceeded, the auto-run is skipped
- [ ] Skipped auto-runs are logged with a clear reason
- [ ] Skipping is done in a deterministic order (e.g., by strategy ID or newest first)
- [ ] After skipping, remaining strategies for other users continue to be processed

### 2.3 Failure Handling

- [ ] If a scheduled job fails (invalid strategy, vendor outage), `backtest_runs.status = "failed"` with a human-readable error
- [ ] Failed auto-runs do NOT update `strategies.last_auto_run_at`
- [ ] Failures do NOT disable `auto_update_enabled` on the strategy
- [ ] A failure in one strategy's auto-run does NOT prevent other strategies from being scheduled

### 2.4 Idempotency

- [ ] If the scheduler accidentally runs twice in a short window, no duplicate jobs are enqueued for the same strategy
- [ ] Duplicate detection checks for existing `backtest_runs` with `triggered_by = "auto"` and `status in ("pending", "running")` for that strategy in the last N hours
- [ ] Scheduler task scans and enqueues all auto-enabled strategies in under 1 minute under expected load

---

## 3. UI Freshness Indicators (S6.3)

### 3.1 Strategy List – Auto-Update Status

- [ ] Strategies with `auto_update_enabled = true` show a pill: "Auto: On"
- [ ] Strategies with `auto_update_enabled = false` show no pill or "Auto: Off"
- [ ] `last_auto_run_at` timestamp is displayed in small text (e.g., "2025-01-10 02:17 UTC")

### 3.2 Strategy List – Freshness Badge

- [ ] If `last_auto_run_at` is today: badge shows "Updated today"
- [ ] If `last_auto_run_at` is older than today or null (and `auto_update_enabled = true`): badge shows "Needs update"
- [ ] Badge has a tooltip explaining: "Based on last automatic run."
- [ ] Freshness badge logic is simple and predictable

### 3.3 Strategy Detail – Latest Auto-Run Summary (Optional)

- [ ] Strategy detail page shows a "Latest auto-run" card (if implemented)
- [ ] Card displays date/time of last auto-run
- [ ] Card displays key metrics: total return, max drawdown, number of trades
- [ ] "View run" button links to the backtest results page
- [ ] Data is fetched from backtest history filtered by `triggered_by=auto`

---

## 4. Data Model

### 4.1 `strategies` Table Extensions

- [ ] `auto_update_enabled` column exists (boolean, default `false`)
- [ ] `auto_update_lookback_days` column exists (integer, nullable, default 365)
- [ ] `last_auto_run_at` column exists (timestamp, nullable)
- [ ] No new tables are introduced for this epic

### 4.2 `backtest_runs` Table Extensions

- [ ] `triggered_by` column exists (string/enum: `manual`, `auto`; default `manual`)
- [ ] (Optional) `is_latest_for_strategy` column exists (boolean, default `false`)
- [ ] Existing backtest runs are not affected by the migration (default to `triggered_by = "manual"`)

---

## 5. Transparency

- [ ] UI clearly states: "Auto-updates use the same simulated backtests as manual runs (OHLCV-based, with fees & slippage assumptions). This is not live trading or financial advice."
- [ ] Auto-runs use the same backtest engine and assumptions as manual runs
- [ ] Auto-runs are visible in the backtest history alongside manual runs (distinguishable by `triggered_by`)

---

## 6. Non-Functional

- [ ] Scheduler runs inside the existing worker container (no new services)
- [ ] Scheduler is configured via a single periodic task (e.g., Celery beat entry)
- [ ] Scheduler time-of-day is configurable via environment variable
- [ ] Individual auto-backtests follow the same SLA as manual runs (e.g., 30s for 1 year of 1h candles)
- [ ] No intraday or per-minute scheduling exists (daily only for MVP)
- [ ] No per-user cron configuration exists (global schedule only)

---

## 7. Edge Cases

- [ ] Enabling auto-update on an archived strategy does not cause errors (scheduler should skip archived strategies or handle gracefully)
- [ ] Disabling auto-update mid-day does not affect already-enqueued runs for that day
- [ ] Strategy with no saved versions and auto-update enabled is handled gracefully by the scheduler (skip with log)
- [ ] User with all strategies auto-enabled but at daily limit results in all being skipped with logs
- [ ] Auto-run for a strategy whose asset data is unavailable fails gracefully with a clear error
- [ ] Multiple users with auto-enabled strategies are processed independently
- [ ] Changing `auto_update_lookback_days` takes effect on the next scheduled run
