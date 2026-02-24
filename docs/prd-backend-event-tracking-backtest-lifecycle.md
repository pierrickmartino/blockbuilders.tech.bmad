# PRD: Backend Event Tracking for Backtest Lifecycle

## 1. Summary
Add server-side PostHog analytics in the FastAPI/worker path for backtest lifecycle events so product owners can track scheduled and worker-originated backtests that are not triggered from frontend interactions.

## 2. Problem Statement
Current analytics coverage is frontend-focused, which misses important backtest lifecycle events executed by workers (including scheduled runs). This creates blind spots in operational and product analytics.

## 3. Goals
- Emit backend lifecycle events for backtest jobs: start, complete, and fail.
- Include required context in every event: correlation ID, user ID, strategy ID, and duration.
- Ensure analytics dispatch is asynchronous fire-and-forget so backtest performance is not impacted.

## 4. Non-Goals
- No full analytics taxonomy redesign.
- No additional BI pipeline or data warehouse work.
- No frontend UI changes for this feature.

## 5. Target Users & User Stories
### 5.1 Target Users
- Product owner monitoring lifecycle reliability and usage of backtests.
- Engineering/operations team validating worker execution behavior.

### 5.2 User Stories
- As a product owner, I want backend analytics for backtest lifecycle events, so that I can measure activity not initiated by the frontend.
- As an engineer, I want correlation-aware lifecycle events, so that I can trace a backtest across worker logs and analytics.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Integrate PostHog server-side SDK in FastAPI/worker runtime.
- Emit worker lifecycle events: `backtest_job_started`, `backtest_job_completed`, `backtest_job_failed`.
- Include required payload properties for each event.
- Dispatch events asynchronously as non-blocking fire-and-forget calls.

### 6.2 Out of Scope
- New user-facing analytics dashboards.
- New consent UX changes.
- Event batching/retry framework beyond SDK defaults.

### 6.3 Functional Requirements
- On worker job start, emit `backtest_job_started`.
- On successful worker completion, emit `backtest_job_completed`.
- On worker failure, emit `backtest_job_failed`.
- Required event properties: `correlation_id`, `user_id`, `strategy_id`, `duration_ms`.
- `duration_ms` should be populated for completion/failure and optional/`null` on start.
- Event emission must never block backtest execution or alter job status behavior.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. A backtest job is executed by a worker (manual or scheduled origin).
2. Worker emits lifecycle event(s) to PostHog server-side.
3. Product owner verifies events and properties in PostHog live stream.

### 7.2 States
- Loading: Worker starts and initializes analytics client.
- Empty: No backtest jobs executed in time range.
- Error: Analytics dispatch fails silently/logged; backtest execution continues.
- Success: Lifecycle events appear in PostHog with required properties.

### 7.3 Design Notes
- No UI changes required.
- Keep implementation minimal and local to worker lifecycle hooks.

## 8. Data Requirements
### 8.1 Data Model
- `event_name` — string — One of `backtest_job_started`, `backtest_job_completed`, `backtest_job_failed`.
- `correlation_id` — string — Request/job correlation identifier used for traceability.
- `user_id` — string/UUID — Owner of the strategy/backtest run.
- `strategy_id` — string/UUID — Strategy tied to the run.
- `duration_ms` — integer/null — Job duration in milliseconds; null for start event.
- `timestamp` — ISO8601 string — Event emission time.

### 8.2 Calculations / Definitions (if applicable)
- `duration_ms = completed_or_failed_timestamp - started_timestamp` (in milliseconds).

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new public API endpoint required.
- Existing worker execution path is the integration point for lifecycle emission.

### 9.2 Validation & Error Handling
- If PostHog configuration is missing, event emission should no-op safely.
- Event dispatch failures must be logged and must not fail the backtest job.
- Missing required context fields should be validated before send; if missing, log and skip emit.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- No frontend implementation required.

### 10.2 Backend
- Add a small server-side analytics helper (`track_backend_event`) wrapping PostHog capture.
- Invoke helper from worker lifecycle points (start/success/failure).
- Use async fire-and-forget pattern (`create_task`/background dispatch) to avoid blocking core execution.
- Keep payload schema fixed and minimal.

## 11. Rollout Plan
- Phase 1: Add backend PostHog client/helper with safe no-op fallback.
- Phase 2: Instrument worker start/complete/fail lifecycle hooks.
- Phase 3: Validate events/properties in PostHog and run TST checklist.

## 12. Acceptance Criteria
- [ ] Given the PostHog server-side SDK is integrated in FastAPI, when a backtest job starts in the worker, then `backtest_job_started` is emitted.
- [ ] Given a backtest job completes in the worker, then `backtest_job_completed` is emitted.
- [ ] Given a backtest job fails in the worker, then `backtest_job_failed` is emitted.
- [ ] For each lifecycle event, payload includes `correlation_id`, `user_id`, `strategy_id`, and `duration_ms` (null allowed on start).
- [ ] Events are dispatched asynchronously (fire-and-forget) and do not impact backtest performance or job success/failure outcomes.

## 13. Tracking Metrics (Optional)
- Lifecycle event completeness rate — target: near 100% of executed jobs produce expected event sequence.
- Failure event visibility — target: 100% of failed jobs emit `backtest_job_failed`.
- Dispatch overhead — target: no measurable regression in backtest runtime.

## 14. Dependencies (Optional)
- Existing PostHog project and credentials.
- Worker lifecycle hooks in backtest execution flow.
- Correlation ID availability in request/job context.

## 15. Risks & Mitigations (Optional)
- Risk: Missing context fields in some worker paths.
  Mitigation: Add guarded extraction and logging; skip invalid events safely.
- Risk: Analytics call latency impacts runtime.
  Mitigation: Enforce async fire-and-forget dispatch only.
- Risk: Event duplication in retries.
  Mitigation: Include correlation ID and event timestamp for downstream dedupe.

## 16. Open Questions
- Should `duration_ms` for `backtest_job_started` be null or omitted? (Default: include as null for schema consistency.)
- Should worker retries emit separate lifecycle events per attempt or only final attempt?
