# PRD: Canvas Undo/Redo

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Add undo/redo controls for the strategy canvas so users can safely reverse recent edits. Include toolbar buttons and standard keyboard shortcuts. This is a frontend-only history stack with a small cap.

---

## 2. Goals
- Provide undo and redo for recent canvas edits.
- Support standard shortcuts (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, `Cmd/Ctrl+Y`).
- Add simple toolbar buttons with disabled states.
- Keep state management minimal and local to the canvas.

## 3. Non-Goals
- No backend changes or persistence of history.
- No multi-user collaboration or shared history.
- No branching history visualization.

---

## 4. Target Users
- Strategy builders who want confidence when experimenting on the canvas.

---

## 5. User Stories
1. As a user, I can press `Cmd/Ctrl+Z` to undo my last canvas change.
2. As a user, I can press `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` to redo an undone change.
3. As a user, I can click undo/redo buttons if I prefer mouse controls.

---

## 6. UX Flow (Minimal)

**Undo:**
1. User edits the canvas (add/move/remove nodes, change parameters, connect/disconnect).
2. User presses `Cmd/Ctrl+Z` or clicks the undo button.
3. Canvas reverts to the previous state.

**Redo:**
1. User undoes a change.
2. User presses `Cmd/Ctrl+Shift+Z` (or `Cmd/Ctrl+Y`) or clicks the redo button.
3. Canvas reapplies the next state in history.

---

## 7. History Model
- Simple in-memory stacks: `past`, `present`, `future`.
- Push a new snapshot on each meaningful canvas change.
- Cap history length (e.g., 50 states) by trimming the oldest entries.
- Clear `future` on any new change after an undo.

**Snapshot contents:**
- Nodes and edges (full canvas state) using existing serialization helpers.

---

## 8. Edge Cases
- No history available: undo button disabled and shortcut no-ops.
- No future states: redo button disabled and shortcut no-ops.
- Rapid drag events: debounce or batch to avoid excessive snapshots.
- Strategy reload: history resets to current state.

---

## 9. Acceptance Criteria
- ✅ Undo/redo works for node/edge changes, moves, and parameter edits.
- ✅ Buttons appear in the canvas toolbar and reflect disabled state correctly.
- ✅ Keyboard shortcuts work on Mac and Windows.
- ✅ History is capped and kept front-end-only.
- ✅ No backend, schema, or API changes.

---

## 10. Implementation Notes
- Keep logic inside the canvas state layer; avoid new global stores.
- Prefer a small helper to capture and restore canvas snapshots.
- Use existing React Flow state APIs; avoid new dependencies.
