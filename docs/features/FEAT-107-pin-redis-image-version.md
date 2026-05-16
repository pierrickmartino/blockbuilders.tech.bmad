## Status: Approved
## Source issue: #315

## Goal (one paragraph)
Reduce infrastructure security risk by pinning the Redis container image in local and CI-like Docker Compose environments to a fixed patched tag (`redis:7.4.6-alpine`) instead of a floating major tag (`redis:7-alpine`), so the stack consistently runs a Redis server version that includes fixes for the CVEs identified in issue #315.

## Non-goals (explicit list — what this does NOT do)
- Upgrade Redis to major version 8.x.
- Change Redis configuration, authentication model, persistence settings, or networking.
- Change backend Redis client libraries (e.g., `redis-py`) or application queue logic.
- Introduce runtime vulnerability scanning tooling.
- Modify production deployment manifests outside this repository's Docker Compose definitions.

## Acceptance criteria (numbered AC-001, AC-002, …)
- **AC-001**
  - **Given** the repository contains Docker Compose service definitions for Redis,
  - **When** the Redis service image is inspected,
  - **Then** it must be explicitly set to `redis:7.4.6-alpine` and must not use a floating `redis:7-alpine` tag.

- **AC-002**
  - **Given** a developer renders the effective Compose configuration,
  - **When** the Redis service definition is resolved via `docker compose config`,
  - **Then** the resolved image for Redis must be `redis:7.4.6-alpine`.

- **AC-003**
  - **Given** this security update is reviewed in project docs,
  - **When** contributors open the feature spec and test plan,
  - **Then** the reason for pinning (CVE mitigation and deterministic patch level) is clearly documented along with verification steps.

## API contract (FastAPI endpoints if backend; omit otherwise)
Not applicable. No FastAPI endpoint changes are required.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- If multiple Compose files or override files define Redis, each applicable definition must be pinned consistently to avoid environment drift.
- If a future dependency requires Redis 8.x features, this pin will need a deliberate follow-up feature with compatibility validation.
- If image registry mirroring is introduced, the pinned semantic version should remain unchanged even if registry host changes.

## Open questions
- Does the repository include any additional environment-specific Compose files (e.g., CI overrides) that also define Redis and should be updated in the same change?
- Should Dependabot or an equivalent process be configured to alert on pinned container image CVEs and patch updates?

## Implementation Plan
_Produced by Claude. Approved: [approved]_

<plan>

1. **File:** `docker-compose.yml` (line 95)
   - **Change:** Replace `image: redis:7-alpine` with `image: redis:7.4.6-alpine` for the `redis` service.
   - **Scope:** Infra (dev Compose)
   - **Alembic migration:** no
   - **Order:** independent

2. **File:** `docker-compose.prod.yml` (line 97)
   - **Change:** Replace `image: redis:7-alpine` with `image: redis:7.4.6-alpine` for the `redis` service.
   - **Scope:** Infra (prod-like Compose)
   - **Alembic migration:** no
   - **Order:** independent

3. **File:** `docs/testing/FEAT-107-test-plan.md`
   - **Change:** Fix header (currently says "FEAT-105") and correct TC-003 paths to reference `docs/features/FEAT-107-pin-redis-image-version.md` and `docs/testing/FEAT-107-test-plan.md`.
   - **Scope:** Docs
   - **Alembic migration:** no
   - **Order:** independent

4. **Verification (no file change — run after steps 1–3):**
   - `rg -n "redis:7-alpine" docker-compose.yml docker-compose.prod.yml` → must return zero matches.
   - `rg -n "redis:7\.4\.6-alpine" docker-compose.yml docker-compose.prod.yml` → must return two matches.
   - `docker compose config | rg -n "image:\s*redis:7\.4\.6-alpine"` → at least one match.
   - **Order:** after 1 and 2.

**Resolved open questions:**
- No additional environment-specific Compose files define Redis (repo scan: only `docker-compose.yml` and `docker-compose.prod.yml`).
- Dependabot / image-CVE alerting is out of scope per the Non-goals section; track separately if desired.

</plan>
