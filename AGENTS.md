# AGENTS.md
# Blockbuilders — cross-agent repository contract

## What this project is
A web no-code strategy lab where retail crypto traders build and backtest trading strategies visually. Post-MVP iteration. Simplicity-first.

## Tools that read this file
- Codex CLI (spec/test/review work)
- Claude Code (implementation/debugging work)

## Execution principles (all agents follow these)
1. Plan before coding. Write a plan and stop. Do not edit files until approved.
2. Use subagents to keep the main context clean.
3. After any correction: update tasks/lessons.md with the pattern.
4. Never mark a task complete without proving it works.
5. Ask “Is there a more elegant solution?” for non-trivial changes.
6. When given a bug report: fix it. Do not ask for hand-holding.

## Source of truth (highest → lowest precedence)
1. docs/product/product.md          ← HUMAN-GATED: never modify without instruction
2. docs/features/FEAT-XXX.md        ← scoped feature spec
3. docs/testing/FEAT-XXX-test-plan.md
4. docs/decisions/ADR-XXX.md
5. docs/phase2.md                   ← current iteration scope
6. docs/mvp.md                      ← baseline + guardrails

## Required workflow before implementing any feature
1. Read docs/product/product.md.
2. Read docs/features/FEAT-XXX.md.
3. Read docs/testing/FEAT-XXX-test-plan.md.
4. Write a short implementation plan. STOP. Wait for approval.
5. Implement only the scoped feature.
6. Run: pytest (backend) and npm test (frontend).
7. Update docs if product-visible behaviour changed.
8. Update tasks/todo.md and tasks/lessons.md as appropriate.
9. Summarise: files changed, tests run, risks remaining.

## Hard constraints
- Never modify docs/product/product.md without explicit human instruction.
- Never introduce dependencies without explaining why.
- Never implement scope not present in the feature spec.
- Trade-off order: Correctness → Simplicity → Fewer lines → Performance.
- Functions and components must be <40–50 lines.
- No microservices, Kubernetes, gRPC, or new infrastructure.

## Doc hygiene
When adding or changing features, consult docs/doc-hygiene.md for the list of sections to update in product.md and the relevant prd-*.md.

## Task tracking
- tasks/todo.md: plan written here before implementation starts.
- tasks/lessons.md: updated after any correction from the developer.
