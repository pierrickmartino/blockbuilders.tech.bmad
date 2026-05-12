---
name: spec-from-issue
description: >-
  Convert a GitHub issue into a Blockbuilders feature spec and test plan.
  Trigger: needs-spec label. Does not write source code.
  Usage: $spec-from-issue ISSUE_NUMBER
---

Read AGENTS.md, docs/product/product.md, and the target issue.
Read existing docs/features/FEAT-*.md to determine the next FEAT ID.

Create docs/features/FEAT-XXX-short-name.md with this exact structure:
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

Create docs/testing/FEAT-XXX-test-plan.md:
  One test case per AC. For each: input, expected output, exact command.
  Backend: pytest backend/tests/test_<feature>.py::test_<case> -v
  Frontend: cd frontend && npm test -- --testPathPattern=<Component>

Rules:
  - Do not edit source code.
  - If issue is ambiguous, list open questions and stop.
  - Every AC must have a stable ID; every AC ID must map to a test.
  - Describe behaviour, not mechanism.
