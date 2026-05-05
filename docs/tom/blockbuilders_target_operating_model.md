# Blockbuilders Target Operating Model

**Purpose:** Define a practical, repeatable AI-assisted development workflow for Blockbuilders that balances development velocity, implementation quality, token consumption, and usage-limit resilience.

**Primary tools:**

- **OpenAI Codex** — feature specification, test-plan generation, independent code review.
- **Claude Code Opus** — implementation planning only.
- **Claude Code Sonnet** — implementation, focused fixes, documentation synchronization.
- **Human developer** — semantic judgment, scope decisions, approval gates, final merge.

## Full Feature Workflow

Use this for new functionality, user-visible behavior changes, API changes, data-model changes, or anything involving both backend and frontend behavior.

### Stage 0 — Feature Intake

**Owner:** Human  
**Tool:** None  
**Output:** Feature ID and one-sentence feature description

Steps:

1. Assign the next feature ID, for example `FEAT-009`.
2. Write one sentence describing the feature from the user's perspective.
3. Decide scope: `backend`, `frontend`, or `backend+frontend`.
4. Check whether this is small enough for one feature. If not, split it.

Example:

```text
FEAT-009: Allow users to add and manage exchange wallets from the dashboard.
Scope: backend+frontend
```

---

### Stage 1 — Spec and Test Plan

**Owner:** Codex  
**Tool:** Codex  
**Skill:** `$spec-feature`  
**Output:** Feature spec + test plan

Command inside Codex:

```text
$spec-feature FEAT-009 "Allow users to add and manage exchange wallets from the dashboard" backend+frontend
```

Codex must create:

```text
docs/features/FEAT-009-wallet-management.md
docs/testing/FEAT-009-test-plan.md
```

The feature spec must include:

- goal;
- non-goals;
- acceptance criteria with stable IDs;
- API contract;
- data model changes;
- UI behavior;
- open questions;
- dependencies and constraints.

Acceptance criteria must use IDs:

```md
AC-001 User can create a wallet with a valid name and address.
AC-002 Invalid wallet addresses show a validation error.
AC-003 User can edit wallet metadata.
AC-004 User can delete a wallet after confirmation.
```

The test plan must map one or more tests to each acceptance criterion:

```md
TEST-AC-001 Backend API accepts a valid wallet payload.
TEST-AC-002 Frontend displays validation error for invalid address.
TEST-AC-003 User can update wallet label from the wallet list.
TEST-AC-004 Delete action requires confirmation before removal.
```

Constraints:

- Codex must not touch source code.
- Codex must describe behavior, not implementation internals.
- Codex must stop after writing the spec and test plan.

#### Human Gate 1 — Spec Review

Before continuing, the human must check:

- Is the feature actually what you want?
- Are the non-goals specific enough?
- Does every acceptance criterion have a matching test case?
- Does the API contract match existing backend structure?
- Does the UI behavior match the current product direction?
- Does the feature require a product.md change?

If the spec is wrong, revise it before planning.

When satisfied:

```bash
git checkout -b feat/FEAT-009-wallet-management
```

---

### Stage 2 — Implementation Plan

**Owner:** Claude Code Opus  
**Tool:** Claude Code  
**Skill:** `/plan-feature`  
**Output:** Approved implementation plan

Start a new Claude Code session:

```bash
claude --model "$PLANNING_MODEL"
```

Inside Claude Code:

```text
/plan-feature FEAT-009
```

Opus must read:

```text
AGENTS.md
CLAUDE.md
docs/features/FEAT-009-wallet-management.md
docs/testing/FEAT-009-test-plan.md
```

Opus must:

1. Ask all clarifying questions before planning.
2. Produce a 5–10 bullet implementation plan.
3. Append the plan to the feature spec under `## Implementation Plan`.
4. Stop.

Opus must not:

- edit source files;
- implement code;
- run broad refactors;
- continue after the hard stop.

#### Spec Amendment Rule

Any architectural or product clarification answered during `/plan-feature` must be written back into the feature spec before Sonnet implementation starts.

The answer must not live only in the chat transcript.

#### Human Gate 2 — Plan Review

Before continuing, check:

- Does the plan match all acceptance criteria?
- Does it touch only necessary files?
- Is the plan 10 bullets or fewer?
- Does the migration strategy make sense?
- Is backend/frontend sequencing clear?

If the plan is too large, split the feature.

---

### Stage 3a — Backend Implementation

**Owner:** Claude Code Sonnet  
**Tool:** Claude Code  
**Skill:** `/build-feature`  
**Output:** Backend implementation commit

Start a fresh session:

```bash
claude --model "$IMPLEMENTATION_MODEL"
```

Inside Claude Code:

```text
/build-feature FEAT-009 backend
```

Sonnet must read:

```text
AGENTS.md
CLAUDE.md
backend/CLAUDE.md
docs/features/FEAT-009-wallet-management.md
docs/testing/FEAT-009-test-plan.md
```

Sonnet must:

1. Execute only the backend bullets from the approved plan.
2. Add or update backend tests.
3. Run focused tests first.
4. Run broader backend tests after focused tests pass.
5. Produce a summary.

Recommended commands:

```bash
cd backend && pytest tests/test_feat_009.py -v
cd backend && pytest tests/ -v
```

Commit:

```bash
git add -A
git commit -m "feat(FEAT-009): implement backend slice"
```

---

### Stage 3b — Frontend Implementation

**Owner:** Claude Code Sonnet  
**Tool:** Claude Code  
**Skill:** `/build-feature`  
**Output:** Frontend implementation commit

Start a fresh session:

```bash
claude --model "$IMPLEMENTATION_MODEL"
```

Inside Claude Code:

```text
/build-feature FEAT-009 frontend
```

Sonnet must read:

```text
AGENTS.md
CLAUDE.md
frontend/CLAUDE.md
docs/features/FEAT-009-wallet-management.md
docs/testing/FEAT-009-test-plan.md
```

Sonnet must:

1. Execute only the frontend bullets from the approved plan.
2. Add or update frontend tests.
3. Run focused tests first.
4. Run lint and build checks.
5. Produce a summary.

Recommended commands:

```bash
cd frontend && npm test
cd frontend && npm run lint
cd frontend && npm run build
```

Commit:

```bash
git add -A
git commit -m "feat(FEAT-009): implement frontend slice"
```

---

### Stage 4 — Independent Review

**Owner:** Codex  
**Tool:** Codex  
**Skill:** `$review-feature`  
**Output:** Prioritized review findings

Command inside Codex:

```text
$review-feature FEAT-009
```

Codex must review:

- feature spec;
- acceptance criteria;
- test plan;
- git diff between branch and main;
- changed files only.

Codex must not read the `## Implementation Plan` section as the source of truth. The review is against the desired behavior, not against the plan.

Findings must be grouped as:

```text
CRITICAL
MAJOR
MINOR
```

#### Human Gate 3 — Review Triage

For each finding:

- Critical: fix before merge.
- Major: fix now or track explicitly in `tasks/todo.md`.
- Minor: fix or defer.

Do not blindly send every review finding to Sonnet. The human decides which findings are valid.

---

### Stage 5 — Docs Sync

**Owner:** Claude Code Sonnet  
**Tool:** Claude Code  
**Skill:** `/docs-sync`  
**Output:** Updated docs and product-change proposal

Start a fresh session:

```bash
claude --model "$IMPLEMENTATION_MODEL"
```

Inside Claude Code:

```text
/docs-sync FEAT-009
```

Sonnet must:

1. Inspect `git diff main...HEAD`.
2. Update the feature spec if behavior changed.
3. Update the test plan if acceptance criteria changed.
4. Propose product changes in `docs/product/proposals/PRODUCT-CHANGE-FEAT-009.md`.
5. Update `tasks/todo.md`.
6. Update `tasks/lessons.md` with any correction pattern.

Sonnet must not directly edit `docs/product/product.md` unless explicitly instructed.

Commit:

```bash
git add docs/ tasks/
git commit -m "docs(FEAT-009): sync spec and lessons"
```

---

### Stage 6 — PR and Merge

**Owner:** Human  
**Tool:** GitHub / Git  
**Output:** Merged PR

Steps:

1. Open the PR against `main`.
2. Use title format:

```text
feat(FEAT-009): add wallet management
```

3. Link the feature spec in the PR body.
4. Wait for CI.
5. Read the final diff manually.
6. Confirm the PR contains exactly the approved scope.
7. Merge.
8. Delete the feature branch.
9. Apply approved `product.md` changes separately if needed.
