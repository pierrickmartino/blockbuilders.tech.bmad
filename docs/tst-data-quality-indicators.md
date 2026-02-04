# Test Checklist -- Data Quality Indicators

> Source PRD: `prd-data-quality-indicators.md`

## 1. Data Validation Job

- [ ] Scheduled validation job runs daily (or on-demand)
- [ ] Job computes quality metrics for each asset + timeframe combination
- [ ] Job stores results in the `data_quality_metrics` table
- [ ] Job re-computes for the latest N days on each run
- [ ] Job reuses the existing scheduler infrastructure
- [ ] Job completes without errors for all supported assets and timeframes

## 2. Quality Metrics -- gap_percent

- [ ] `gap_percent` is calculated as `(expected - actual) / expected * 100`
- [ ] Expected candle count is correct for the given date range and timeframe
- [ ] 0% gap is returned when all candles are present
- [ ] Correct gap percentage is returned when candles are missing
- [ ] Warning threshold is > 2% missing candles

## 3. Quality Metrics -- outlier_count

- [ ] Outlier count is computed based on `abs(close/open - 1)` exceeding the threshold (e.g., 25%)
- [ ] Count is 0 when no candles have anomalous price moves
- [ ] Count is correct when one or more candles exceed the threshold
- [ ] Threshold is stored as a constant in the validation job
- [ ] Warning threshold is > 0 outliers in the period

## 4. Quality Metrics -- volume_consistency

- [ ] `volume_consistency` is calculated as `(candles with volume > 0) / actual * 100`
- [ ] 100% is returned when all candles have non-zero volume
- [ ] Correct percentage is returned when some candles have zero volume
- [ ] Warning threshold is < 95% non-zero volume

## 5. has_issues Flag

- [ ] `has_issues` is `true` when `gap_percent > 2%`
- [ ] `has_issues` is `true` when `outlier_count > 0`
- [ ] `has_issues` is `true` when `volume_consistency < 95%`
- [ ] `has_issues` is `false` when all metrics are within thresholds
- [ ] `has_issues` is `true` when any single metric breaches its threshold

## 6. API -- GET /data-quality

- [ ] Endpoint accepts `asset`, `timeframe`, `date_from`, and `date_to` query parameters
- [ ] Response includes `gap_percent`, `outlier_count`, `volume_consistency`, and `has_issues`
- [ ] Response includes the thresholds used for comparison
- [ ] Returns valid data for BTC/USDT with 1d timeframe
- [ ] Returns valid data for ETH/USDT with 1d timeframe
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns appropriate error for unsupported asset or timeframe
- [ ] Returns appropriate response when no quality data exists for the given range

## 7. Data Model

- [ ] `data_quality_metrics` table exists with columns: asset, timeframe, date_from, date_to, gap_percent, outlier_count, volume_consistency, has_issues
- [ ] Table is keyed by asset, timeframe, date_from, date_to
- [ ] No new dependencies are introduced

## 8. UI -- Backtest Setup

- [ ] A small "Data Quality" summary is displayed for the selected asset/timeframe
- [ ] Summary shows gap_percent, outlier_count, and volume_consistency metrics
- [ ] If `has_issues` is true for the chosen date range, a warning banner appears
- [ ] Warning banner includes a short, plain-language explanation of the issues
- [ ] Warning does not block the user from running the backtest
- [ ] Changing asset, timeframe, or date range updates the quality display

## 9. UI -- Backtest Results

- [ ] Data quality metrics are displayed on the backtest results page
- [ ] Metrics shown are the ones that applied to the specific run
- [ ] Display is compact (3 metrics + warning text if applicable)
- [ ] Warning text appears when `has_issues` was true for the run

## 10. Threshold Behavior

- [ ] Metrics exactly at the threshold boundary are handled correctly
  - [ ] `gap_percent` of exactly 2% does NOT trigger a warning (threshold is > 2%)
  - [ ] `outlier_count` of exactly 0 does NOT trigger a warning (threshold is > 0)
  - [ ] `volume_consistency` of exactly 95% does NOT trigger a warning (threshold is < 95%)
- [ ] Metrics slightly beyond the threshold trigger warnings correctly

## 11. Negative & Edge Cases

- [ ] Asset with no candle data returns appropriate fallback values
- [ ] Very short date ranges (e.g., 1 day) produce valid metrics
- [ ] Very long date ranges (e.g., multiple years) produce valid metrics without timeouts
- [ ] Date range with no quality data returns an appropriate response (not a server error)
- [ ] Job handles candles with zero open price gracefully (division by zero in outlier check)
- [ ] No new complex infrastructure is introduced
- [ ] Validation job failure does not block backtest execution
