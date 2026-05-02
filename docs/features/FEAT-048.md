# PRD: Low Trade Count Warning

## 1. Summary
Add a lightweight warning on backtest results when a strategy has very few trades (1-9). This helps users avoid over-trusting statistically weak outcomes and nudges them toward gathering more data.

## 2. Problem Statement
Users can misinterpret backtest performance when only a handful of trades were executed. Without a clear signal, they may draw false conclusions from noisy samples.

## 3. Goals
- Warn users when completed backtests have low trade counts (1-9).
- Keep behavior frontend-only and non-blocking for backtest completion (NFR-08).
- Track warning impressions with PostHog for product health visibility.

## 4. Non-Goals
- No backend schema or API changes.
- No statistical significance scoring system beyond the simple trade-count threshold.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail users reviewing backtest results.
- New users prone to over-reading short sample performance.

### 5.2 User Stories
- As a user viewing backtest results, I want to be warned when trade count is too low, so that I do not over-trust noisy results.
- As a product team member, I want analytics on warning exposure, so that we can measure how often users see sample-size risk signals.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Render a yellow warning banner on results pages when `num_trades` is 1-9 inclusive.
- Place banner below narrative card (if present) or at top of metrics section (if no narrative).
- Fire PostHog event `health_warning_shown` with `warning_type: low_trade_count`.

### 6.2 Out of Scope
- Any change to backtest execution, worker behavior, or completion timing.
- Any additional warning types in this iteration.

### 6.3 Functional Requirements
- Frontend reads `num_trades` from existing backtest result payload.
- Condition: show warning only when `num_trades >= 1 && num_trades < 10`.
- Condition: do not show warning when `num_trades === 0` or `num_trades >= 10`.
- Banner copy must be exact (dynamic N):
  - "Your strategy triggered [N] trades over this period. With so few trades, results can vary a lot — try a longer date range or looser entry conditions to get more data points."
- Fire `health_warning_shown` once per render/impression with `warning_type=low_trade_count`.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens completed backtest results. Frontend checks `num_trades` and conditionally renders warning without delaying any result content.

### 7.2 States
- Loading: no warning until results data is available.
- Empty: not applicable (result page requires run).
- Error: no warning rendering if results fetch fails.
- Success:
  - `num_trades` 1-9: show warning banner.
  - otherwise: no banner.

### 7.3 Design Notes
- Warning uses yellow semantic style and must meet WCAG 2.1 AA contrast (NFR-09).
- Placement priority: below narrative card; fallback at top of metrics section.
- Tone is coaching, not alarming.

## 8. Data Requirements
### 8.1 Data Model
- `num_trades` — number — existing backtest summary field used for conditional rendering.

### 8.2 Calculations / Definitions (if applicable)
- `isLowTradeCountWarning = num_trades >= 1 && num_trades < 10`

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{id}` — unchanged; frontend consumes existing `num_trades` value.

### 9.2 Validation & Error Handling
- If `num_trades` is missing/invalid, fail safe by not rendering the warning.
- Warning logic must never block backtest completion or results response flow (NFR-08).

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a small conditional in results page component.
- Reuse existing banner/alert component if available.
- Trigger PostHog event from the same conditional render path with `warning_type: low_trade_count`.

### 10.2 Backend
- No changes required.

## 11. Rollout Plan
- Implement behind normal release flow (no flag required).
- Verify with manual UI checks and analytics payload inspection.

## 12. Acceptance Criteria
- [ ] Given a completed backtest with 1-9 trades, when results render, then a yellow warning banner appears below narrative (if present) or at top of metrics section.
- [ ] Given a completed backtest with 1-9 trades, when warning is shown, then banner text exactly matches required coaching copy with correct `[N]`.
- [ ] Given a completed backtest with 1-9 trades, when results render, then PostHog event `health_warning_shown` fires with `warning_type: low_trade_count`.
- [ ] Given a completed backtest with 10+ trades, when results render, then no low-trade warning is displayed.
- [ ] Given warning computation runs, then it is a frontend conditional check on `num_trades` and does not block/delay backtest completion (NFR-08).
- [ ] Given warning banner is rendered, then it meets WCAG 2.1 AA contrast ratios (NFR-09).

## 13. Tracking Metrics (Optional)
- `health_warning_shown` count — expected to increase with low-trade-result exposure.
- `% of results views with low_trade_count warning` — monitor prevalence by cohort/timeframe defaults.

## 14. Dependencies (Optional)
- Existing backtest results payload with `num_trades`.
- Existing frontend analytics utility for PostHog events.

## 15. Risks & Mitigations (Optional)
- Risk: Event fires multiple times from rerenders.  
  Mitigation: Guard event emission to first render/impression per page load.
- Risk: Warning styling misses accessibility targets.  
  Mitigation: Use design-system warning colors/components validated for WCAG AA.

## 16. Open Questions
- Should we cap warnings to one per run per user session if users navigate between tabs?
- Should future iterations include additional health warnings (e.g., very short date range, extreme costs)?
