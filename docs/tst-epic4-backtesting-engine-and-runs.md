# Test Checklist – Backtesting Engine & Runs (Epic 4)

> Source PRD: `prd-epic4-backtesting-engine-and-runs.md`

---

## 1. Create a Backtest Run (S4.1)

### 1.1 API Tests – `POST /backtests/`

- [x] Successful request with valid `strategy_id`, `date_from`, and `date_to` returns 201 with `run_id` and `status: "pending"`
- [x] A `backtest_runs` record is created in the database with `status = "pending"`
- [x] A job is enqueued in the Redis-backed queue with the `run_id`
- [x] `strategy_version_id` is set to the latest valid version of the strategy
- [x] `asset` and `timeframe` are copied from the strategy record
- [x] `fee_rate` and `slippage_rate` default to user settings if not provided in the request
- [x] `fee_rate` and `slippage_rate` use global defaults if neither overrides nor user settings exist
- [x] Explicit `fee_rate` and `slippage_rate` overrides in the request body are used when provided
- [ ] Unauthenticated request returns 401

### 1.2 Validation Rules

- [ ] `strategy_id` that does not exist returns 400 with a human-readable error
- [x] `strategy_id` that belongs to another user returns 404
- [x] Strategy with no saved versions returns 400 with a human-readable error
- [ ] `date_from` after `date_to` returns 400 with a clear error
- [ ] `date_from` equal to `date_to` returns 400 with a clear error
- [x] `date_from` older than the maximum vendor history range returns 400 with a clear error
- [ ] Missing `strategy_id` returns 400
- [ ] Missing `date_from` or `date_to` returns 400
- [ ] Negative `fee_rate` returns 400
- [ ] Negative `slippage_rate` returns 400

### 1.3 Queue Failure Handling

- [x] If queue enqueue fails, the `backtest_runs` record is marked `status = "failed"` with an `error_message`
- [x] API returns 500 with a simple error message when queue enqueue fails

---

## 2. Fetch Historical OHLCV Data (S4.2)

### 2.1 Candle Fetching

- [x] Worker fetches candles for the requested `asset`, `timeframe`, and `[date_from, date_to]` range
- [x] Candles already in the DB/cache are used without calling the vendor API
- [ ] Missing candle ranges trigger vendor API calls for just the missing chunks
- [x] Fetched candles are inserted into the DB and/or cache for future reuse
- [x] Candles are returned sorted by timestamp ascending

### 2.2 Supported Assets & Timeframes

- [x] Only supported assets (e.g., BTC/USDT, ETH/USDT) can be fetched
- [ ] Only supported timeframes (e.g., 1h, 4h) can be fetched
- [x] Requesting unsupported asset/timeframe results in a failed run with a clear error

### 2.3 Gap Handling

- [x] Small gaps (1-2 missing candles) are skipped without aborting
- [x] Large gaps (above configurable threshold) abort the run with `status = "failed"`
- [x] Error message for large gaps is user-friendly: "Missing price data for [date range]. Please try a shorter period."

### 2.4 Vendor Errors

- [x] Vendor API failure marks the run as `failed` with error message "Data provider unavailable"
- [ ] Vendor error details are logged server-side for ops but not exposed to the user

---

## 3. Execute Backtest & Store Results (S4.3)

### 3.1 Worker Lifecycle

- [x] Worker loads the `backtest_runs` record by `run_id`
- [x] Worker skips runs with `status != "pending"` (idempotency: no double-processing)
- [x] Worker sets `status = "running"` before starting execution
- [ ] Worker loads the strategy JSON definition for the `strategy_version_id`
- [x] Worker fetches required candles for the date range
- [x] On completion, worker updates `status = "completed"` with summary metrics and storage keys
- [x] On any failure, worker updates `status = "failed"` with a human-readable `error_message`

### 3.2 Backtest Execution Model

- [x] Entry signal (`entry_long = true`) opens a long position at the next candle's open (or same candle close, whichever convention is chosen)
- [x] Only one position at a time (no pyramiding)
- [x] While in a long position, TP is checked: if `high` hits TP price, exit at TP
- [x] While in a long position, SL is checked: if `low` hits SL price, exit at SL
- [x] While in a long position, exit signal (`exit_long = true`) closes at candle close
- [ ] TP is checked before SL within the same candle (consistent priority)
- [x] No short positions are opened (long-only for MVP)
- [x] When flat, exit signals are ignored
- [x] When in position, entry signals are ignored

### 3.3 Fees & Slippage

- [x] Fee rate is applied on both entry and exit
- [x] Slippage rate is applied on both entry and exit
- [ ] Effective fill price calculation is consistent with the documented formula
- [x] Zero fee and zero slippage are handled correctly (no errors)
- [x] Fee and slippage values come from: request overrides > user defaults > global defaults (in that priority)

### 3.4 Equity & PnL Tracking

- [x] Equity time series is computed per candle
- [x] Per-trade PnL is computed in quote currency
- [x] Initial balance is correctly set (e.g., 10,000 USDT)
- [x] Final balance reflects all trades, fees, and slippage

### 3.5 Summary Metrics

- [x] `initial_balance` is stored correctly
- [ ] `final_balance` is stored correctly
- [x] `total_return_pct` is calculated correctly: `(final - initial) / initial * 100`
- [x] `cagr_pct` is calculated correctly based on the backtest period
- [x] `max_drawdown_pct` is calculated correctly (peak-to-trough)
- [x] `num_trades` counts all completed trades
- [x] `win_rate_pct` is calculated correctly: `winning trades / total trades * 100`
- [ ] Summary is stored as JSON in `backtest_runs.summary`

### 3.6 Stored Outputs – Equity Curve

- [x] Equity curve is stored as JSON in object storage
- [x] Equity curve format: array of `{ "timestamp": "...", "equity": ... }`
- [x] `equity_curve_key` in `backtest_runs` points to the correct storage object

### 3.7 Stored Outputs – Trades List

- [x] Trades list is stored as JSON in object storage
- [x] Trades format: array of objects with `entry_time`, `entry_price`, `exit_time`, `exit_price`, `side`, `pnl`
- [x] `trades_key` in `backtest_runs` points to the correct storage object
- [x] All trades have `side = "long"` for MVP

---

## 4. Backtest Status & Error Handling (S4.4)

### 4.1 API Tests – `GET /backtests/{run_id}`

- [x] Returns 200 with the run details including `run_id`, `strategy_id`, `status`, `asset`, `timeframe`, `date_from`, `date_to`
- [x] For `status = "completed"`, response includes the full `summary` object
- [x] For `status = "pending"` or `"running"`, `summary` is `null`
- [x] For `status = "failed"`, `error_message` contains a user-friendly string
- [x] `error_message` is `null` for non-failed runs
- [x] Requesting a `run_id` not owned by the user returns 404
- [x] Requesting a non-existent `run_id` returns 404
- [x] No stack traces or internal details are leaked in error responses
- [ ] Unauthenticated request returns 401

### 4.2 Status Transitions

- [x] Run transitions from `pending` -> `running` -> `completed` (happy path)
- [x] Run transitions from `pending` -> `running` -> `failed` (error path)
- [x] Frontend can poll the endpoint and observe the status progression

---

## 5. Performance

- [x] Backtesting 1 year of hourly candles completes in 30 seconds or less under normal load
- [x] Candle data is cached aggressively to avoid repeated vendor calls
- [x] `POST /backtests/` responds in under 300ms
- [x] `GET /backtests/{run_id}` responds in under 300ms

---

## 6. Reliability & Idempotency

- [x] Duplicate job processing does not occur: worker skips runs with `status != "pending"`
- [x] Each run either completes fully (metrics + storage) or fails with a clear error
- [x] No duplicate trades are generated from retry scenarios
- [ ] No duplicate `backtest_runs` records are created from retry scenarios
- [ ] If the worker crashes mid-run, the run remains in `running` status (can be cleaned up or retried)

---

## 7. Transparency

- [x] Backtest assumptions are documented: OHLCV-based, fixed fee/slippage model, single-asset, single-timeframe, long-only
- [x] Summary object is simple enough for the UI to display all key metrics
- [x] Fee and slippage values used for the run are stored or retrievable

---

## 8. Edge Cases

- [x] Strategy with no trades in the date range produces a valid completed run with `num_trades = 0`
- [ ] Strategy that triggers a trade at the very last candle handles the exit correctly
- [x] Strategy that triggers entry on the first candle works correctly
- [x] Backtest with very short date range (e.g., 1 day) completes without error
- [ ] Backtest with very long date range (e.g., 3 years) completes within acceptable time
- [x] TP and SL both triggered within the same candle are resolved with a consistent priority
- [x] Position size of 100% of equity works correctly
- [x] Position size of a very small percentage (e.g., 0.1%) works correctly
- [x] Run with 0 fee and 0 slippage produces expected results
- [x] Run with maximum reasonable fee (e.g., 5%) produces expected results
- [ ] Multiple concurrent backtest runs for the same user process independently
- [ ] Multiple concurrent backtest runs for different users process independently
