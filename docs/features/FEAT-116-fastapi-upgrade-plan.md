## Status: Implemented
## Source issue: #330
## Goal (one paragraph)
Create an implementation plan for upgrading the backend FastAPI dependency from `0.129.2` to the researched target `0.136.1`, after auditing the repo for known compatibility risks around response classes, stricter JSON content-type handling, Starlette constraints, lifespan behavior, test clients, RQ workers, and internal HTTP callers. The plan must preserve existing backend API behavior, avoid source-code changes in this step, and give maintainers enough verification and rollback detail to approve a later bounded dependency-upgrade implementation.

## Non-goals (explicit list — what this does NOT do)
- This does not upgrade FastAPI or any other dependency.
- This does not edit backend source code, frontend source code, tests, migrations, or runtime configuration.
- This does not change authentication, billing, backtesting numerical logic, database models, or Alembic migrations.
- This does not add new API endpoints or change existing request or response contracts.
- This does not adopt FastAPI 0.136 features such as native SSE or streaming JSON Lines support.
- This does not remove the existing explicit `starlette>=0.49.1` constraint unless a later approved implementation plan requires it.
- This does not batch unrelated backend dependency upgrades such as uvicorn, RQ, redis-py, SQLModel, Alembic, httpx, or python-jose.

## Acceptance criteria (numbered AC-001, AC-002, ...)
1. AC-001  
   **Given** the FastAPI upgrade plan is prepared,  
   **When** a maintainer reviews the audited current-state section,  
   **Then** it identifies the current backend dependency pins for FastAPI, Starlette, uvicorn, and httpx from `backend/requirements.txt`.

2. AC-002  
   **Given** FastAPI 0.130 through 0.136 includes compatibility risks,  
   **When** a maintainer reviews the response-class audit,  
   **Then** the plan states whether `ORJSONResponse` or `UJSONResponse` are used in `backend/` and lists any required remediation before upgrade.

3. AC-003  
   **Given** FastAPI 0.132 requires strict `Content-Type: application/json` handling for JSON requests,  
   **When** a maintainer reviews the request-client audit,  
   **Then** the plan covers backend tests, RQ workers, and internal HTTP callers that post JSON and identifies any missing explicit JSON content-type handling that must be fixed during implementation.

4. AC-004  
   **Given** FastAPI 0.134 moves onto Starlette 1.0+ compatibility territory,  
   **When** a maintainer reviews the Starlette compatibility section,  
   **Then** the plan explains how the existing `starlette>=0.49.1` constraint will be handled and whether the upgrade requires a tightened, removed, or confirmed-compatible Starlette constraint.

5. AC-005  
   **Given** the product relies on the existing FastAPI app startup path,  
   **When** a maintainer reviews the lifespan and server-startup audit,  
   **Then** the plan covers existing lifespan or startup/shutdown behavior, local reload startup, production container startup, and `/health` accessibility after upgrade.

6. AC-006  
   **Given** the later FastAPI upgrade is risk-medium backend work,  
   **When** a maintainer reviews the implementation sequence,  
   **Then** the plan limits changes to the dependency upgrade and compatibility fixes required by the audit, with explicit exclusions for auth, billing, backtesting numerical logic, migrations, and unrelated dependency upgrades.

7. AC-007  
   **Given** maintainers need proof before approving implementation,  
   **When** a maintainer reviews the verification section,  
   **Then** the plan includes exact backend test, dependency-inspection, and startup smoke commands, including `cd backend && pytest tests/ -v`, `cd backend && pip show fastapi starlette`, and a production-style `uvicorn app.main:app` health smoke check, plus a rollback path that restores the previous FastAPI dependency state.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes are approved by this planning feature. Existing FastAPI endpoints must keep their current paths, authentication requirements, request schemas, response schemas, and status-code behavior in any later implementation.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
Not applicable.

## Edge cases
- The local repo may have no `ORJSONResponse` or `UJSONResponse` usage, but a clean implementation plan should still record the audit command and result.
- `TestClient` requests using `json=` may already add JSON content-type headers, while lower-level internal callers may require explicit header checks.
- RQ worker jobs and service-level HTTP calls can pass automated route tests while still failing under strict content-type handling if they post raw JSON bodies without headers.
- The existing `starlette>=0.49.1` lower bound may resolve to a version that differs between local, CI, and container environments unless the implementation plan verifies the installed version.
- Startup smoke tests may pass direct `uvicorn` invocation but fail in Docker if dependency resolution differs in a clean image.
- Existing FastAPI or Starlette deprecation warnings should be separated from upgrade-blocking regressions.

## Open questions
- Resolved: the later implementation targets exactly FastAPI `0.136.1`.
- Resolved: the implementation PR includes both direct `uvicorn` and Docker Compose backend startup verification.
- Resolved: if Starlette compatibility requires a constraint change, it is handled inside the FastAPI upgrade PR rather than split into a prerequisite feature.

## Implementation Plan
_Produced by Claude. Approved: [approved]_

Note: FEAT-116 is a planning-only feature. Its deliverable is the FastAPI upgrade plan content authored inside this spec file. No backend/frontend source code, tests, migrations, or runtime configuration are modified. All bullets below edit `docs/features/FEAT-116-fastapi-upgrade-plan.md`. No Alembic migration is required for any bullet.

Resolved open questions (from planning Q&A):
- Target version: pin to FastAPI `0.136.1` exactly.
- Smoke-test scope: include both direct `uvicorn` and Docker Compose backend startup verification.
- Starlette constraint adjustment (if needed for Starlette 1.0+ compatibility): handled inside the FastAPI upgrade PR.

Plan bullets (sequential — each appends/updates one section of this file):

1. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Current-state audit` section listing exact pins for `fastapi==0.129.2`, `starlette>=0.49.1`, `uvicorn[standard]==0.32.1`, `httpx==0.27.0` from `backend/requirements.txt`, with the `rg` command used to extract them. (Backend planning doc. Migration: no. Order: 1.) — Satisfies AC-001.

2. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Response-class audit` section recording the `rg "ORJSONResponse|UJSONResponse" backend/` result and stating remediation (none if no matches; otherwise list each file:line and required replacement). (Backend planning doc. Migration: no. Order: 2.) — Satisfies AC-002.

3. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### JSON request-client audit` section covering FastAPI 0.132 strict `Content-Type: application/json` behavior, with audit results across `backend/tests/`, RQ workers under `backend/app/workers/` (or equivalent), and internal HTTP callers (`httpx`/`requests`) in `backend/app/`; list any callers missing explicit JSON content-type headers and mark them for fixing during implementation. (Backend planning doc. Migration: no. Order: 3.) — Satisfies AC-003.

4. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Starlette compatibility` section documenting current `starlette>=0.49.1` constraint, the version FastAPI 0.136.1 requires, and the decided handling: adjust the Starlette constraint inside the FastAPI upgrade PR (loosen/tighten/confirm) — explicitly not split into a prerequisite feature. (Backend planning doc. Migration: no. Order: 4.) — Satisfies AC-004.

5. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Lifespan and startup audit` section covering existing lifespan or `@app.on_event` startup/shutdown handlers in `backend/app/main.py`, local `uvicorn app.main:app --reload`, production container startup via `backend/Dockerfile` + `backend/start_server.sh`, and `/health` accessibility post-upgrade. (Backend planning doc. Migration: no. Order: 5.) — Satisfies AC-005.

6. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Implementation sequence and scope exclusions` section enumerating the bounded change set (bump `fastapi==0.136.1`, adjust Starlette constraint if required, apply only compatibility fixes surfaced by audits 2/3) and explicit exclusions: auth, billing, backtesting numerical logic, migrations, and unrelated dependency upgrades (uvicorn, RQ, redis-py, SQLModel, Alembic, httpx, python-jose). (Backend planning doc. Migration: no. Order: 6.) — Satisfies AC-006.

7. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Add `### Verification and rollback` section with exact commands: `cd backend && pytest tests/ -v`, `cd backend && pip show fastapi starlette`, production-style `uvicorn app.main:app` health smoke (curl `/health`), Docker Compose backend smoke (`docker compose up backend` + `/health` curl), and a rollback path that reverts `backend/requirements.txt` to the prior FastAPI dependency state and rebuilds. (Backend planning doc. Migration: no. Order: 7.) — Satisfies AC-007.

8. **`docs/features/FEAT-116-fastapi-upgrade-plan.md`** — Flip `## Status: Draft` to `## Status: Ready for implementation approval` and record the three resolved open questions inline under the existing `## Open questions` block. (Backend planning doc. Migration: no. Order: 8, final.) — Closes spec gates.

### Current-state audit
Command used:

```bash
rg "fastapi==|starlette|uvicorn\[standard\]|httpx==" backend/requirements.txt
```

Result from `backend/requirements.txt`:

```text
fastapi==0.129.2
starlette>=0.49.1
uvicorn[standard]==0.32.1
httpx==0.27.0
```

The later implementation starts from FastAPI `0.129.2` with an explicit Starlette lower bound, pinned uvicorn, and pinned httpx. Dependency resolution must be inspected after the FastAPI bump because the Starlette lower bound allows different resolved versions across local, CI, and container environments.

### Response-class audit
Command used:

```bash
rg "ORJSONResponse|UJSONResponse" backend/ || true
```

Result: no matches in `backend/`.

No response-class remediation is required before the FastAPI upgrade. The implementation PR should not add or replace response classes unless a regression appears during verification.

### JSON request-client audit
FastAPI `0.132` introduced stricter handling for requests with JSON bodies and missing or incompatible `Content-Type`. The implementation should preserve existing backend API behavior by confirming all internal JSON-posting clients send explicit JSON content type or use a client helper that does so.

Audit command used:

```bash
rg "json=|Content-Type|application/json|\.post\(" backend/tests backend/app
```

Backend tests: `backend/tests/` and `backend/tests/api/` use FastAPI `TestClient` with `json=` for JSON request bodies. `TestClient` sets `Content-Type: application/json` for `json=` payloads, so no test-call remediation is expected. If any test later uses raw `data=` with a JSON string against an endpoint expecting JSON, that test should be updated during the FastAPI upgrade implementation.

RQ workers: the worker package is `backend/app/worker/`. The JSON-posting worker call is in `backend/app/worker/jobs.py`, where `client.post(..., json=payload, headers={"Content-Type": "application/json"})` already sends an explicit JSON content type. No worker remediation is required from the current audit.

Internal HTTP callers: `backend/app/api/auth.py` has OAuth token exchange calls that use form `data=` payloads, not JSON. The GitHub exchange also sends `Accept: application/json`, which affects the provider response format rather than request JSON content type. `backend/app/api/market.py`, `backend/app/backtest/candles.py`, and other audited HTTP callers use GET requests. No internal backend caller currently posts JSON without an explicit JSON content type.

### Starlette compatibility
The current backend dependency manifest contains:

```text
starlette>=0.49.1
```

FastAPI `0.136.1` package metadata was inspected with:

```bash
tmpdir=$(mktemp -d); python3 -m pip download fastapi==0.136.1 --no-deps -d "$tmpdir" >/dev/null && python3 - <<'PY' "$tmpdir"
import pathlib, sys, zipfile
wheel = next(pathlib.Path(sys.argv[1]).glob('fastapi-0.136.1*.whl'))
with zipfile.ZipFile(wheel) as z:
    meta = z.read('fastapi-0.136.1.dist-info/METADATA').decode()
for line in meta.splitlines():
    if line.startswith('Requires-Dist: starlette'):
        print(line)
PY
```

Result:

```text
Requires-Dist: starlette>=0.46.0
```

The existing `starlette>=0.49.1` constraint is compatible with FastAPI `0.136.1`'s lower bound and is stricter than FastAPI's own minimum. The FastAPI upgrade PR should confirm the resolved installed Starlette version with `pip show fastapi starlette`. If local, CI, or container resolution reveals a Starlette incompatibility, adjust the Starlette constraint inside the FastAPI upgrade PR. This is explicitly not split into a prerequisite feature.

### Lifespan and startup audit
Audit command used:

```bash
rg "on_event|lifespan|include_router\(health_router\)|/health|uvicorn app\.main:app --reload|CMD \[\"uvicorn\"|start_server" backend/app/main.py backend/app backend/Dockerfile backend/start_server.sh
```

Current app startup in `backend/app/main.py` uses `app = FastAPI()`, middleware registration, and router registration. The audit found no `lifespan` handler and no `@app.on_event` startup or shutdown handlers in `backend/app/main.py`.

Local reload startup is defined in `backend/start_server.sh`:

```bash
uvicorn app.main:app --reload
```

Production container startup is defined in `backend/Dockerfile`:

```text
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The health router is included by `app.include_router(health_router)`, and `backend/app/api/health.py` defines `GET /health`. The implementation PR must verify `/health` remains reachable after direct uvicorn startup and after Docker Compose backend startup.

### Implementation sequence and scope exclusions
The later FastAPI upgrade implementation is bounded to:

1. Change the backend dependency from `fastapi==0.129.2` to `fastapi==0.136.1`.
2. Keep `starlette>=0.49.1` if dependency inspection confirms compatibility, or adjust only the Starlette constraint if the resolver/startup audit proves that is required.
3. Apply only compatibility fixes surfaced by the response-class audit or JSON request-client audit.

Explicit exclusions: no auth behavior changes, no billing behavior changes, no backtesting numerical logic changes, no database model changes, no Alembic migrations, no API contract changes, and no unrelated dependency upgrades for uvicorn, RQ, redis-py, SQLModel, Alembic, httpx, or python-jose.

### Verification and rollback
Backend test command:

```bash
cd backend && pytest tests/ -v
```

Dependency inspection command:

```bash
cd backend && pip show fastapi starlette
```

Direct production-style uvicorn health smoke:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
curl -f http://127.0.0.1:8000/health
```

Docker Compose backend smoke:

```bash
docker compose up backend
curl -f http://127.0.0.1:8000/health
```

Rollback path: revert the FastAPI upgrade PR changes so `backend/requirements.txt` returns to the prior FastAPI dependency state, including `fastapi==0.129.2` and the previous Starlette constraint. Then rebuild or reinstall backend dependencies and rerun `cd backend && pip show fastapi starlette` plus the `/health` smoke to confirm the previous dependency state is restored.
