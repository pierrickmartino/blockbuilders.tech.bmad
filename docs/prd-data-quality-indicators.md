# PRD – Data Quality Indicators

**Status:** Done
**Owner:** Product
**Last Updated:** 2025-02-14

---

## 1. Goal

Show **data quality metrics** (gap %, outlier count, volume consistency) for each asset/timeframe and **warn users** when a selected backtest period overlaps known data quality issues. This builds trust by being transparent about data limitations and prevents misleading results.

---

## 2. Non-Goals

- No new market data vendors or reconciliation between vendors.
- No complex anomaly detection or machine-learning models.
- No per-user overrides or manual data correction UI.
- No blocking of backtests (warnings only).

---

## 3. User Story

“As a trader, I want to see data quality indicators and warnings for the asset/timeframe I’m testing so I can trust the results and avoid conclusions based on bad data.”

---

## 4. Functional Requirements

### 4.1. Data Validation Job

- Add a scheduled **data validation job** that computes quality metrics for each **asset + timeframe** using existing candles.
- Store results in a **simple quality metadata table** keyed by asset, timeframe, date_from, date_to.
- Run daily (or on-demand) and re-compute for the latest N days (keep it simple, reuse existing scheduler).

### 4.2. Quality Metrics

For each asset/timeframe/date range, store:
- **gap_percent**: percentage of missing candles in the period.
- **outlier_count**: count of candles with anomalous price moves.
- **volume_consistency**: percentage of candles with non-zero volume.
- **has_issues**: boolean if any metric breaches thresholds.

### 4.3. Thresholds (Simple Defaults)

- **gap_percent warning**: > 2% missing candles.
- **outlier_count warning**: > 0 in period.
- **volume_consistency warning**: < 95% non-zero volume.

### 4.4. API

- Add an endpoint to fetch quality data for a specific asset/timeframe and date range:
  - `GET /data-quality?asset=BTC/USDT&timeframe=1d&date_from=...&date_to=...`
  - Response includes metrics, thresholds, and `has_issues`.
- Backtest creation should call this internally (or the UI should call directly) to determine warning state for the selected period.

### 4.5. UI

- **Backtest Setup**
  - Show a small “Data Quality” summary for the selected asset/timeframe.
  - If the chosen date range overlaps any `has_issues` periods, show a **warning banner** with a short explanation.
- **Backtest Results**
  - Show the data quality metrics that applied to the run.
  - Keep display compact (3 metrics + warning text if needed).

---

## 5. Data & Calculations

### 5.1. gap_percent

```
expected = number of candles between date_from/date_to for timeframe
actual = count of candles present

gap_percent = (expected - actual) / expected * 100
```

### 5.2. outlier_count

- A candle is an outlier if **abs(close/open - 1)** exceeds a fixed threshold (e.g., 25%).
- Keep the threshold as a constant in the validation job.

### 5.3. volume_consistency

```
volume_consistency = (count of candles with volume > 0) / actual * 100
```

---

## 6. Acceptance Criteria

- [ ] Validation job stores quality metadata per asset/timeframe/date range.
- [ ] Quality API returns metrics + `has_issues` for requested range.
- [ ] Backtest setup shows data quality summary.
- [ ] UI warns when backtest period overlaps known issues.
- [ ] Backtest results display the metrics used for that run.
- [ ] No new dependencies.

---

## 7. Minimal Implementation Plan

1. **Backend**
   - Add a `data_quality_metrics` table with asset, timeframe, date_from, date_to, gap_percent, outlier_count, volume_consistency, has_issues.
   - Implement a scheduled job that computes metrics using existing candles.
   - Add a small API endpoint to query metrics for a date range.

2. **Frontend**
   - Fetch quality metrics for selected asset/timeframe/date range in backtest setup.
   - Render compact metrics and a warning banner if `has_issues`.
   - Store the metrics on the backtest run response and show them in results.

---

## 8. Open Questions

- What default lookback window should the validation job cover (e.g., last 90 days)?
- Do we want to store metrics per month or per rolling window?
