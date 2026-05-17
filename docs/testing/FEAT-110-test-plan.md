# FEAT-110 Test Plan: Canvas Command Palette Node Insertion

## Scope
Validate that strategy builders can open a keyboard-first command palette from the canvas editor, search grouped node insertion commands, insert nodes with existing canvas semantics, and keep existing insertion paths intact.

## Test Cases

### TC-001 Opens command palette with canvas shortcut
**Acceptance criterion:** AC-001

**Input:** Authenticated user opens a strategy canvas, leaves focus on the canvas or page body, and presses Cmd+K on macOS or Ctrl+K on Windows/Linux.

**Expected output:** A command palette opens over the canvas and focus moves to the palette search input.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Start the app, open a strategy editor, press the platform shortcut, and confirm the palette opens with the search field focused.

### TC-002 Groups node insertion commands
**Acceptance criterion:** AC-002

**Input:** User opens the command palette on the strategy canvas.

**Expected output:** Node insertion commands are grouped under Indicators, Conditions, and Actions.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Open the palette and inspect the visible group labels and the commands listed under each group.

### TC-003 Filters by block name and keywords
**Acceptance criterion:** AC-003

**Input:** User searches for `EMA`, `crossover`, and `stop loss` in separate palette searches.

**Expected output:** Each query returns the relevant node insertion command and omits unrelated commands.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Open the palette, type each query, and confirm the displayed results match the expected node type.

### TC-004 Inserts selected node with existing defaults
**Acceptance criterion:** AC-004

**Input:** User searches for `EMA` and selects the EMA insertion command.

**Expected output:** One EMA node is added to the current canvas with the same label and default parameters used by existing palette insertion.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Insert EMA from the command palette, then compare the new node label and parameters with an EMA inserted through the existing block palette or bottom sheet.

### TC-005 Places inserted node visibly
**Acceptance criterion:** AC-005

**Input:** User pans or zooms the canvas, opens the command palette, and inserts a Stop Loss node.

**Expected output:** The Stop Loss node appears in the visible canvas area near the current viewport focus and does not fully overlap an existing node.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Pan/zoom to a non-origin canvas area, insert a node through the palette, and confirm the node is immediately visible.

### TC-006 Closes palette without navigation
**Acceptance criterion:** AC-006

**Input:** User opens the command palette, then presses Escape, clicks outside it, and separately selects a command.

**Expected output:** Each action closes the palette and leaves the user on the same strategy canvas route.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Exercise each close path and confirm the route and current strategy remain unchanged.

### TC-007 Ignores shortcut in editable fields
**Acceptance criterion:** AC-007

**Input:** User focuses a parameter input, textarea, contenteditable note, or another editable field and presses Cmd+K or Ctrl+K.

**Expected output:** The command palette does not open and the editable field keeps normal editing behaviour.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Focus each editable surface available in the canvas editor and confirm the shortcut is ignored there.

### TC-008 Preserves existing insertion paths
**Acceptance criterion:** AC-008

**Input:** User inserts one node through drag-and-drop and one node through the existing bottom sheet block library after the command palette feature is present.

**Expected output:** Both existing insertion paths still add nodes with their expected labels, default parameters, and visible placement.

**Test command to run:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Add nodes through the existing block palette and bottom sheet, then confirm they behave the same as before the command palette change.

## Notes
- The frontend currently has no `npm test` script in `frontend/package.json`, so this plan uses the executable frontend quality gate available in the repo plus manual interaction checks for keyboard and canvas behaviour.
- No backend verification is required because this is a frontend-only feature with no API or SQLModel changes.
