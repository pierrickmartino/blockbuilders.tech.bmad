# Test Checklist – Keyboard Shortcuts & Reference

> Source PRD: `prd-keyboard-shortcuts.md`

---

## 1. Save Strategy Shortcut (Cmd/Ctrl+S)

### 1.1 Positive Cases

- [ ] Pressing `Cmd+S` (macOS) or `Ctrl+S` (Windows/Linux) on the strategy editor page triggers the existing save handler
- [ ] The strategy is saved successfully and the UI reflects the saved state (e.g., no unsaved changes indicator)
- [ ] The browser "Save page" dialog is prevented from opening when `Cmd/Ctrl+S` is pressed
- [ ] Shortcut works when focus is on the canvas area (not inside an input field)

### 1.2 Negative Cases

- [ ] `Cmd/Ctrl+S` does NOT trigger while typing in an `<input>` element on the editor page
- [ ] `Cmd/Ctrl+S` does NOT trigger while typing in a `<textarea>` element
- [ ] `Cmd/Ctrl+S` does NOT trigger while typing in a `[contenteditable]` element
- [ ] `Cmd/Ctrl+S` does NOT fire on pages outside the strategy editor (e.g., dashboard, strategy list)

---

## 2. Run Backtest Shortcut (Cmd/Ctrl+R)

### 2.1 Positive Cases

- [ ] Pressing `Cmd+R` (macOS) or `Ctrl+R` (Windows/Linux) on the strategy editor page triggers the existing run backtest handler
- [ ] The backtest run initiates and the UI shows the backtest progress/results
- [ ] The browser page refresh is prevented when `Cmd/Ctrl+R` is pressed in the editor context

### 2.2 Negative Cases

- [ ] `Cmd/Ctrl+R` does NOT trigger while typing in an `<input>` element
- [ ] `Cmd/Ctrl+R` does NOT trigger while typing in a `<textarea>` element
- [ ] `Cmd/Ctrl+R` does NOT trigger while typing in a `[contenteditable]` element
- [ ] `Cmd/Ctrl+R` does NOT fire on pages outside the strategy editor/backtest context
- [ ] If no strategy is loaded or the strategy is in an invalid state, pressing `Cmd/Ctrl+R` does not cause an unhandled error

---

## 3. Undo/Redo Shortcuts

### 3.1 Undo (Cmd/Ctrl+Z)

- [ ] Pressing `Cmd/Ctrl+Z` on the strategy editor reverts the last canvas action using existing canvas history
- [ ] Multiple successive `Cmd/Ctrl+Z` presses continue to undo previous actions in order
- [ ] Undo does NOT fire while focus is in an `<input>`, `<textarea>`, or `[contenteditable]` element (allowing native text undo in those fields)
- [ ] If there is nothing to undo, the shortcut is a no-op (no error or crash)

### 3.2 Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)

- [ ] Pressing `Cmd/Ctrl+Shift+Z` on the strategy editor redoes the last undone canvas action
- [ ] Pressing `Cmd/Ctrl+Y` on the strategy editor also redoes the last undone canvas action
- [ ] Multiple successive redo presses continue to redo actions in order
- [ ] Redo does NOT fire while focus is in an `<input>`, `<textarea>`, or `[contenteditable]` element
- [ ] If there is nothing to redo, the shortcut is a no-op (no error or crash)

### 3.3 Regression

- [ ] Undo/redo behavior is identical to pre-shortcut implementation (no regression in canvas history)

---

## 4. Show Shortcuts Modal (?)

### 4.1 Opening the Modal

- [ ] Pressing `?` on the strategy editor opens a shortcut reference modal
- [ ] The modal is centered on the screen
- [ ] The modal lists all supported shortcuts with clear labels (Save, Run Backtest, Undo, Redo, Show Shortcuts)
- [ ] The modal uses the existing dialog component (no new UI primitives introduced)

### 4.2 Closing the Modal

- [ ] Pressing `Esc` closes the shortcut reference modal
- [ ] Clicking outside the modal (if supported by existing dialog behavior) closes it

### 4.3 Negative Cases

- [ ] Pressing `?` does NOT open the modal while typing in an `<input>` element
- [ ] Pressing `?` does NOT open the modal while typing in a `<textarea>` element
- [ ] Pressing `?` does NOT open the modal while typing in a `[contenteditable]` element
- [ ] Pressing `?` does NOT open the modal on pages outside the strategy editor

---

## 5. Scope Boundaries

- [ ] No keyboard shortcuts are bound on the strategy list page
- [ ] No keyboard shortcuts are bound on the dashboard page
- [ ] No keyboard shortcuts are bound on the profile/settings page
- [ ] Shortcuts only activate when the strategy editor (canvas) or backtest panel is the active context

---

## 6. Implementation Constraints

- [ ] No new backend endpoints are introduced
- [ ] No new API calls are made by any shortcut handler
- [ ] Shortcuts reuse existing save, backtest run, undo, and redo handlers
- [ ] The shortcut list is maintained in a single constants file used by both handlers and the modal
- [ ] No new UI primitives or libraries are introduced
