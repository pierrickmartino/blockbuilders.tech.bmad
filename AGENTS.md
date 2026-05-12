# AGENTS.md
# Blockbuilders — cross-agent contract
# Read by: Codex (CLI, Web, Code Review), Claude Code, Jules, Gemini CLI

## What this project is
A web no-code strategy lab where retail crypto traders build and backtest trading strategies visually. Post-MVP iteration. Simplicity-first.

## Stack
Frontend: Next.js 15, React 19, TypeScript, Tailwind, XyFlow
Backend:  FastAPI 0.129.x, Python 3.12, SQLModel, Alembic, Redis/RQ, MinIO
Infra:    Docker Compose, PostgreSQL, GitHub Actions CI

## Overnight tool assignment
Claude Code Action:  nightly research, implementation plan, morning report
Codex Web:           spec generation, medium-risk implementation, docs sync
Codex Code Review:   automatic PR review
Jules:               low-risk implementation (parallel)

## Skill systems (where each tool reads its skills)
Codex:        .agents/skills/<name>/SKILL.md  invoked $skill-name
Claude Code:  .claude/skills/<name>.md        invoked /skill-name

## Execution principles (all agents)
1. Plan before coding. No file edits until plan is approved.
2. Never mark a task complete without proving it works.
3. After any correction, update tasks/lessons.md with the pattern.
4. Never implement scope not in the feature spec.
5. Prefer existing patterns. Prefer elegance over cleverness.

## Source of truth (highest to lowest precedence)
1. docs/product/product.md          HUMAN-GATED
2. docs/features/FEAT-XXX.md
3. docs/testing/FEAT-XXX-test-plan.md
4. docs/decisions/ADR-XXX.md
5. docs/phase2.md
6. docs/mvp.md

## Hard rules
- NEVER edit docs/product/product.md directly.
  Propose changes in docs/product/product-change-proposals/.
- NEVER merge to main.
- NEVER deploy production.
- NEVER change auth, billing, backtesting logic, or migrations
  without explicit human approval.
- NEVER add a dependency without explaining why.
- NEVER mark work complete without tests or verification evidence.

## Risk policy
risk-low (Jules or Codex Web):
  docs, tests, simple UI copy, minor polish, small isolated bugs.
risk-medium (Codex Web with approved spec):
  bounded feature, endpoint, validation, refactor.
risk-high (research/plan only — Claude reviews, no autonomous code):
  auth, security, migrations, backtesting numerical logic.

## Test commands
Backend:  cd backend && pytest tests/ -v
Frontend: cd frontend && npm test && npm run lint && npm run build

## Task tracking
tasks/todo.md         plan before implementation
tasks/lessons.md      updated after corrections
tasks/ai-usage-log.csv  date, agent, model, task_type, issue_or_feature, branch, status, tokens_or_credits, prs_opened, tests_passed, blocked_reason, notes
