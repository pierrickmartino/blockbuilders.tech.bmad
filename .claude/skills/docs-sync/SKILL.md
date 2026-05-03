---
name: docs-sync
description: Sync docs/features/, docs/testing/, and docs/product/product.md after code changes. Does NOT modify product.md without human approval.
---

1. Inspect the current git diff: git diff main...HEAD
2. Identify product-visible behaviour changes (anything a user would notice).
3. Update docs/features/$ARGUMENTS.md if behaviour changed during implementation.
4. Update docs/testing/$ARGUMENTS-test-plan.md if acceptance criteria changed.
5. Check docs/product/doc-hygiene.md for which product.md sections are affected.
6. Output the proposed product.md changes. Do NOT apply them.
   Label the output: PROPOSED PRODUCT.MD CHANGES — AWAITING HUMAN APPROVAL
7. Update tasks/todo.md: mark feature items complete.
8. Update tasks/lessons.md: record any correction pattern from this cycle.
9. Output: DOCS SYNC COMPLETE — product.md changes require your approval.
