# TST: Data Availability Display and Date Range Warning

## Test Checklist

### Backend / Data
- [ ] Migration adds `earliest_candle_date` and `latest_candle_date` to `data_quality_metrics` if missing.
- [ ] Migration is idempotent (safe to run where columns already exist).
- [ ] Daily validation job writes earliest/latest values for each asset/timeframe with candle history.
- [ ] Daily validation job updates values when newer candles are ingested.
- [ ] Availability endpoint returns metadata values when present.
- [ ] Availability endpoint falls back to candle `MIN/MAX(timestamp)` when metadata missing.
- [ ] Availability endpoint returns empty/not-found response when no candles exist for asset/timeframe.
- [ ] Availability endpoint returns dates in ISO format and expected timezone conventions.

### Frontend / UX
- [ ] Backtest configuration shows `Data available: [earliest date] – Present` after asset selection.
- [ ] Availability text updates immediately when asset changes.
- [ ] Availability text updates when timeframe changes (if timeframe selector exists).
- [ ] If start date is before earliest available date, inline warning appears with exact approved copy.
- [ ] Out-of-range start date auto-adjusts to earliest available date.
- [ ] Adjusted start date remains user-visible in date input after correction.
- [ ] Date auto-adjust does not block backtest submission.
- [ ] Limited-history asset scenario (e.g., SUI + 5-year range) shows warning and adjusts correctly.
- [ ] Warning clears when start date is in range.

### Integration / Regression
- [ ] `POST /backtests` accepts adjusted range and creates run successfully.
- [ ] Existing historical depth limit validation still works as before.
- [ ] Existing gap/completeness indicators still render correctly with new availability line.
- [ ] No new modal or blocking flow introduced in backtest configuration.

### Edge Cases
- [ ] Asset with same-day earliest/latest data still renders valid availability text.
- [ ] Asset with delayed latest candle still displays sensible end label behavior.
- [ ] Rapid asset switching does not display stale availability data from previous selection.
- [ ] Network error fetching availability shows non-blocking fallback/error state and keeps form usable.
