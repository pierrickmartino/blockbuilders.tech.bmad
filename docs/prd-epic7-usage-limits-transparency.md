# PRD — Epic 7: Usage Limits & Transparency (Blockbuilders MVP)

## Summary
Implement **soft usage limits** (beta-friendly caps) and a **clear, lightweight explanation of simulation assumptions** so users understand what’s allowed and what backtest results do (and do not) represent.

This PRD covers:
- Per-user limits (strategies + backtests/day), enforced server-side with friendly errors
- Small UI surfaces showing remaining usage
- “Assumptions” content shown where it matters (results + a simple static page/section)

Keep it simple: no billing, no plans, no payments, no complex quotas.

## Goals
1. Prevent abuse and keep the system stable during beta via **configurable soft limits**.
2. Make backtests **transparent**: users understand OHLCV-based simulation, fees/slippage assumptions, and MVP constraints.
3. Ensure limit errors are **clear and non-blocking** (users know what happened and what to do next).

## Non-goals (MVP)
- Payments, subscriptions, plan tiers, upgrades
- Complex rate-limiting across IPs/devices
- Real-time paper trading or tick-level simulation explanations beyond “not supported”
- Advanced compliance flows (KYC, suitability checks)

## Primary user
Retail crypto tinkerer (non-technical). Needs clear guardrails and simple explanations.

---

## User stories (Epic 7)
### S7.1 Soft usage limits per user
As a user, I want clear limits on how many strategies and backtests I can create, so that I understand what’s allowed in the beta.

### S7.2 Clear simulation assumptions
As a user, I want a concise explanation of the simulation assumptions, so that I don’t mistake backtests for guaranteed results.

---

## Functional requirements

### 1) Limits configuration
**Server-side config** (env vars or a single config file) for:
- `MAX_STRATEGIES_PER_USER` (default: 10)
- `MAX_BACKTESTS_PER_USER_PER_DAY` (default: 50)
- (Optional but nice) `BACKTESTS_DAY_ROLLOVER_TZ` (default: UTC)

Notes:
- Defaults are “beta-friendly” and can be adjusted without DB migrations.
- If a limit is unset, treat it as “no limit” (for internal testing).

### 2) Enforce max strategies per user
When creating a new strategy:
- If user already has >= `MAX_STRATEGIES_PER_USER` active (non-archived) strategies:
  - Reject request with **HTTP 403** (or 429; pick one and be consistent)
  - Return a friendly, structured error:
    - `code`: `LIMIT_STRATEGIES_REACHED`
    - `message`: e.g. “You’ve reached the beta limit of 10 strategies.”
    - `limit`: 10
    - `current`: 10
    - `reset_at`: null (not time-based)

Archiving a strategy should free a slot.

### 3) Enforce max backtests per user per day
When creating a backtest run:
- If user has already created >= `MAX_BACKTESTS_PER_USER_PER_DAY` runs for “today”:
  - Reject with **HTTP 429** (recommended for quotas)
  - Return:
    - `code`: `LIMIT_BACKTESTS_DAILY_REACHED`
    - `message`: e.g. “You’ve hit today’s beta limit of 50 backtests. Try again tomorrow.”
    - `limit`: 50
    - `current`: 50
    - `reset_at`: ISO timestamp for next rollover

Counting rules:
- Count **all attempts** that create a run record (pending/running/completed/failed) to prevent spam.
- Retries for the same `run_id` do not count (but creating a new run does).
- Scheduled re-backtests count the same way (simple and fair).

### 4) Usage status endpoint
Provide a simple endpoint so the UI can display usage:
- `GET /usage/me`

Response:
```json
{
  "strategies": { "current": 3, "limit": 10 },
  "backtests_today": { "current": 12, "limit": 50, "reset_at": "2025-12-13T00:00:00Z" }
}
```

### 5) UI: show usage status (minimal)
- In the strategy list header or user menu:
  - “Strategies: 3/10”
  - “Backtests today: 12/50”
- When a limit is hit, show a clear toast/dialog:
  - Strategy create: “You’ve reached the beta limit of 10 strategies. Archive one to create another.”
  - Backtest create: “You’ve hit today’s beta limit of 50 backtests. Try again tomorrow.”

No fancy dashboards. Just enough to reduce confusion.

### 6) UI: assumptions & disclaimer
Add a compact assumptions section in two places:

**A) Backtest results page (always visible, small):**
- “Simulated performance. Not investment advice.”
- Link: “How backtests work”

**B) “How backtests work” page/section (static content):**
Must mention (in plain language):
- Uses **OHLCV candle data** (not tick/order book)
- Fees: fixed model (user default + optional override)
- Slippage: simple extra cost per trade
- MVP constraints: single asset, single timeframe
- “Backtests are simulations and don’t guarantee future results.”

Keep it short (bullet list). No walls of text.

---

## API requirements (concrete)

### Strategy create
- `POST /strategies/`
- On limit reached: 403 with `LIMIT_STRATEGIES_REACHED`

### Backtest create
- `POST /backtests/`
- On daily limit reached: 429 with `LIMIT_BACKTESTS_DAILY_REACHED`

### Usage
- `GET /usage/me`

Error schema (common):
```json
{
  "error": {
    "code": "LIMIT_BACKTESTS_DAILY_REACHED",
    "message": "You’ve hit today’s beta limit of 50 backtests. Try again tomorrow.",
    "meta": { "limit": 50, "current": 50, "reset_at": "2025-12-13T00:00:00Z" }
  }
}
```

---

## Data & counting approach (keep simple)

### Option A (preferred): derive counts from existing tables
- Strategies count: `strategies WHERE user_id=? AND archived_at IS NULL`
- Backtests/day count: `backtest_runs WHERE user_id=? AND created_at >= day_start AND created_at < day_end`

Pros: no new tables.
Cons: needs an index to be fast.

Required DB indexes:
- `strategies(user_id, archived_at)`
- `backtest_runs(user_id, created_at)`

### Option B: lightweight daily counter table (only if needed)
Only add if Option A is too slow at scale.

---

## Edge cases & rules
- Changing limits mid-day: use the new limits immediately (simple).
- Timezone for “today”: default UTC; can be configured. UI shows reset time.
- Failed runs still count (prevents spamming vendor/data endpoints).
- Archived strategies don’t count toward the max.
- Admin/dev bypass (optional): env var `DISABLE_USAGE_LIMITS=true`.

---

## Acceptance criteria

### Limits
- Creating the (limit+1)th strategy returns a friendly error (no 500).
- Creating the (limit+1)th backtest “today” returns 429 + reset time.
- `GET /usage/me` matches server enforcement behavior.
- UI surfaces usage and shows clear messages on failure.

### Transparency
- Results page shows a short disclaimer and link.
- “How backtests work” content includes all required assumptions bullets.
- Assumptions match actual MVP behavior (OHLCV-only, fee/slippage models, single asset/timeframe).

---

## Minimal analytics (optional but useful)
Track (server-side logs or a simple events table):
- `limit_hit` event with type: `strategies` or `backtests_daily`
- Clicks on “How backtests work”
- Time spent on assumptions page (frontend only, optional)

---

## Rollout plan
1. Ship server-side enforcement + `/usage/me`
2. Add UI display + friendly error handling
3. Add assumptions content + link from results page
4. Monitor logs for frequent limit hits; adjust defaults if needed

