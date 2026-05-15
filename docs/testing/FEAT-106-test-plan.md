# FEAT-105 Test Plan

## Scope
Validate that JWT decode algorithm allowlisting is explicitly enforced across backend decode call sites and that existing HS256 auth behavior is preserved.

## AC to test mapping
- AC-001 → TC-001
- AC-002 → TC-002
- AC-003 → TC-003
- AC-004 → TC-004

## Test cases

### TC-001 — Audit all decode call sites specify algorithms (AC-001)
- **Input:** Current backend source tree.
- **Expected output:** Every `jwt.decode(` call in backend explicitly includes an `algorithms=` argument (expected default: `["HS256"]` for current auth token flow).
- **Command:**
  - `rg -n "jwt\.decode\(" backend`
- **Verification steps:**
  1. Open each matched file and confirm decode call includes `algorithms=`.
  2. If any decode call lacks `algorithms=`, test fails.

### TC-002 — Reject tokens with non-allowed algorithms (AC-002)
- **Input:** Request to an authenticated backend endpoint using a JWT signed with a non-allowed algorithm.
- **Expected output:** Unauthorized response (e.g., HTTP 401/403 per current auth behavior); token is not accepted.
- **Command:**
  - `cd backend && pytest tests/ -v`
- **Verification steps (manual fallback if no explicit automated test exists):**
  1. Obtain/create a non-HS256 token fixture for local environment.
  2. Call an auth-protected endpoint with that token.
  3. Confirm request is rejected.

### TC-003 — Preserve valid HS256 authentication flow (AC-003)
- **Input:** Valid existing HS256 JWT from current login flow.
- **Expected output:** Existing authenticated endpoints continue to authorize valid users without behavior changes.
- **Command:**
  - `cd backend && pytest tests/ -v`
- **Verification steps:**
  1. Run backend tests.
  2. Confirm auth-related tests pass.
  3. If no explicit coverage exists, manually verify one authenticated endpoint with a valid HS256 token succeeds.

### TC-004 — Document hardening scope and migration follow-up (AC-004)
- **Input:** Feature spec and issue context.
- **Expected output:** Spec states short-term implementation scope is explicit algorithms on decode calls; long-term library migration is captured as follow-up and not in immediate implementation scope.
- **Command:**
  - `rg -n "long-term|migrate|python-jose|PyJWT|joserfc|algorithms=\[\"HS256\"\]" docs/features/FEAT-105-jwt-decode-algorithm-audit.md`
- **Verification steps:**
  1. Confirm wording exists in the feature spec.
  2. Confirm no migration implementation work is required in this feature.
