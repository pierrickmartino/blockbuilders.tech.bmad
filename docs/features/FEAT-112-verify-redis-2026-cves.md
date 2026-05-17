## Status: Draft
## Source issue: #336

## Goal (one paragraph)
Verify whether the currently pinned Redis server container image (`redis:7.4.6-alpine`) includes the Redis 2026 security fixes reported in the nightly research, using official Redis release and security sources as the decision basis, and document the nearest patched Redis 7.4.x or compatible successor tag if the current image is behind.

## Non-goals (explicit list — what this does NOT do)
- Change Docker Compose Redis image tags.
- Upgrade Redis to a new major or minor version.
- Change Redis configuration, authentication, persistence, networking, queue usage, or cache behavior.
- Change the `redis-py` client library or any backend application code.
- Add vulnerability scanning tooling or dependency automation.
- Deploy, merge, or alter production infrastructure.

## Acceptance criteria (numbered AC-001, AC-002, …)
- **AC-001**
  - **Given** the repository contains Docker Compose Redis service definitions,
  - **When** the Redis server image tag is inspected,
  - **Then** the currently pinned image tag must be identified for every Compose file that defines a Redis service.

- **AC-002**
  - **Given** the nightly research references possible 2026 Redis server memory-safety CVEs,
  - **When** official Redis release or security sources are checked,
  - **Then** the verification notes must identify the relevant 2026 CVEs, affected Redis release line, and patched Redis release tag for the 7.4.x line.

- **AC-003**
  - **Given** the current pinned image tag and the official patched Redis release tag are known,
  - **When** the tags are compared,
  - **Then** the verification outcome must state whether `redis:7.4.6-alpine` is patched for the 2026 Redis server CVEs or whether a newer tag is required.

- **AC-004**
  - **Given** the current image is found to be behind the official patched Redis 7.4.x release,
  - **When** the verification is recorded,
  - **Then** the notes must identify the nearest patched 7.4.x image tag candidate and require a follow-up implementation issue or feature before any Docker Compose image change.

- **AC-005**
  - **Given** this is an infrastructure security verification task,
  - **When** the feature spec and test plan are reviewed,
  - **Then** they must clearly state that the scope is Redis server container verification only and not backend Redis client library migration.

## API contract (FastAPI endpoints if backend; omit otherwise)
Not applicable. No FastAPI endpoint changes are required.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- Official Redis security pages may redirect or provide different detail than release notes; verification should prefer Redis-maintained release notes or the `redis/redis` GitHub release/advisory pages when they identify patched versions.
- Docker image availability must be checked separately from Redis source release availability because a Redis release tag does not guarantee the exact Alpine image tag exists in the registry.
- If Redis 7.4.x does not have a patched container image tag available, the verifier should identify the nearest supported patched Redis line and leave the upgrade decision to a follow-up implementation spec.
- Module-specific CVEs in Redis Stack, RedisTimeSeries, RedisBloom, or other Redis modules must not be treated as affecting the plain Redis server image unless official Redis sources say they apply to Redis Community Edition/server.
- If multiple Compose files define Redis, every file must be considered before declaring the current repository image posture.

## Open questions
- Is `redis:7.4.9-alpine` available and acceptable as the nearest patched container image tag for the project's Compose environments?
- Should the follow-up implementation use the patched 7.4.x line only, or should a newer supported Redis line be considered after compatibility review?
- Should this verification result become a dedicated follow-up GitHub issue, or should issue #336 be converted into the implementation tracking issue after the spec is approved?

## Implementation Plan
_Produced by Claude. Approved: [pending]_

This is a verification-only, documentation-only feature. No source code, Compose files, dependencies, or migrations are changed. The "implementation" produces verification notes inside this spec file.

1. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** Add a `## Verification — Current Redis image tags` subsection enumerating every `image: redis:*` line found in `docker-compose.yml` (line 95) and `docker-compose.prod.yml` (line 97), confirming `redis:7.4.6-alpine` as the currently pinned tag in both Compose files.
   **Layer:** Docs (infra-adjacent).
   **Alembic migration required:** no.
   **Order dependency:** must precede bullet 2.

2. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** Add a `## Verification — 2026 Redis server CVEs and patched 7.4.x release` subsection citing official Redis sources (Redis Community Edition 7.4 release notes page and/or `redis/redis` GitHub releases/advisories) listing the relevant 2026 CVE IDs, the affected Redis release line, and the patched Redis 7.4.x release tag, with URLs and a retrieval date.
   **Layer:** Docs.
   **Alembic migration required:** no.
   **Order dependency:** depends on bullet 1; must precede bullet 3.

3. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** Add a `## Verification — Outcome` subsection that explicitly compares `redis:7.4.6-alpine` to the patched 7.4.x release identified in bullet 2 and states unambiguously whether the current image is patched or requires an update (satisfies AC-003).
   **Layer:** Docs.
   **Alembic migration required:** no.
   **Order dependency:** depends on bullets 1 and 2; must precede bullet 4.

4. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** If bullet 3 concludes the image is behind, add a `## Verification — Nearest patched 7.4.x candidate and follow-up` subsection identifying the nearest patched Alpine image tag candidate (e.g. `redis:7.4.9-alpine`), noting Docker Hub registry availability must be confirmed separately, and requiring a follow-up implementation issue or feature before any Compose change (satisfies AC-004); if patched, record "no follow-up required" and skip the candidate tag.
   **Layer:** Docs.
   **Alembic migration required:** no.
   **Order dependency:** depends on bullet 3.

5. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** Add a `## Verification — Scope reaffirmation` line restating that this feature covers the Redis server container image only and explicitly excludes `redis-py` client library migration and backend application code changes (satisfies AC-005), and resolve the three Open questions inline (patched 7.4.x line vs newer line, candidate tag acceptance, and follow-up issue routing decision).
   **Layer:** Docs.
   **Alembic migration required:** no.
   **Order dependency:** last; depends on bullets 1–4.

6. **File:** `docs/features/FEAT-112-verify-redis-2026-cves.md`
   **Change:** Flip the `## Status` line from `Draft` to `Verified` and update the document to reflect completion of all five test cases in `docs/testing/FEAT-112-test-plan.md`.
   **Layer:** Docs.
   **Alembic migration required:** no.
   **Order dependency:** final step.
