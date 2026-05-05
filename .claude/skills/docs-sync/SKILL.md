---
name: docs-sync
description: Sync docs/features/, docs/testing/, and docs/product/product.md after code changes. Does NOT modify product.md without human approval.
---

## Step 1: Inspect diff
Inspect the current git diff: git diff main...HEAD
Identify product-visible behaviour changes (anything a user would notice).

## Step 2: Update feature spec
Update docs/features/$ARGUMENTS.md if behaviour changed during implementation.
Do not remove the Implementation Plan section.
Mark implemented AC IDs as done if that convention is present.

## Step 3: Update test plan
Update docs/testing/$ARGUMENTS-test-plan.md if acceptance criteria changed.

## Step 4: Propose product.md changes
Check docs/product/doc-hygiene.md for which product.md sections are affected.
Output the proposed product.md changes. Do NOT apply them.
   Label the output: PROPOSED PRODUCT.MD CHANGES — AWAITING HUMAN APPROVAL
Do not modify docs/product/product.md.

## Step 5: Update task files
Update tasks/todo.md: mark feature items complete.
Update tasks/lessons.md: record any correction pattern from this cycle.

## Step 6: Output
Output: DOCS SYNC COMPLETE — product.md changes require your approval.
Updated: <files>
Proposed: product.md changes listed above — apply only with explicit instruction.