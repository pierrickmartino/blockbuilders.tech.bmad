---
name: implement-feature
description: >-
  Implement an approved Blockbuilders feature from its spec.
  Does NOT re-plan. Executes the ## Implementation Plan section.
  Usage: $implement-feature FEAT-XXX
---

Read AGENTS.md, CLAUDE.md, frontend/CLAUDE.md or backend/CLAUDE.md as needed.
Read docs/features/$ARGUMENTS.md (especially the ## Implementation Plan section).
Read docs/testing/$ARGUMENTS-test-plan.md.

Required preconditions (stop if any are missing):
  - Issue is labelled ai-ready.
  - Feature spec exists in docs/features/.
  - Test plan exists in docs/testing/.
  - ## Implementation Plan section exists and is approved.
  - Risk is risk-low or risk-medium.

Execute the Implementation Plan bullets matching the scope:

Backend patterns:
  Routes:    backend/app/api/<router>.py
  Models:    backend/app/models/<model>.py
  Schemas:   backend/app/schemas/<schema>.py
  Migration: cd backend && alembic revision --autogenerate -m "feat_xxx"

Frontend patterns:
  Components: frontend/src/components/<domain>/<Component>.tsx
  Types:      frontend/src/types/<domain>.ts
  API client: frontend/src/lib/api.ts (add function, do not rewrite)
  Pages:      frontend/src/app/(app)/<route>/page.tsx

Run tests:
  Backend:  cd backend && pytest tests/test_<feature>.py -v
  Frontend: cd frontend && npm test && npm run lint && npm run build

Open a PR with this body:
  ## Summary
  ## Linked issue: Closes #N
  ## Acceptance criteria covered: AC-001, AC-002, …
  ## Tests run: <commands and pass/fail>
  ## Risks: <ambiguities or deviations>
  ## Human decisions needed: <if any>

Hard constraints:
  - Do NOT merge.
  - Do NOT modify docs/product/product.md.
  - Do NOT add scope beyond the spec.
  - Do NOT re-plan.
