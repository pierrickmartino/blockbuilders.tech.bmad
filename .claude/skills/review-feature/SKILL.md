---
name: review-feature
description: Review a Blockbuilders diff against spec, test plan, and code. Returns prioritised findings only. Does not edit files. Usage: /review-feature FEAT-XXX
---

1. Read docs/features/$ARGUMENTS.md. (spec and acceptance criteria only, not the Implementation Plan section — review against requirements, not against the plan).
2. Read docs/testing/$ARGUMENTS-test-plan.md.
3. Inspect the current git diff (or latest commit if on clean tree).
4. Check for:
      Critical:
        - Acceptance criteria with no matching implementation
        - Failing tests or untested code paths
        - FastAPI endpoints missing auth checks or input validation
        - SQLModel/Alembic migration mismatch (model changed, migration missing)
      Major:
        - Test plan cases with no corresponding test
        - Over-implementation (code not in the spec)
        - TypeScript type regressions (any, implicit any, missing return type)
        - API response shape mismatch between FastAPI schema and frontend type
        - Documentation drift (feature behaviour changed, spec not updated)
      Minor:
        - Style inconsistencies with existing codebase patterns
        - Missing error messages or edge case handling not in spec
        - Naming inconsistencies
5. Return findings in this format:
   CRITICAL: <n findings>
   • [C1] <file:line> — <description>
   MAJOR: <n findings>
   • [M1] <file:line> — <description>
   MINOR: <n findings>
   • [m1] <file:line> — <description>
6. Do not edit any files.