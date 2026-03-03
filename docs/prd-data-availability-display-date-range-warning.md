# PRD: Data Availability Display and Date Range Warning

## 1. Summary
Add a simple data availability indicator in backtest configuration and warn users about out-of-range start dates. Users will immediately see how far back data exists for the selected asset/timeframe, get a clear inline warning when requesting unavailable history, and can confirm to download earlier data on demand.

## 2. Problem Statement
Users can currently select date ranges that start before available candle history, which creates confusion about what period is actually tested. This causes trust and usability issues, especially for newer assets with short history (e.g., SUI).

## 3. Goals
- Make data availability explicit in backtest configuration for the selected asset/timeframe.
- Prevent silent out-of-range behavior by warning and letting users confirm data download.
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
- As a user, I want a clear warning when my start date is before available data, so I can confirm and trigger a download of earlier history.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Show `Data available: [earliest date] – Present` on backtest configuration when asset/timeframe is selected or changed.
- Fetch earliest/latest availability from `data_quality_metrics` when present; fallback to candle-data min/max when needed.
- Inline warning when selected `date_from` is before earliest available date, with confirmation dialog to download earlier data on demand.
- Schema migration adding `earliest_candle_date` and `latest_candle_date` to `data_quality_metrics` when missing.
- Daily validation job updates and backfills earliest/latest metadata.

### 6.2 Out of Scope
- Changes to pricing tiers or historical depth plan limits.
- Multi-step correction wizards or complex modal flows beyond the lightweight download confirmation dialog.

### 6.3 Functional Requirements
- On asset/timeframe change, UI requests data availability metadata and renders a one-line availability hint.
- **Regular users:** If user-selected start date is earlier than availability start, UI shows inline warning and auto-adjusts `date_from` to the earliest available date. Users cannot force a date before available data.
- **Beta users:** If user-selected start date is earlier than availability start, UI shows inline warning but preserves the user's date. On submission, a lightweight confirmation dialog explains that missing data will be downloaded and the run may take longer. User confirms ("Download & run") or cancels. The existing worker downloads missing candles on demand.
- Backend migration ensures `data_quality_metrics.earliest_candle_date` and `data_quality_metrics.latest_candle_date` exist.
- Daily validation job writes earliest/latest for each tracked asset/timeframe pair.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens backtest configuration.
2. User selects/changes asset (and timeframe if applicable).
3. UI displays availability line for that selection.
4. User picks date range.
5. If `date_from` is out of range:
   - **Regular users:** inline warning appears and start date auto-adjusts to earliest available. User continues normally.
   - **Beta users:** inline warning appears but date is preserved. On submit, confirmation dialog explains data will be downloaded. User confirms ("Download & run") or cancels.

### 7.2 States
- Loading: Show lightweight placeholder text for availability line.
- Empty: Show `Data availability not found` only when both metadata and fallback lookup fail.
- Error: Non-blocking inline message; keep form usable.
- Success: Availability line shown with normalized date format and warning behavior active.

### 7.3 Design Notes
- Keep copy short and explicit; no tooltip required.
- Place availability line directly near date inputs for context.
- Warning should be inline near date inputs and persist as long as the date is out of range.
- Confirmation dialog uses shadcn/ui Dialog, max-width `sm:max-w-md`, responsive footer (stacked on mobile).

## 8. Data Requirements
### 8.1 Data Model
- `data_quality_metrics.earliest_candle_date` — `date`/`timestamp` — earliest candle timestamp available for asset/timeframe.
- `data_quality_metrics.latest_candle_date` — `date`/`timestamp` — latest candle timestamp available for asset/timeframe.
- `candles.timestamp` — existing field used for fallback min/max computation.

### 8.2 Calculations / Definitions (if applicable)
- **Availability start**: `earliest_candle_date` from metadata; fallback `MIN(candles.timestamp)` for asset/timeframe.
- **Availability end**: `latest_candle_date` from metadata; fallback `MAX(candles.timestamp)` for asset/timeframe.
- **User start date**: preserved as entered; not auto-adjusted.

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
- Show warning via `useEffect` when `dateFrom < earliest_date`; do not auto-correct the value.
- Gate `handleSubmit` to show confirmation dialog when warning is active.
- Keep warning and dialog copy aligned with acceptance criteria text.

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
- [ ] Regular users: selecting a start date before available history shows warning and auto-adjusts to earliest available date.
- [ ] Regular users: cannot submit a backtest with a start date before available data.
- [ ] Beta users: selecting a start date before available history shows warning without changing the date.
- [ ] Beta users: submitting with an out-of-range start date opens a confirmation dialog explaining data download.
- [ ] Beta users: confirming the dialog submits the backtest; cancelling returns to the form with date unchanged.
- [ ] Limited-history assets (e.g., SUI) clearly show actual range and still allow submission (beta) or auto-adjust (regular).
- [ ] Migration adds `earliest_candle_date`/`latest_candle_date` to `data_quality_metrics` when missing.
- [ ] Daily validation job populates and maintains earliest/latest candle dates for tracked assets/timeframes.

## 13. Tracking Metrics (Optional)
- Percent of backtest form interactions that trigger the out-of-range warning.
- Availability lookup fallback rate (metadata miss → candle aggregation).
- Backtest submission success rate after download confirmation shown.

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
