# AGENTS.md
# Blockbuilders — cross-agent repository contract
# Read by: Codex CLI (spec/review), Claude Code Opus (planning), Claude Code Sonnet (implementation)

## What this project is
A web no-code strategy lab where retail crypto traders build and backtest trading strategies visually. Post-MVP iteration. Simplicity-first.

## Model assignment (mandatory)
- Spec writing, test planning, independent review: Codex CLI (default model)
- /plan-feature (planning only):  claude --model claude-opus-4-7
- /build-feature (implementation): claude --model claude-sonnet-4-6
- /docs-sync (docs only):          claude --model claude-sonnet-4-6
Never use Opus for implementation. Never use Sonnet for planning.

## Execution principles (all agents follow these)
1. Plan before coding. Write the plan and stop. No file edits until approved.
2. Use subagents to keep the main context clean.
3. After any correction: update tasks/lessons.md with the pattern.
4. Never mark a task complete without proving it works.
5. Ask “Is there a more elegant solution?” for non-trivial changes.
6. When given a bug report: fix it. No hand-holding required.

## Source of truth (highest → lowest precedence)
1. docs/product/product.md          ← HUMAN-GATED: never modify without instruction
2. docs/features/FEAT-XXX.md        ← scoped feature spec
3. docs/testing/FEAT-XXX-test-plan.md
4. docs/decisions/ADR-XXX.md
5. docs/phase2.md                   ← current iteration scope
6. docs/mvp.md                      ← baseline + guardrails

## Required workflow
See the detailed stage descriptions in the Target Operating Model document.
Short form:
  Stage 1:  Codex CLI → spec + test plan
  Stage 2:  Opus /plan-feature → implementation plan (no code)
  Stage 3a: Sonnet /build-feature FEAT-XXX backend
  Stage 3b: Sonnet /build-feature FEAT-XXX frontend
  Stage 4:  Codex CLI /review-feature FEAT-XXX
  Stage 5:  Sonnet /docs-sync FEAT-XXX

## Hard constraints
- Never modify docs/product/product.md without explicit human instruction.
- /plan-feature MUST NOT write code or modify source files.
- /build-feature MUST NOT re-plan or ask architectural questions.
- Never introduce dependencies without explaining why.
- Trade-off order: Correctness → Simplicity → Fewer lines → Performance.
- Functions and components must be <40–50 lines.
- No microservices, Kubernetes, gRPC, or new infrastructure.

## Doc hygiene
When adding or changing features, consult docs/doc-hygiene.md for the list of sections to update in product.md and the relevant prd-*.md.

## Task tracking
- tasks/todo.md: plan written before implementation starts.
- tasks/lessons.md: updated after any correction from the developer.
- tasks/token-log.csv: date, tool, model, branch, tokens_in, tokens_out.
