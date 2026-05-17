# FEAT-113 Test Plan

## Scope
Validate the minimal `python-jose` dependency upgrade, confirm dependency resolution installs version `3.5.0`, and verify existing JWT algorithm enforcement and HS256 auth behavior remain intact.

## AC to test mapping
- AC-001 -> TC-001
- AC-002 -> TC-002
- AC-003 -> TC-003
- AC-004 -> TC-004
- AC-005 -> TC-005
- AC-006 -> TC-006

## Test cases

### TC-001 (AC-001): Direct backend requirement is pinned to python-jose 3.5.0 only
- **Input:** Implemented change set for `backend/requirements.txt`.
- **Expected output:** `backend/requirements.txt` contains `python-jose[cryptography]==3.5.0`, and the diff shows no unrelated direct dependency pin changes.
- **Exact command:** `git diff -- backend/requirements.txt && rg -n "^python-jose\\[cryptography\\]==3\\.5\\.0$" backend/requirements.txt`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm the `rg` command returns exactly the updated direct requirement line.
  3. Confirm the diff does not change unrelated direct dependency pins.

### TC-002 (AC-002): Clean dependency install resolves python-jose 3.5.0
- **Input:** Backend Python environment installing dependencies from the updated manifest.
- **Expected output:** `python-jose` installs successfully and `pip show python-jose` reports `Version: 3.5.0`.
- **Exact command:** `cd backend && python -m pip install -r requirements.txt && python -m pip show python-jose`
- **Verification steps:**
  1. Run the command in a clean or refreshed backend environment.
  2. Confirm installation succeeds.
  3. Confirm the output includes `Name: python-jose` and `Version: 3.5.0`.

### TC-003 (AC-003): JWT decode call sites still require explicit algorithms
- **Input:** Current backend source tree after the dependency upgrade.
- **Expected output:** Every `jwt.decode(` call in backend explicitly includes an `algorithms=` argument.
- **Exact command:** `rg -n "jwt\\.decode\\(" backend`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Open every returned call site.
  3. Confirm each decode call explicitly passes `algorithms=`.
  4. If any decode call lacks `algorithms=`, this test fails.

### TC-004 (AC-004): Existing HS256 auth and expiry behavior still pass
- **Input:** Backend auth and JWT tests after installing the updated dependency.
- **Expected output:** Existing tests covering valid HS256 tokens and expired token handling pass.
- **Exact command:** `cd backend && pytest tests/test_jwt_algorithm_enforcement.py -v`
- **Verification steps:**
  1. Run the command after dependencies are installed.
  2. Confirm valid HS256 token tests pass.
  3. Confirm expired or invalid token behavior remains unchanged.

### TC-005 (AC-005): Non-allowed JWT algorithms remain rejected
- **Input:** Backend JWT enforcement tests using non-HS256 or unsigned token fixtures.
- **Expected output:** Tokens with non-allowed algorithms are rejected and do not authenticate.
- **Exact command:** `cd backend && pytest tests/test_jwt_algorithm_enforcement.py -v`
- **Verification steps:**
  1. Run the command after dependencies are installed.
  2. Confirm non-HS256 and unsigned-token rejection tests pass.
  3. If this test fails after the dependency upgrade, stop for human review before changing auth behavior.

### TC-006 (AC-006): Human-gated scope and joserfc follow-up are documented
- **Input:** Feature spec, issue context, and PR notes for this feature.
- **Expected output:** Documentation records that this is a risk-high auth dependency change requiring human approval, includes verification evidence, and keeps `joserfc` migration out of scope.
- **Exact command:** `rg -n "risk-high|human approval|verification evidence|joserfc|out of scope|Source issue: #335" docs/features/FEAT-113-pin-python-jose-3-5-0.md docs/testing/FEAT-113-test-plan.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm the spec names issue #335.
  3. Confirm the spec/test plan document human-gated approval and `joserfc` migration as out of scope.
  4. Confirm implementation or PR notes include actual verification evidence before the feature is marked complete.
