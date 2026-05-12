# GEMINI.md
# Blockbuilders — Jules and Gemini agent instructions

## What this project is
A web no-code strategy lab for retail crypto traders.
Post-MVP. Simplicity-first.

## Stack
Frontend: Next.js 15, React 19, TypeScript, Tailwind, XyFlow
Backend:  FastAPI 0.129.x, Python 3.12, SQLModel, Alembic, Redis/RQ, MinIO

## Source of truth
See AGENTS.md § Source of truth.
Shortlist:
  1. docs/product/product.md  (NEVER modify directly)
  2. docs/features/FEAT-XXX.md
  3. docs/testing/FEAT-XXX-test-plan.md

## Hard rules for Jules
- ONLY work on issues labelled risk-low.
- NEVER modify docs/product/product.md.
- NEVER merge to main.
- NEVER change auth, billing, backtesting, or migrations.
- Every implementation must include tests.
- Open a PR with CI results and a clear summary.

## Test commands
Backend:  cd backend && pytest tests/ -v
Frontend: cd frontend && npm test && npm run lint && npm run build

## Jules task policy
Allowed autonomously:
  documentation, tests, simple UI copy, minor polish,
  small isolated bug fixes, dependency metadata updates.
Forbidden without explicit human approval:
  auth, security, migrations, backtesting logic, deployment, infra.
