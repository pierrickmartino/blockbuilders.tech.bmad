# FEAT-104 Test Plan: Next.js and React Security Upgrade

## Test cases

### TC-001 Dependency versions are pinned correctly
**Acceptance criterion:** AC-001

**Input:** Open `frontend/package.json` and lockfile after implementation.

**Expected output:** `next` is `16.2.6`; `react` and `react-dom` are `19.2.1`.

**Exact command:** `cd frontend && npm test -- --testPathPattern=DependencyVersionPinning.spec`

### TC-002 Frontend production build succeeds after upgrade
**Acceptance criterion:** AC-002

**Input:** Clean install dependencies and execute production build.

**Expected output:** Build completes successfully with no new blocking compile errors caused by the upgrade.

**Exact command:** `cd frontend && npm test -- --testPathPattern=FrontendBuildAfterUpgrade.spec`

### TC-003 Core route smoke flow remains functional
**Acceptance criterion:** AC-003

**Input:** Run the upgraded frontend and manually traverse authentication screens, dashboard, and strategy editor shell.

**Expected output:** Core routes render and primary interactions remain usable without blocking regressions.

**Exact command:** `cd frontend && npm test -- --testPathPattern=CoreRouteSmokeAfterUpgrade.spec`

### TC-004 Vulnerability scope from issue #312 is remediated
**Acceptance criterion:** AC-004

**Input:** Run dependency vulnerability scan for frontend runtime dependencies.

**Expected output:** The critical affected combination described in issue #312 is no longer reported as affecting the project.

**Exact command:** `cd frontend && npm test -- --testPathPattern=SecurityAdvisoryRemediation.spec`

### TC-005 PR includes rollout and rollback notes
**Acceptance criterion:** AC-005

**Input:** Review the PR description/checklist prepared for merge.

**Expected output:** Risk summary, validation evidence, and rollback guidance are present.

**Exact command:** `cd frontend && npm test -- --testPathPattern=ReleaseRiskDocumentation.spec`
