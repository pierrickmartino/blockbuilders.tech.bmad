# MVP User Stories for Blockbuilders

Here’s a first pass at ~20 atomic, iterative stories to get the MVP in `mvp.md` live.

I’ve grouped them by “epic” but each story is intentionally small and vertical-friendly.

---

## Epic 0 – Foundation & Environment

### S0.1 – Local dev & basic deploy

> As a developer, I want a reproducible local setup and a simple deployment target, so that I can run the whole stack easily and ship changes fast.

- Done when: `docker-compose up` (or equivalent) runs FastAPI API, worker, Postgres, Redis, and Next.js.
- There is a minimal “healthcheck” page on frontend and `/health` endpoint on backend.

### S0.2 – Core data model & migrations

> As a developer, I want core DB tables for users, strategies, strategy versions, backtest runs, and candles, so that I can build features without reworking the schema later.

- Tables exist and are migrated: `users`, `strategies`, `strategy_versions`, `backtest_runs`, `candles` (plus basic timestamps / FKs).
- ORM models wired up in FastAPI (SQLModel / SQLAlchemy).

---

## Epic 1 – Authentication & Accounts

### S1.1 – Email/password signup

> As a new user, I want to create an account with email and password, so that I can save my strategies and runs.

- POST `/auth/signup` endpoint with basic validation.
- Next.js form with simple success/error messages.
- Passwords stored hashed; duplicate email blocked.

### S1.2 – Login & session persistence

> As a user, I want to log in and stay logged in, so that I can come back and see my work without re-authenticating every minute.

- POST `/auth/login` issues JWT or session token.
- Frontend stores token securely (HTTP-only cookie or secure storage) and attaches it to API calls.
- Protected pages redirect to login if unauthenticated.

### S1.3 – Basic account settings (fee & slippage defaults)

> As a user, I want to set my default trading fee and slippage assumptions, so that my backtests match my usual exchange conditions.

- Simple `/users/me` endpoint for reading/updating a few settings (fee %, slippage %).
- Frontend settings page with small form; backtests default to these values if not overridden.

---

## Epic 2 – Strategy Management

### S2.1 – Create a blank strategy

> As a user, I want to create a new blank strategy with a name, asset, and timeframe, so that I have a starting point for building my logic.

- POST `/strategies/` to create a strategy with `name`, `asset`, `timeframe`.
- Asset & timeframe restricted to MVP-supported ones (e.g. BTC/USDT, ETH/USDT; 1h / 4h).
- UI: “New strategy” button → modal or page with that form → redirects to strategy editor.

### S2.2 – List my strategies

> As a user, I want to see a list of my strategies, so that I can quickly open, manage, and understand what I’ve already built.

- GET `/strategies/` returns only the current user’s strategies.
- Each row shows: name, asset, timeframe, last modified, “auto-update on/off”.
- Next.js page: sortable, searchable list (even basic search is fine).

### S2.3 – Edit, duplicate, archive a strategy

> As a user, I want to edit, duplicate, and archive a strategy, so that I can iterate safely without losing old work.

- PATCH `/strategies/{id}` for name/metadata.
- POST `/strategies/{id}/duplicate` to copy strategy + latest version.
- “Archive/Delete” action that hides a strategy from default list (soft delete).

### S2.4 – Strategy versioning

> As a user, I want each save to create a version of my strategy, so that I can roll back or compare past ideas.

- When saving the logic, backend writes to `strategy_versions` with timestamp and JSON definition.
- GET `/strategies/{id}/versions` returns version list.
- Strategy editor shows a simple version history dropdown (e.g. “v3 – 2025-01-10 14:22”).

---

## Epic 3 – Strategy Canvas (Visual Builder)

### S3.1 – Basic canvas layout & block palette

> As a user, I want a visual canvas with a palette of building blocks, so that I can see and organize the components of my strategy.

- Frontend-only at first: drag-and-drop canvas with a minimal palette (Price, SMA, RSI, Compare, AND).
- Strategy logic stored as a clean JSON graph (blocks + connections).
- Save button sends that JSON to backend as the strategy version payload.

### S3.2 – Indicator blocks configuration

> As a user, I want to add and configure indicator blocks (SMA, EMA, RSI, MACD, Bollinger Bands, ATR), so that I can express typical trading ideas visually.

- Palette: SMA, EMA, RSI, MACD, Bollinger, ATR.
- Each block has a properties panel (e.g. period length, source: close vs open).
- Validation: required fields must be filled before save.

### S3.3 – Logic & signal blocks

> As a user, I want to combine indicator outputs with conditions (>, <, crossovers, AND/OR/NOT), so that I can generate entry/exit signals.

- Blocks: Compare (`>`, `<`, `>=`, `<=`), Crossover (“crosses above/below”), AND, OR, NOT.
- Canvas enforces a simple flow: indicators → conditions → final “Entry Signal” / “Exit Signal” output nodes.
- Backend schema supports these blocks (type + config + wiring).

### S3.4 – Position sizing & risk blocks

> As a user, I want to define fixed position size and simple TP/SL rules, so that my backtests simulate realistic trades.

- Blocks: `PositionSize` (e.g. % of virtual account), `TakeProfit`, `StopLoss`.
- At least long-only strategies for MVP.
- These params end up in the backtest engine config.

### S3.5 – Strategy validation

> As a user, I want to validate my strategy before running a backtest, so that I don’t waste time on broken configurations.

- Backend endpoint `/strategies/{id}/validate` (or integrated into backtest create).
- Checks: there is at least one entry signal, signals are connected, required block parameters are set, asset/timeframe set, etc.
- Canvas shows inline errors next to problematic blocks and a global “valid/invalid” banner.

---

## Epic 4 – Backtesting Engine & Runs

### S4.1 – Create a backtest run (enqueue job)

> As a user, I want to run a backtest for a given strategy and date range, so that I can see how it would have performed.

- POST `/backtests/` with `strategy_id`, `date_from`, `date_to`, optional fee/slippage override.
- Backend validates strategy, writes a `backtest_runs` row with `status=pending`, enqueues a job in Redis queue.
- API returns a `run_id`.

### S4.2 – Fetch historical OHLCV data

> As a backtest engine, I need to fetch and cache OHLCV candles for supported pairs and timeframes, so that runs are fast and consistent.

- Worker integration with chosen vendor API (e.g. exchange or data provider).
- Caches candles in DB (`candles` table) and/or Redis, keyed by `asset`, `timeframe`, `timestamp`.
- Handles simple missing-data gaps gracefully.

### S4.3 – Execute backtest & store results

> As a user, I want the system to reliably execute my backtest and store the results, so that I can reopen them later without rerunning immediately.

- Worker consumes queue job: builds an execution model from strategy JSON, iterates candles, applies signals, TP/SL, and fees.
- Computes metrics: total return, CAGR, max drawdown, # trades, win rate, etc.
- Persists:
  - Summary metrics in `backtest_runs`.
  - Equity curve and trade list as JSON in S3-like storage, with a storage key in `backtest_runs`.

### S4.4 – Backtest status & error handling

> As a user, I want to see whether my backtest is pending, running, completed, or failed, so that I know what’s happening.

- GET `/backtests/{run_id}` returns status and summary.
- Frontend polls (or uses SWR refetch) until status is terminal.
- If errors occur (invalid strategy, vendor error), a human-readable error message is stored and displayed.

---

## Epic 5 – Backtest Results UI & History

### S5.1 – Backtest overview & metrics

> As a user, I want a clear summary of my backtest (returns, drawdown, trades, win rate), so that I can quickly judge whether it’s worth exploring further.

- Results page: metrics card with total return, CAGR, max drawdown, # trades, win rate (and optionally average R).
- Pulls data from `/backtests/{run_id}` and detailed results from a dedicated endpoint that reads S3 file.

### S5.2 – Equity curve & basic charting

> As a user, I want to see an equity curve chart over time, so that I can visually understand how the strategy behaved.

- Simple line chart (e.g. using Recharts) of datetime vs equity.
- Basic interactions: hover tooltip, maybe zoom/pan later.

### S5.3 – Trades table

> As a user, I want a table of all trades (entry, exit, P&L), so that I can inspect how the strategy behaved on individual trades.

- Table with columns: entry time, entry price, exit time, exit price, P&L, side (long).
- Pagination if needed for long periods.

### S5.4 – List & reopen past runs

> As a user, I want to see past backtest runs for each strategy and reopen their results, so that I can compare and revisit earlier experiments.

- GET `/backtests/?strategy_id=...` returns runs (sorted by date).
- On strategy detail page: “Backtest history” table with run date, period, key metrics, and “View results” button.

### S5.5 – Re-run a backtest with updated data

> As a user, I want to re-run a past backtest with fresh data, so that I can see how the same idea holds up with more recent candles.

- UI action “Re-run with latest data” that:
  - Uses same strategy version and parameters.
  - Adjusts `date_to` to “now” (or recent latest).
- Creates a new `backtest_runs` record and goes through the same pipeline.

---

## Epic 6 – Scheduled Re-Backtests (“Soft” Paper Trading)

### S6.1 – Enable auto-update on a strategy

> As a user, I want to turn on daily auto-updates for a strategy, so that I can track its performance over time without manually hitting run.

- Toggle on strategy detail page: “Auto-update daily”.
- Backend stores schedule flag & maybe desired horizon (e.g. last 1 year).

### S6.2 – Scheduler worker & periodic backtests

> As the system, I want a scheduler that enqueues backtests for auto-update strategies, so that performance is refreshed in the background.

- Cron-like job in worker (e.g. RQ scheduler / Celery beat) that:
  - Finds strategies with auto-update enabled.
  - Enqueues backtests once per day (configurable).
- Uses latest available candles; updates latest run for each strategy.

### S6.3 – UI indicator for freshness

> As a user, I want to see whether a strategy’s latest backtest is up-to-date, so that I know if I should trust the current metrics.

- Strategy list shows:
  - Last auto-run date.
  - Badge like “Updated today” / “Needs update”.
- Maybe subtle highlight for strategies with new runs since the user last opened them.

---

## Epic 7 – Usage Limits & Transparency

### S7.1 – Soft usage limits per user

> As a user, I want clear limits on how many strategies and backtests I can create, so that I understand what’s allowed in the beta.

- Configurable limits (e.g. max 10 strategies, 50 backtests/day) in settings or env vars.
- Backend middleware/guards that enforce these and return friendly error messages (not 500s).
- UI surfaces limit status (e.g. “42/50 backtests today”).

### S7.2 – Clear simulation assumptions

> As a user, I want a concise explanation of the simulation assumptions, so that I don’t mistake backtests for guaranteed results.

- Static “Assumptions” / “How backtests work” section in the app (e.g. on results page and/or settings).
- Explicitly mentions:
  - OHLCV-based execution (no tick data).
  - Fee model and slippage model.
  - Single-asset, single-timeframe constraint.
- A small note near results (e.g. “Simulated performance. Not investment advice.”).

