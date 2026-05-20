## Status: Draft
## Source issue: #372
## Goal (one paragraph)
Upgrade the backend FastAPI dependency from `0.129.2` to exactly `0.136.1` using the approved FEAT-116 plan as the implementation boundary, preserving existing API behavior while applying only compatibility fixes required by the audited FastAPI 0.130-0.136 risks. The implementation must keep current routes, auth requirements, request and response schemas, status-code behavior, startup behavior, health checks, and backtest behavior intact, with verification evidence before completion.

## Non-goals (explicit list - what this does NOT do)
- This does not change authentication, authorization, JWT handling, OAuth behavior, or password reset behavior.
- This does not change billing, subscription limits, credits, or plan enforcement.
- This does not change backtesting numerical logic, trading calculations, indicator output, or strategy interpretation.
- This does not change SQLModel models, Alembic migrations, or database schema.
- This does not change API paths, request schemas, response schemas, or expected status-code behavior.
- This does not upgrade uvicorn, RQ, redis-py, SQLModel, Alembic, httpx, python-jose, or unrelated backend dependencies.
- This does not adopt new FastAPI features or refactor backend architecture.
- This does not change frontend behavior or frontend dependencies.

## Acceptance criteria (numbered AC-001, AC-002, ...)
1. AC-001  
   **Given** the backend dependency upgrade is applied,  
   **When** a maintainer inspects the backend dependency manifest and installed packages,  
   **Then** FastAPI is pinned to exactly `0.136.1` and the resolved Starlette version is compatible with that FastAPI version.

2. AC-002  
   **Given** FEAT-116 identified response-class compatibility risk,  
   **When** the backend is audited after the upgrade,  
   **Then** there are no `ORJSONResponse` or `UJSONResponse` usages left that can break under FastAPI 0.130-0.136 behavior.

3. AC-003  
   **Given** FastAPI 0.132 enforces stricter JSON request content types,  
   **When** backend tests, RQ workers, and backend internal HTTP callers send JSON request bodies,  
   **Then** those callers use `json=` or otherwise send `Content-Type: application/json`, with no raw JSON body caller missing the header.

4. AC-004  
   **Given** the dependency upgrade is maintenance-only backend work,  
   **When** a maintainer reviews the implementation diff,  
   **Then** source changes are limited to the FastAPI pin, any required Starlette constraint adjustment, and compatibility fixes required by AC-002 or AC-003.

5. AC-005  
   **Given** existing backend API behavior must be preserved,  
   **When** the backend test suite is run,  
   **Then** the existing backend tests pass without changing expected route contracts, authentication requirements, request schemas, response schemas, or status codes.

6. AC-006  
   **Given** the application relies on stable backend startup behavior,  
   **When** the backend is started with production-style `uvicorn`,  
   **Then** the app starts successfully and `GET /health` remains reachable.

7. AC-007  
   **Given** container dependency resolution can differ from local dependency resolution,  
   **When** the backend is started through Docker Compose,  
   **Then** the backend service starts successfully and `GET /health` remains reachable.

8. AC-008  
   **Given** dependency upgrades need a safe rollback path,  
   **When** the implementation is prepared for review,  
   **Then** the PR records rollback guidance to restore the prior FastAPI dependency state and rerun dependency inspection plus the health smoke check.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes are approved. Existing FastAPI endpoints must keep their current paths, authentication requirements, request schemas, response schemas, and status-code behavior.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
Not applicable.

## Edge cases
- `starlette>=0.49.1` is stricter than FastAPI `0.136.1`'s minimum, but local, CI, and container installs still need dependency inspection to confirm the resolved Starlette version.
- `TestClient` calls using `json=` should already send `Content-Type: application/json`; raw `data=` JSON calls would need explicit headers if any are introduced or discovered.
- RQ worker HTTP POSTs can fail stricter content-type behavior even when route tests pass, so worker-side callers must be included in the audit.
- OAuth token exchanges using form `data=` are not JSON request bodies and should not be rewritten as JSON compatibility work.
- Docker Compose startup can expose resolver or environment differences that direct `uvicorn` startup does not.
- Deprecation warnings should be reviewed, but only upgrade-blocking compatibility fixes are in scope.

## Open questions
- None.

## Implementation Plan: Not produced in this step.
