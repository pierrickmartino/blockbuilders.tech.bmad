# FEAT-105 Test Plan

## Scope
Validate that FEAT-105 acceptance criteria are met for explicit Starlette pinning to a patched version.

## AC-to-test mapping
- AC-001 -> TC-001
- AC-002 -> TC-002
- AC-003 -> TC-003

## Test cases

### TC-001 (AC-001): Requirement pin is explicit
- **Input/Setup:** Open `backend/requirements.txt` from current branch.
- **Steps:**
  1. Inspect dependency lines for a direct Starlette requirement.
  2. Confirm comparator and version floor.
- **Expected output:** File contains `starlette>=0.49.1` explicitly.
- **Command:** `rg "^starlette>=0\.49\.1$" backend/requirements.txt`

### TC-002 (AC-002): Installed Starlette version is patched
- **Input/Setup:** Backend environment with dependencies installed from repo requirements.
- **Steps:**
  1. Install/update backend dependencies from `backend/requirements.txt`.
  2. Query installed Starlette package metadata.
  3. Compare returned version to required minimum.
- **Expected output:** Installed version shown by pip is `0.49.1` or higher.
- **Command:** `cd backend && pip show starlette`
- **Manual verification detail:** Confirm the `Version:` field is `>= 0.49.1`.

### TC-003 (AC-003): Backend regression check after pin
- **Input/Setup:** Backend environment after dependency update.
- **Steps:**
  1. Run the standard backend automated test suite.
  2. Review failures, if any, for Starlette-related regressions.
- **Expected output:** Test suite passes with no new failures caused by dependency pinning.
- **Command:** `cd backend && pytest tests/ -v`
