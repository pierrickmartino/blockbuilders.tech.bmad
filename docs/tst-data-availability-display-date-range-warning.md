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
- [ ] Regular users: out-of-range start date shows warning and auto-adjusts to earliest available date.
- [ ] Regular users: adjusted start date remains visible in date input after correction.
- [ ] Regular users: auto-adjust does not block backtest submission.
- [ ] Beta users: out-of-range start date shows warning without changing the date value.
- [ ] Beta users: submitting with out-of-range date opens confirmation dialog explaining data download.
- [ ] Beta users: confirming the dialog ("Download & run") submits the backtest normally.
- [ ] Beta users: cancelling the dialog returns to the form with the date unchanged.
- [ ] Beta users: confirmation dialog is responsive on mobile (stacked buttons).
- [ ] Limited-history asset scenario (e.g., SUI + 5-year range) auto-adjusts for regular users, shows dialog for beta users.
- [ ] Warning clears when start date is changed to be within available range (both user types).

### Integration / Regression
- [ ] `POST /backtests` accepts adjusted range and creates run successfully.
- [ ] Existing historical depth limit validation still works as before.
- [ ] Existing gap/completeness indicators still render correctly with new availability line.
- [ ] Lightweight confirmation dialog is the only new modal; no multi-step flows introduced.

### Edge Cases
- [ ] Asset with same-day earliest/latest data still renders valid availability text.
- [ ] Asset with delayed latest candle still displays sensible end label behavior.
- [ ] Rapid asset switching does not display stale availability data from previous selection.
- [ ] Network error fetching availability shows non-blocking fallback/error state and keeps form usable.
