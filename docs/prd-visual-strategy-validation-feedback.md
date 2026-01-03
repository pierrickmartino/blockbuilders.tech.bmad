# PRD – Visual Strategy Validation Feedback

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Goal

Make strategy validation errors **obvious and fixable** directly on the canvas by highlighting problematic blocks and showing inline messages next to them. Reduce time spent hunting errors in the side panel.

---

## 2. Non-Goals

- No new validation rules or logic changes in the backend.
- No new API endpoints (reuse existing validation endpoint).
- No complex overlays, popovers, or animations.
- No auto-fixes or auto-rewiring.

---

## 3. User Story

“As a trader, I want to see exactly which blocks are invalid right on the canvas so I can fix issues quickly without hunting through a side panel.”

---

## 4. Functional Requirements

### 4.1. Validation Trigger

- Use the existing **validation flow** (manual validate or pre-run validation).
- Do not add new API calls or polling.

### 4.2. Canvas Highlights

- Blocks with validation errors show a **colored border** (red for errors, amber for warnings).
- Each highlighted block shows a small **status icon** (error or warning) in the block header.

### 4.3. Inline Messages

- Each invalid block shows **one inline message** anchored near the block (top-right or below).
- Message text is short and directly actionable (e.g., “Missing input connection”).
- If a block has multiple errors, show the first one inline and keep the rest in the side panel list.

### 4.4. Side Panel Behavior

- Keep the existing validation list in the side panel (no removal).
- Selecting an item in the list still focuses/pans to the block.

### 4.5. Errors Without a Block

- If a validation error is not tied to a specific block (e.g., “No entry signal”), show a **compact banner** at the top of the canvas.

---

## 5. Data Contract

- Reuse the current validation response.
- If the response already includes `block_id`, map it to the canvas block.
- If a response item has no `block_id`, treat it as a global error.

---

## 6. UX Notes (Simple + Minimal)

- Use existing Tailwind styles and icon set already in the app.
- Avoid heavy tooltips or hover-only content.
- No new layout containers; render inline message with absolute positioning near the block.

---

## 7. Acceptance Criteria

- [ ] Invalid blocks display a colored border and a small status icon.
- [ ] Each invalid block shows an inline message near the block.
- [ ] Global (non-block) validation errors appear in a canvas-level banner.
- [ ] Existing side panel validation list remains available.
- [ ] No new endpoints or validation rules added.
- [ ] No new dependencies.

---

## 8. Minimal Implementation Plan

1. Map validation errors to canvas nodes by `block_id`.
2. Add a lightweight visual state on block rendering (border + icon + inline message).
3. Render a small banner for global errors at the top of the canvas.
4. Keep side panel list unchanged.
