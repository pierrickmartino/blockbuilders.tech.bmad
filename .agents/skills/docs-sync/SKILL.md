---
name: docs-sync
description: >-
    Sync feature spec and test plan after merged PR.
    Proposes product.md changes without applying them.
    Usage: $docs-sync FEAT-XXX
---

Run: git diff main~1...main
Identify product-visible behaviour changes.

Update docs/features/$ARGUMENTS.md if behaviour changed.
Update docs/testing/$ARGUMENTS-test-plan.md if AC changed.

Output proposed product.md changes under this exact header:
  PROPOSED PRODUCT.MD CHANGES — AWAITING HUMAN APPROVAL
  <list of diffs>
Do NOT modify docs/product/product.md.

Update tasks/lessons.md with any correction pattern from the cycle.

Output: DOCS SYNC COMPLETE
  Updated: <list>
  Proposed product.md changes require your approval.
