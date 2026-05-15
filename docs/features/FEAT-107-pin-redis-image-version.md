## Status: Draft
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

## Implementation Plan: Not produced in this step.
