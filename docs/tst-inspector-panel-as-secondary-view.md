# Test Checklist – Inspector Panel as Secondary View

> Source PRD: `prd-inspector-panel-as-secondary-view.md`

---

## 1. Details Button Availability

- [ ] Inline desktop/tablet popover shows a visible `Details` button
- [ ] Mobile parameter sheet shows the same `Details` action if the inline editor is available there
- [ ] Blocks with no editable parameters do not show a broken or misleading `Details` action

## 2. Popover-to-Inspector Handoff

- [ ] With the inline popover open, clicking `Details` closes the popover
- [ ] After clicking `Details`, the existing Inspector Panel opens in its current location
- [ ] The same block remains selected before and after the handoff
- [ ] Parameter values visible in the Inspector match the values that were visible in the inline editor before the handoff

## 3. Real-Time Sync From Inspector

- [ ] Editing a value in the Inspector updates the selected block label immediately
- [ ] Example check: `RSI (14)` changes to `RSI (25)` on the canvas while editing in the Inspector
- [ ] Rapid edits in the Inspector keep the canvas label in sync without obvious lag
- [ ] If an inline editor is open for the same block, Inspector edits update the inline control value in real time

## 4. Existing Inspector Entry Points

- [ ] With no popover open, the existing Inspector keyboard shortcut opens the Inspector exactly as before
- [ ] With no popover open, the existing menu action opens the Inspector exactly as before
- [ ] Existing Inspector behavior for selecting a block directly from the canvas still works

## 5. Validation & State Integrity

- [ ] Existing validation messages still appear in the Inspector for invalid values
- [ ] Invalid values are not silently introduced during the popover-to-Inspector handoff
- [ ] Reopening the inline editor after Inspector edits shows the latest valid values
- [ ] Shared state stays correct when switching from one block to another after using `Details`

## 6. Regression Checks

- [ ] Feature does not require backend or API changes
- [ ] Existing autosave flow still works after editing through the Inspector opened via `Details`
- [ ] Existing undo/redo behavior still works after editing through the Inspector opened via `Details`
- [ ] No duplicate Inspector panels or duplicate parameter editors appear during the handoff
