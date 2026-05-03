You are working on Blockbuilders, a web no-code strategy lab for retail crypto traders.
Read AGENTS.md before doing anything else.

Feature ID: $FEAT_ID

Your task: review the implementation of $FEAT_ID against its spec and test plan.
You are an independent reviewer. You did not write this code.

## Step 1: Load the requirements
Read docs/features/$FEAT_ID.md.
Focus on: Goal, Non-goals, Acceptance criteria, API contract, Data model changes, UI behaviour.
Do NOT read the ## Implementation Plan section. Review against requirements, not the plan.
Read docs/testing/$FEAT_ID-test-plan.md.

## Step 2: Inspect the implementation
Run: git diff main...HEAD
Read the diff. Do not read all source files — read only the changed files.

## Step 3: Produce findings
Check for the following and classify each finding:
CRITICAL (feature cannot ship):
  - Acceptance criterion with no matching implementation
  - Failing test or untested code path in a critical flow
  - FastAPI endpoint missing authentication check
  - FastAPI endpoint missing input validation (Pydantic schema not used)
  - SQLModel model changed without a matching Alembic migration

MAJOR (fix before merge or create tracked issue):
  - Test plan case with no corresponding test
  - Over-implementation: code that adds behaviour not in the spec
  - TypeScript type regression: use of any, missing return type, implicit any
  - API response shape mismatch between FastAPI schema and frontend TypeScript type
  - Documentation drift: feature behaviour changed but spec not updated

MINOR (defer or fix in this cycle):
  - Style inconsistency with existing codebase patterns
  - Missing error message or edge case not in spec
  - Naming inconsistency

## Step 4: Format your output
CRITICAL: N findings
  [C1] path/to/file.py:line_number — description

MAJOR: N findings
  [M1] path/to/file.ts:line_number — description

MINOR: N findings
  [m1] path/to/file.py:line_number — description

Do not edit any files. Do not suggest implementations. Return findings only.
Stop when the findings list is complete.
