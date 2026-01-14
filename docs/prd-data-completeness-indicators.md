# PRD – Data Completeness Indicators

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Goal

Provide **data completeness indicators** for each asset/timeframe so users can see **what historical data is available** and where gaps exist before running a backtest.

---

## 2. Non-Goals

- No new data vendors or cross-vendor reconciliation.
- No per-user overrides or manual data correction UI.
- No blocking of backtests (warnings only).
- No advanced anomaly detection beyond existing data quality checks.

---

## 3. User Story

“As a trader, I want to see how complete the candle history is for a pair and timeframe so I can choose reliable backtest periods.”

---

## 4. Functional Requirements

### 4.1. Completeness Metrics (per asset/timeframe)

- **Coverage range:** earliest to latest candle timestamp available.
- **Completeness percent:** percentage of expected candles that exist within the coverage range.
- **Gap count:** number of missing periods within the coverage range.
- **Gap total duration:** total time missing across all gaps.
- **Gap ranges:** list of start/end timestamps for each gap.

### 4.2. Timeline Visualization

- Show a **data availability timeline** for the selected asset/timeframe.
- Highlight gap ranges as missing segments.
- Keep it simple: a single horizontal bar with gaps marked.

### 4.3. Summary String

- Display a single sentence summary:
  - Example: “99.2% complete from Jan 2020 to present, 3 gap periods totaling 18 hours.”

### 4.4. API

- Add or extend an endpoint to fetch completeness data:
  - `GET /data-completeness?asset=BTC/USDT&timeframe=1d`
- Response includes coverage range, completeness percent, gap count, gap total duration, and gap ranges.

### 4.5. UI Placement

- **Backtest Setup:** show the timeline and summary for the selected asset/timeframe.
- **Backtest Results:** show the same summary (and optional timeline) used for the run.
- **Warnings:** if the selected backtest period overlaps a gap, show a warning banner.

---

## 5. Data & Calculations

### 5.1. Completeness Percent

```
expected = number of candles between coverage_start/coverage_end
actual = count of candles present

completeness_percent = actual / expected * 100
```

### 5.2. Gap Ranges

- A gap is any missing run of candles longer than one expected interval.
- Store gaps as a list of `{ start, end, missing_candles }`.

---

## 6. Acceptance Criteria

- [ ] Completeness data is stored per asset/timeframe.
- [ ] API returns completeness summary and gap ranges.
- [ ] Backtest setup displays timeline + summary sentence.
- [ ] UI warns when the backtest period overlaps a gap.
- [ ] Backtest results show the same completeness summary.
- [ ] No new dependencies.

---

## 7. Minimal Implementation Plan

1. **Backend**
   - Extend the existing data quality metrics table (or add a small companion table) with completeness fields and gap ranges.
   - Compute gaps and completeness in the existing validation job.
   - Add a small API endpoint to fetch completeness data by asset/timeframe.

2. **Frontend**
   - Fetch completeness data on backtest setup.
   - Render a compact timeline bar and summary sentence.
   - Reuse the data for backtest results display.

---

## 8. Open Questions

- How far back should coverage range extend if data is very sparse (full history vs rolling window)?
- Should we collapse very short gaps (e.g., single candle) to reduce noise?
