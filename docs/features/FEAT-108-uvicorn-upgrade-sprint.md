## Status: Approved
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

## Implementation Plan
_Produced by Claude. Approved: [approved]_
<plan>

1. **backend/requirements.txt** — Bump pin from `uvicorn[standard]==0.32.1` to `uvicorn[standard]==0.47.0`; leave every other line untouched. (Backend; Alembic migration: no; order: first — prerequisite for all validation steps.)

2. **backend/requirements.txt** (fallback path, only if 0.47.0 has a transitive incompatibility per AC-001/edge cases) — Pin to the newest compatible `uvicorn[standard]` release below 0.47.0, document the chosen version and the blocker in the PR body. (Backend; Alembic migration: no; order: conditional, replaces step 1 only on failure.)

3. **Clean install verification** — In a clean environment run `pip install -r backend/requirements.txt` to surface transitive conflicts before functional tests; capture output for the PR. (Backend; Alembic migration: no; order: after step 1/2, before steps 4–6.)

4. **Backend test suite execution (TC-003 / AC-003)** — Run `cd backend && pytest tests/ -v` against the upgraded environment and attach the result to the PR; no source file changes. (Backend; Alembic migration: no; order: after step 3.)

5. **Production-style startup smoke (TC-004 / AC-004)** — Execute the production-style `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` invocation, hit `/health`, capture log evidence. Confirms `backend/Dockerfile` CMD still works without source changes. (Backend; Alembic migration: no; order: after step 4.)

6. **Reload-mode startup smoke (TC-005 / AC-005)** — Execute `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001`, hit `/health`, capture log evidence. Confirms `backend/start_server.sh` reload path still works without source changes. (Backend; Alembic migration: no; order: after step 5.)

7. **PR body — compatibility notes (TC-002 / AC-002)** — Document upgrade-gap notes for FastAPI 0.129.2, Starlette `>=0.49.1`, reload behavior, and production container startup behavior; no source file changes. (Backend; Alembic migration: no; order: after steps 3–6.)

8. **PR body — evidence + rollback path (TC-006 / AC-006)** — Include executed commands, smoke-test outputs, observed warnings vs. blocking regressions, and a rollback path limited to reverting the `backend/requirements.txt` pin to `0.32.1`. (Backend; Alembic migration: no; order: after step 7, final.)

Out of scope per resolved open questions: no Docker Compose smoke test, no extended route checklist beyond `/health`. If 0.47.0 is incompatible, fall back to the newest compatible sub-0.47.0 release (not a broader FastAPI/Starlette upgrade).

</plan>
