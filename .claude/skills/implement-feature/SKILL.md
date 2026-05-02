---
name: implement-feature
description: Implement one FEAT-XXX for Blockbuilders. Input: feature ID. Example: /implement-feature FEAT-001
---

1. Read AGENTS.md.
2. Read docs/product/product.md.
3. Read docs/features/$ARGUMENTS.md.
4. Read docs/testing/$ARGUMENTS-test-plan.md.
5. Produce an implementation plan. STOP. Wait for approval.
6. Implement the smallest vertical slice of the feature.
   If backend change: FastAPI route + SQLModel + Alembic migration if needed.
   If frontend change: Next.js component + TypeScript types + Tailwind.
   If both: backend first, then frontend consuming the new endpoint.
7. Write or update tests.
8. Run pytest for backend; npm test for frontend.
9. Update docs if product-visible behaviour changed.
10. Update tasks/todo.md. Update tasks/lessons.md if any correction occurred.
11. Summarise: files changed, tests run, risks remaining.
