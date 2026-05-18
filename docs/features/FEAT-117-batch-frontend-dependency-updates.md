## Status: Draft
## Source issue: #337
## Goal (one paragraph)
Batch the low-risk frontend dependency maintenance updates identified by nightly research into one bounded frontend dependency PR: upgrade `react` and `react-dom` from `19.2.1` to `19.2.6`, keep Tailwind CSS on v3 while moving from the current `^3.4.16` constraint to `3.4.19`, and manually adopt TypeScript 5.9 from the current `^5.7.2` constraint. The work preserves the existing frontend behavior and treats any source edits as compatibility fixes only if the dependency update exposes build, lint, or type failures.

## Non-goals (explicit list — what this does NOT do)
- This does not migrate Tailwind CSS to v4.
- This does not upgrade Next.js, Storybook, Radix, XyFlow, charting libraries, or unrelated frontend dependencies.
- This does not change backend code, FastAPI dependencies, database models, migrations, auth, billing, or backtesting logic.
- This does not add new product functionality, new UI screens, or user-visible behavior changes.
- This does not change deployment infrastructure or Docker Compose behavior unless required only to keep the existing frontend build working.
- This does not add a new frontend test framework or test script as part of the dependency maintenance batch.

## Acceptance criteria (numbered AC-001, AC-002, ...)
1. AC-001  
   **Given** the frontend dependency batch is implemented,  
   **When** a maintainer inspects `frontend/package.json`,  
   **Then** `react` and `react-dom` are both pinned to `19.2.6`.

2. AC-002  
   **Given** Tailwind CSS v4 is explicitly out of scope,  
   **When** a maintainer inspects `frontend/package.json` and Tailwind configuration files,  
   **Then** the project remains on Tailwind CSS v3 with `tailwindcss` set to `3.4.19` and no Tailwind v4 migration or config rewrite is introduced.

3. AC-003  
   **Given** the current TypeScript constraint does not automatically adopt TypeScript 5.9,  
   **When** a maintainer inspects `frontend/package.json`,  
   **Then** the `typescript` dev dependency allows TypeScript 5.9 and the installed lockfile resolves to a 5.9.x version.

4. AC-004  
   **Given** the dependency update is managed through npm,  
   **When** a maintainer inspects `frontend/package-lock.json`,  
   **Then** the lockfile is updated consistently with `frontend/package.json` for React, React DOM, Tailwind CSS, and TypeScript.

5. AC-005  
   **Given** this is a maintenance-only dependency batch,  
   **When** a maintainer reviews the implementation diff,  
   **Then** any source changes are limited to compatibility fixes required by lint or build failures, with no new feature behavior or unrelated refactors.

6. AC-006  
   **Given** the frontend dependency batch has been applied,  
   **When** the frontend verification command is run,  
   **Then** the existing frontend lint and production build checks pass.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
The UI should behave the same after the dependency batch. Existing pages, strategy canvas interactions, onboarding flows, profile views, billing views, and analytics consent behavior should keep their current visible behavior. If dependency changes expose compile, lint, or type issues, fixes should be the smallest compatibility changes needed to preserve the current UI.

## Edge cases
- `react` and `react-dom` must stay on the same exact version to avoid runtime or hydration mismatches.
- Tailwind CSS must remain on v3; changes that introduce Tailwind v4 packages, config format changes, or v4-only behavior are outside scope.
- TypeScript 5.9 may surface stricter checks or changed inference behavior; compatibility fixes must preserve existing behavior.
- The repository currently has no `frontend` `test` npm script, so automated verification for this feature relies on the existing executable frontend lint and build scripts unless a separate approved testing feature adds a test runner.
- `node_modules` may already contain versions that differ from the lockfile; maintainers should trust `package.json` plus `package-lock.json` and verify through a clean install or CI.
- If npm resolves peer dependency warnings, they should be reviewed, but unrelated dependency upgrades should not be bundled unless required to complete the requested batch.

## Open questions
- None.

## Implementation Plan: Not produced in this step.
