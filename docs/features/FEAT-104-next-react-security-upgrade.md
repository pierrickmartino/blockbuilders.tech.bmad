## Status: Draft
## Source issue: #312
## Goal (one paragraph)
Upgrade the frontend runtime dependencies to the patched versions of Next.js and React so Blockbuilders is no longer exposed to the critical React Server Function deserialization remote-code-execution risk and related May 2026 Server Function/RSC denial-of-service advisories, while preserving existing user-visible behavior and application workflows.

## Non-goals (explicit list — what this does NOT do)
- This does not redesign or refactor frontend architecture, routing, or component structure beyond what is required for safe dependency upgrades.
- This does not add new product functionality, UI features, or endpoint contracts.
- This does not change authentication, billing, backtesting logic, or database schema.
- This does not upgrade unrelated backend libraries or infrastructure components.
- This does not introduce new third-party dependencies beyond version bumps for existing frontend packages.
- This does not guarantee zero warnings from transitive dependencies that are unrelated to the identified critical vulnerabilities.

## Acceptance criteria (numbered AC-001, AC-002, …)
1. AC-001  
   **Given** the repository frontend dependency manifests are updated for this feature,  
   **When** a maintainer inspects `frontend/package.json` (and lockfile),  
   **Then** `next` is pinned to `16.2.6` and both `react` and `react-dom` are pinned to `19.2.1`.

2. AC-002  
   **Given** the upgraded dependency set is installed in a clean environment,  
   **When** the frontend production build command is executed,  
   **Then** the build completes successfully without introducing new blocking compile errors attributable to the version upgrade.

3. AC-003  
   **Given** the upgraded frontend is running locally,  
   **When** a user navigates through core app routes used in daily workflows (authentication screens, dashboard, strategy editor shell),  
   **Then** pages render successfully and no regression blocks navigation or primary interactions.

4. AC-004  
   **Given** dependency scanning is run after the upgrade,  
   **When** maintainers review vulnerability output for direct frontend runtime dependencies,  
   **Then** the critical issue scope from issue #312 (Next.js ≤16.1.x + React ≤19.2.0 combination) is no longer reported as affecting the project.

5. AC-005  
   **Given** this upgrade is prepared for merge,  
   **When** maintainers review the change set,  
   **Then** the PR includes release-risk notes (what changed, what was validated, and rollback path) sufficient for safe deployment planning.

## API contract (FastAPI endpoints if backend; omit otherwise)
Not applicable (frontend dependency/security maintenance only).

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
- No intentional UI behavior change is introduced by this feature.
- Existing screens should preserve current rendering and interactions after the dependency upgrades.
- Any incidental behavior difference from upstream framework changes must be documented in PR notes if discovered during validation.

## Edge cases
- Lockfile resolution may pull transitive updates that alter warning surfaces without changing direct dependencies.
- Existing deprecated APIs could emit new warnings under upgraded React/Next versions even if functionality remains intact.
- Environment-specific build behavior (Node version mismatch, stale cache) may create false negatives during verification and should be ruled out via clean install.
- If regression is detected in a non-critical route, upgrade may require a follow-up fix issue while still preserving security posture.

## Open questions
- Which exact Node.js version is the CI baseline for frontend build validation, and does it meet Next 16.2.6 requirements?
- Should this upgrade be shipped as a fast-tracked hotfix release with reduced batch scope?
- Do maintainers require an additional staged smoke-test checklist (beyond core routes) before production deploy?

## Implementation Plan: Not produced in this step.
