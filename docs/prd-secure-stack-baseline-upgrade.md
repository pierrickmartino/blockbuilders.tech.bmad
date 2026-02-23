# PRD: Secure Stack Baseline Upgrade

## 1. Summary
Upgrade the platform runtime baseline to secure supported versions: Next.js 16.x, FastAPI 0.129.x, and Python 3.12. Users should see no product behavior changes, while the engineering team gets a patched and stable base for Phase 2 delivery.

## 2. Problem Statement
The current baseline (Next.js 15, older FastAPI, Python 3.11) increases security and maintenance risk. We need a controlled upgrade so known vulnerabilities are patched and future work is built on supported versions.

## 3. Goals
- Upgrade frontend framework to Next.js 16.x with latest security patches in that major line.
- Upgrade backend framework to FastAPI 0.129.x.
- Upgrade runtime to Python 3.12 for API/worker/scheduler services.
- Preserve existing behavior for OAuth callback flow, shared result links, and all currently exposed routes.
- Validate key smoke flows: login, strategy creation, and backtest run.

## 4. Non-Goals
- Adding new end-user features.
- Refactoring architecture, service boundaries, or major module structure.
- Rewriting auth, backtesting, or routing logic beyond compatibility fixes required by the upgrade.

## 5. Target Users & User Stories
### 5.1 Target Users
- Product owner and engineering team responsible for secure releases.
- Existing Blockbuilders users who depend on stable login, strategy, and backtest workflows.

### 5.2 User Stories
- As a product owner, I want the platform on secure framework/runtime versions, so that known vulnerabilities are reduced.
- As an end user, I want existing routes and core workflows to keep working after the upgrade, so that I can continue using the product without disruption.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Upgrade dependency and runtime versions for Next.js, FastAPI, and Python.
- Apply required compatibility updates in app/bootstrap/config files only where needed.
- Rebuild and run frontend, API, worker, and scheduler using upgraded versions.
- Execute smoke checks for protected and public core flows.

### 6.2 Out of Scope
- UI redesign, API contract redesign, or new endpoint additions not needed for compatibility.
- Performance optimization work unrelated to upgrade correctness/security.

### 6.3 Functional Requirements
- FE-1: Frontend service must run on Next.js 16.x and start without version/deprecation breakage.
- BE-1: API service must run on FastAPI 0.129.x with all existing routes reachable.
- RT-1: API/worker/scheduler runtime must be Python 3.12.
- QA-1: OAuth callback route (`/auth/callback`) must complete existing callback handling path successfully.
- QA-2: Shared result public route (`/share/backtests/[token]`) must keep current behavior for valid/invalid links.
- QA-3: Smoke tests for login, strategy creation, and backtest execution must pass.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
No new user flow. Existing flows remain: authenticate -> create strategy -> run backtest -> optionally share results link.

### 7.2 States
- Loading: Existing loading states remain unchanged.
- Empty: Existing empty states remain unchanged.
- Error: Existing plain-language error messaging remains unchanged.
- Success: Existing success confirmations remain unchanged.

### 7.3 Design Notes
No visual redesign is required. Any UI changes should be limited to compatibility-level updates only.

## 8. Data Requirements
### 8.1 Data Model
No schema changes required. Existing tables and records remain unchanged.

### 8.2 Calculations / Definitions (if applicable)
- Secure baseline compliance: all target services report target versions (Next.js 16.x, FastAPI 0.129.x, Python 3.12).

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /health` — confirm API health after upgrade.
- Existing auth, strategy, and backtest endpoints — must maintain backward-compatible behavior.
- Existing public share endpoint(s) — must maintain backward-compatible behavior.

### 9.2 Validation & Error Handling
- Startup failures due to incompatible dependencies must fail fast with clear logs.
- Route-level behavior should keep current response semantics and plain-language errors.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Update package baseline to Next.js 16.x and associated lockfile entries.
- Keep changes minimal: only compatibility fixes needed for build/runtime success.

### 10.2 Backend
- Update Python image/runtime to 3.12 and FastAPI to 0.129.x.
- Keep dependency and code changes minimal; avoid broad refactors.

## 11. Rollout Plan
- Step 1: Upgrade dependencies/runtime in a feature branch.
- Step 2: Build and run services locally via existing stack commands.
- Step 3: Execute smoke checklist (OAuth callback, shared links, login, strategy creation, backtest run).
- Step 4: Merge after checklist passes.

## 12. Acceptance Criteria
- [ ] Next.js 16.x is running with all latest security patches applied for the 16.x line.
- [ ] FastAPI is upgraded to 0.129.x.
- [ ] Python runtime is upgraded to 3.12.
- [ ] OAuth callback flow continues to work correctly.
- [ ] Shared result links continue to work correctly.
- [ ] All existing routes still work correctly.
- [ ] Smoke testing passes for login, strategy creation, and backtest run.

## 13. Tracking Metrics (Optional)
- Security baseline compliance rate — target: 100% of app services report required versions.
- Upgrade regression count — target: 0 critical regressions in smoke suite.

## 14. Dependencies (Optional)
- Existing CI/build pipeline for frontend and backend services.
- Existing smoke test accounts/fixtures.

## 15. Risks & Mitigations (Optional)
- Risk: Hidden breaking changes from major framework/runtime updates.  
  Mitigation: Keep scope strict, apply targeted compatibility fixes, run smoke checks before merge.
- Risk: Transitive dependency mismatch.  
  Mitigation: Lock versions, rebuild cleanly, and validate startup logs for all services.

## 16. Open Questions
- Which exact Next.js 16.x patch version should be pinned for release (latest at implementation time)?
- Should smoke checks be fully automated in CI in this iteration, or remain manual checklist + selective automation?
