# PRD: Canvas Auto-Layout & Connection Tidying

## Summary
Add an **Auto-arrange** button to reorganize blocks into a clean left-to-right or top-to-bottom flow with aligned ports and minimal wire crossings. Add a **Tidy connections** option that straightens wire paths without moving blocks. This reduces messy graphs during iterative building, especially on small screens.

## Goals
- Provide a one-click way to clean up cluttered graphs.
- Support predictable, readable layouts in either horizontal or vertical flow.
- Keep implementation lightweight and front-end-only.

## Non-Goals
- No new backend endpoints or schema changes.
- No automatic re-layout on every edit.
- No complex layout customization beyond flow direction and the tidy option.

## UX & Entry Points
- **Canvas toolbar**: add `Auto-arrange` button with a small dropdown or split button for:
  - `Left → Right`
  - `Top → Bottom`
  - `Tidy connections`
- Keep labels short and icon-friendly for mobile.

## User Stories
- As a user, I can auto-arrange my blocks so the strategy reads clearly left-to-right.
- As a user, I can switch to top-to-bottom flow when working in narrow viewports.
- As a user, I can tidy wire paths without shifting block positions.

## Functional Requirements
1. **Auto-arrange**
   - Repositions all blocks into a clean grid layout.
   - Minimizes wire crossings and keeps connections readable.
   - Aligns ports consistently on a shared grid.
   - Supports **Left → Right** and **Top → Bottom** flow.
   - Preserves block sizes and types.
2. **Tidy connections**
   - Adjusts wire paths to be straighter and less tangled.
   - Does **not** move blocks.
   - Respects existing connection endpoints.
3. **Predictable output**
   - Running auto-arrange multiple times on unchanged data yields the same result.
   - Avoids unnecessary movement when layout is already clean.

## Layout Heuristics (Simple by Design)
- Use existing node/edge data from the canvas state.
- Prefer a lightweight DAG layout approach with a fallback:
  - If graph is acyclic, run a simple topological layout.
  - If cycles exist, group by depth from inputs and place cyclic nodes together.
- Apply a **fixed grid spacing** (e.g., 40–60px increments) for alignment.
- Use consistent padding between node columns/rows for readability.

## Edge Cases
- **Isolated blocks**: place in a compact cluster off to the side/bottom.
- **Large graphs**: keep runtime fast and avoid blocking the UI (use requestAnimationFrame or a small timeout if needed).
- **Cycles**: keep nodes grouped without attempting advanced cycle-breaking.

## Data & State
- No new persisted fields.
- Changes are purely positional updates to existing nodes.
- Reuse existing undo/redo history for layout actions.

## Technical Notes
- Frontend-only implementation within canvas utilities/components.
- Reuse existing grid/snap utilities if present.
- Avoid adding new dependencies unless already in the stack.

## Acceptance Criteria
- Auto-arrange produces a readable layout for typical strategies (10–30 blocks) in under 200ms on a modern laptop.
- Tidy connections straightens wires without moving any blocks.
- Auto-arrange respects selected flow direction and keeps layouts consistent across repeated runs.
- Works on desktop and mobile canvas modes.

## Analytics (Optional, Minimal)
- Track button usage counts for `Auto-arrange` and `Tidy connections`.

