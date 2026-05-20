# FEAT-118 Test Plan: FastAPI 0.136.1 Upgrade

## Test cases

### TC-001 FastAPI and Starlette dependency state is correct
**Acceptance criterion:** AC-001

**Input:** Inspect backend dependency files and installed backend packages after the upgrade.

**Expected output:** `backend/requirements.txt` pins FastAPI to exactly `0.136.1`, and `pip show` reports FastAPI `0.136.1` with a compatible Starlette installation.

**Exact command:** `cd backend && rg "^fastapi==0\.136\.1$|^starlette" requirements.txt && pip show fastapi starlette`

### TC-002 Deprecated response classes are absent
**Acceptance criterion:** AC-002

**Input:** Search backend source for FastAPI response classes affected by the FEAT-116 audit.

**Expected output:** No backend source file uses `ORJSONResponse` or `UJSONResponse`.

**Exact command:** `rg "ORJSONResponse|UJSONResponse" backend/ || true`

### TC-003 JSON request callers preserve strict content-type compatibility
**Acceptance criterion:** AC-003

**Input:** Search backend tests, workers, and application code for JSON-posting callers and content-type handling.

**Expected output:** JSON request bodies are sent through `json=` or with explicit `Content-Type: application/json`; no raw JSON body caller is missing the JSON content-type header.

**Exact command:** `rg "json=|Content-Type|application/json|\.post\(|data=json\.dumps" backend/tests backend/app`

### TC-004 Implementation diff stays inside approved scope
**Acceptance criterion:** AC-004

**Input:** Review changed files after implementation.

**Expected output:** The diff is limited to `backend/requirements.txt`, any required lock or constraint artifact, and compatibility fixes required by JSON content-type or response-class behavior; it does not touch auth, billing, backtesting numerical logic, SQLModel models, Alembic migrations, or unrelated dependencies.

**Exact command:** `git diff --name-only && git diff -- backend/requirements.txt`

### TC-005 Backend regression suite passes
**Acceptance criterion:** AC-005

**Input:** Run the existing backend test suite.

**Expected output:** All existing backend tests pass, proving current route contracts and backend behavior remain intact.

**Exact command:** `cd backend && pytest tests/ -v`

### TC-006 Direct uvicorn startup health smoke passes
**Acceptance criterion:** AC-006

**Input:** Start the backend directly with production-style uvicorn and request the health endpoint.

**Expected output:** The app starts without dependency/startup errors and `GET /health` returns a successful response.

**Exact command:** `cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8001`

**Manual check:** In a second terminal while uvicorn is running, execute `curl -f http://127.0.0.1:8001/health`.

### TC-007 Docker Compose backend health smoke passes
**Acceptance criterion:** AC-007

**Input:** Start the backend service through Docker Compose and request the health endpoint.

**Expected output:** The backend service starts successfully in the Compose environment and `GET /health` returns a successful response.

**Exact command:** `docker compose up backend`

**Manual check:** In a second terminal while the backend service is running, execute `curl -f http://127.0.0.1:8000/health`.

### TC-008 Rollback guidance is recorded
**Acceptance criterion:** AC-008

**Input:** Inspect the implementation PR description or review notes.

**Expected output:** The PR records that rollback restores `backend/requirements.txt` to the prior FastAPI dependency state, rebuilds or reinstalls backend dependencies, reruns `cd backend && pip show fastapi starlette`, and reruns a `/health` smoke check.

**Exact command:** `rg "rollback|fastapi==0\.129\.2|pip show fastapi starlette|/health" docs/features/FEAT-118-fastapi-0-136-1-upgrade.md docs/testing/FEAT-118-test-plan.md`
