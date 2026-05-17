## Status: Draft
## Source issue: #341
## Goal (one paragraph)
Upgrade the backend ASGI server dependency from `uvicorn[standard]==0.32.1` to `uvicorn[standard]==0.47.0` through a dedicated backend dependency sprint, preserving the existing FastAPI application behavior, local development reload workflow, production container startup command, and health-check accessibility while documenting compatibility findings across the version gap.

## Non-goals (explicit list — what this does NOT do)
- This does not change authentication, billing, backtesting numerical logic, database models, or migrations.
- This does not upgrade unrelated backend dependencies such as FastAPI, Starlette, RQ, redis-py, SQLModel, Alembic, or python-jose.
- This does not add new API endpoints or change existing endpoint request or response contracts.
- This does not change frontend code, UI behavior, or user-facing product workflows.
- This does not introduce a new process manager, deployment platform, or container orchestration strategy.
- This does not batch unrelated security remediations or dependency maintenance items into the uvicorn upgrade.

## Acceptance criteria (numbered AC-001, AC-002, …)
1. AC-001  
   **Given** the backend dependency manifest is updated for this feature,  
   **When** a maintainer inspects `backend/requirements.txt`,  
   **Then** `uvicorn[standard]` is pinned to `0.47.0` and no unrelated dependency versions are changed.

2. AC-002  
   **Given** the uvicorn 0.32.1 to 0.47.0 release gap is being upgraded,  
   **When** the implementer prepares the PR,  
   **Then** the PR documents compatibility notes for FastAPI 0.129.2, Starlette `>=0.49.1`, development reload behavior, and production container startup behavior.

3. AC-003  
   **Given** the upgraded backend dependencies are installed,  
   **When** the backend automated test suite is executed,  
   **Then** the test suite completes successfully without failures attributable to the uvicorn upgrade.

4. AC-004  
   **Given** the upgraded backend is started with the production-style uvicorn command,  
   **When** a health endpoint request is made against the local server,  
   **Then** the server starts successfully and responds to the health request without startup import errors or ASGI/runtime errors.

5. AC-005  
   **Given** the upgraded backend is started with the local development reload command,  
   **When** the command initializes the FastAPI app,  
   **Then** reload mode starts successfully without CLI option regressions, missing optional extras, or watcher-related startup failures.

6. AC-006  
   **Given** this upgrade is prepared for merge,  
   **When** maintainers review the PR,  
   **Then** the PR includes validation evidence, observed compatibility findings, and a rollback path limited to reverting the uvicorn dependency bump.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing FastAPI endpoints keep their current paths, authentication requirements, request schemas, response schemas, and status-code behavior.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
Not applicable.

## Edge cases
- Uvicorn optional extras may pull changed transitive packages that affect reload watchers, websockets, HTTP parsing, or event-loop behavior.
- The application may pass request-level tests while still failing under the container entrypoint if CLI flags, import paths, or installed extras behave differently.
- Reload mode can behave differently from production mode, so both startup paths must be checked.
- A transitive dependency conflict may appear only in a clean install and should be documented rather than worked around with unrelated package upgrades unless explicitly approved.
- Existing warnings from FastAPI, Starlette, or uvicorn should be separated from blocking regressions caused by this upgrade.

## Open questions
- Should validation include a Docker Compose backend startup smoke test in addition to direct `uvicorn` commands?
- Should maintainers require a narrowed route smoke checklist beyond the health endpoint before implementation is approved?
- If uvicorn 0.47.0 introduces a transitive incompatibility, should the sprint target the newest compatible uvicorn release below 0.47.0 or pause for a broader FastAPI/Starlette upgrade plan?

## Implementation Plan: Not produced in this step.
