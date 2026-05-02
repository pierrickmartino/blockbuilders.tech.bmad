# Test Checklist – Mobile Bottom Sheet Parameter Editing

> Source PRD: `prd-mobile-bottom-sheet-parameter-editing.md`

---

## 1. Breakpoint Behavior

- [ ] On viewport widths below 768px, tapping a block opens a bottom sheet instead of the desktop/tablet popover
- [ ] On viewport widths 768px and above, existing non-mobile parameter editing behavior remains unchanged
- [ ] Rotating a device or resizing the viewport does not leave the editor in a broken mixed state

## 2. Bottom Sheet Layout

- [ ] Mobile editor uses the existing shadcn/ui `Sheet` component
- [ ] Sheet opens at roughly half-screen height on first open
- [ ] Long parameter forms are scrollable inside the sheet
- [ ] Selected block label remains visible above the sheet while editing

## 3. Parameter Editing Parity

- [ ] Mobile sheet renders the same parameter controls already available for the selected block
- [ ] Blocks with no editable parameters show a clear “No parameters” message
- [ ] Existing inline validation messages and plain-language error copy still appear in the sheet

## 4. Real-Time Canvas Feedback

- [ ] Changing a parameter updates the selected block label in real time
- [ ] Example check: changing `RSI (14)` to `RSI (25)` updates the visible label above the sheet
- [ ] Rapid slider or stepper changes keep the visible block label in sync without obvious lag

## 5. Keyboard / visualViewport Behavior

- [ ] Focusing a lower input with the software keyboard open keeps the active field visible
- [ ] `visualViewport` resize handling scrolls the sheet enough to reveal the focused field
- [ ] Keyboard-open editing works in iOS Safari
- [ ] Keyboard-open editing works in Android Chrome

## 6. Close & Commit Behavior

- [ ] Swiping down closes the sheet
- [ ] Swipe-down close commits the latest valid parameter values
- [ ] Reopening the same block shows the committed values
- [ ] Tapping the close affordance or other close path also commits through the same logic

## 7. Undo / Redo / Autosave

- [ ] One undo action reverts the committed mobile parameter edit
- [ ] Redo reapplies the committed mobile parameter edit
- [ ] Closing the sheet triggers existing autosave debounce behavior
- [ ] One close action does not create duplicate autosave requests or duplicate history entries

## 8. Regression Checks

- [ ] Desktop/tablet popover behavior still works after mobile support is added
- [ ] Inspector-panel fallback still works when the inline editor feature flag is disabled
- [ ] Strategy save/version creation still works after mobile sheet edits
- [ ] No backend or API changes are required for this feature
