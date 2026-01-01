# PRD: Strategy Notes & Annotations

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2025-02-14

---

## 1. Summary
Add simple text notes directly on the strategy canvas so users can document intent or mark specific blocks. Notes can float freely or be attached to a block. Notes are stored in the strategy version JSON as metadata and never affect execution.

---

## 2. Goals
- Let users add quick, plain-text notes on the canvas.
- Support both floating notes and notes attached to a block.
- Persist notes with each strategy version (stored in definition JSON metadata).
- Keep the implementation minimal with no new backend endpoints or block types.

## 3. Non-Goals
- No rich text, markdown, or images.
- No comments, mentions, or collaboration features.
- No advanced layout or auto-arrange behaviors.
- No searching or filtering of notes.

---

## 4. Target Users
- Strategy builders who want to remember why they configured something.
- Users documenting logic for later review or sharing screenshots.

---

## 5. User Stories
1. As a user, I can add a quick note on the canvas to document my reasoning.
2. As a user, I can attach a note to a block so it moves with that block.
3. As a user, I can edit or delete a note at any time.

---

## 6. UX Flow (Minimal)
**Entry points:**
- A simple “Add Note” button in the canvas toolbar, or a context menu item on the canvas.
- A context menu item on a block: “Add Note to Block”.

**Create note:**
1. User selects “Add Note”.
2. A small note card appears near the cursor with empty text.
3. User types plain text and clicks outside to save.

**Attach note to block:**
- When created from a block, the note is linked to that block and placed with a small offset.
- The note follows the block when the block moves.

**Edit note:**
- Click the note to edit text inline.
- Pressing Escape cancels edits.

**Delete note:**
- A simple delete action (e.g., small “x” icon or context menu).

---

## 7. Data Model (Strategy Version JSON)
Notes are stored under a top-level `metadata` key so execution logic can ignore them.

```json
{
  "blocks": ["..."],
  "connections": ["..."],
  "metadata": {
    "notes": [
      {
        "id": "note_uuid",
        "text": "Why this crossover?",
        "position": {"x": 120, "y": 240},
        "attached_block_id": "block_uuid",
        "offset": {"x": 20, "y": -10}
      }
    ]
  }
}
```

**Field rules:**
- `id`: required, unique per note (UUID).
- `text`: required string (plain text).
- `position`: required for floating notes.
- `attached_block_id`: optional. If present, note is attached to that block.
- `offset`: optional. Used only when attached to position relative to the block.

**Defaults:**
- For floating notes: `position` is set, `attached_block_id` omitted.
- For attached notes: `attached_block_id` and `offset` set; `position` can be derived from block + offset.

---

## 8. Validation & Compatibility
- Strategy validation ignores `metadata` entirely.
- Backtest interpreter ignores `metadata` entirely.
- If `metadata.notes` is missing, treat as no notes.
- If an attached block is deleted, the note becomes floating at its last known position (simple fallback).

---

## 9. Minimal UI Requirements
- Notes render as small, lightweight cards on the canvas.
- Plain text only, no formatting toolbar.
- Drag to reposition.
- Resize is optional; if omitted, use a fixed width.

---

## 10. Acceptance Criteria
- Users can create, edit, move, and delete notes on the canvas.
- Notes can be attached to a block and move with it.
- Notes are persisted in `definition_json.metadata.notes` on save.
- Notes load correctly when reopening a strategy version.
- Notes do not affect strategy validation or backtest execution.
- No new backend endpoints or block types are required.

---

## 11. Open Questions
- Should notes have a maximum length (e.g., 280 or 500 chars)?
- Should attached notes snap to a default offset (top-right, etc.)?
