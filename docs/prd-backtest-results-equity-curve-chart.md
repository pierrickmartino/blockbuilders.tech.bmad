# PRD — Backtest Results Equity Curve Chart (Backtest Page)

## Summary
Add a **simple equity curve line chart** to the Backtest Results page so users can visually understand how a strategy’s simulated account value changed over time. This directly implements the MVP story **S5.2 – Equity curve & basic charting**. fileciteturn0file1

## Goals
- Show an **equity curve** (time → equity) for a completed backtest run.
- Keep the UI **fast, readable, and minimal** (no complex analytics).
- Work with the existing “run status → results” flow (pending/running/completed/failed). fileciteturn0file1

## Non-goals
- No advanced charting (multi-series overlays, indicators, annotations, trade markers).
- No zoom/pan (can be added later).
- No real-time updates beyond the normal polling for run completion.

## Primary user story
**As a user, I want to see an equity curve chart over time, so I can visually understand how the strategy behaved.** fileciteturn0file1

## Scope
### In scope
- A new “Equity curve” section on the Backtest Results page.
- A responsive **line chart** (desktop + mobile).
- Basic interactions:
  - Hover tooltip showing timestamp + equity value. fileciteturn0file1

### Out of scope (explicitly)
- Drawdown chart (optional story elsewhere).
- Comparing multiple runs on one chart.
- Saving chart images/export.

## UX / UI requirements
### Placement
Backtest Results page layout (simple):
1. Page header: run name / strategy name, asset/timeframe, date range
2. Status banner: Pending/Running/Completed/Failed
3. Metrics summary card(s)
4. **Equity curve section (this PRD)**
5. Trades table

### Equity curve section
- Title: **Equity curve**
- Body:
  - If data is available: render chart
  - If data is missing: render a compact “No equity data” message and a “Retry loading” button.
- Responsive:
  - Chart should stretch to container width.
  - Height can be fixed (e.g., 260–320px) to avoid layout jumps.

### Loading states
- If run status is **Pending/Running**: show a lightweight skeleton placeholder for the chart area.
- If run status is **Failed**: do not show chart; show error message from run.

## Data requirements
The frontend needs the equity curve time series for a given `run_id`.

### Proposed minimal shape (preferred)
A list of points:
```json
{
  "run_id": "uuid",
  "equity_curve": [
    { "ts": "2025-01-01T00:00:00Z", "equity": 10000.0 },
    { "ts": "2025-01-01T01:00:00Z", "equity": 10012.5 }
  ]
}
```

Notes:
- `ts` should be ISO-8601 string (UTC recommended).
- `equity` is the simulated account value (float).

### Backend storage assumption (MVP-aligned)
Equity curve is stored as JSON in object storage (S3-compatible), and the DB run record points to it. fileciteturn0file0

## API contract
Use the existing run + details pattern described in MVP stories. fileciteturn0file1

### Endpoints
1) **Run status/summary**
- `GET /backtests/{run_id}`
- Returns: `{ status, summary_metrics, error_message?, details_key? }`

2) **Run details (includes equity curve)**
- `GET /backtests/{run_id}/details`
- Returns: `{ equity_curve: [...], trades: [...] }` (trades may already exist; equity_curve must be present for chart)

If you already have a different endpoint name for “details”, reuse it—don’t add a second one.

### Error handling
- 404: show “Run not found”
- 403: show “Not authorized”
- 500 / vendor issues: show “Couldn’t load chart data” + retry
- Details missing: show “No equity data available for this run”

## Frontend implementation notes (keep simple)
### Chart library
- Use **Recharts** (line chart) as suggested in MVP. fileciteturn0file1

### Data fetching
- Page already fetches run status/summary.
- Only fetch details **after** status is `completed`.
- Cache details request client-side (SWR/React Query or simple state) to avoid refetch loops.

### Formatting
- X-axis: time
  - Show a small number of ticks (auto).
- Y-axis: equity value
  - Show currency-like formatting (no currency symbol required in MVP).
- Tooltip:
  - `ts` formatted to user locale (or ISO short), and equity rounded (e.g. 2 decimals).

## Acceptance criteria
- Given a **completed** run with equity curve data, the Backtest Results page displays a **line chart** of equity over time. fileciteturn0file1
- Hovering a point shows a tooltip with timestamp and equity.
- Given a run that is **pending/running**, the chart area shows a loading placeholder.
- Given a run that **failed**, the chart is not displayed and an error is shown.
- Chart is responsive and does not overflow on mobile.

## QA checklist
- Completed run with ~1 year hourly data renders within reasonable time (no UI freezing).
- Empty curve / missing details handled gracefully.
- Timezones: timestamps display consistently (prefer UTC in data, format in UI).
- Regression: metrics and trades table remain functional.

## Minimal analytics (optional)
- Event: `backtest_chart_viewed` when chart renders successfully.
- Event: `backtest_chart_load_failed` when details fetch fails.
