---
name: review-feature
description: Review a Blockbuilders diff against spec, test plan, and code. Returns prioritised findings only. Does not edit files.
---

1. Read docs/features/$ARGUMENTS.md.
2. Read docs/testing/$ARGUMENTS-test-plan.md.
3. Inspect the current git diff (or latest commit if on clean tree).
4. Check for:
   - Unmet acceptance criteria from the feature spec.
   - Missing or incomplete tests (backend pytest + frontend).
   - Over-implementation (scope beyond the spec).
   - FastAPI security issues (auth checks, input validation, JWT handling).
   - TypeScript type safety regressions in canvas or backtest components.
   - SQLModel / Alembic migration consistency.
   - Documentation drift.
5. Return findings grouped as: Critical / Major / Minor.
6. Do not edit any files.
