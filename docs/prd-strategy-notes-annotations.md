# PRD: Strategy Notes & Annotations

**Status:** Implemented
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Add simple text notes directly on the strategy canvas so users can document intent or add reminders. Notes float freely on the canvas and can be positioned anywhere. Notes are stored in the strategy version JSON as metadata and never affect execution.

---

## 2. Goals
- Let users add quick, plain-text notes on the canvas.
- Support freely positioned floating notes.
- Persist notes with each strategy version (stored in definition JSON metadata).
- Keep the implementation minimal with no new backend endpoints or block types.

## 3. Non-Goals
- No rich text, markdown, or images.
- No comments, mentions, or collaboration features.
- No advanced layout or auto-arrange behaviors.
- No searching or filtering of notes.
- No visual links between notes and blocks.
- No note attachment to blocks.

---

## 4. Target Users
- Strategy builders who want to remember why they configured something.
- Users documenting logic for later review or sharing screenshots.

---

## 5. User Stories
1. As a user, I can add a quick note on the canvas to document my reasoning.
2. As a user, I can drag notes to position them anywhere on the canvas.
3. As a user, I can edit or delete a note at any time.

---

## 6. UX Flow (Minimal)
**Entry points:**
- "Add Note" button in the canvas controls toolbar.

**Create note:**
1. User clicks "Add Note" button.
2. A small yellow note card appears at a default center position with empty text.
3. Note automatically enters edit mode with text area focused.
4. User types plain text (up to 280 characters) and clicks outside to save.

**Edit note:**
- Click the note to enter edit mode and modify text inline.
- Pressing Escape cancels edits and reverts to previous text.
- Clicking outside saves the changes.

**Move note:**
- Drag the note card to reposition it anywhere on the canvas.

**Delete note:**
- Select the note, then click the "Delete" button in the properties panel.

---

## 7. Data Model (Strategy Version JSON)
Notes are stored as React Flow nodes with type "note" in the strategy definition.

```json
{
  "blocks": ["..."],
  "connections": ["..."]
}
```

Notes are represented as nodes in the React Flow graph:

```typescript
{
  "id": "note_uuid",
  "type": "note",
  "position": {"x": 120, "y": 240},
  "data": {
    "text": "Why this crossover?"
  }
}
```

**Field rules:**
- `id`: required, unique per note (UUID).
- `type`: required, must be "note".
- `position`: required, { x, y } coordinates on canvas.
- `data.text`: required string (plain text, max 280 chars).

---

## 8. Validation & Compatibility
- Strategy validation ignores note nodes (type "note").
- Backtest interpreter ignores note nodes entirely.
- Notes are part of the standard React Flow node array, no special metadata key needed.

---

## 9. Minimal UI Requirements
- Notes render as yellow sticky note cards (w-52, min-h-24).
- Plain text only, no formatting toolbar.
- Drag to reposition freely on canvas.
- Fixed width with automatic height based on text content.
- Character counter showing usage vs 280 char limit.

---

## 10. Acceptance Criteria
- ✅ Users can create, edit, move, and delete notes on the canvas.
- ✅ Notes are persisted in definition JSON on save.
- ✅ Notes load correctly when reopening a strategy version.
- ✅ Notes do not affect strategy validation or backtest execution.
- ✅ No new backend endpoints or block types are required.
- ✅ Notes have a 280 character limit with visual feedback.
- ✅ Notes auto-focus on creation for immediate text entry.

---

## 11. Implementation Notes
- Implemented as a custom React Flow node type ("note").
- Uses NoteNode component with inline editing.
- Stored alongside blocks in the strategy definition.
- No visual links or block attachment - notes are independent elements.
