## Status: Implemented
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
_Produced by Claude. Approved: [approved]_

<plan>

Scope audit: only two files import `jose` — `backend/app/core/security.py` (prod encode/decode) and `backend/tests/test_jwt_algorithm_enforcement.py` (forges RS256 + unsigned tokens to verify rejection). Decisions confirmed: use the high-level `joserfc.jwt` API for production; use `joserfc` for RS256 forging in tests (no second JWT lib). FEAT-106 explicit `algorithms=[settings.jwt_algorithm]` allowlist is preserved on every decode.

1. **`backend/requirements.txt`** — Replace `python-jose[cryptography]==3.3.0` with `joserfc==1.6.5`, leaving every other pin untouched. Backend. Alembic migration: no. Order: must land first so subsequent edits resolve imports.

2. **`backend/app/core/security.py`** — Replace `from jose import JWTError, jwt` with `from joserfc import jwk`, `from joserfc.jwt import encode as jwt_encode, decode as jwt_decode, JWTClaimsRegistry`, and `from joserfc.errors import JoseError`; import the HMAC secret with `jwk.import_key(settings.jwt_secret_key, "oct")`; rewrite `create_access_token` to call `jwt_encode({"alg": settings.jwt_algorithm}, {"sub": user_id, "exp": int(expire.timestamp())}, key)`; rewrite `decode_access_token` to call `jwt_decode(token, key, algorithms=[settings.jwt_algorithm])`, validate `exp`/`iat`/`nbf` via `JWTClaimsRegistry().validate(decoded.claims)`, return `decoded.claims.get("sub")`, and return `None` on any `JoseError`. Backend. Alembic migration: no. Depends on bullet 1.

3. **`backend/tests/test_jwt_algorithm_enforcement.py`** — Replace `from jose import jwt` with `from joserfc.jwt import encode as jwt_encode` and `from joserfc.jwk import RSAKey`; coerce `_claims()` `exp` to `int(expire.timestamp())` (joserfc requires numeric claims); refactor `_rs256_token` to import the private key with `RSAKey.import_key(RS256_PRIVATE_KEY)` and call `jwt_encode({"alg": "RS256"}, _claims(user_id), key)`; leave `_unsigned_token` hand-rolled (joserfc refuses `alg: none`); keep all three rejection assertions and the HS256 acceptance assertion unchanged. Backend. Alembic migration: no. Depends on bullet 1.

4. **`tasks/todo.md`** — Add a FEAT-113 entry recording the migration scope (security.py + algorithm-enforcement test), the verification command `cd backend && pytest tests/test_jwt_algorithm_enforcement.py tests/test_security.py tests/test_api_auth.py -v`, and an explicit AC-006 human-approval checkbox. Backend (docs). Alembic migration: no. Depends on bullets 2 and 3.

5. **`tasks/lessons.md`** — Append a short note that `python-jose` is abandoned and that `joserfc.jwt.decode` requires explicit `algorithms=` exactly like the FEAT-106 allowlist, and that `exp` must be an int unix timestamp under joserfc. Backend (docs). Alembic migration: no. Depends on bullet 2.

</plan>
