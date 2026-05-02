# Test Checklist – Multi-Period Batch Backtesting

> Source PRD: `prd-multi-period-batch-backtesting.md`

## 1. Period Options & Tier Gating

- [ ] Free users see period checkboxes: `30d`, `60d`, `90d`, `120d`, `1y`
- [ ] Pro users see period checkboxes: `30d`, `60d`, `90d`, `120d`, `1y`
- [ ] Premium users additionally see: `2y`, `3y`
- [ ] Non-premium users never see `2y` or `3y`

## 2. Selection Behavior

- [ ] Period checkboxes can be selected/deselected independently
- [ ] Default selection state matches product decision (documented and consistent)
- [ ] `Run All` is disabled when no periods are selected
- [ ] `Run All` is enabled when one or more periods are selected

## 3. Batch Queueing

- [ ] Clicking `Run All` queues exactly one backtest job per selected period
- [ ] Each queued job is linked to the same strategy and execution parameters
- [ ] Returned payload includes per-period queue outcome and identifiers (`batch_id`, `run_id` where queued)
- [ ] Duplicate queue submission is prevented during in-flight request (no accidental double-enqueue)

## 4. Daily Limit Accounting

- [ ] Each successfully queued period decrements/consumes one daily backtest unit
- [ ] If quota is fully available, all selected periods queue successfully
- [ ] If quota is partially available, only allowed periods queue and remaining periods are marked skipped
- [ ] Skipped periods show clear plain-language reason tied to daily limits

## 5. Historical Depth & Validation

- [ ] Backend rejects/marks periods not allowed by plan tier
- [ ] Backend rejects empty period selection with clear validation message
- [ ] Historical depth constraints are enforced per selected period
- [ ] Out-of-range periods return period-specific feedback without breaking whole batch response

## 6. Progressive Result Rendering

- [ ] UI shows per-period status states: Pending/Running/Completed/Failed/Skipped
- [ ] Results populate incrementally as each period completes (no full-batch wait)
- [ ] Completed period results remain grouped under the correct period label
- [ ] Group ordering is consistent (shortest to longest period)

## 7. Error Isolation

- [ ] A failed period shows period-level error without blocking other periods
- [ ] Mixed outcomes (some complete, some fail) render correctly
- [ ] Polling/status refresh remains stable when one or more periods fail

## 8. API Contract

- [ ] `POST /backtests/batch` response is stable and includes per-period statuses
- [ ] `GET /backtests/batch/{batch_id}` returns grouped current statuses/results
- [ ] Response supports partial success and complete success cases
- [ ] Existing single-backtest endpoints remain backward compatible

## 9. UX Regression Checks

- [ ] Backtest runner layout remains usable on desktop and mobile widths
- [ ] Existing single-run flow (if retained) still works unchanged
- [ ] Existing result cards/components render correctly for batch-sourced runs
- [ ] Plain-language error copy is used for validation, quota, and data-range issues
