# FEAT-107 Test Plan

## Scope
Validate that Docker Compose Redis image pinning is implemented and verifiable.

## AC to test mapping
- AC-001 → TC-001
- AC-002 → TC-002
- AC-003 → TC-003

## Test cases

### TC-001 (AC-001): Redis image is pinned in source definitions
- **Input:** Repository Docker Compose files.
- **Expected output:** Redis uses `redis:7.4.6-alpine`; no `redis:7-alpine` remains in active Compose definitions.
- **Command:**
  - `rg -n "redis:(7-alpine|7\.4\.6-alpine)" docker-compose*.yml`
- **Verification steps:**
  1. Confirm at least one `redis:7.4.6-alpine` match exists for Redis service image.
  2. Confirm no `redis:7-alpine` match remains.

### TC-002 (AC-002): Resolved Compose config uses pinned tag
- **Input:** Effective rendered Docker Compose config.
- **Expected output:** Resolved Redis image is `redis:7.4.6-alpine`.
- **Command:**
  - `docker compose config | rg -n "image:\s*redis:7\.4\.6-alpine"`
- **Verification steps:**
  1. Run command from repository root.
  2. Confirm at least one matching line is returned for Redis image.

### TC-003 (AC-003): Security rationale and checks are documented
- **Input:** Feature spec and test plan documents.
- **Expected output:** Documents clearly state CVE-mitigation rationale and include repeatable verification commands.
- **Command:**
  - `rg -n "CVE|redis:7.4.6-alpine|verification|AC-00" docs/features/FEAT-107-pin-redis-image-version.md docs/testing/FEAT-107-test-plan.md`
- **Verification steps (manual):**
  1. Open both documents.
  2. Confirm CVE/security rationale is present in the feature goal.
  3. Confirm each AC has a mapped test case with executable command(s).
