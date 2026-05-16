## Status: Approved
## Source issue: #313
## Goal (one paragraph)
Reduce backend denial-of-service risk by explicitly pinning a safe Starlette version in backend dependency definitions so Blockbuilders no longer inherits a vulnerable transitive Starlette release from FastAPI defaults, and can consistently install a patched version across local, CI, and containerized environments.

## Non-goals (explicit list — what this does NOT do)
- Does not change application business logic, routing behavior, or request handlers.
- Does not redesign file-serving endpoints or static asset architecture.
- Does not change FastAPI version in this feature.
- Does not introduce new security scanning tooling.
- Does not modify frontend dependencies.

## Acceptance criteria (numbered AC-001, AC-002, …)
- **AC-001**
  - **Given** the backend dependency file is reviewed
  - **When** engineers inspect direct backend requirements
  - **Then** `starlette>=0.49.1` is explicitly present in `backend/requirements.txt`.
- **AC-002**
  - **Given** a fresh backend dependency installation from repository requirements
  - **When** `pip show starlette` is executed in the backend environment
  - **Then** the installed Starlette version is `0.49.1` or higher.
- **AC-003**
  - **Given** backend automated tests are run after the dependency pin
  - **When** the project executes the standard backend test command
  - **Then** tests complete successfully without new failures attributable to the Starlette pin.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing endpoints remain unchanged.

## Data model changes (SQLModel if any)
No SQLModel or schema changes.

## UI behaviour (frontend if any)
No frontend/UI behavior changes.

## Edge cases
- Dependency resolver may select a newer compatible Starlette version above `0.49.1`; this is acceptable as long as it remains `>=0.49.1`.
- Environment cache or lock artifacts may retain an older Starlette unless dependencies are reinstalled/updated.
- If other backend dependencies constrain Starlette to `<0.49.1`, installation may fail and require explicit dependency conflict resolution before implementation can be considered complete.

## Open questions
- Is there any deployed environment currently using lockfiles or image-layer caches that could bypass the new pin without a full rebuild?
- Should this feature also require explicit verification in CI logs (e.g., dependency freeze artifact) beyond local/container `pip show` checks?

## Implementation Plan
_Produced by Claude. Approved: [approved]_
<plan>

1. **backend/requirements.txt** — Add an explicit `starlette>=0.49.1` line immediately after the `fastapi==0.129.2` entry to pin the transitive dependency to a patched version. (Backend. Alembic migration: no. Order: first; all other steps depend on this change.)

2. **backend/requirements.txt** — Verify no other line constrains Starlette to `<0.49.1`; if a conflicting transitive constraint surfaces during install, resolve by adjusting only this file (no FastAPI bump, per non-goals). (Backend. Alembic migration: no. Order: after step 1.)

3. **Local verification (no file change)** — Rebuild backend env from `backend/requirements.txt` and run `pip show starlette` to confirm `Version: >= 0.49.1` (TC-002). (Backend. Alembic migration: no. Order: after step 2.)

4. **Local verification (no file change)** — Run `rg "^starlette>=0\.49\.1$" backend/requirements.txt` to confirm exact AC-001 pin text (TC-001). (Backend. Alembic migration: no. Order: parallel to step 3.)

5. **Backend regression check (no file change)** — Execute `cd backend && pytest tests/ -v` and confirm no new failures attributable to the Starlette pin (TC-003 / AC-003). (Backend. Alembic migration: no. Order: after steps 3–4.)

6. **tasks/todo.md** — Append a completion entry for FEAT-105 noting the pin, the resolved Starlette version reported by `pip show`, and pytest result summary. (Backend. Alembic migration: no. Order: last.)

</plan>
