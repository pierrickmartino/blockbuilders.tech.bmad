---
name: build-feature
description: >- 
  Implement one FEAT-XXX slice for Blockbuilders using Sonnet. 
  Reads the Implementation Plan section from the spec file. 
  NEVER re-plans. NEVER asks architectural questions. 
  Usage: /build-feature FEAT-XXX <backend|frontend|both>
---

You are running as Claude Sonnet. Your only job is to implement the plan that Opus wrote. Do not re-plan. Do not ask architectural questions.
If the plan is ambiguous, flag it in your summary and implement the most conservative interpretation. Do not invent scope.

## Step 1: Load context
Read in this order:
  1. AGENTS.md
  2. CLAUDE.md
  3. backend/CLAUDE.md (if scope includes backend)
  4. frontend/CLAUDE.md (if scope includes frontend)
  5. docs/features/$FEAT*.md — read the ## Implementation Plan section carefully
  6. docs/testing/$FEAT-test-plan.md

The second argument ($SCOPE) is: backend, frontend, or both.
Load only the CLAUDE.md files relevant to the scope.

## Step 2: Implement the plan
Execute exactly the bullet points in the ## Implementation Plan section.
Follow this order if scope is both: backend first, then frontend.
Reference AC IDs while working.

Backend changes follow these patterns:
  - FastAPI routes: backend/app/api/<router>.py
  - SQLModel models: backend/app/models/<model>.py
  - Alembic migration: alembic revision --autogenerate -m "feat_xxx_description"
  - Schemas: backend/app/schemas/<schema>.py

Frontend changes follow these patterns:
  - Next.js components: frontend/src/components/<domain>/<Component>.tsx
  - TypeScript types: frontend/src/types/<domain>.ts
  - API client: frontend/src/lib/api.ts (add new function, do not rewrite existing)
  - App Router pages: frontend/src/app/(app)/<route>/page.tsx

## Step 3: Run tests
After backend changes:
  cd backend && pytest tests/test_<feature>.py -v
  cd backend && pytest tests/ -v

After frontend changes:
  cd frontend && npm test -- --testPathPattern=<Component>
  cd frontend && npm run lint
  cd frontend && npm run build (to catch TypeScript errors)

## Step 4: Produce a summary
Output:
  FILES CHANGED: <list every file with one-line description of change>
  AC COVERED: <list AC IDs implemented>
  TESTS RUN: <command and result pass/fail for each>
  RISKS: <any remaining ambiguities or deviations from the plan>
  DOCS NEEDED: <which spec or product.md sections may need updating>

Do not open a PR. Do not run /docs-sync. Stop after the summary.
