# PRD: Data Availability Display and Date Range Warning

## 1. Summary
Add a simple data availability indicator in backtest configuration and auto-adjust invalid start dates. Users will immediately see how far back data exists for the selected asset/timeframe, get a clear inline warning when requesting unavailable history, and still be able to run backtests without extra steps.

## 2. Problem Statement
Users can currently select date ranges that start before available candle history, which creates confusion about what period is actually tested. This causes trust and usability issues, especially for newer assets with short history (e.g., SUI).

## 3. Goals
- Make data availability explicit in backtest configuration for the selected asset/timeframe.
- Prevent silent out-of-range behavior by warning and auto-adjusting the start date.
- Reuse existing data quality metadata and avoid new external dependencies.

## 4. Non-Goals
- Building a new data ingestion pipeline.
- Blocking backtest execution when range is partially unavailable.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail crypto traders configuring manual backtests.
- Users testing newly listed assets with short historical coverage.

### 5.2 User Stories
- As a user, I want to see available history for my selected asset, so that I pick a realistic range.
- As a user, I want the app to auto-correct invalid start dates with a clear warning, so that I can continue quickly without guessing.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Show `Data available: [earliest date] – Present` on backtest configuration when asset/timeframe is selected or changed.
- Fetch earliest/latest availability from `data_quality_metrics` when present; fallback to candle-data min/max when needed.
- Inline warning when selected `date_from` is before earliest available date, with automatic start-date adjustment.
- Schema migration adding `earliest_candle_date` and `latest_candle_date` to `data_quality_metrics` when missing.
- Daily validation job updates and backfills earliest/latest metadata.

### 6.2 Out of Scope
- Changes to pricing tiers or historical depth plan limits.
- New modal flows, confirmation dialogs, or multi-step correction UX.

### 6.3 Functional Requirements
- On asset/timeframe change, UI requests data availability metadata and renders a one-line availability hint.
- If user-selected start date is earlier than availability start, UI shows: `Data for [asset] starts at [date]. Your backtest will use the available range.`
- UI updates `date_from` to earliest available date automatically and keeps `date_to` unchanged unless existing validations require otherwise.
- Backtest submission is allowed after adjustment; no hard block for this condition.
- Backend migration ensures `data_quality_metrics.earliest_candle_date` and `data_quality_metrics.latest_candle_date` exist.
- Daily validation job writes earliest/latest for each tracked asset/timeframe pair.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens backtest configuration.
2. User selects/changes asset (and timeframe if applicable).
3. UI displays availability line for that selection.
4. User picks date range.
5. If `date_from` is out of range, inline warning appears and start date auto-adjusts.
6. User continues and runs backtest normally.

### 7.2 States
- Loading: Show lightweight placeholder text for availability line.
- Empty: Show `Data availability not found` only when both metadata and fallback lookup fail.
- Error: Non-blocking inline message; keep form usable.
- Success: Availability line shown with normalized date format and warning behavior active.

### 7.3 Design Notes
- Keep copy short and explicit; no tooltip required.
- Place availability line directly near date inputs for context.
- Warning should be inline under start date field and persist long enough to explain the auto-adjustment.

## 8. Data Requirements
### 8.1 Data Model
- `data_quality_metrics.earliest_candle_date` — `date`/`timestamp` — earliest candle timestamp available for asset/timeframe.
- `data_quality_metrics.latest_candle_date` — `date`/`timestamp` — latest candle timestamp available for asset/timeframe.
- `candles.timestamp` — existing field used for fallback min/max computation.

### 8.2 Calculations / Definitions (if applicable)
- **Availability start**: `earliest_candle_date` from metadata; fallback `MIN(candles.timestamp)` for asset/timeframe.
- **Availability end**: `latest_candle_date` from metadata; fallback `MAX(candles.timestamp)` for asset/timeframe.
- **Adjusted start date**: `max(user_date_from, availability_start)`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /market/data-availability?asset={asset}&timeframe={timeframe}` — returns earliest/latest availability for selected pair, preferring `data_quality_metrics` with candle fallback.
- `POST /backtests` — unchanged contract; backend should tolerate already-adjusted date range from frontend.

### 9.2 Validation & Error Handling
- Return `404` or empty payload only when no candle history exists at all for asset/timeframe.
- Return availability dates in a stable ISO format.
- If metadata lookup fails, fallback to candle aggregation before returning an error.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing backtest configuration form state and inline validation area.
- Apply start-date auto-adjust in the same handler that validates date range changes.
- Keep warning copy exactly aligned with acceptance criteria text.

### 10.2 Backend
- Add migration for `data_quality_metrics` date columns if not already present.
- Extend daily validation job to populate earliest/latest consistently for each asset/timeframe.
- Keep query path simple: metadata first, candle min/max fallback second.

## 11. Rollout Plan
- Add migration and deploy backend support for earliest/latest metadata.
- Update daily validation job and run one backfill cycle.
- Enable UI availability line and start-date auto-adjust warning in backtest configuration.
- Monitor logs for fallback rate and missing-history cases.

## 12. Acceptance Criteria
- [ ] Selecting/changing asset displays `Data available: [earliest date] – Present` using metadata table or candle fallback.
- [ ] Selecting a start date before available history shows warning text and auto-adjusts start date to earliest available.
- [ ] Limited-history assets (e.g., SUI) clearly show actual range and still allow backtest submission.
- [ ] Migration adds `earliest_candle_date`/`latest_candle_date` to `data_quality_metrics` when missing.
- [ ] Daily validation job populates and maintains earliest/latest candle dates for tracked assets/timeframes.

## 13. Tracking Metrics (Optional)
- Percent of backtest form interactions that trigger start-date auto-adjust.
- Availability lookup fallback rate (metadata miss → candle aggregation).
- Backtest submission success rate after auto-adjust warning shown.

## 14. Dependencies (Optional)
- Existing `data_quality_metrics` table and daily validation job.
- Existing backtest configuration form and date-range validation logic.

## 15. Risks & Mitigations (Optional)
- Risk: Metadata becomes stale and shows incorrect availability.  
  Mitigation: Daily refresh plus candle fallback on read path.
- Risk: Warning appears too often/noisily for normal users.  
  Mitigation: Trigger only when `date_from < availability_start` and keep message concise.

## 16. Open Questions
- Should `Present` always map to latest ingested candle date in UI copy when the feed lags?
- Should availability be cached client-side per asset/timeframe for the session?
