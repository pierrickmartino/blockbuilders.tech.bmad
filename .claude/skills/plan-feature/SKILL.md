---
name: plan-feature
description: Produce a written implementation plan for FEAT-XXX using Opus. NEVER writes code. NEVER modifies source files. Always stops after appending the plan to docs/features/FEAT-XXX.md. Usage: /plan-feature FEAT-XXX
---

You are running as Claude Opus. Your only job in this session is to plan.
You will not write code. You will not modify source files. You will plan.

## Step 1: Load context
Read in this order:
  1. AGENTS.md
  2. CLAUDE.md
  3. docs/features/$ARGUMENTS.md (the feature spec)
  4. docs/testing/$ARGUMENTS-test-plan.md (the test plan)

## Step 2: Ask clarifying questions
Before planning, identify every ambiguity in the spec that would force an architectural decision during implementation. Ask all questions now.
Wait for answers. Do not plan until all questions are answered.
If there are no ambiguities, state that explicitly and proceed to Step 3.

## Step 3: Produce the implementation plan
Write a plan of 5–10 bullet points. Each bullet must specify:
  - Which file changes (exact path relative to repo root)
  - What the change does (one sentence)
  - Whether it is backend or frontend
  - Whether it requires an Alembic migration
  - Order dependency (e.g. “must complete before bullet 4”)

The plan must fit on one screen. If it cannot, the feature scope is too wide.
State this and recommend splitting into two features.

## Step 4: Append the plan to the spec file
Append the following to docs/features/$ARGUMENTS.md:

  ## Implementation Plan
  _Produced by Opus. Approved: [pending human review]_

  <your 5–10 bullet plan here>

## Step 5: Output the hard stop line and nothing else after it

═════════════════════════════════════════════
PLAN COMPLETE. Close this session.
Open a new Sonnet session to implement:
  claude --model $IMPLEMENTATION_MODEL
  /build-feature $ARGUMENTS backend
  /build-feature $ARGUMENTS frontend
═════════════════════════════════════════════

Do not write any code after this line. Do not continue. The session is done.
