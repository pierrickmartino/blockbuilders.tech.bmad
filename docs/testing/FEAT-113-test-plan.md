# FEAT-113 Test Plan

## Scope
Validate the migration from `python-jose` to `joserfc 1.6.5`, confirm `python-jose` is removed, and verify existing JWT algorithm enforcement and HS256 auth behavior remain intact.

## AC to test mapping
- AC-001 -> TC-001
- AC-002 -> TC-002
- AC-003 -> TC-003
- AC-004 -> TC-004
- AC-005 -> TC-005
- AC-006 -> TC-006

## Test cases

### TC-001 (AC-001): Backend requirements reflect joserfc migration
- **Input:** Implemented change set for `backend/requirements.txt`.
- **Expected output:** `backend/requirements.txt` contains `joserfc==1.6.5` and no longer contains `python-jose`.
- **Exact command:** `grep -E "joserfc==1\.6\.5|python-jose" backend/requirements.txt`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm `joserfc==1.6.5` is present.
  3. Confirm `python-jose` is NOT present in the output.

### TC-002 (AC-002): Clean dependency install resolves joserfc 1.6.5
- **Input:** Backend Python environment installing dependencies from the updated manifest.
- **Expected output:** `joserfc` installs successfully and `pip show joserfc` reports `Version: 1.6.5`. `python-jose` should not be installed.
- **Exact command:** `cd backend && python -m pip install -r requirements.txt && python -m pip show joserfc`, then run `python -m pip show python-jose`
- **Verification steps:**
  1. Run the command in a clean or refreshed backend environment.
  2. Confirm `joserfc` installation succeeds with version `1.6.5`.
  3. Confirm `pip show python-jose` returns a non-zero exit code or "Package(s) not found".

### TC-003 (AC-003): JWT usage migrated to joserfc with explicit algorithms
- **Input:** Current backend source tree after the migration.
- **Expected output:** Imports use `joserfc`, raw `python-jose` imports are absent, and every `jwt_decode(` call explicitly includes an `algorithms=` (or equivalent restricted set) argument.
- **Exact command:** `rg -n "from jose|python-jose|joserfc|jwt_decode\\(|algorithms=\\[settings\\.jwt_algorithm\\]" backend`
- **Verification steps:**
  1. Run the commands from the repository root.
  2. Confirm `joserfc` is imported where JWT operations occur.
  3. Confirm no `from jose` or `python-jose` backend usage remains.
  4. Confirm each decode call explicitly restricts algorithms to the expected set (e.g., `["HS256"]`).

### TC-004 (AC-004): Existing HS256 auth and expiry behavior still pass
- **Input:** Backend auth and JWT tests after installing the updated dependency.
- **Expected output:** Existing tests covering valid HS256 tokens and expired token handling pass.
- **Exact command:** `cd backend && python -m pytest tests/test_jwt_algorithm_enforcement.py -v`
- **Verification steps:**
  1. Run the command after dependencies are installed.
  2. Confirm valid HS256 token tests pass.
  3. Confirm expired or invalid token behavior remains unchanged.

### TC-005 (AC-005): Non-allowed JWT algorithms remain rejected
- **Input:** Backend JWT enforcement tests using non-HS256 or unsigned token fixtures.
- **Expected output:** Tokens with non-allowed algorithms (including 'none') are rejected.
- **Exact command:** `cd backend && python -m pytest tests/test_jwt_algorithm_enforcement.py -v`
- **Verification steps:**
  1. Run the command after dependencies are installed.
  2. Confirm non-HS256 and unsigned-token rejection tests pass.

### TC-006 (AC-006): Human-gated scope and verification are documented
- **Input:** Feature spec, issue context, and PR notes for this feature.
- **Expected output:** Documentation records that this is a risk-high auth dependency change requiring human approval and includes verification evidence.
- **Exact command:** `rg -n "risk-high|human approval|verification evidence|joserfc|Source issue: #335" docs/features/FEAT-113-migrate-to-joserfc.md docs/testing/FEAT-113-test-plan.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm the spec names issue #335.
  3. Confirm the spec/test plan document human-gated approval.
  4. Confirm implementation or PR notes include actual verification evidence before the feature is marked complete.
