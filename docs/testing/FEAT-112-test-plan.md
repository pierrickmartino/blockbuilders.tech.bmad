# FEAT-112 Test Plan

## Scope
Validate the Redis 2026 CVE verification documentation and ensure each acceptance criterion has repeatable verification evidence.

## AC to test mapping
- AC-001 -> TC-001
- AC-002 -> TC-002
- AC-003 -> TC-003
- AC-004 -> TC-004
- AC-005 -> TC-005

## Test cases

### TC-001 (AC-001): Current Redis image tags are identified
- **Input:** Repository Docker Compose files.
- **Expected output:** Every Redis service image definition is visible and currently resolves to the pinned Redis tag under review.
- **Command:**
  - `rg -n "image:\\s*redis:" docker-compose.yml docker-compose.prod.yml`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm each returned Redis service image is included in the verification notes.
  3. Confirm the notes explicitly name `redis:7.4.6-alpine` as the current pinned image if that remains the source definition.

### TC-002 (AC-002): Official Redis source identifies relevant 2026 CVEs and patched 7.4.x tag
- **Input:** Official Redis release or security documentation.
- **Expected output:** Verification notes identify the relevant 2026 Redis server CVEs and the patched Redis 7.4.x release tag.
- **Command:**
  - `rg -n "CVE-2026|7\\.4\\.9|Redis Community Edition 7\\.4\\.9|redis/redis/releases" docs/features/FEAT-112-verify-redis-2026-cves.md docs/testing/FEAT-112-test-plan.md`
- **Manual verification steps:**
  1. Open the official Redis Community Edition 7.4 release notes: `https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisce-7.4-release-notes/`.
  2. Confirm Redis Community Edition 7.4.9 lists 2026 security fixes for Redis server CVEs.
  3. Cross-check the `redis/redis` GitHub releases page if the Redis docs page is unavailable.
  4. Confirm the verification notes cite the official source checked and summarize the patched 7.4.x tag.

### TC-003 (AC-003): Verification outcome states whether the current image is patched
- **Input:** Current Redis image tag and official patched Redis 7.4.x release tag.
- **Expected output:** Verification notes state whether `redis:7.4.6-alpine` includes the 2026 Redis server fixes or requires an update.
- **Command:**
  - `rg -n "redis:7\\.4\\.6-alpine|patched|requires|newer tag|required" docs/features/FEAT-112-verify-redis-2026-cves.md docs/testing/FEAT-112-test-plan.md`
- **Verification steps:**
  1. Confirm the current image tag and patched release tag are both present.
  2. Confirm the outcome is explicit and does not leave the current patch status ambiguous.

### TC-004 (AC-004): Follow-up implementation requirement is documented if update is needed
- **Input:** Verification result showing current image is behind a patched Redis 7.4.x release.
- **Expected output:** Documentation identifies a nearest patched tag candidate and requires a follow-up implementation issue or feature before changing Compose files.
- **Command:**
  - `rg -n "nearest patched|7\\.4\\.x|follow-up|implementation issue|Docker Compose image change" docs/features/FEAT-112-verify-redis-2026-cves.md docs/testing/FEAT-112-test-plan.md`
- **Manual verification steps:**
  1. Confirm the candidate tag is described as a candidate until image registry availability is checked.
  2. Confirm no Docker Compose file is changed as part of this verification-only spec step.

### TC-005 (AC-005): Scope excludes redis-py and application behavior changes
- **Input:** Feature spec and test plan.
- **Expected output:** Documentation states this feature verifies the Redis server container only and excludes backend Redis client library migration.
- **Command:**
  - `rg -n "Redis server container|redis-py|client library|backend application code|No FastAPI endpoint changes|None\\." docs/features/FEAT-112-verify-redis-2026-cves.md docs/testing/FEAT-112-test-plan.md`
- **Verification steps:**
  1. Confirm the non-goals exclude `redis-py` and backend application code changes.
  2. Confirm API, data model, and UI sections state no changes are required.
