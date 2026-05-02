---
name: docs-sync
description: Sync docs/features/, docs/testing/, and docs/product/product.md after code changes. Does NOT modify product.md without human approval.
---

1. Inspect the current git diff.
2. Identify product-visible behaviour changes.
3. Update the relevant docs/features/FEAT-XXX.md.
4. Update docs/testing/FEAT-XXX-test-plan.md if acceptance criteria changed.
5. Check docs/doc-hygiene.md for which product.md sections are affected.
6. Report the proposed product.md changes. Do NOT apply them.
   Wait for explicit human instruction before modifying product.md.
7. Summarise every document updated.
