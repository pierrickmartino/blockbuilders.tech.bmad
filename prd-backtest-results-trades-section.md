# PRD – Backtest Results Trades Section

## Summary
Add a **Trades** section to the Backtest Results page so users can inspect every simulated trade (entry/exit + P&L) in a simple, readable table. This implements the MVP user story **S5.3 – Trades table**.

## Goals
- Show **all trades** from a completed backtest run in a table.
- Make it easy to scan **when** trades happened, **at what prices**, and **whether each trade won/lost**.
- Keep the UI minimal: readable defaults, pagination, and basic formatting.

## Non-goals (for MVP)
- No advanced analytics (MAE/MFE, excursions, trade tagging, charts per trade).
- No export (CSV), filtering, or complex multi-column sorting.
- No per-trade chart drill-down.

## User story
“As a user, I want a table of all trades (entry, exit, P&L), so that I can inspect how the strategy behaved on individual trades.”

## Placement in UI
Backtest Results page layout (high level):
1. Metrics overview
2. Equity curve chart
3. (Optional) Drawdown chart
4. **Trades section (this PRD)**

### Trades section UI
- Section header: **Trades**
- Subtitle (small): “Showing trades simulated for this run.”
- Table with columns (MVP):
  1. **Entry time (UTC)**
  2. **Entry price**
  3. **Exit time (UTC)**
  4. **Exit price**
  5. **P&L**
  6. **Side** (default: `LONG`)

### Defaults
- Sort order: **most recent entry first** (descending by entry time).
- Page size: **25 rows** (configurable; offer 25/50/100 if trivial).
- Times displayed in **UTC** (explicit “UTC” label in column header).

### Formatting rules
- Prices:
  - Display with up to 2–8 decimals depending on the asset price (simple rule: trim trailing zeros).
- P&L:
  - Show **absolute P&L** (quote currency) and optionally **%** if available.
  - Display “+” for positive values.
  - (Optional but simple) color positive/negative values (green/red).

### Empty / error states
- If there are **0 trades**: show “No trades were generated for this run.”
- If results are still **Pending/Running**: hide or disable the table and show a small loading indicator.
- If trades cannot be loaded: show a compact error with “Retry”.

## Data requirements

### Trade record (backend → frontend)
Each trade row must map to this minimal shape:

```json
{
  "id": "string-or-int",
  "side": "LONG",
  "entry_time": "2025-01-10T14:22:00Z",
  "entry_price": 42123.45,
  "exit_time": "2025-01-12T09:00:00Z",
  "exit_price": 43000.00,
  "pnl": 876.55,
  "pnl_pct": 0.0208
}
```

Notes:
- `id` can be the trade index if nothing else exists.
- `pnl_pct` is optional; if not provided, frontend can omit it or compute if position sizing makes it unambiguous.
- `side` is `LONG` for MVP.

### Pagination response shape
To support pagination without downloading huge payloads:

```json
{
  "run_id": "bt_123",
  "total": 312,
  "page": 1,
  "page_size": 25,
  "items": [ /* trade records */ ]
}
```

## API requirements

### Option A (preferred): dedicated paginated endpoint
**GET** `/backtests/{run_id}/trades?page=1&page_size=25`

- Auth required; only the run owner can access.
- Returns the pagination response shape above.
- Error cases:
  - `404` if run does not exist / not owned by user.
  - `409` if run status is not `completed` (include status in message).
  - `500` with user-friendly message if storage read fails.

### Option B (acceptable if already exists): include trades in details endpoint
**GET** `/backtests/{run_id}/details`

- Returns equity curve + trades in one payload.
- Frontend paginates client-side.
- Use this only if trade count is expected to stay small enough for MVP.

**Pick the simplest option that matches the current backend structure.**
If results are already stored as a single JSON blob (equity curve + trades), implement Option B first, then upgrade to Option A if payload size becomes a problem.

## Backend implementation notes (minimal)
- Source of truth is the stored backtest result JSON (e.g., in object storage).
- For Option A:
  - Read the stored result once and slice `trades[(page-1)*page_size : page*page_size]`.
  - (Optional) cache parsed result in Redis keyed by `run_id` for a short TTL (e.g., 5 minutes).
- Ensure times are stored/returned as ISO-8601 with `Z` (UTC).

## Frontend implementation notes (minimal)
- Add a `<TradesTable />` component to the Backtest Results page.
- Responsibilities:
  - Fetch trades (Option A: server-paginated; Option B: full list then paginate in memory).
  - Render:
    - Loading state
    - Error state
    - Empty state
    - Table + pagination controls
- Keep dependencies light:
  - Plain table (HTML) or existing UI table component if already in the project.
- Pagination controls:
  - Previous / Next
  - “Page X of Y” (Y = ceil(total/page_size))
  - Page size selector is optional.

## Acceptance criteria
- On a **completed** backtest run with trades, the user can:
  - See a Trades section containing a table with the required columns.
  - Navigate between pages (if total > page_size).
  - Understand time zone (UTC labeled).
- On a run with **0 trades**, the user sees the empty message.
- On a run not completed yet, the Trades section does not error and clearly indicates loading / unavailable.
- Trades displayed match stored results (no missing/duplicated trades across pages).

## QA checklist
- Large trade counts (e.g., 1,000+): pagination remains responsive.
- Numeric formatting: prices and P&L don’t render as “NaN”, and handle very small/large values.
- Access control: user cannot fetch another user’s run trades.
- Mobile: table is horizontally scrollable (simple `overflow-x-auto`).

## Telemetry (optional but simple)
- `backtest_trades_loaded` (run_id, total, page_size)
- `backtest_trades_page_changed` (run_id, page)
