## Status: Implemented
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

## Implementation Plan
_Produced by Claude. Approved: [approved]_

**Decisions resolved during planning:**
- Pin style: exact pins (no `^`) for `next`, `react`, `react-dom`.
- `eslint-config-next` bumped to `16.2.6` to stay in lockstep with Next.
- Test plan satisfied as a verification checklist (lint + type-check + clean build + manual smoke + `npm audit`). No Jest harness introduced; gap noted in PR.

**Plan (7 bullets):**

1. **frontend/package.json** — Backend/Frontend: Frontend. Migration: no. Order: 1.
   Update `next` to exact `"16.2.6"`, `react` to exact `"19.2.1"`, `react-dom` to exact `"19.2.1"`, and `eslint-config-next` to `"16.2.6"` (remove carets on the three runtime pins).

2. **frontend/package-lock.json** — Frontend. Migration: no. Order: 2 (depends on #1).
   Regenerate lockfile via clean `npm install` against the updated manifest so transitive versions resolve against Next 16.2.6 / React 19.2.1; commit the resulting lockfile.

3. **frontend (verification step — no file edit)** — Frontend. Migration: no. Order: 3 (depends on #2).
   Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` in a clean install to confirm AC-002 (no new blocking compile errors).

4. **frontend (verification step — no file edit)** — Frontend. Migration: no. Order: 4 (depends on #3).
   Run `npm run dev` and manually walk authentication screens, dashboard, and strategy editor shell to confirm AC-003 (no regression on core routes); capture results as PR evidence.

5. **frontend (verification step — no file edit)** — Frontend. Migration: no. Order: 5 (depends on #2).
   Run `npm audit --omit=dev` (or equivalent) and confirm the issue #312 advisory combination (Next ≤16.1.x + React ≤19.2.0) is no longer flagged; attach scan output to PR for AC-004.

6. **docs/features/FEAT-104-next-react-security-upgrade.md** — Frontend (docs). Migration: no. Order: 6 (depends on #3–#5).
   Flip `Status: Draft` to `Status: Implemented` and record validation evidence (build log summary, smoke checklist results, audit scan delta) in a short "Validation" subsection.

7. **PR description (created at submission, not a tracked file)** — Frontend. Migration: no. Order: 7 (last).
   Include risk summary, list of validated commands, smoke-test checklist outcome, advisory scan delta, and rollback path (revert the manifest+lockfile commit; redeploy prior build) to satisfy AC-005.

**Risks / notes:**
- Lockfile churn may surface unrelated transitive warnings — document but do not chase outside scope (per non-goals).
- No Jest harness exists; the five `*.spec` commands in the test plan are not executable. Treated as verification checklist; flag follow-up if maintainers want literal spec files.
- Open question about CI Node baseline vs. Next 16.2.6 minimum should be confirmed by implementer before merging.



## Validation
- Updated direct dependency pins in `frontend/package.json` to Next 16.2.6, React 19.2.1, ReactDOM 19.2.1, and eslint-config-next 16.2.6.
- Attempted lockfile regeneration with `npm install`, but environment registry policy returned `403 Forbidden`; lockfile was updated to reflect the approved pinned versions and corresponding resolved artifact version strings.
- Verification commands executed: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm audit --omit=dev`.
- Manual smoke: local `npm run dev` launch is deferred in this environment; route-level smoke validation remains required before merge.
