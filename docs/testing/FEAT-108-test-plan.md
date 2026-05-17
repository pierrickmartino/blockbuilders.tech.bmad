# FEAT-108 Test Plan: Uvicorn Upgrade Sprint

## Test cases

### TC-001 Uvicorn dependency is pinned without unrelated backend dependency changes
**Acceptance criterion:** AC-001

**Input:** Inspect the implemented change set for `backend/requirements.txt`.

**Expected output:** `uvicorn[standard]==0.47.0` is present, the previous `uvicorn[standard]==0.32.1` pin is absent, and unrelated dependency pins are unchanged.

**Exact command:** `git diff -- backend/requirements.txt`

### TC-002 Compatibility notes are included in PR evidence
**Acceptance criterion:** AC-002

**Input:** Review the implementation PR description and release-risk notes.

**Expected output:** The PR documents compatibility notes for FastAPI 0.129.2, Starlette `>=0.49.1`, local reload behavior, and production container startup behavior.

**Exact command:** `gh pr view --json body --jq .body`

### TC-003 Backend automated tests pass after the upgrade
**Acceptance criterion:** AC-003

**Input:** Install the upgraded backend dependencies and run the backend test suite.

**Expected output:** The pytest suite exits successfully without uvicorn-related regressions.

**Exact command:** `cd backend && pytest tests/ -v`

### TC-004 Production-style uvicorn startup responds to health checks
**Acceptance criterion:** AC-004

**Input:** Start the FastAPI app with the production-style uvicorn invocation and call the health endpoint.

**Expected output:** The server starts on `127.0.0.1:8000`, the health request returns successfully, and the command exits after the smoke check.

**Exact command:** `cd backend && (python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > /tmp/feat-108-uvicorn.log 2>&1 & pid=$!; sleep 5; curl -fsS http://127.0.0.1:8000/health; status=$?; kill $pid; wait $pid 2>/dev/null || true; exit $status)`

### TC-005 Development reload startup initializes successfully
**Acceptance criterion:** AC-005

**Input:** Start the FastAPI app with the development reload command used by the backend helper script.

**Expected output:** Uvicorn reload mode initializes the application without CLI option regressions, missing extras, or watcher startup failures.

**Exact command:** `cd backend && (python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 > /tmp/feat-108-uvicorn-reload.log 2>&1 & pid=$!; sleep 5; curl -fsS http://127.0.0.1:8001/health; status=$?; kill $pid; wait $pid 2>/dev/null || true; exit $status)`

### TC-006 PR includes validation evidence and rollback path
**Acceptance criterion:** AC-006

**Input:** Review the implementation PR description before merge.

**Expected output:** The PR includes executed commands, smoke-test results, compatibility findings, and rollback guidance to revert the uvicorn dependency bump.

**Exact command:** `gh pr view --json body --jq .body`
