---
name: spec-from-issue
description: >-
  Convert a GitHub issue into a Blockbuilders feature spec and test plan.
  Trigger: needs-spec label. Does not write source code.
  Usage: $spec-from-issue ISSUE_NUMBER
---

Read AGENTS.md and docs/product/product.md.
Resolve the GitHub repository automatically from local git metadata (prefer `git remote get-url origin`).
Fetch and read the target GitHub issue using the single provided argument `ISSUE_NUMBER`.
- If repo resolution fails, infer owner/repo from available context (workspace path, prior issue URLs, or explicit user message).
- If issue access still fails, report the exact blocker and stop.

Read existing docs/features/FEAT-*.md to determine the next FEAT ID.
Create a slug from the issue title (kebab-case, short, descriptive).

Create `docs/features/FEAT-XXX-<slug>.md` with this exact structure:
  ## Status: Draft
  ## Source issue: #ISSUE_NUMBER
  ## Goal (one paragraph)
  ## Non-goals (explicit list — what this does NOT do)
  ## Acceptance criteria (numbered AC-001, AC-002, …)
     Each as Given / When / Then.
  ## API contract (FastAPI endpoints if backend; omit otherwise)
  ## Data model changes (SQLModel if any)
  ## UI behaviour (frontend if any)
  ## Edge cases
  ## Open questions
  ## Implementation Plan: Not produced in this step.

Create `docs/testing/FEAT-XXX-test-plan.md`:
  One test case per AC. For each: input, expected output, exact command.
  Commands must be executable for this repo (do not invent nonexistent test files).
  Backend command format: `cd backend && pytest tests/ -v` (or a real existing narrowed path if known).
  Frontend command format: `cd frontend && npm test && npm run lint && npm run build` (or real existing narrowed commands if known).
  Manual checks are allowed when automation is unavailable, but still include exact verification steps.

Rules:
  - The only required user input is: `$spec-from-issue ISSUE_NUMBER`.
  - Do not edit source code.
  - If issue is ambiguous, list open questions and stop.
  - Every AC must have a stable ID; every AC ID must map to a test.
  - Describe behaviour, not mechanism.
