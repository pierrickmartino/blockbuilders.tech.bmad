# PRD: Multi-Period Batch Backtesting

## 1. Summary
Enable users to run multiple backtests across predefined time periods with one click. Replace manual date picking in this flow with period checkboxes (`30d`, `60d`, `90d`, `120d`, `1y`; Premium also gets `2y`, `3y`). Users click **Run All** to queue one run per selected period, then view results as they complete, grouped by period for easy robustness comparison.

## 2. Problem Statement
Users currently need repetitive manual date input to test a strategy over multiple horizons. This is slow, error-prone, and discourages consistency checks across timeframes.

## 3. Goals
- Let users run multi-period backtests from one simple action.
- Remove manual date-entry repetition for common period testing.
- Keep output easy to compare by grouping results by selected period.
- Respect plan-tier period availability and existing daily usage limits.

## 4. Non-Goals
- Adding custom free-form periods in v1.
- Changing core backtest engine math or execution assumptions.
- Introducing new billing models or extra credit systems.

## 5. Target Users & User Stories
### 5.1 Target Users
- Free/Pro users validating strategy consistency up to 1 year.
- Premium users who need longer-horizon robustness checks (2y/3y).

### 5.2 User Stories
- As a trader, I want to select several preset periods and run all at once so that I can validate robustness quickly.
- As a Premium user, I want 2-year and 3-year options so that I can evaluate longer-market-cycle behavior.
- As a user, I want each completed result to appear under its period label so that I can compare outcomes without manual organization.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Preset period checkbox selector in backtest runner.
- Plan-gated period options.
- One-click batch queue (`Run All`) creating one run per selected period.
- Progressive, grouped result rendering by period.
- Daily limit accounting per queued backtest.

### 6.2 Out of Scope
- Manual date picker redesign for non-batch flows.
- Cross-strategy batch execution in this feature.
- Auto-scheduling recurring multi-period runs.

### 6.3 Functional Requirements
- Backtest runner shows period checkboxes:
  - Free/Pro: `30d`, `60d`, `90d`, `120d`, `1y`
  - Premium: `30d`, `60d`, `90d`, `120d`, `1y`, `2y`, `3y`
- All period options are selected by default on first load; users can deselect any option.
- `Run All` remains disabled when zero periods are selected.
- Clicking `Run All` submits one backtest job per selected period using the same strategy and execution parameters.
- Each queued job counts as one backtest toward daily limits.
- If the user has remaining quota for only part of the selection, queue jobs until quota is exhausted, then show plain-language feedback for skipped periods.
- Batch results area groups cards/rows by period and updates each period independently as jobs complete.
- Failed periods show an error state without blocking successful periods.
- Historical-depth constraints still apply per period and per plan tier.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens strategy backtest runner.
2. User selects/deselects period checkboxes.
3. User clicks **Run All**.
4. UI immediately shows queued/pending states by period.
5. Completed periods populate results as jobs finish.
6. User compares grouped period outcomes.

### 7.2 States
- Loading: period list and prior batch panel skeleton.
- Empty: no results yet for current batch selection.
- Error: period-level errors inline with retry guidance.
- Success: period groups display completed metrics/results.

### 7.3 Design Notes
- Keep controls simple: checkboxes + one primary `Run All` button.
- Do not introduce modal-heavy flow; keep interaction inline.
- Group output by period label with consistent ordering (shortest to longest).
- Show simple per-period status chips: Pending, Running, Completed, Failed, Skipped.

## 8. Data Requirements
### 8.1 Data Model
- `batch_id` — UUID/string — client-visible batch identifier for grouped rendering.
- `period_key` — enum/string — one of `30d`, `60d`, `90d`, `120d`, `1y`, `2y`, `3y`.
- `run_id` — UUID — underlying backtest run id per period.
- `status` — enum — `pending`, `running`, `completed`, `failed`, `skipped`.
- `queued_at` — datetime — queue timestamp per period run.
- `failure_reason` — string nullable — user-facing plain-language reason for failed/skipped periods.

### 8.2 Calculations / Definitions (if applicable)
- `date_from` for each period is derived as `date_to - period_length` (using existing backend date handling).
- `batch_consumed_backtests` = count of successfully queued period jobs in the batch request.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `POST /backtests/batch` — accept strategy id + selected periods + optional execution params; enqueue one run per period and return per-period queue outcome.
- `GET /backtests/batch/{batch_id}` — return grouped per-period statuses/results for progressive polling.

### 9.2 Validation & Error Handling
- Validate selected periods are allowed for the user plan tier.
- Reject empty period selection with clear validation message.
- Enforce daily limits per queued period job.
- Enforce historical-depth availability per period.
- Return partial-success response shape when some periods queue and others are skipped/failed.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing backtest runner page and result card components.
- Add a small period-checkbox section and `Run All` CTA.
- Poll grouped batch status endpoint and update period rows independently.
- Keep local state simple: map by `period_key`.

### 10.2 Backend
- Reuse existing single-backtest queue path in a loop for selected periods.
- Keep batch orchestration thin; avoid new worker type if existing jobs suffice.
- Use one lightweight batch status record keyed by `batch_id` (or equivalent minimal persistence) to support grouped retrieval.

## 11. Rollout Plan
- Phase 1: Ship Free/Pro periods (`30d`, `60d`, `90d`, `120d`, `1y`) with `Run All` and grouped progressive results.
- Phase 2: Enable Premium-only `2y` and `3y` options with existing plan gating.

## 12. Acceptance Criteria
- [ ] Backtest runner shows preset period checkboxes and hides manual date entry for this batch flow.
- [ ] Free/Pro users can select up to `1y`; Premium users additionally see `2y` and `3y`.
- [ ] `Run All` queues one run per selected period and disables when none are selected.
- [ ] Each queued period consumes one daily backtest quota unit.
- [ ] Results appear progressively and remain grouped by period.
- [ ] Partial-queue scenarios (quota exhausted mid-batch) provide clear per-period skipped messaging.
- [ ] Failure in one period does not block other periods from completing.

## 13. Tracking Metrics (Optional)
- Batch run adoption rate — % of backtest sessions using `Run All`.
- Average periods selected per batch.
- Time from batch start to first completed period result.
- Completion ratio per batch (completed periods / selected periods).

## 14. Dependencies (Optional)
- Existing backtest run creation and queue infrastructure.
- Existing plan tier and usage-limit enforcement.
- Existing backtest results rendering components.

## 15. Risks & Mitigations (Optional)
- Risk: Batch requests create sudden queue spikes.  
  Mitigation: Keep period set small/preset and reuse existing queue limits.
- Risk: Users misunderstand skipped periods due to limits.  
  Mitigation: Show explicit per-period skipped reason and remaining quota hint.
- Risk: Longer periods may exceed data depth unexpectedly.  
  Mitigation: Validate before queueing and surface period-specific guidance.

## 16. Open Questions
- Should defaults include all visible periods selected, or only a recommended subset on first run?
- Should we allow single-period `Run All` usage as equivalent to today’s run action, or keep current single-run button in parallel?
