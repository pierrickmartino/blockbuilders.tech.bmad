# CLAUDE.md

**Blockbuilders** — web no-code strategy lab, retail crypto traders build/backtest strategies visually, major pairs. Post-MVP iteration; keep simplicity-first.

## Cherny principles

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don’t keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user, update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until the mistake rate drops
- Review lessons at the session start for the relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: “Would a staff engineer approve this?”
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask, “Is there a more elegant way?”
- If a fix feels hacky: “Knowing everything I know now, implement the elegant solution.”
- Skip this for simple, obvious fixes — don’t over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don’t ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching is required from the user
- Go fix failing CI tests without being told how

## Task Management

- Plan First: Write a plan for tasks/todo.md with checkable items
- Verify Plan: Check in before starting implementation
- Track Progress: Mark items complete as you go
- Explain Changes: High-level summary at each step
- Document Results: Add review section to tasks/todo.md
- Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what’s necessary. Avoid introducing bugs.

## Stack

- **Frontend:** Next.js 16.x (App Router) + TypeScript, Tailwind CSS — see `frontend/CLAUDE.md`
- **Backend:** FastAPI 0.129.x monolith, Python 3.12, Postgres, Redis, S3-compatible storage — see `backend/CLAUDE.md`
- Single deployable backend; worker mode for background jobs
- On version upgrade: smoke test OAuth callback, login, strategy creation, backtest run

## Architecture

- One module > many micro-modules; add to existing files before new ones
- No microservices, Kubernetes, gRPC, new infra
- Strategy metadata (non-execution) under top-level `metadata` key
- Strategy tags: relational tables, **not** in strategy version JSON
- Credits/add-ons: simple integer fields on user record (no extra tables)
- Import/export: JSON only, explicit validation

## Non-negotiable principles

- Trade-off order: **Correctness → Simplicity → Fewer lines → Performance**
- No abstractions/configs/features "for later" (YAGNI)
- Functions/components <40–50 lines; early returns over deep nesting
- Plain-language errors: what wrong + next action + help link if available
- Market data: explicit validation + stored metadata; warn users, never silent fail

## Spec precedence (highest → lowest)

1. `docs/product.md` — current product truth
2. `docs/prd-*.md` — feature PRDs
3. `docs/phase2.md` — current iteration scope
4. `docs/mvp.md` — MVP baseline + guardrails
5. `docs/mvp_plan.md` — backlog seed (not authoritative)

- New feature outside active spec → update `docs/phase2.md` (goal, non-goals, AC) first
- New feature → create `docs/prd-<feature>.md` + update `docs/product.md`

## Doc hygiene — update on every feature change

When adding/changing features, update `docs/product.md` + matching `docs/prd-*.md` and `docs/tst-*.md`:

| Feature area | Sections to update |
|---|---|
| New PRD/feature | 17.1 + relevant sections; create matching `tst-*.md` |
| Dashboard / strategy list / bulk actions | 9.3, 13 |
| Strategy performance by period grid | 9.3, 13, 17.1 |
| Multi-period batch backtesting | 5.1, 9.4, 13, 16.1, 17.1 |
| Canvas (UX, health bar, SmartCanvas, undo/redo, toolbar, editor header) | 4, 9.3, 13, 16.1, 17 |
| Backtest (visualizations, comparison, exports, metrics, narrative, warnings, education) | 5.4–5.5, 9.13, 13, 17.1 |
| Billing / user tiers | 2.3–2.4, 13 |
| Onboarding / post-signup routing / wizard | 2.1, 4.4, 9.2, 9.3, 9.13, 11, 13, 17.1 |
| Indicator palette / block library / inline popover / bottom sheet | 4, 9.3, 13, 17.1 |
| Notifications / analytics / structured logging | 9.5, 9.13, 9.14, 11, 13, 17.1 |
| Asset universe expansion | 3.4, 6.2, 13, 14.1, 16.1, 17 |
| Storybook / design system | 13, 16.1, 17.1 |

## Never do (unless user insists + spec allows)

- New global utilities or core abstractions
- Complex HOCs when simple inline works
- Unused config options "for future flexibility"
- Repeat identical instructions in `frontend/CLAUDE.md` or `backend/CLAUDE.md`