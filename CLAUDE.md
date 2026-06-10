# CLAUDE.md — Blockbuilders
# Claude Code execution rules. For cross-agent conventions, read AGENTS.md.

## Role
Senior full-stack engineer on a post-MVP no-code crypto strategy lab.
Implement small, testable vertical slices only.
Model assignment: read AGENTS.md § Model assignment.

## Stack
Frontend: Next.js 16.x (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + XyFlow
          See frontend/CLAUDE.md for component-level rules.
Backend:  FastAPI 0.129.x, Python 3.12, SQLModel, Alembic, Redis/RQ, MinIO
          See backend/CLAUDE.md for endpoint and model rules.
Infra:    Docker Compose (dev + prod), PostgreSQL, GitHub Actions CI.

## If you are running as Opus (/plan-feature)
Your only job: produce the implementation plan. See .claude/skills/plan-feature.md.
Do not write code. Do not modify source files.

## If you are running as Sonnet (/build-feature)
Your only job: execute the ## Implementation Plan in the spec file.
See .claude/skills/build-feature.md.
Do not re-plan. Do not ask architectural questions.

## After coding
- List every file changed.
- State tests run and whether they passed.
- State docs updated (or explain why not).
- If any env var was added/removed, double-check it is propagated to all layers (`.env.example`, `README.md`, `backend/app/core/config.py` or `frontend/Dockerfile` + `docker-compose.yml`).
- Update tasks/todo.md and tasks/lessons.md.
- Flag remaining risks.
