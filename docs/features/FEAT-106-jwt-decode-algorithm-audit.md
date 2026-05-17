## Status: Implemented
## Source issue: #314

## Goal (one paragraph)
Reduce authentication bypass risk from algorithm confusion by ensuring every JWT verification path in the backend explicitly declares the expected algorithm during token decode, starting with the auth API and any additional backend `jwt.decode()` call sites. This feature aims to harden current token validation behavior without changing user-facing auth flows, token format, or authorization rules.

## Non-goals (explicit list — what this does NOT do)
- Migrate from `python-jose` to another JWT library.
- Introduce new authentication methods or token types.
- Rotate signing keys or change JWT secrets.
- Redesign authorization/business permission checks.
- Change frontend auth UX.

## Acceptance criteria (numbered AC-001, AC-002, …)
AC-001
**Given** the backend codebase contains JWT decode call sites used for authentication or authorization,
**When** a maintainer audits all `jwt.decode()` usages,
**Then** each decode call explicitly passes the expected algorithm list (for current tokens, `algorithms=["HS256"]`).

AC-002
**Given** an auth-protected API route,
**When** a request includes a JWT signed with an algorithm other than the explicitly allowed one,
**Then** token verification fails and the request is rejected as unauthorized.

AC-003
**Given** a valid JWT signed with HS256 and existing claims,
**When** the token is submitted to existing authenticated endpoints,
**Then** authentication succeeds exactly as before (no regression in normal login/session behavior).

AC-004
**Given** repository security guidance for this issue,
**When** the feature documentation is reviewed,
**Then** it clearly records short-term hardening scope (explicit decode algorithms) and captures the long-term migration note as a follow-up item rather than part of this implementation.

## API contract (FastAPI endpoints if backend; omit otherwise)
No new endpoints.

Existing auth-protected endpoints continue to use current contracts. Verification behavior is hardened internally by explicit algorithm allowlisting in decode paths.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- Decode helper wrappers or indirect imports may hide `jwt.decode()` usage and must still be included in audit scope.
- Any non-HS256 internal token usage (if discovered) must specify its true expected algorithm explicitly, not HS256 by default.
- Expired or malformed token handling should remain unchanged except for explicit algorithm enforcement.
- Background tasks or websocket auth paths (if present) are in scope when they decode JWTs.

## Open questions
- Are there any backend JWT decode usages outside `backend/app/api/auth.py` (e.g., dependencies, middleware, websocket handlers) that require explicit algorithms?
- Should we add a dedicated automated regression/security test that asserts non-HS256 tokens are rejected, or rely on existing auth tests plus manual verification for this hardening step?
- Should the long-term library migration (PyJWT>=2.12.0 or joserfc) be tracked as a separate feature/issue immediately after this patch?

## Implementation Plan
_Produced by Claude. Approved: [approved]_

<plan>

Audit result (informs plan): `rg "jwt\.decode\(" backend` returns exactly one call site — [backend/app/core/security.py:30](backend/app/core/security.py:30) — which already passes `algorithms=[settings.jwt_algorithm]`. No other backend module imports `jose` or `jwt`. The feature therefore lands as **verification + regression test + documentation**, not behavior change.

1. **[backend/app/core/security.py](backend/app/core/security.py)** — Add a single inline comment above the existing `jwt.decode()` call documenting that the explicit `algorithms=` allowlist is a deliberate algorithm-confusion mitigation (per FEAT-106 / issue #314); no behavioral change. _Backend. Alembic migration: no. Order: 1._

2. **backend/tests/test_jwt_algorithm_enforcement.py** (new) — Add pytest covering: (a) valid HS256 token via `decode_access_token` returns the subject; (b) RS256-signed token is rejected (returns `None`); (c) `alg=none` unsigned token is rejected; (d) one integration call to an auth-protected endpoint using a non-HS256 token asserts HTTP 401. Uses `python-jose` directly to forge the non-HS256 tokens; no new dependency. _Backend. Alembic migration: no. Order: 2 — depends on #1 only insofar as both target the same module's contract._

3. **[docs/features/FEAT-106-jwt-decode-algorithm-audit.md](docs/features/FEAT-106-jwt-decode-algorithm-audit.md)** — Append a `## Follow-up (out of scope)` section recording the long-term migration to `PyJWT >= 2.12.0` or `joserfc` as deferred work tracked separately; flip `Status: Draft` to `Status: Approved` once this plan is accepted. Satisfies AC-004. _Doc. Alembic migration: no. Order: independent (can land in same PR)._

4. **[docs/testing/FEAT-106-test-plan.md](docs/testing/FEAT-106-test-plan.md)** — Fix stale references: change the `# FEAT-105 Test Plan` heading to `# FEAT-106 Test Plan`, update TC-004's `rg` command path from `FEAT-105-jwt-decode-algorithm-audit.md` to `FEAT-106-jwt-decode-algorithm-audit.md`, and replace the generic `pytest tests/ -v` in TC-002 / TC-003 with the specific path to the test file from bullet #2 so the test plan is executable as written. _Doc. Alembic migration: no. Order: independent._

5. **[tasks/todo.md](tasks/todo.md)** — Append a FEAT-106 row marking the slice as implemented (file changes, tests run, AC mapping). _Doc. Alembic migration: no. Order: last — written after bullets 1–4 land._

</plan>

## Follow-up (out of scope)
Track long-term JWT library migration separately. This implementation keeps the
current `python-jose` flow and hardens it with an explicit decode algorithm
allowlist; evaluating a later move to `PyJWT >= 2.12.0` or `joserfc` is deferred
work and is not part of FEAT-106.
