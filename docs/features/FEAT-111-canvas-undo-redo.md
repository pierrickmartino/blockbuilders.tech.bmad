## Status: Draft
## Source issue: #338
## Goal (one paragraph)
Give strategy builders reliable undo and redo controls in the canvas editor so they can recover from common editing mistakes, reverse recent graph changes, and reapply reverted changes without leaving the strategy builder or losing the current canvas context.

## Non-goals (explicit list — what this does NOT do)
- Does not change strategy validation, backtest execution, indicator calculations, or numerical trading logic.
- Does not add, remove, rename, or change any strategy block types.
- Does not add, remove, or change FastAPI endpoints.
- Does not change SQLModel models, database tables, migrations, or persisted strategy version schemas.
- Does not change authentication, billing, usage limits, scheduled updates, or strategy ownership rules.
- Does not create collaborative editing, multi-user history, server-side version rollback, or persisted undo history across browser sessions.
- Does not replace the existing save/versioning model or make unsaved canvas changes automatically become saved strategy versions.
- Does not add a new dependency unless the implementation plan separately explains why existing frontend state patterns cannot satisfy the feature safely.

## Acceptance criteria (numbered AC-001, AC-002, ...)
1. AC-001
   **Given** an authenticated user is editing a strategy in the canvas editor,
   **When** they make a meaningful canvas change such as adding a node, deleting a node, moving a node after drag completion, editing an edge, or changing node parameters,
   **Then** the change is added to the canvas undo history as a reversible action.

2. AC-002
   **Given** the canvas has at least one reversible action in its undo history,
   **When** the user triggers Undo from the canvas UI or the standard keyboard shortcut,
   **Then** the most recent reversible canvas action is reverted while the user remains on the same strategy canvas.

3. AC-003
   **Given** the user has undone at least one canvas action and has not made a new divergent canvas change,
   **When** the user triggers Redo from the canvas UI or the standard keyboard shortcut,
   **Then** the most recently undone canvas action is reapplied while preserving the current strategy editor context.

4. AC-004
   **Given** the user performs a continuous drag or resize-style canvas interaction,
   **When** the interaction is in progress,
   **Then** intermediate pointer movement is not recorded as separate undo steps and the completed interaction is represented as one undoable action.

5. AC-005
   **Given** a single user command creates multiple related canvas changes such as adding a node and creating its initial connection,
   **When** the user undoes that command,
   **Then** all related changes from that command are reverted together as one logical undo step.

6. AC-006
   **Given** the user undoes one or more actions and then makes a new canvas change,
   **When** the new change is recorded,
   **Then** redo history after the undone point is cleared so Redo cannot apply a stale branch of canvas state.

7. AC-007
   **Given** no undo or redo action is available,
   **When** the canvas toolbar and keyboard shortcuts are used,
   **Then** unavailable undo or redo controls are disabled or no-op without throwing errors, corrupting canvas state, or blocking normal editing.

8. AC-008
   **Given** the user is editing text in an input, textarea, contenteditable field, parameter editor, or command/search field,
   **When** they press a keyboard shortcut that overlaps with undo or redo,
   **Then** the shortcut applies to text editing or browser-native behavior and does not unexpectedly change the canvas history.

9. AC-009
   **Given** the user saves, validates, runs a backtest, navigates away from the canvas, or reloads the page,
   **When** the action completes,
   **Then** existing save, validation, and backtest behavior remains unchanged and no server-side undo history is implied.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
- Undo and redo are available only inside the strategy canvas editor.
- The canvas exposes visible undo and redo toolbar controls with accessible names, disabled states when unavailable, and visual treatment consistent with existing canvas controls.
- Standard shortcuts are supported where safe: Cmd+Z on macOS and Ctrl+Z on Windows/Linux for Undo; Cmd+Shift+Z and Ctrl+Shift+Z for Redo, with Ctrl+Y also accepted where platform conventions make it appropriate.
- Keyboard shortcuts must not hijack text editing, parameter editing, contenteditable notes, search fields, or modal/dialog inputs.
- Meaningful canvas changes include node insertion, node deletion, completed node movement, edge creation, edge deletion, edge reconnection, and node parameter changes.
- Continuous pointer movement during dragging is grouped so one completed drag creates at most one undoable action.
- Compound commands are grouped as one logical history action when the user experiences them as one operation.
- Undo and redo preserve the current editor route, selected strategy, theme, viewport usability, and normal canvas editing affordances.
- The feature must remain usable in compact and expanded node display modes and on desktop, tablet, and mobile viewports.

## Edge cases
- The first loaded canvas state should not itself become an undoable action.
- Undoing a node deletion must restore the node and any eligible edges that were removed as part of that deletion.
- Undoing an edge change must not leave dangling edges that reference missing nodes.
- Undoing a parameter change must restore the prior parameter value without reopening or closing unrelated panels unexpectedly.
- Redo history must be cleared after a new change follows an undo.
- Shortcuts must be ignored while focus is inside editable fields or when a modal owns the shortcut.
- Rapid repeated shortcut presses must not corrupt node or edge state.
- If the canvas has not finished loading, undo and redo controls must remain disabled or no-op safely.
- If a strategy is saved after undoing changes, the saved definition should reflect the currently visible canvas state only.

## Open questions
- Should redo support Ctrl+Y in addition to Ctrl+Shift+Z on Windows/Linux?
- Should undo/redo include viewport-only changes such as pan and zoom, or only strategy graph and parameter changes?
- Should the toolbar show history depth counts or only enabled/disabled icons?
- Should history be cleared after a successful save, or should users be able to undo changes made before the save while staying on the page?

## Implementation Plan: Not produced in this step.
