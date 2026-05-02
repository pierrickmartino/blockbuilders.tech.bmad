# Test Checklist -- Strategy Notes & Annotations

> Source PRD: `prd-strategy-notes-annotations.md`

## 1. Note Creation

- [ ] "Add Note" button is visible in the canvas controls toolbar
- [ ] Clicking "Add Note" creates a new note card at a default center position
- [ ] Newly created note appears as a yellow sticky note card
- [ ] Newly created note has empty text
- [ ] Newly created note automatically enters edit mode with the text area focused
- [ ] User can type plain text into the note immediately after creation
- [ ] Clicking outside the note saves the entered text
- [ ] Each note receives a unique UUID as its `id`

## 2. Note Editing

- [ ] Clicking an existing note enters edit mode for inline text modification
- [ ] Text changes are saved when clicking outside the note
- [ ] Pressing Escape cancels edits and reverts to previous text
- [ ] Note supports plain text only (no rich text, markdown, or images)

## 3. Note Character Limit

- [ ] Notes enforce a 280-character maximum limit
- [ ] A character counter is displayed showing current usage vs. the 280-character limit
- [ ] User cannot type beyond the 280-character limit
- [ ] A note with exactly 280 characters is accepted
- [ ] Visual feedback indicates when approaching or at the character limit

## 4. Note Positioning

- [ ] Notes can be dragged to reposition anywhere on the canvas
- [ ] Note position is persisted after drag (x, y coordinates saved)
- [ ] Notes can overlap with other notes or blocks
- [ ] Notes maintain their position when the canvas is panned or zoomed

## 5. Note Deletion

- [ ] Selecting a note and clicking "Delete" in the properties panel removes the note
- [ ] Deleted notes are no longer visible on the canvas
- [ ] Deleted notes are removed from the strategy definition on save
- [ ] Deleting a note does not affect other notes or blocks on the canvas

## 6. Note Visual Appearance

- [ ] Notes render as yellow sticky note cards
- [ ] Notes have a fixed width (w-52)
- [ ] Notes have a minimum height (min-h-24)
- [ ] Note height adjusts automatically based on text content
- [ ] Notes are visually distinct from strategy blocks (different color/style)

## 7. Data Model -- Strategy Version JSON

- [ ] Notes are stored as React Flow nodes with `type: "note"` in the strategy definition
- [ ] Note node contains `id` field (UUID)
- [ ] Note node contains `type` field set to "note"
- [ ] Note node contains `position` field with `x` and `y` coordinates
- [ ] Note node contains `data.text` field with the note text
- [ ] Notes are stored alongside blocks in the same node array

## 8. Persistence

- [ ] Notes are persisted in the definition JSON when the strategy is saved
- [ ] Notes load correctly when reopening a strategy version
- [ ] Note text is preserved exactly as entered through save/reload cycle
- [ ] Note positions are preserved exactly through save/reload cycle
- [ ] Multiple notes on the same canvas all persist and reload correctly

## 9. Validation and Compatibility

- [ ] Strategy validation ignores note nodes (type "note")
- [ ] Backtest interpreter ignores note nodes entirely
- [ ] Adding notes to a strategy does not cause validation errors
- [ ] Removing all notes from a strategy does not cause validation errors
- [ ] A strategy with notes can be backtested without errors
- [ ] Notes do not appear in backtest results or outputs

## 10. Edge Cases

- [ ] Creating a note with empty text (no characters) is handled gracefully
- [ ] Creating multiple notes on the same canvas works correctly
- [ ] Notes at extreme canvas positions (very large x/y values) are handled
- [ ] Saving a strategy with many notes (e.g., 20+) works without issues
- [ ] Note text with special characters (quotes, angle brackets, unicode) is preserved correctly
- [ ] Rapidly creating and deleting notes does not cause UI or data issues

## 11. Non-Goals Verification

- [ ] No rich text or markdown formatting is available in notes
- [ ] No image support in notes
- [ ] No comment, mention, or collaboration features on notes
- [ ] No visual links between notes and blocks
- [ ] No note attachment to blocks (notes are independent elements)
- [ ] No searching or filtering of notes
- [ ] No new backend endpoints are created for notes
- [ ] No new block types are introduced for notes
