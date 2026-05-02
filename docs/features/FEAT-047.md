# PRD: Keyboard Shortcuts & Reference

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

## 1. Overview

Power users want faster workflows in the strategy editor. This PRD introduces a small set of keyboard shortcuts for the most common actions (save, run backtest, undo/redo) and a simple in-app reference modal triggered by the `?` key.

## 2. Goals

- Speed up common strategy actions without adding complex UI.
- Provide a single, easy-to-find shortcut reference.
- Keep implementation frontend-only and minimal.

## 3. Non-Goals

- Global shortcuts outside the strategy editor/backtest context.
- Customizable key bindings or user preferences.
- New backend endpoints, schema changes, or telemetry.

## 4. User Stories

- As a frequent editor, I can press `Cmd/Ctrl+S` to save a strategy without moving my mouse.
- As a power user, I can press `Cmd/Ctrl+R` to run a backtest from the editor.
- As a cautious user, I can undo/redo edits with standard shortcuts.
- As a new user, I can press `?` to see available shortcuts.

## 5. Scope

### 5.1 In Scope

- Keyboard shortcuts in the strategy editor/backtest screens only.
- Save strategy shortcut wired to the existing save handler.
- Run backtest shortcut wired to the existing run handler.
- Undo/redo reuse existing canvas history actions.
- A shortcut reference modal listing the supported shortcuts.

### 5.2 Out of Scope

- Shortcuts for strategy list, dashboard, or global navigation.
- Context-specific shortcuts beyond the list below.
- Keyboard shortcut customization.

## 6. Shortcut List (Initial)

| Action | Shortcut | Notes |
| --- | --- | --- |
| Save strategy | `Cmd/Ctrl+S` | Prevent browser “Save page” dialog. |
| Run backtest | `Cmd/Ctrl+R` | Prevent browser refresh while in editor context. |
| Undo | `Cmd/Ctrl+Z` | Uses existing canvas history. |
| Redo | `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` | Uses existing canvas history. |
| Show shortcuts | `?` | Opens reference modal; `Esc` closes. |

## 7. UX Notes

- Only bind shortcuts when the strategy editor (canvas) or backtest panel is active.
- Do not trigger shortcuts while typing in `input`, `textarea`, or `[contenteditable]` elements.
- Show a small, centered modal listing shortcuts with clear labels.
- Use the existing dialog component; no new UI primitives.

## 8. Implementation Notes

- Frontend-only `keydown` listener scoped to the editor layout.
- Reuse existing save/backtest/undo/redo handlers; no new API calls.
- Keep the shortcut list in a single constants file used by both handlers and the modal.
- Keep the list short; add new shortcuts only when needed.

## 9. Acceptance Criteria

- `Cmd/Ctrl+S` saves the strategy on the editor page and does not open the browser save dialog.
- `Cmd/Ctrl+R` runs a backtest on the editor page and does not refresh the page.
- Undo/redo shortcuts work as before with no regression.
- Pressing `?` opens a shortcut reference modal; `Esc` closes it.
- Shortcuts do not fire while an input/textarea/contenteditable field is focused.
- No backend changes required.

