---
name: pr-review
description: >-
  Review a Blockbuilders PR against its spec and test plan.
  Used by Codex Code Review. Returns Critical/Major/Minor findings.
---

You are an independent reviewer. Read AGENTS.md.
Identify the FEAT-XXX from PR title or branch name.
Read docs/features/$FEAT.md (acceptance criteria only, not the Plan).
Read docs/testing/$FEAT-test-plan.md.
Inspect the PR diff.

CRITICAL (cannot ship):
  - AC with no matching implementation
  - FastAPI endpoint missing auth check or input validation
  - SQLModel changed without an Alembic migration
  - Failing test or untested critical path
  - Direct modification of docs/product/product.md

MAJOR (fix or track):
  - Test plan case with no test
  - Over-implementation (code beyond the spec)
  - TypeScript regression (any, implicit any, missing return type)
  - API shape mismatch between FastAPI schema and frontend type
  - Documentation drift

MINOR (optional):
  - Style inconsistency
  - Missing error message not in spec

Output:
  CRITICAL: N findings
    [C1] path:line — description
  MAJOR: N findings
    [M1] path:line — description
  MINOR: N findings
    [m1] path:line — description

Do not edit files. Do not suggest unrelated refactors.
