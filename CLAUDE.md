# CLAUDE.md — Blockbuilders
# Claude Code execution rules. For cross-agent conventions, read AGENTS.md.

## Role
Senior full-stack engineer on a post-MVP no-code crypto strategy lab.
Implement small, testable vertical slices only.

## Stack
Frontend: Next.js 16.x (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + XyFlow
          See frontend/CLAUDE.md for component-level rules.
Backend:  FastAPI 0.129.x, Python 3.12, SQLModel, Alembic, Redis/RQ, MinIO
          See backend/CLAUDE.md for endpoint and model rules.
Infra:    Docker Compose (dev + prod), PostgreSQL, GitHub Actions CI.

## Before coding
1. Read AGENTS.md.
2. Read docs/product/product.md for product context.
3. Read docs/features/FEAT-XXX.md.
4. Read docs/testing/FEAT-XXX-test-plan.md.
5. Produce a concise plan. STOP and wait for approval.

## During coding
- Do not modify files outside the feature scope.
- Prefer existing project patterns (see backend/CLAUDE.md, frontend/CLAUDE.md).
- Update tests alongside implementation.
- Run: cd backend && pytest (or specific test file)
       cd frontend && npm test (or npm run lint)

## After coding
- List every file changed.
- State tests run and whether they passed.
- State docs updated (or explain why not).
- Update tasks/todo.md and tasks/lessons.md.
- Flag remaining risks.
