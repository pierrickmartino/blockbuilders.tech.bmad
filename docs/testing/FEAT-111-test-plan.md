# FEAT-111 Test Plan: Canvas Undo/Redo

## Test cases

### TC-001 Meaningful canvas changes enter undo history
**Acceptance criterion:** AC-001

**Input:** In the strategy canvas editor, add a node, delete a node, complete a node drag, create an edge, delete an edge, and change a node parameter.

**Expected output:** Each meaningful completed canvas change becomes reversible through the canvas undo control or shortcut.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Start the frontend, open `/strategies/{id}`, perform each listed canvas change, and confirm Undo becomes available after each completed change.

### TC-002 Undo reverts the most recent canvas action
**Acceptance criterion:** AC-002

**Input:** Make two distinct canvas changes, then trigger Undo through the toolbar control and through Cmd+Z or Ctrl+Z.

**Expected output:** Only the most recent reversible canvas action is reverted each time, and the user remains on the same strategy canvas.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Open a strategy canvas, add two different nodes or edges, trigger Undo twice using both available interaction paths, and verify the canvas steps backward one action at a time.

### TC-003 Redo reapplies undone canvas actions
**Acceptance criterion:** AC-003

**Input:** Make a canvas change, undo it, then trigger Redo through the toolbar control and through Cmd+Shift+Z or Ctrl+Shift+Z.

**Expected output:** The undone action is reapplied and the editor stays on the same strategy canvas with the expected node, edge, or parameter state restored.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Open a strategy canvas, add or remove a node, undo the action, redo it using both available interaction paths, and confirm the visible canvas state matches the state before Undo.

### TC-004 Continuous drag records one undo step
**Acceptance criterion:** AC-004

**Input:** Drag a node across the canvas in one continuous interaction and release it.

**Expected output:** The completed drag is represented as one undoable action, and Undo returns the node to its pre-drag position without stepping through intermediate pointer positions.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Drag a node a noticeable distance, press Undo once, and confirm the node returns directly to its starting position.

### TC-005 Compound commands undo as one logical action
**Acceptance criterion:** AC-005

**Input:** Use an existing command or insertion path that creates multiple related canvas changes, such as adding a node with an initial connection where supported.

**Expected output:** Undo reverses all related changes from that command together as one logical action.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Trigger a compound insertion or equivalent multi-step canvas command, press Undo once, and confirm both the node and related initial connection are removed together.

### TC-006 New changes after undo clear redo history
**Acceptance criterion:** AC-006

**Input:** Make two canvas changes, undo the latest change, then make a different new canvas change.

**Expected output:** Redo becomes unavailable or no-op for the previously undone change, and the canvas keeps the new branch of visible state.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Add two nodes, undo the second, add a different node, and verify Redo does not restore the original second node.

### TC-007 Unavailable undo and redo are safe disabled states
**Acceptance criterion:** AC-007

**Input:** Load a strategy canvas with no recorded local history, then use undo and redo controls or shortcuts.

**Expected output:** Undo and redo controls are disabled or safely no-op, no errors appear, and normal canvas editing still works.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Open a fresh strategy canvas, inspect the toolbar state, try undo and redo shortcuts, and verify no visual corruption or console error occurs.

### TC-008 Text editing shortcuts do not mutate canvas history
**Acceptance criterion:** AC-008

**Input:** Focus a parameter input, textarea, contenteditable note, search field, or modal input and press undo or redo keyboard shortcuts.

**Expected output:** The shortcut applies to the focused editable context or browser-native behavior and does not unexpectedly undo or redo canvas graph changes.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Change a canvas node, focus an editable field, type text, press Cmd+Z or Ctrl+Z, and verify text editing behavior occurs without reverting the canvas change.

### TC-009 Save, validation, backtest, navigation, and reload behavior remain unchanged
**Acceptance criterion:** AC-009

**Input:** Save a currently visible canvas state, validate the strategy, run or navigate to the existing backtest workflow, navigate away, and reload the canvas page.

**Expected output:** The existing save, validation, and backtest workflows behave as before; no server-side undo history is shown or implied after navigation or reload.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification:** Start the frontend, open `/strategies/{id}`, make and undo a change, save the visible state, validate, run or open backtesting through the existing workflow, reload the page, and confirm the persisted strategy matches the saved visible state.
