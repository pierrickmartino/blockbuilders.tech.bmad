## Status: Draft
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

## Implementation Plan: Not produced in this step.
