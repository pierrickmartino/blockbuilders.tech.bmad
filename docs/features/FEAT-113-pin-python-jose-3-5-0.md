## Status: Draft
## Source issue: #335
## Goal (one paragraph)
Upgrade the backend JWT library dependency from `python-jose[cryptography]==3.3.0` to `python-jose[cryptography]==3.5.0` to remove the known CVE-2024-33663 exposure from the installed package while preserving the existing HS256 token format, authentication flows, expiry behavior, and FEAT-106 runtime mitigation that explicitly allowlists the expected decode algorithm.

## Non-goals (explicit list — what this does NOT do)
- This does not migrate JWT handling from `python-jose` to `joserfc`, PyJWT, or any other library.
- This does not change token signing algorithms, token payload shape, token expiry duration, JWT secrets, or auth configuration.
- This does not add, remove, or change authentication endpoints.
- This does not change authorization rules, billing gates, backtesting behavior, database models, or migrations.
- This does not upgrade unrelated backend dependencies beyond what is required by resolving the existing `python-jose[cryptography]` extra.
- This does not weaken or remove the FEAT-106 explicit `algorithms=` decode allowlist.

## Acceptance criteria (numbered AC-001, AC-002, …)
AC-001
**Given** the backend dependency manifest is updated for this feature,
**When** a maintainer inspects `backend/requirements.txt`,
**Then** the direct `python-jose[cryptography]` requirement is pinned to `3.5.0` and no unrelated direct dependency pins are changed.

AC-002
**Given** backend dependencies are installed from the updated manifest,
**When** a maintainer checks the installed JWT library version,
**Then** the environment reports `python-jose` version `3.5.0`.

AC-003
**Given** the repository contains JWT encode and decode helpers,
**When** a maintainer audits JWT usage after the dependency upgrade,
**Then** all `jwt.decode()` call sites still explicitly pass the expected algorithm allowlist and no new decode path omits `algorithms=`.

AC-004
**Given** existing valid HS256 JWTs are used with authenticated backend routes,
**When** backend auth and JWT tests are run after the dependency upgrade,
**Then** valid HS256 authentication and token expiry behavior continue to pass without user-facing auth regressions.

AC-005
**Given** CVE-2024-33663 depends on unsafe algorithm handling,
**When** backend JWT enforcement tests are run after the dependency upgrade,
**Then** tokens using non-allowed algorithms continue to be rejected.

AC-006
**Given** auth dependency changes are risk-high under `AGENTS.md`,
**When** the feature is prepared for implementation or PR review,
**Then** the implementation notes include explicit human approval, verification evidence, and a follow-up note that migration to `joserfc` remains out of scope and tracked separately.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing authentication endpoints and authenticated routes keep their current paths, request schemas, response schemas, status codes, token payloads, token expiry behavior, and authorization requirements.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- `python-jose[cryptography]` may resolve transitive dependency versions differently in a clean environment; unrelated direct dependency pins should not be changed without separate approval.
- FEAT-106 already mitigates current runtime exposure by explicitly passing `algorithms=[settings.jwt_algorithm]`; this upgrade must preserve that allowlist instead of treating the package bump as sufficient by itself.
- Existing tests may pass while a new JWT decode call site silently omits `algorithms=`, so source audit remains part of the verification.
- If `python-jose==3.5.0` introduces behavior differences around expired, malformed, or non-HS256 tokens, the implementation must stop for human review rather than changing auth semantics inside this feature.
- If dependency resolution cannot install `3.5.0` with the current Python 3.12 backend stack, the implementation must document the conflict and stop rather than broadening the upgrade.

## Open questions
- Should the implementation use the exact direct pin `python-jose[cryptography]==3.5.0`, or would maintainers prefer a lower-bound requirement such as `python-jose[cryptography]>=3.5.0,<3.6.0`?
- Should issue #327 remain the only tracker for the longer-term `joserfc` migration, or should a new feature spec be created after this minimal pin lands?
- Which auth/JWT test subset should be considered sufficient for approval if the full backend suite is slow in CI?

## Implementation Plan
_Produced by Claude. Approved: [pending]_

<plan>

1. **`backend/requirements.txt`** — Update the direct dependency line `python-jose[cryptography]==3.3.0` to `python-jose[cryptography]==3.5.0` (exact pin, per TC-001 expectation); leave every other direct pin untouched. Backend. Alembic migration: no. Order dependency: must land before steps 2–5.

2. **`backend/app/core/security.py`** — No code change; perform a read-only audit to confirm the single `jwt.decode(` call site (line 31) still explicitly passes `algorithms=[...]` (FEAT-106 mitigation preserved). Backend. Alembic migration: no. Order dependency: after step 1.

3. **Repo-wide decode audit** — Run `rg -n "jwt\.decode\(" backend` and verify every match passes `algorithms=` (TC-003); no file edits expected. Backend. Alembic migration: no. Order dependency: after step 1.

4. **Clean-install verification** — In a refreshed backend env, run `python -m pip install -r requirements.txt && python -m pip show python-jose` and confirm `Version: 3.5.0` (TC-002). If resolution fails on Python 3.12, stop and escalate (do not broaden the upgrade). Backend. Alembic migration: no. Order dependency: after step 1.

5. **Auth/JWT regression run** — Execute `cd backend && pytest tests/test_jwt_algorithm_enforcement.py -v` and confirm HS256 acceptance, expiry handling, and non-allowed-algorithm rejection all pass (TC-004, TC-005). If any behavior diverges, stop for human review per AC-006. Backend. Alembic migration: no. Order dependency: after step 4.

6. **PR / implementation notes** — In the PR description (and a brief note appended to this spec under verification evidence), record: risk-high human approval obtained, the `pip show` output, the pytest summary, and a reference that `joserfc` migration remains out of scope and tracked separately (issue #327). Backend (docs only). Alembic migration: no. Order dependency: after steps 4–5.

</plan>
