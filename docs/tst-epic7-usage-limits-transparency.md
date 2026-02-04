# Test Checklist – Usage Limits & Transparency (Epic 7)

> Source PRD: `prd-epic7-usage-limits-transparency.md`

---

## 1. Limits Configuration

- [ ] `MAX_STRATEGIES_PER_USER` is configurable via environment variable (default: 10)
- [ ] `MAX_BACKTESTS_PER_USER_PER_DAY` is configurable via environment variable (default: 50)
- [ ] `BACKTESTS_DAY_ROLLOVER_TZ` is configurable (default: UTC)
- [ ] Defaults can be adjusted without DB migrations
- [ ] If a limit env var is unset, the system treats it as "no limit" (for internal testing)
- [ ] (Optional) `DISABLE_USAGE_LIMITS=true` bypasses all limits for admin/dev use

---

## 2. Enforce Max Strategies Per User (S7.1)

### 2.1 API Tests – `POST /strategies/`

- [ ] User with fewer than `MAX_STRATEGIES_PER_USER` active strategies can create a new strategy successfully
- [ ] User with exactly `MAX_STRATEGIES_PER_USER` active (non-archived) strategies gets HTTP 403 (or 429)
- [ ] Error response includes `code: "LIMIT_STRATEGIES_REACHED"`
- [ ] Error response includes a friendly `message` (e.g., "You've reached the beta limit of 10 strategies.")
- [ ] Error response includes `limit` and `current` values
- [ ] Error response includes `reset_at: null` (not time-based)
- [ ] Archived strategies do NOT count toward the max
- [ ] After archiving a strategy, user can create a new one (slot is freed)
- [ ] Duplicating a strategy also counts toward the limit and is rejected if at max

### 2.2 Count Accuracy

- [ ] Count is derived from `strategies WHERE user_id = ? AND is_archived = false` (or equivalent)
- [ ] Count is accurate immediately after archiving/unarchiving
- [ ] Count is accurate immediately after creating/deleting strategies

---

## 3. Enforce Max Backtests Per User Per Day (S7.1)

### 3.1 API Tests – `POST /backtests/`

- [ ] User with fewer than `MAX_BACKTESTS_PER_USER_PER_DAY` runs today can create a new backtest
- [ ] User at the daily limit gets HTTP 429
- [ ] Error response includes `code: "LIMIT_BACKTESTS_DAILY_REACHED"`
- [ ] Error response includes a friendly `message` (e.g., "You've hit today's beta limit of 50 backtests. Try again tomorrow.")
- [ ] Error response includes `limit`, `current`, and `reset_at` (ISO timestamp for next rollover)
- [ ] `reset_at` correctly reflects the next UTC midnight (or configured timezone rollover)

### 3.2 Counting Rules

- [ ] All run records (pending, running, completed, failed) count toward the daily limit
- [ ] Retries for the same `run_id` do NOT increment the count (but a new run does)
- [ ] Scheduled re-backtests (auto-triggered) count the same as manual runs
- [ ] Failed runs count toward the limit (prevents spam)
- [ ] Count resets at the configured rollover time (default: UTC midnight)

### 3.3 Count Accuracy

- [ ] Count is derived from `backtest_runs WHERE user_id = ? AND created_at >= day_start AND created_at < day_end`
- [ ] Count is accurate immediately after creating a new run
- [ ] After rollover time, the count resets to 0

---

## 4. Usage Status Endpoint

### 4.1 API Tests – `GET /usage/me`

- [ ] Returns JSON with `strategies` object containing `current` and `limit`
- [ ] Returns JSON with `backtests_today` object containing `current`, `limit`, and `reset_at`
- [ ] `strategies.current` matches the actual number of active (non-archived) strategies
- [ ] `strategies.limit` matches the configured `MAX_STRATEGIES_PER_USER`
- [ ] `backtests_today.current` matches the actual count of runs created today
- [ ] `backtests_today.limit` matches the configured `MAX_BACKTESTS_PER_USER_PER_DAY`
- [ ] `backtests_today.reset_at` is a valid ISO timestamp for the next rollover
- [ ] Unauthenticated request returns 401
- [ ] Response matches server enforcement behavior (counts are consistent with limit enforcement)

---

## 5. UI – Usage Status Display (S7.1)

### 5.1 Usage Indicators

- [ ] Strategy list header or user menu displays "Strategies: X/Y" (e.g., "Strategies: 3/10")
- [ ] Strategy list header or user menu displays "Backtests today: X/Y" (e.g., "Backtests today: 12/50")
- [ ] Usage values update dynamically after creating strategies or backtests

### 5.2 Limit Hit – Strategy Create

- [ ] When strategy creation is rejected due to limit, a clear toast/dialog is shown
- [ ] Message includes actionable guidance: "Archive one to create another."
- [ ] No server error (500) is shown; the error is handled gracefully

### 5.3 Limit Hit – Backtest Create

- [ ] When backtest creation is rejected due to daily limit, a clear toast/dialog is shown
- [ ] Message tells the user to try again tomorrow
- [ ] No server error (500) is shown; the error is handled gracefully

---

## 6. UI – Assumptions & Disclaimer (S7.2)

### 6.1 Backtest Results Page

- [ ] A short disclaimer is always visible on the backtest results page: "Simulated performance. Not investment advice."
- [ ] A "How backtests work" link is displayed next to or below the disclaimer
- [ ] Clicking the link navigates to the assumptions page/section

### 6.2 "How Backtests Work" Page/Section

- [ ] Page/section exists and is accessible
- [ ] Content mentions OHLCV candle data (not tick/order book)
- [ ] Content mentions the fixed fee model (user default + optional override)
- [ ] Content mentions simple slippage (extra cost per trade)
- [ ] Content mentions MVP constraints: single asset, single timeframe
- [ ] Content includes the disclaimer: "Backtests are simulations and don't guarantee future results."
- [ ] Content is concise (bullet list format, no walls of text)
- [ ] Assumptions described match actual MVP behavior

---

## 7. Error Response Schema

- [ ] Strategy limit error follows the common error schema: `{ "error": { "code": "...", "message": "...", "meta": { ... } } }`
- [ ] Backtest limit error follows the common error schema
- [ ] `meta` object includes relevant fields: `limit`, `current`, `reset_at` (where applicable)
- [ ] Error messages are in plain language and actionable

---

## 8. Database Indexes

- [ ] Index exists on `strategies(user_id, is_archived)` or equivalent for fast counting (Option A)
- [ ] Index exists on `backtest_runs(user_id, created_at)` or equivalent for fast daily counting (Option A)
- [ ] Queries for counting strategies and backtests are performant

---

## 9. Edge Cases

- [ ] Changing `MAX_STRATEGIES_PER_USER` mid-session applies immediately (no restart required, or documented behavior)
- [ ] Changing `MAX_BACKTESTS_PER_USER_PER_DAY` mid-day applies the new limit immediately
- [ ] User with exactly the limit number of strategies can still archive and re-create (slot freed)
- [ ] User with 0 strategies sees "Strategies: 0/10" and can create freely
- [ ] User with 0 backtests today sees "Backtests today: 0/50"
- [ ] Timezone edge case: a backtest created at 23:59 UTC counts for today; one at 00:01 UTC counts for tomorrow
- [ ] Failed runs still count toward the daily limit
- [ ] Multiple rapid API calls near the limit boundary do not allow exceeding the limit (race condition safety)
- [ ] If limits are disabled (`DISABLE_USAGE_LIMITS=true`), strategy creation and backtest creation are unrestricted
- [ ] `GET /usage/me` reflects correct values even when limits are disabled (shows "no limit" or similar)

---

## 10. Analytics (Optional)

- [ ] `limit_hit` events are logged server-side with type (`strategies` or `backtests_daily`)
- [ ] Clicks on "How backtests work" are tracked (if implemented)
