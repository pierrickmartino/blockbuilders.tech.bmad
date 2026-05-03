You are working on Blockbuilders, a web no-code strategy lab for retail crypto traders.
Read AGENTS.md and docs/product/product.md before doing anything else.

Feature ID:   $FEAT_ID
Description:  $DESCRIPTION
Scope:        $SCOPE  (backend / frontend / backend+frontend)

Produce two documents:

1. docs/features/$FEAT_ID.md — the feature spec:
   ## Goal
   One paragraph describing what the feature does for the user.

   ## Non-goals
   Explicit list of what this feature does NOT do in this iteration.
   Be specific. Vague non-goals do not prevent scope creep.

   ## Acceptance criteria
   Numbered list. Each item is observable user behaviour, not implementation detail.

   ## API contract
   New or changed FastAPI endpoints. For each: method, path, request body shape,
   response body shape, auth requirement. Omit if no backend change.

   ## Data model changes
   New SQLModel fields or tables with Python types. Omit if no model change.

   ## UI behaviour
   What the user sees and interacts with. Omit if no frontend change.

2. docs/testing/$FEAT_ID-test-plan.md — the test plan:
   One test case per acceptance criterion.
   For each: input, expected output, exact test command to run.
   Backend tests: pytest backend/tests/test_<feature>.py::test_<case> -v
   Frontend tests: cd frontend && npm test -- --testPathPattern=<Component>

Do not touch any source code files.
Describe behaviour, not mechanism. No implementation details in the spec.
When both documents are written, stop and wait.
