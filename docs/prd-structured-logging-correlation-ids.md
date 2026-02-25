# PRD: Structured Logging with Correlation IDs

## 1. Summary
Implement structured JSON logging for FastAPI request handling and worker backtest jobs, with a shared correlation ID so developers can trace a single issue end-to-end in Docker logs. This improves diagnosis speed for beta bug reports without adding a full observability platform.

## 2. Problem Statement
Current logs are hard to correlate across API and worker services. When a beta tester reports a failed run, developers cannot quickly gather all related log lines for that request/job chain.

## 3. Goals
- Emit machine-readable JSON logs to stdout from API and worker processes.
- Attach a correlation ID to every API request log and every related backtest job log.
- Ensure worker failure logs include full traceback details in structured fields.

## 4. Non-Goals
- Introduce distributed tracing systems (OpenTelemetry, Jaeger, etc.).
- Build a log storage/search product beyond existing `docker compose logs | jq` workflows.

## 5. Target Users & User Stories
### 5.1 Target Users
- Backend developers diagnosing request/job failures.
- Support/engineering teammates validating beta bug reports.

### 5.2 User Stories
- As a developer, I want a correlation ID on every API request log, so that I can isolate one request timeline quickly.
- As a developer, I want worker logs to include correlation ID, user ID, and strategy ID, so that I can trace job context without reading database rows first.
- As a developer, I want structured error tracebacks, so that I can debug failures directly from logs.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Configure `structlog` for JSON output to stdout in FastAPI and worker processes.
- Request middleware that binds correlation context for all request-scoped logs.
- Pass correlation ID into queued backtest jobs and bind job context in worker logging.
- Structured worker lifecycle logs for start/progress/failure/completion.

### 6.2 Out of Scope
- UI changes in frontend.
- New dashboarding or alerting infrastructure.

### 6.3 Functional Requirements
- API requests:
  - Generate a UUID correlation ID when none is provided.
  - If `X-Correlation-ID` header exists and is non-empty, reuse it.
  - Include `correlation_id`, method, path, status_code, and duration_ms in request logs.
  - All logs emitted during request handling include the same `correlation_id`.
- Backtest worker jobs:
  - Accept and bind `correlation_id` from enqueued job payload.
  - Include `correlation_id`, `user_id`, `strategy_id`, and `run_id` in lifecycle logs.
  - Emit progress logs at existing progress checkpoints (no new checkpoints required).
  - On error, emit structured exception event with full traceback and mark job failed.
- Output:
  - Logs are valid JSON lines written to stdout.
  - Fields use stable snake_case keys for easy `jq` filtering.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. Developer triggers API call or user initiates backtest.
2. API logs request with correlation ID.
3. Job is enqueued with same correlation ID.
4. Worker logs lifecycle events with shared context.
5. Developer filters Docker logs by correlation ID.

### 7.2 States
- Loading: request accepted / job queued.
- Empty: no logs yet for ID.
- Error: structured failure event includes traceback.
- Success: request and worker lifecycle visible under one correlation ID.

### 7.3 Design Notes
No end-user UI changes. Developer-facing output must be readable via `jq` and minimal in shape variation.

## 8. Data Requirements
### 8.1 Data Model
- `correlation_id` — string (UUID/text) — request/job trace key.
- `user_id` — string/UUID — job owner context.
- `strategy_id` — string/UUID — strategy context.
- `run_id` — string/UUID — backtest run context.
- `event` — string — log event name.
- `level` — string — log level.
- `timestamp` — ISO-8601 string — event time.
- `traceback` — string/object — full exception traceback for errors.

### 8.2 Calculations / Definitions (if applicable)
- `duration_ms`: integer elapsed milliseconds from request start to response completion.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints required.
- Existing endpoints impacted:
  - `POST /backtests` (correlation propagation to worker enqueue).
  - All API routes (request-scoped correlation logging via middleware).

### 9.2 Validation & Error Handling
- Correlation ID validation: non-empty header accepted as opaque string; fallback to generated UUID otherwise.
- Logging must never crash request/job processing; failures in logging setup should degrade gracefully to standard logging.
- Worker exception logs must include traceback and preserve existing failure response behavior.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- No frontend code changes required.
- Optional: later add `X-Correlation-ID` header from client for cross-system tracing (not required now).

### 10.2 Backend
- Add a small shared logging config module that:
  - configures structlog processors/JSON renderer,
  - binds contextvars,
  - standardizes timestamp + level fields.
- Add FastAPI middleware to bind/unbind request correlation context.
- Update backtest enqueue payload and worker job signature to carry `correlation_id`.
- Update worker logging calls to include required context fields consistently.

## 11. Rollout Plan
- Phase 1: Implement structured logging config + request middleware in API.
- Phase 2: Propagate correlation IDs into worker and lifecycle logs.
- Phase 3: Verify with local Docker logs + `jq` filters and document usage in dev docs.

## 12. Acceptance Criteria
- [ ] Given structlog is configured in the FastAPI application, when any API request is processed, then a unique correlation ID is generated and attached to all log entries for that request, and logs are output as structured JSON to stdout.
- [ ] Given a backtest job is processed by the worker, when the job starts, progresses, or fails, then all log entries include the job's correlation ID, user ID, and strategy ID, and error logs include the full exception traceback in structured format.
- [ ] Given a developer needs to debug an issue, when they search Docker logs with `docker compose logs | jq`, then they can filter by correlation ID to see all related log entries for a single request or job.

## 13. Tracking Metrics (Optional)
- `% worker failure logs with correlation_id` — target: 100%.
- `% API request logs with correlation_id` — target: 100%.
- Mean time to isolate incident log timeline (internal) — expected downward trend.

## 14. Dependencies (Optional)
- Existing FastAPI middleware stack.
- Existing worker job enqueue/dequeue path.
- `structlog` package availability in backend environment.

## 15. Risks & Mitigations (Optional)
- Risk: Inconsistent field naming across modules.  
  Mitigation: Centralize logger configuration and key naming constants.
- Risk: Missing propagation path from API to worker on some job triggers.  
  Mitigation: Add integration tests covering enqueue payload and worker context binding.

## 16. Open Questions
- Should we enforce strict UUID format for incoming `X-Correlation-ID`, or keep it opaque for flexibility?
- Should correlation ID be echoed in API response headers (`X-Correlation-ID`) in this iteration?
