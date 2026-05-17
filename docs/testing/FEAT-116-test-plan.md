# FEAT-116 Test Plan: FastAPI Upgrade Plan

## Test cases

### TC-001 Current dependency pins are identified
**Acceptance criterion:** AC-001

**Input:** Inspect the produced FastAPI upgrade plan and the backend dependency manifest.

**Expected output:** The plan identifies current FastAPI, Starlette, uvicorn, and httpx pins or constraints from `backend/requirements.txt`.

**Exact command:** `rg "fastapi==|starlette|uvicorn\[standard\]|httpx==" backend/requirements.txt && rg "FastAPI|Starlette|uvicorn|httpx" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-002 Response-class audit is documented
**Acceptance criterion:** AC-002

**Input:** Search backend code for deprecated or removed FastAPI response classes and inspect the produced plan.

**Expected output:** The backend search exits with no matches or lists every usage, and the plan documents the audit result plus any required remediation.

**Exact command:** `rg "ORJSONResponse|UJSONResponse" backend/ || true; rg "ORJSONResponse|UJSONResponse|response-class" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-003 JSON request client audit is documented
**Acceptance criterion:** AC-003

**Input:** Search backend tests, RQ workers, and backend services for JSON-posting callers and inspect the produced plan.

**Expected output:** The plan documents the strict JSON content-type risk and covers tests, RQ workers, and internal HTTP callers that post JSON.

**Exact command:** `rg "json=|Content-Type|application/json|\.post\(" backend/tests backend/app && rg "Content-Type|application/json|RQ workers|internal HTTP callers" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-004 Starlette compatibility handling is documented
**Acceptance criterion:** AC-004

**Input:** Inspect current Starlette requirements and the produced plan.

**Expected output:** The current `starlette>=0.49.1` constraint is visible, and the plan explains how the constraint will be handled for the FastAPI upgrade.

**Exact command:** `rg "^starlette>=0\.49\.1$" backend/requirements.txt && rg "starlette>=0\.49\.1|Starlette" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-005 Lifespan and startup verification scope is documented
**Acceptance criterion:** AC-005

**Input:** Inspect backend startup commands, health endpoint wiring, and the produced plan.

**Expected output:** The plan covers lifespan or startup/shutdown behavior, local reload startup, production container startup, and `/health` accessibility.

**Exact command:** `rg "uvicorn app\.main:app --reload|CMD \[\"uvicorn\"|/health|include_router\(health_router\)" backend/start_server.sh backend/Dockerfile backend/app && rg "lifespan|startup|reload|production container|/health" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-006 Scope exclusions are documented
**Acceptance criterion:** AC-006

**Input:** Inspect the produced plan for risk boundaries and non-goals.

**Expected output:** The plan explicitly excludes auth, billing, backtesting numerical logic, migrations, and unrelated dependency upgrades.

**Exact command:** `rg "auth|billing|backtesting numerical logic|migrations|unrelated dependency" docs/features/FEAT-116-fastapi-upgrade-plan.md`

### TC-007 Verification and rollback are documented
**Acceptance criterion:** AC-007

**Input:** Inspect the produced plan for validation commands and rollback guidance.

**Expected output:** The plan includes exact backend test, dependency-inspection, and startup smoke commands plus rollback guidance to restore the previous FastAPI dependency state.

**Exact command:** `rg "cd backend && pytest tests/ -v|pip show fastapi|uvicorn app\.main:app|rollback|FastAPI dependency state" docs/features/FEAT-116-fastapi-upgrade-plan.md`
