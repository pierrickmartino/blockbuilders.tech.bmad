## Status: Draft
## Source issue: #339
## Goal (one paragraph)
Give strategy builders a keyboard-first way to insert canvas nodes by opening a command palette with Cmd+K on macOS or Ctrl+K on Windows/Linux, searching available node types, and selecting a result that adds the chosen node to the current strategy canvas without leaving the editor flow.

## Non-goals (explicit list — what this does NOT do)
- Does not add, remove, rename, or change any strategy block types.
- Does not change strategy validation, backtest execution, or numerical trading logic.
- Does not change persisted strategy definition JSON beyond the normal addition of a selected node.
- Does not add a new backend endpoint, database field, or migration.
- Does not replace the existing block palette, bottom sheet block library, drag-and-drop insertion, or mobile canvas tools.
- Does not introduce a third-party command palette dependency unless existing UI primitives cannot support the required behaviour and the dependency is separately justified.
- Does not create global app search outside the strategy canvas editor.

## Acceptance criteria (numbered AC-001, AC-002, …)
- **AC-001**
  - **Given** an authenticated user is editing a strategy in the canvas editor,
  - **When** they press Cmd+K on macOS or Ctrl+K on Windows/Linux while focus is not inside an editable text field,
  - **Then** a command palette opens over the canvas and focus moves to its search input.

- **AC-002**
  - **Given** the command palette is open,
  - **When** the user views the available commands,
  - **Then** node insertion commands are grouped by user-facing category: Indicators, Conditions, and Actions.

- **AC-003**
  - **Given** the command palette is open,
  - **When** the user types a block name, abbreviation, or plain-English keyword such as `EMA`, `crossover`, or `stop loss`,
  - **Then** the list filters to matching node insertion commands without showing unrelated commands.

- **AC-004**
  - **Given** the command palette shows a matching node insertion command,
  - **When** the user selects that command with mouse, touch, or keyboard,
  - **Then** the corresponding node is added to the current canvas using the same label and default parameters as existing palette insertion.

- **AC-005**
  - **Given** a node is inserted through the command palette,
  - **When** the node appears on the canvas,
  - **Then** it is placed in a visible, non-overlapping location near the current canvas focus or viewport center so the user can immediately find it.

- **AC-006**
  - **Given** the command palette is open,
  - **When** the user presses Escape, clicks outside the palette, or completes a command selection,
  - **Then** the palette closes and the user remains on the same strategy canvas without navigation.

- **AC-007**
  - **Given** focus is inside an input, textarea, contenteditable element, parameter editor, or palette search field,
  - **When** the user presses Cmd+K or Ctrl+K,
  - **Then** the shortcut does not interfere with text editing or browser/editor-native behaviour.

- **AC-008**
  - **Given** the strategy canvas already supports existing node insertion paths,
  - **When** the command palette feature is added,
  - **Then** drag-and-drop insertion and bottom sheet insertion continue to work as before.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
- The command palette is available only inside the strategy canvas editor.
- The palette opens with Cmd+K on macOS and Ctrl+K on Windows/Linux when the shortcut is safe to handle.
- The palette uses the existing visual system for modal/dialog surfaces and should prefer existing shadcn/Radix primitives already present in the frontend.
- The search input receives initial focus when the palette opens.
- Commands are grouped as:
  - Indicators: indicator blocks such as SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, ADX, Ichimoku Cloud, OBV, and Fibonacci.
  - Conditions: comparison and boolean logic blocks such as Compare, Crossover, AND, OR, and NOT.
  - Actions: signal and risk/action blocks such as Entry Signal, Exit Signal, Position Size, Take Profit, Stop Loss, Max Drawdown, Time Exit, and Trailing Stop.
- Input/data source blocks may be included where they fit the current product language, but they must not be mislabeled as trading actions.
- Search should match block labels, common abbreviations, and obvious keywords already represented by the block metadata or UI copy.
- Selection adds exactly one node and closes the palette.
- Inserted nodes use the same default parameters, node type, and label semantics as existing canvas insertion.
- Empty search results show a concise empty state without changing the canvas.
- The palette must be keyboard accessible: arrow navigation, Enter to select, and Escape to close.
- The UI must remain usable on mobile and tablet viewports, but this feature is primarily a keyboard-first desktop enhancement.

## Edge cases
- Shortcut handling must ignore editable fields so users can type normally in parameter forms, search inputs, and contenteditable notes.
- If no strategy canvas instance is ready yet, opening or selecting from the palette must not throw an error or corrupt local canvas state.
- If the current viewport is zoomed or panned, inserted nodes must still appear within the user's visible canvas area.
- If several nodes already occupy the intended insertion location, the new node should be offset enough to remain discoverable.
- If a search query has no matches, the palette should remain open and allow the user to revise the query.
- If a block type is later added to the registry, the command list should stay aligned with the same source used by existing canvas insertion paths.
- The feature must work in both light and dark themes.

## Open questions
- Should input/data source blocks appear as a fourth group such as Data, or should the first version limit the palette to the issue's requested Indicators, Conditions, and Actions groups?
- Should selecting a command also select the newly inserted node and open the existing parameter inspector, or only place the node on the canvas?
- Should the command palette be guarded by an existing canvas feature flag, or should it ship as a default canvas enhancement?

## Implementation Plan: Not produced in this step.
