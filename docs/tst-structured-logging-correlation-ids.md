# TST: Structured Logging with Correlation IDs

## 1. Objective
Validate that API and worker logs are structured JSON, include correlation IDs, and support fast debugging via `docker compose logs | jq` filtering.

## 2. Test Scope
- FastAPI request logging with correlation context.
- Backtest enqueue correlation propagation.
- Worker lifecycle/error logging fields and traceback.
- Docker log filter workflow for developers.

## 3. Preconditions
- API and worker services running via docker compose.
- At least one test user and one strategy available.
- `jq` installed in the environment used for manual verification.

## 4. Automated Tests

### 4.1 Unit Tests
- [ ] `test_logging_config_outputs_json`
  - Arrange: initialize logging config.
  - Act: emit sample log.
  - Assert: stdout line parses as JSON and includes `timestamp`, `level`, `event`.
- [ ] `test_request_middleware_generates_correlation_id`
  - Arrange: request without `X-Correlation-ID`.
  - Assert: emitted logs include non-empty generated `correlation_id`.
- [ ] `test_request_middleware_reuses_header_correlation_id`
  - Arrange: request with `X-Correlation-ID: abc-123`.
  - Assert: all request-scoped logs include `correlation_id=abc-123`.
- [ ] `test_worker_log_context_includes_required_fields`
  - Arrange: run worker handler with `correlation_id`, `user_id`, `strategy_id`, `run_id`.
  - Assert: start/progress/completion logs include all fields.
- [ ] `test_worker_failure_logs_include_traceback`
  - Arrange: force worker exception.
  - Assert: error log JSON includes `traceback` with stack details.

### 4.2 Integration Tests
- [ ] `test_backtest_enqueue_passes_correlation_id_to_worker`
  - Arrange: call `POST /backtests`.
  - Assert: queued payload contains same request correlation ID.
- [ ] `test_api_request_logs_are_json_lines`
  - Assert: captured API logs parse as JSON for success and failure responses.
- [ ] `test_worker_lifecycle_logs_share_correlation_id`
  - Assert: worker start/progress/failure logs for same run share one `correlation_id`.

## 5. Manual Verification

### 5.1 API Request Traceability
- [ ] Send a request to any endpoint (e.g., `/health` or `/strategies`).
- [ ] Confirm logs are JSON and contain `correlation_id`.
- [ ] Confirm all logs emitted during that request share identical `correlation_id`.

### 5.2 Backtest Job Traceability
- [ ] Trigger a backtest run from API.
- [ ] Confirm API enqueue log includes `correlation_id`.
- [ ] Confirm worker start/progress/completion logs include same `correlation_id`, plus `user_id` and `strategy_id`.

### 5.3 Worker Failure Traceability
- [ ] Trigger a controlled worker failure (invalid strategy data or forced exception path).
- [ ] Confirm failure log includes `correlation_id`, `user_id`, `strategy_id`, and full traceback.

### 5.4 Developer `jq` Workflow
- [ ] Run `docker compose logs api worker | jq -c 'select(.correlation_id == "<id>")'`.
- [ ] Confirm output returns complete request + job timeline for that correlation ID.
- [ ] Confirm filtering works for both success and failed runs.

## 6. Exit Criteria
- [ ] All unit and integration tests pass.
- [ ] Manual verification steps pass in docker-compose local environment.
- [ ] No regressions in existing API/backtest flows.

## 7. Nice-to-Have (Optional)
- [ ] Add a short developer troubleshooting note to internal docs showing common `jq` commands.
