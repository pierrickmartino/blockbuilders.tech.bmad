# Test Checklist – Canvas Undo/Redo

> Source PRD: `prd-canvas-undo-redo.md`

## 1. Undo via Keyboard Shortcut

- [ ] Pressing `Ctrl+Z` on Windows/Linux undoes the last canvas change
- [ ] Pressing `Cmd+Z` on macOS undoes the last canvas change
- [ ] Undoing a node addition removes the node from the canvas
- [ ] Undoing a node deletion restores the node and its connections
- [ ] Undoing a node move restores the node to its previous position
- [ ] Undoing a parameter edit restores the previous parameter values
- [ ] Undoing a connection creation removes the connection
- [ ] Undoing a connection removal restores the connection
- [ ] Pressing undo with no history available is a no-op (nothing happens)
- [ ] Multiple consecutive undos step back through the history sequentially

## 2. Redo via Keyboard Shortcut

- [ ] Pressing `Ctrl+Shift+Z` on Windows/Linux redoes the last undone change
- [ ] Pressing `Cmd+Shift+Z` on macOS redoes the last undone change
- [ ] Pressing `Ctrl+Y` on Windows/Linux redoes the last undone change
- [ ] Pressing `Cmd+Y` on macOS redoes the last undone change
- [ ] Redo restores a previously undone node addition
- [ ] Redo restores a previously undone node move
- [ ] Redo restores a previously undone parameter edit
- [ ] Redo restores a previously undone connection change
- [ ] Pressing redo with no future states available is a no-op
- [ ] Multiple consecutive redos step forward through the history sequentially

## 3. Toolbar Buttons

- [ ] Undo button is visible in the canvas toolbar
- [ ] Redo button is visible in the canvas toolbar
- [ ] Clicking the undo button undoes the last change (same as keyboard shortcut)
- [ ] Clicking the redo button redoes the last undone change (same as keyboard shortcut)
- [ ] Undo button is disabled when there is no history to undo
- [ ] Redo button is disabled when there are no future states to redo
- [ ] Undo button becomes enabled after a canvas change is made
- [ ] Redo button becomes enabled after an undo is performed
- [ ] Redo button becomes disabled again after a new change is made following an undo

## 4. History Stack Behavior

- [ ] A new snapshot is pushed on each meaningful canvas change (add node, move node, edit params, add/remove connection)
- [ ] The future stack is cleared when a new change is made after an undo
- [ ] History is capped at the configured limit (e.g., 50 states)
- [ ] When the cap is reached, the oldest entry is trimmed on the next change
- [ ] After trimming, undo still works correctly for remaining history entries
- [ ] History contains full canvas state (nodes and edges) per snapshot

## 5. Rapid/Batch Events

- [ ] Rapid drag events (e.g., dragging a node) are debounced or batched to avoid excessive snapshots
- [ ] A single drag operation results in one undo step (start position to end position), not many intermediate steps
- [ ] Rapid parameter changes (e.g., typing in an input) are debounced into a single snapshot

## 6. Strategy Reload and Navigation

- [ ] Reloading the strategy resets the history to the current state (empty past and future)
- [ ] Navigating away from the canvas and returning clears the history
- [ ] Opening a different strategy starts with a fresh empty history

## 7. Edge Cases and Negative Tests

- [ ] Undo/redo shortcuts do not fire when focus is inside a text input or form field on the canvas
- [ ] Undo/redo shortcuts do not interfere with browser-native undo in text fields
- [ ] History state remains consistent after alternating undo and redo multiple times
- [ ] Performing undo all the way to the initial state and then redoing all the way back restores the latest state exactly

## 8. No Backend Impact

- [ ] No new API calls are made when undo or redo is triggered
- [ ] No changes to the database schema or backend endpoints
- [ ] History state is entirely in-memory on the frontend
- [ ] Refreshing the page does not attempt to restore undo/redo history from any persistent store
