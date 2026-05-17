# FEAT-115 Test Plan: RQ and redis-py Migration Plan

## Test cases

### TC-001 Dependency scope is documented before pins change
**Acceptance criterion:** AC-001

**Input:** Review the approved migration notes and the implemented dependency diff.

**Expected output:** The notes identify current and target versions for RQ, redis-py, and rq-scheduler, Python compatibility constraints, and transitive constraints; `backend/requirements.txt` changes are limited to the approved dependency pins.

**Exact command:** `git diff -- backend/requirements.txt`

### TC-002 Scheduler direction is explicit
**Acceptance criterion:** AC-002

**Input:** Review the migration notes and scheduler-related implementation diff.

**Expected output:** The notes state whether the implementation keeps `rq-scheduler`, replaces it with native RQ 2.x scheduling or repeat jobs, or defers the scheduler change; the worker scheduler code matches that decision.

**Exact command:** `git diff -- backend/app/worker/main.py backend/app/worker/jobs.py docker-compose.yml docker-compose.prod.yml`

### TC-003 RQ, redis-py, and scheduler integration points are audited
**Acceptance criterion:** AC-003

**Input:** Search backend and Compose files for Redis, RQ, worker, queue, and scheduler integration points.

**Expected output:** Every discovered integration point is accounted for in the migration notes or implementation diff, including API queue enqueueing, Redis cache/rate-limit usage, worker startup, scheduled job registration, and Compose worker/scheduler services.

**Exact command:** `rg -n "from redis|from rq|rq_scheduler|Redis\\.from_url|Queue\\(|Worker\\(|Scheduler\\(|scheduler|redis:" backend docker-compose.yml docker-compose.prod.yml`

### TC-004 Backend automated checks pass after migration
**Acceptance criterion:** AC-004

**Input:** Install the migrated backend dependencies and run the backend test suite.

**Expected output:** The pytest suite exits successfully without regressions in backtest enqueueing, Redis-backed API behavior, worker job imports, or scheduler-related tests.

**Exact command:** `cd backend && pytest tests/ -v`

### TC-005 FEAT-030 dependency decision is recorded
**Acceptance criterion:** AC-005

**Input:** Review the migration notes and any FEAT-030-related documentation diff.

**Expected output:** The notes state whether FEAT-030 should wait for this migration or continue with the current scheduler workaround, including the reason for the decision.

**Exact command:** `git diff -- docs/features/FEAT-030.md docs/testing/FEAT-030-test-plan.md docs/features/FEAT-115-rq-redis-migration-plan.md`

### TC-006 Worker strategy is locally verifiable
**Acceptance criterion:** AC-006

**Input:** Import the worker entrypoint after installing migrated dependencies.

**Expected output:** The worker module imports without RQ, redis-py, or scheduler import errors, and the selected worker strategy is documented in the migration notes.

**Exact command:** `cd backend && python -c "from app.worker.main import run_worker, run_scheduler; print(run_worker.__name__, run_scheduler.__name__)"`

### TC-007 PR evidence and rollback path are present
**Acceptance criterion:** AC-007

**Input:** Review the implementation PR description before merge.

**Expected output:** The PR includes executed validation commands, compatibility findings, rollout notes, rollback guidance, and confirmation that unrelated dependencies and product behavior were not changed.

**Exact command:** `gh pr view --json body --jq .body`
