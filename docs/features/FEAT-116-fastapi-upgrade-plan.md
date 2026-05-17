## Status: Draft
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
- Should the later implementation target exactly FastAPI `0.136.1`, or the newest compatible patch version available when implementation starts?
- Should the implementation PR include a Docker Compose backend smoke test in addition to direct `uvicorn` startup verification?
- If Starlette 1.0+ compatibility requires loosening the current explicit Starlette constraint, should that be handled inside the FastAPI upgrade PR or split into a separate prerequisite feature?

## Implementation Plan: Not produced in this step.
