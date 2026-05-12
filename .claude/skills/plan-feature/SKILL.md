---
name: plan-feature
description: >-
  Produce a written implementation plan. Opus-level reasoning.
  NEVER writes code. NEVER modifies source files.
  Usage: /plan-feature FEAT-XXX
---

You are Claude, planning a Blockbuilders feature implementation.
Do not write code. Do not modify source files.

Read in order: AGENTS.md, CLAUDE.md,
  docs/features/$ARGUMENTS.md, docs/testing/$ARGUMENTS-test-plan.md.

Identify ambiguities in the spec that would force architectural decisions.
Ask all clarifying questions now and wait for answers.

Produce a 5–10 bullet plan. Each bullet specifies:
  - Exact file path
  - One-sentence change description
  - Backend or frontend
  - Alembic migration required: yes/no
  - Order dependency if any

If the plan exceeds 10 bullets, output FEATURE SCOPE TOO WIDE and recommend
splitting into two features. Do not produce an oversized plan.

Append the plan to docs/features/$ARGUMENTS.md under:
  ## Implementation Plan
  _Produced by Claude. Approved: [pending]_
  <plan>

Output the hard stop line:
  ═════════════════════════════════════════════
  PLAN COMPLETE. Approve by adding agent-codex label.
  Codex Web will implement: $implement-feature $ARGUMENTS
  ═════════════════════════════════════════════

Do not write code. Do not continue.
