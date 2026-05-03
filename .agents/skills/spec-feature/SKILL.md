---
name: spec-feature
description: Write a feature spec and test plan for a Blockbuilders feature. Trigger: when asked to write, create, or produce a feature spec, PRD, or test plan for a new feature. Does NOT write code. Usage: $spec-feature FEAT-ID "description" scope 
             scope = backend | frontend | backend+frontend
---

You are working on Blockbuilders, a web no-code strategy lab for retail crypto traders.
Read AGENTS.md and docs/product/product.md before doing anything else.

Parse the invocation arguments:
  First argument:  FEAT_ID (e.g. FEAT-009)
  Second argument: DESCRIPTION (one-sentence feature description)
  Third argument:  SCOPE (backend | frontend | backend+frontend)

## Step 1: Create the feature spec
Create docs/features/$FEAT_ID.md with the following sections:

  ## Goal
  One paragraph: what the feature does for the user.

  ## Non-goals
  Explicit list. What this feature does NOT do in this iteration.
  Be specific. Vague non-goals do not prevent scope creep.

  ## Acceptance criteria
  Numbered list. Each item is observable user behaviour, not implementation detail.

  ## API contract  (omit if SCOPE is frontend only)
  New or changed FastAPI endpoints. For each:
    method, path, request body (Pydantic schema), response body, auth required.

  ## Data model changes  (omit if no model change)
  New SQLModel fields or tables with Python types.

  ## UI behaviour  (omit if SCOPE is backend only)
  What the user sees and interacts with.

## Step 2: Create the test plan
Create docs/testing/$FEAT_ID-test-plan.md.
One test case per acceptance criterion. For each:
  - Input
  - Expected output
  - Expected output
  - Exact test command:
    Backend: pytest backend/tests/test_<feature>.py::test_<case> -v
    Frontend: cd frontend && npm test -- --testPathPattern=<Component>

## Constraints
Do not touch any source code files.
Describe behaviour, not mechanism. No implementation details in the spec.
When both documents are written, stop and wait.
