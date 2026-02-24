# Test Checklist -- Backend Event Tracking for Backtest Lifecycle

> Source PRD: `prd-backend-event-tracking-backtest-lifecycle.md`

## 1. Configuration & Initialization

- [ ] PostHog server-side credentials are configured for backend runtime.
- [ ] Backend/worker starts successfully when PostHog config is present.
- [ ] Backend/worker starts successfully when PostHog config is missing (analytics safely no-op).

## 2. Worker Lifecycle Event Emission

- [ ] Starting a worker backtest emits `backtest_job_started`.
- [ ] Successful completion emits `backtest_job_completed`.
- [ ] Failed execution emits `backtest_job_failed`.
- [ ] Scheduled backtests (non-frontend origin) emit the same lifecycle events.

## 3. Event Payload Validation

- [ ] `backtest_job_started` includes `correlation_id`.
- [ ] `backtest_job_started` includes `user_id`.
- [ ] `backtest_job_started` includes `strategy_id`.
- [ ] `backtest_job_started` includes `duration_ms` (null allowed).
- [ ] `backtest_job_completed` includes `correlation_id`, `user_id`, `strategy_id`, and `duration_ms`.
- [ ] `backtest_job_failed` includes `correlation_id`, `user_id`, `strategy_id`, and `duration_ms`.

## 4. Duration Semantics

- [ ] `duration_ms` is non-negative integer for completed jobs.
- [ ] `duration_ms` is non-negative integer for failed jobs.
- [ ] `duration_ms` on start is consistently null (or follows agreed schema rule).

## 5. Async Fire-and-Forget Behavior

- [ ] Event dispatch is asynchronous and non-blocking.
- [ ] Artificial PostHog latency does not meaningfully increase backtest runtime.
- [ ] Backtest success/failure outcome is unchanged when analytics dispatch fails.

## 6. Error Handling & Resilience

- [ ] If PostHog send fails, worker logs warning/error and continues.
- [ ] No analytics exception bubbles up to fail an otherwise successful backtest.
- [ ] Missing context fields are handled gracefully (log + skip emit) without worker crash.

## 7. Verification in PostHog

- [ ] All 3 lifecycle events appear in PostHog live events stream.
- [ ] Properties are queryable for correlation-based filtering (`correlation_id`).
- [ ] Properties are queryable for user- and strategy-level analysis (`user_id`, `strategy_id`).

## 8. End-to-End Acceptance Criteria Validation

- [ ] Given SDK integrated in FastAPI, when worker job starts/completes/fails, corresponding lifecycle events are emitted.
- [ ] Given emitted lifecycle events, payload includes `correlation_id`, `user_id`, `strategy_id`, and `duration_ms`.
- [ ] Given event dispatch path, analytics runs fire-and-forget and does not impact backtest performance.
