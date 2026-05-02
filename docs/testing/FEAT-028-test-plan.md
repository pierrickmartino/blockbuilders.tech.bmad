# Test Checklist – Copy/Paste Blocks & Subgraphs

> Source PRD: `prd-copy-paste-blocks-subgraphs.md`

## 1. Multi-Select

- [ ] Shift-clicking individual blocks adds them to the selection
- [ ] Dragging a marquee (lasso) selects all blocks within the rectangle
- [ ] Selected blocks show the existing selection styling (highlight/border)
- [ ] Shift-clicking an already selected block deselects it
- [ ] Clicking on empty canvas area clears the selection

## 2. Copy via Keyboard Shortcut

- [ ] Pressing `Cmd/Ctrl+C` with blocks selected copies them to the clipboard
- [ ] Copied payload is stored in localStorage under the `strategyClipboard` key (or equivalent)
- [ ] Clipboard payload contains all selected blocks with their type, params, and positions
- [ ] Clipboard payload contains only connections where both endpoints are in the selected blocks
- [ ] Connections where one endpoint is outside the selection are excluded from the clipboard
- [ ] Annotation/note nodes within the selection are included in the clipboard
- [ ] Pressing `Cmd/Ctrl+C` with nothing selected does nothing (optional toast)

## 3. Paste within the Same Strategy

- [ ] Pressing `Cmd/Ctrl+V` after a copy creates new blocks on the canvas
- [ ] Pasted blocks have new unique IDs (no collision with existing blocks)
- [ ] Pasted blocks preserve the same relative layout as the copied blocks
- [ ] Pasted blocks are offset from the originals (e.g., +24px x, +24px y) to avoid exact overlap
- [ ] Internal connections between pasted blocks are preserved with remapped IDs
- [ ] Pasted blocks do not create connections to blocks outside the pasted set
- [ ] After pasting, the selection updates to contain only the newly pasted blocks
- [ ] Pasting multiple times from the same clipboard creates additional copies each time
- [ ] Each successive paste produces new unique IDs

## 4. Paste across Strategies

- [ ] Copying blocks in Strategy A and opening Strategy B retains the clipboard
- [ ] Pressing `Cmd/Ctrl+V` in Strategy B creates blocks with new IDs
- [ ] Internal connections between pasted blocks are preserved in the target strategy
- [ ] Block parameters are fully preserved when pasting across strategies
- [ ] Pasted blocks appear at an appropriate position in the target canvas

## 5. Clipboard Payload Integrity

- [ ] Clipboard JSON includes `blocks` array with id, type, params, and position for each block
- [ ] Clipboard JSON includes `connections` array with from/to block_id and port references
- [ ] Only connections with both endpoints inside the selection are stored
- [ ] Payload is minimal and does not include extraneous canvas state

## 6. Edge Cases and Negative Tests

- [ ] Pasting with no clipboard data is a no-op (optional toast notification)
- [ ] Pasting clipboard data from an older or incompatible schema fails gracefully
- [ ] After a graceful failure from stale clipboard data, the clipboard is cleared
- [ ] Pasting into a strategy that already has selected nodes still works; new nodes replace the selection
- [ ] Copying a single block (not multi-select) works correctly
- [ ] Copying blocks that have no internal connections produces a valid clipboard with an empty connections array
- [ ] Very large selections (many blocks) copy and paste without errors

## 7. No Backend Impact

- [ ] No API calls are made during copy or paste operations
- [ ] No database or schema changes are required
- [ ] Clipboard data is stored only in localStorage (browser-local)
- [ ] Clipboard persists across strategy navigation within the same browser session
- [ ] Clipboard does not persist after clearing localStorage or using a different browser
