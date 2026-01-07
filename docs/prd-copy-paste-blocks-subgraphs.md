# PRD: Copy/Paste Blocks & Subgraphs

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Enable users to select multiple blocks on the strategy canvas and copy/paste them within the same strategy or across strategies. The clipboard stores block definitions and internal connections, and paste assigns new IDs to avoid collisions. Frontend-only feature; no backend changes.

---

## 2. Goals
- Allow multi-select of blocks on the canvas.
- Copy selected blocks + internal connections to a local clipboard.
- Paste creates new blocks with new IDs and preserved relative layout.
- Support cross-strategy paste in the same browser session.
- Keep implementation minimal and predictable.

## 3. Non-Goals
- No backend clipboard storage or API changes.
- No system-level clipboard integration beyond standard shortcut handling.
- No advanced grouping or template management.
- No deep conflict resolution with existing connections outside the selection.

---

## 4. Target Users
- Builders creating variations of similar strategies.
- Users who want to reuse a signal pattern across strategies.

---

## 5. User Stories
1. As a user, I can select multiple blocks and copy them with one shortcut.
2. As a user, I can paste a copied set and get new blocks with the same wiring.
3. As a user, I can copy from one strategy and paste into another without redoing work.

---

## 6. UX Flow (Minimal)

**Selection:**
1. User shift-clicks blocks or drags a marquee to multi-select.
2. Selected blocks show existing selection styling.

**Copy:**
1. User presses `Cmd/Ctrl+C`.
2. App stores a JSON payload of selected blocks + internal connections in local storage.

**Paste (same strategy):**
1. User presses `Cmd/Ctrl+V`.
2. App creates new block IDs, offsets positions slightly, and adds the new blocks + connections.

**Paste (different strategy):**
1. User opens another strategy.
2. User presses `Cmd/Ctrl+V`.
3. App pastes the clipboard content as new blocks + connections.

---

## 7. Clipboard Payload (Frontend-Only)
Minimal JSON stored in localStorage under a single key (e.g., `strategyClipboard`).

```json
{
  "blocks": [
    {
      "id": "block_uuid",
      "type": "sma",
      "params": {"period": 20},
      "position": {"x": 100, "y": 200}
    }
  ],
  "connections": [
    {
      "from": {"block_id": "block_uuid", "port": "output"},
      "to": {"block_id": "target_uuid", "port": "input"}
    }
  ]
}
```

**Rules:**
- Only include connections where **both endpoints** are in `blocks`.
- On paste, generate new IDs and remap all connection endpoints.
- Apply a small default offset (e.g., +24px, +24px) to avoid overlapping the source.
- Notes (annotation nodes) are treated like normal blocks and included.

---

## 8. Edge Cases
- Empty selection: copy does nothing and shows a small toast (optional).
- Paste with no clipboard data: no-op, optional toast.
- Clipboard from an older schema: fail gracefully and clear the clipboard.
- Pasting into a strategy that already has selected nodes: new nodes still paste; selection updates to new nodes only.

---

## 9. Acceptance Criteria
- ✅ Multi-select works with existing canvas selection patterns.
- ✅ Copy captures selected blocks and their internal connections only.
- ✅ Paste generates new IDs and preserves connections between pasted blocks.
- ✅ Paste works across strategies without API changes.
- ✅ No backend, database, or schema changes required.

---

## 10. Implementation Notes
- Prefer existing React Flow selection state and node serialization utilities.
- Keep logic in the canvas layer; avoid new shared services.
- Use localStorage for persistence across strategy navigation; keep payload tiny.
- No new dependencies.
