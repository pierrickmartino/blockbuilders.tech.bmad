## Status: Draft
## Source issue: #335
## Goal (one paragraph)
Migrate the backend JWT library from `python-jose[cryptography]==3.3.0` to `joserfc 1.6.5`. The previously proposed target of `python-jose 3.5.0` is invalid as that version does not exist and the library is considered abandoned. This migration removes the known CVE-2024-33663 exposure while preserving the existing HS256 token format, authentication flows, expiry behavior, and FEAT-106 runtime mitigation that explicitly allowlists the expected decode algorithm.

## Non-goals (explicit list — what this does NOT do)
- This does not change token signing algorithms (remaining HS256), token payload shape, token expiry duration, JWT secrets, or auth configuration.
- This does not add, remove, or change authentication endpoints.
- This does not change authorization rules, billing gates, backtesting behavior, database models, or migrations.
- This does not upgrade unrelated backend dependencies beyond what is required by `joserfc`.
- This does not weaken or remove the FEAT-106 explicit `algorithms=` decode allowlist.

## Acceptance criteria (numbered AC-001, AC-002, …)
AC-001
**Given** the backend dependency manifest is updated for this feature,
**When** a maintainer inspects `backend/requirements.txt`,
**Then** `python-jose[cryptography]` is removed and `joserfc` is pinned to `1.6.5`.

AC-002
**Given** backend dependencies are installed from the updated manifest,
**When** a maintainer checks the installed JWT library,
**Then** the environment reports `joserfc` version `1.6.5` and `python-jose` is not present.

AC-003
**Given** the migration to `joserfc` is complete,
**When** a maintainer audits JWT usage,
**Then** all `jwt` operations (sign/verify/decode) use the `joserfc` API, and all decode paths still explicitly pass the expected algorithm allowlist per FEAT-106.

AC-004
**Given** existing valid HS256 JWTs are used with authenticated backend routes,
**When** backend auth and JWT tests are run after the migration,
**Then** valid HS256 authentication and token expiry behavior continue to pass without user-facing auth regressions.

AC-005
**Given** CVE-2024-33663 depends on unsafe algorithm handling,
**When** backend JWT enforcement tests are run after the migration,
**Then** tokens using non-allowed algorithms (including 'none') continue to be rejected.

AC-006
**Given** auth dependency changes are risk-high under `AGENTS.md`,
**When** the feature is prepared for implementation or PR review,
**Then** the implementation notes include explicit human approval and verification evidence.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing authentication endpoints and authenticated routes keep their current paths, request schemas, response schemas, status codes, token payloads, token expiry behavior, and authorization requirements.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- `joserfc` API differences: The implementation must map existing `python-jose` calls to their `joserfc` equivalents while maintaining identical behavior for HS256.
- Algorithm allowlist: `joserfc` requires explicit algorithm handling; this must be configured to match the `FEAT-106` allowlist (typically `["HS256"]`).
- Expiry handling: Ensure `joserfc` verification correctly handles `exp`, `iat`, and `nbf` claims consistent with previous behavior.
- Missing `python-jose` 3.5.0: The spec explicitly acknowledges that `python-jose 3.5.0` was a non-existent target and `joserfc` is the chosen replacement.

## Open questions
- Are there any specific `python-jose` extensions or legacy behaviors in use that `joserfc` does not support out of the box?
- Should we use `joserfc`'s high-level `JWT` registry or lower-level `jws` modules for our specific HS256 needs?

## Implementation Plan
_Produced by Claude. Approved: [pending]_

<plan>

1. **`backend/requirements.txt`** — Remove `python-jose[cryptography]==3.3.0` and add `joserfc==1.6.5`.

2. **`backend/app/core/security.py`** — Update imports from `jose` to `joserfc`. Refactor `create_access_token` and `decode_token` (or equivalent) to use `joserfc.jwt.encode` and `joserfc.jwt.decode`.

3. **Algorithm Allowlist (FEAT-106)** — Ensure the `joserfc.jwt.decode` call explicitly restricts algorithms to `[settings.JWT_ALGORITHM]` (e.g., `["HS256"]`).

4. **Error Handling** — Map `jose.JWTError` and specific exception handling to `joserfc` exception equivalents (e.g., `joserfc.errors.JoseError`).

5. **Verification** — Run full backend auth suite: `cd backend && pytest tests/test_jwt_algorithm_enforcement.py -v` and any other relevant security tests.

</plan>
