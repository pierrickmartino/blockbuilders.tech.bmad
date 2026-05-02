# PRD: Narrative Summary Generation (Backend)

## 1. Summary
Add a server-generated `narrative` field to `GET /backtests/{id}` so users get a plain-English summary paragraph of what happened in a completed backtest. The narrative is deterministic, template-based, and derived from existing backtest metrics, with a dedicated fallback message when there are zero trades.

## 2. Problem Statement
Backtest results currently require users to interpret multiple metrics and charts. This increases cognitive load, especially for newer users, and slows down decision-making. Users need an immediate explanation in plain language without reading the full metrics table.

## 3. Goals
- Generate a plain-English narrative for completed backtests using existing metric fields.
- Ensure the narrative always includes the five required data points for runs with trades.
- Keep implementation simple and fast, adding at most 200ms to response time.

## 4. Non-Goals
- No LLM/AI-based generation.
- No new endpoint; use existing `GET /backtests/{id}`.
- No front-end redesign beyond consuming the new string field.
- No storage of generated narrative in the database.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail crypto traders running backtests in Blockbuilders.
- New users who need plain-language result interpretation.

### 5.2 User Stories
- As a user who just ran a backtest, I want a plain-English summary so I can quickly understand what happened.
- As a user, I want dollar-based outcomes tied to my configured starting balance so results feel concrete and personal.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Backend narrative generation in `backend/app/backtest/narrative.py`.
- Inclusion of `narrative` in `GET /backtests/{id}` response for completed runs.
- Two deterministic templates: (a) trade count > 0, (b) trade count = 0.

### 6.2 Out of Scope
- Generating narrative for in-progress/failed backtests.
- Internationalization/localization.
- Per-user tone/style customization.

### 6.3 Functional Requirements
- FR-01: `GET /backtests/{id}` for a successfully completed run returns a new `narrative` string field.
- FR-02: If `num_trades > 0`, `narrative` is a single plain-English paragraph that includes all required data points:
  - Starting balance -> ending balance in dollars.
  - Best performing period.
  - Worst performing period described with max drawdown in dollar terms.
  - Total number of trades.
  - Comparison vs buy-and-hold in percentage points.
- FR-03: Dollar amounts must be personalized to the user’s configured initial balance (FR-08).
- FR-04: Max drawdown must be described experientially (FR-09), e.g., “You would have watched your $10,000 drop to $7,400 before recovering.”
- FR-05: If `num_trades = 0`, `narrative` must exactly be:
  - `Your strategy didn't trigger any entry signals during this period. This could mean your conditions are too strict, or the market didn't match your criteria. Try adjusting your thresholds or testing a different date range.`
- FR-06: Narrative generation must be template-based and implemented in `backend/app/backtest/narrative.py` only (or minimal helper imports), using existing computed metrics and period stats.
- FR-07: Narrative generation must add <=200ms to `GET /backtests/{id}` response time (NFR-02).

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens a completed backtest result.
2. Frontend calls `GET /backtests/{id}`.
3. Backend returns existing payload plus `narrative`.
4. Frontend displays the narrative near top-level summary metrics.

### 7.2 States
- Loading: Existing loading state remains unchanged.
- Empty: Not applicable for completed backtests; use existing not-found behavior.
- Error: If narrative generation fails, return a safe fallback string and do not fail the whole endpoint.
- Success: Narrative string is present and non-empty for completed runs.

### 7.3 Design Notes
- Keep copy concise and plain-English.
- No markdown/HTML in narrative.
- One paragraph output for consistency.

## 8. Data Requirements
### 8.1 Data Model
- `narrative` — string — generated on read, included in backtest detail response schema.
- Existing required inputs (already present in run/result context):
  - `initial_balance` — number — starting capital for the run.
  - `final_equity` (or equivalent) — number — ending balance.
  - `num_trades` — integer — trade count.
  - `benchmark_return` and strategy return metrics — numbers — for percentage-point comparison.
  - `max_drawdown` and/or drawdown absolute values — numbers — worst period description.
  - best/worst period summary metrics used by existing result calculations.

### 8.2 Calculations / Definitions (if applicable)
- Buy-and-hold comparison (percentage points): `strategy_return_pct - benchmark_return_pct`.
- Max drawdown dollar drop: `peak_equity_before_trough - trough_equity` (or equivalent from drawdown series).
- Ending balance: `initial_balance * (1 + total_return_pct/100)` when not directly stored.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{id}` — append `narrative` to successful completed-run responses.

### 9.2 Validation & Error Handling
- If run status is not completed, keep existing behavior; narrative is omitted or null per current schema conventions.
- If required metrics are missing, use a deterministic fallback narrative that still explains available outcome, and log a structured warning.
- Zero-trade message must match exact acceptance copy (including punctuation).

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Read and render `narrative` if present.
- No client-side text generation.

### 10.2 Backend
- Add `backend/app/backtest/narrative.py` with a single public renderer function.
- Keep formatting helpers minimal (currency and signed percentage-point formatting).
- Build text from existing run metrics and precomputed period stats; avoid extra DB queries where possible.
- Keep endpoint path unchanged and avoid new background jobs.

## 11. Rollout Plan
- Phase 1: Implement backend renderer and wire into `GET /backtests/{id}` response schema.
- Phase 2: Add test coverage for >0 trades, 0 trades, missing metric fallback, and performance budget guard.
- Phase 3: Enable frontend rendering behind existing result summary area.

## 12. Acceptance Criteria
- [ ] For completed backtests with `num_trades > 0`, `GET /backtests/{id}` includes a non-empty `narrative` string.
- [ ] Narrative includes all five required data points: start->end balance, best period, worst period/max drawdown in dollars, total trades, and buy-and-hold comparison in percentage points.
- [ ] Dollar amounts are personalized to configured initial balance (FR-08).
- [ ] Max drawdown wording is experiential (FR-09).
- [ ] For completed backtests with `num_trades = 0`, narrative matches the exact required message.
- [ ] Narrative generation is server-side template rendering in `backend/app/backtest/narrative.py`.
- [ ] Narrative generation adds <=200ms to `GET /backtests/{id}` response time (NFR-02).

## 13. Tracking Metrics (Optional)
- Backtest detail response p95 latency — no regression beyond +200ms attributable to narrative generation.
- Narrative presence rate on completed runs — target 100%.
- Zero-trade fallback correctness rate — target 100% exact match.

## 14. Dependencies (Optional)
- Existing backtest metric computation and storage in backend response payload builders.
- Existing buy-and-hold benchmark metric availability.

## 15. Risks & Mitigations (Optional)
- Risk: Missing period or drawdown components in some historical runs.  
  Mitigation: Deterministic fallback phrasing + structured warning logs, without failing endpoint.
- Risk: Inconsistent currency formatting.  
  Mitigation: Use one shared helper for all currency rendering in narrative module.
- Risk: Latency regression from additional calculations.  
  Mitigation: Reuse existing in-memory metrics, avoid extra I/O, and test performance budget.

## 16. Open Questions
- Which specific existing fields define “best performing period” and “worst performing period” (day/week/month) in current backend payloads?
- Should narrative be returned as `null` or omitted for non-completed runs for strict schema consistency?
