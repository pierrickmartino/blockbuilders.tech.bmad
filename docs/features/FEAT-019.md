# PRD: Block Library Bottom Sheet with Search

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Replace the small floating “+” button with a modern bottom sheet that slides up on tap. The sheet includes a search bar, categorized block sections, and a recent/favorites strip. Users can drag blocks from the sheet onto the canvas or tap to auto-place at the cursor. This is a frontend-only enhancement that uses existing block definitions.

---

## 2. Goals

- Make block discovery faster with search and clear categories.
- Reduce hunting through menus on mobile and desktop.
- Keep implementation simple and frontend-only.

---

## 3. Non-Goals

- No new block types or block metadata fields.
- No backend/API changes.
- No new personalization system beyond simple recent/favorite storage.

---

## 4. Users & Use Cases

### Primary Users
- Traders building strategies on mobile and tablet.
- Desktop users who want quicker block discovery.

### Key Use Cases
- Search for “EMA” and add it quickly.
- Find “Crossover” under Logic without scrolling the full list.
- Reuse recently placed blocks without navigating categories.

---

## 5. Requirements

### 5.1 Trigger & Layout
- Replace the floating “+” button with a bottom sheet trigger.
- Bottom sheet slides up from the bottom and can be dismissed by swipe down or tapping outside.
- Sheet height uses a sensible max (e.g., ~70–80% viewport) with internal scroll.

### 5.2 Search
- Search field at top of the sheet.
- Matches block names and keywords (e.g., “EMA”, “crossover”, “stop loss”).
- Filters results across all categories in-place (no new page).

### 5.3 Categories
- Categorized sections:
  - Indicators
  - Logic
  - Risk
  - Signals
  - Data
- Simple headings or tabs (keep minimal; no complex navigation).

### 5.4 Recents & Favorites
- Recent blocks appear at the top as a small horizontal list.
- Favorites are optional and lightweight (toggle star on a block card).
- Storage is client-side only (localStorage or existing frontend store).

### 5.5 Placement Behavior
- Drag from sheet to canvas (existing drag behavior reused).
- Tap a block to auto-place at current cursor focus or center of viewport if no cursor position is known.

---

## 6. UX Notes

- Familiar mobile pattern (Maps/Spotify-style bottom sheet).
- Keep the UI minimal: no nested menus, no extra settings.
- Use existing block card visuals and icons; no new assets.

---

## 7. Data & API

- No backend or schema changes.
- Recents/favorites stored locally in the browser only.

---

## 8. Acceptance Criteria

- Floating “+” button is replaced by a bottom sheet trigger.
- Bottom sheet opens/closes with smooth slide motion and does not block canvas interactions when closed.
- Search filters blocks by name/keywords across categories.
- Categories render as Indicators, Logic, Risk, Signals, Data.
- Users can drag blocks or tap to place them on the canvas.
- Recent blocks are shown at the top; favorites are optional but supported if present.

---

## 9. Rollout Plan

1. Implement bottom sheet UI and search filtering using existing block metadata.
2. Add recents (and optional favorites) stored locally.
3. QA on mobile and desktop to confirm drag/tap behavior.

---

## 10. Risks & Mitigations

- **Risk:** Sheet hides canvas while open.
  - **Mitigation:** Keep sheet height reasonable and allow drag-to-dismiss.
- **Risk:** Tap-to-place drops blocks in unexpected spots.
  - **Mitigation:** Default to viewport center when cursor position is unknown.

---

## 11. Open Questions

- Should categories be tabs or simple stacked sections?
- Do favorites need a dedicated section or combine with recents?

---

**End of PRD**
