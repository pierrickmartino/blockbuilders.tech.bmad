# Test Checklist – Canvas Auto-Layout & Connection Tidying

> Source PRD: `prd-canvas-auto-layout-connection-tidying.md`

---

## 1. Auto-Arrange Button & UI

- [ ] An "Auto-arrange" button exists in the canvas toolbar
- [ ] The button has a dropdown or split button with options: Left → Right, Top → Bottom, Tidy connections
- [ ] Labels are short and icon-friendly for mobile viewports
- [ ] Button is accessible via keyboard navigation

## 2. Auto-Arrange – Left → Right

- [ ] Selecting "Left → Right" repositions all blocks into a horizontal grid layout
- [ ] Blocks flow left-to-right with inputs on the left and outputs on the right
- [ ] Wire crossings are minimized
- [ ] Ports are aligned consistently on a shared grid
- [ ] Block sizes and types are preserved (no resizing)
- [ ] Node spacing is approximately 80px
- [ ] Layer spacing is approximately 250px
- [ ] Grid snap is applied (15px)

## 3. Auto-Arrange – Top → Bottom

- [ ] Selecting "Top → Bottom" repositions all blocks into a vertical grid layout
- [ ] Blocks flow top-to-bottom with inputs at the top and outputs at the bottom
- [ ] Wire crossings are minimized
- [ ] Ports are aligned consistently on a shared grid
- [ ] Block sizes and types are preserved

## 4. Tidy Connections

- [ ] Selecting "Tidy connections" straightens wire paths
- [ ] Block positions are not changed when tidying connections
- [ ] Existing connection endpoints are respected
- [ ] Tangled or overlapping wires become straighter and more readable

## 5. Predictable & Idempotent Output

- [ ] Running auto-arrange multiple times on unchanged data yields the same result
- [ ] Running auto-arrange on an already clean layout causes minimal or no movement
- [ ] Connected nodes remain visually grouped as distinct branches

## 6. Branch & Ordering Heuristics

- [ ] First layer is ordered by outgoing connections (main sources first)
- [ ] Subsequent layers are ordered by average parent position to minimize crossings
- [ ] Disconnected branches are separated with extra spacing
- [ ] For acyclic graphs, a topological layout is applied
- [ ] For graphs with cycles, cyclic nodes are grouped together by depth from inputs

## 7. Edge Cases

- [ ] Isolated blocks (no connections) are placed in a compact cluster off to the side/bottom
- [ ] Large graphs (30+ blocks) auto-arrange without blocking the UI
- [ ] Auto-arrange completes in under 200ms for typical strategies (10–30 blocks)
- [ ] Graphs with cycles are handled without errors or infinite loops

## 8. State & Undo/Redo

- [ ] Auto-arrange creates an undo/redo history entry
- [ ] Pressing undo after auto-arrange restores the previous block positions
- [ ] No new persisted fields are introduced
- [ ] Changes are purely positional updates to existing nodes

## 9. No Backend Changes

- [ ] No new API endpoints are introduced
- [ ] No new database schema changes are required
- [ ] Implementation is entirely frontend-only

## 10. Responsiveness

- [ ] Auto-arrange works on desktop canvas
- [ ] Auto-arrange works on mobile canvas mode
- [ ] Tidy connections works on both desktop and mobile
- [ ] Toolbar button layout is usable on small screens
