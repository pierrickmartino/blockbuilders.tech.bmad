# PRD: Canvas Bottom Action Bar (Mobile Tools)

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Replace the left vertical tool stack on the canvas with a mobile-optimized bottom action bar. The bar uses larger, horizontal tap targets for core canvas tools (Pan/Select, Zoom In/Out, Fit to Screen, Undo/Redo). This is a frontend-only layout change that frees horizontal space and reduces mis-taps on small screens.

---

## 2. Goals

- Improve touch usability on small screens by enlarging tool buttons.
- Reclaim horizontal canvas space by moving tools to a bottom bar.
- Keep changes simple, minimal, and frontend-only.

---

## 3. Non-Goals

- No new canvas tools or shortcuts.
- No backend or data model changes.
- No changes to desktop tool layout or behavior.

---

## 4. Users & Use Cases

### Primary Users
- Mobile and small-tablet users building strategies on touch devices.

### Key Use Cases
- Switch between pan/select without accidental taps.
- Zoom in/out or fit to screen with a single tap.
- Undo/redo edits without reaching a side toolbar.

---

## 5. Requirements

### 5.1 Mobile Trigger
- The bottom action bar is shown on small screens (Tailwind `sm` breakpoint or existing mobile mode toggle).
- Desktop and larger screens keep the current left tool stack.

### 5.2 Tool Set & Layout
- Horizontal, bottom-fixed action bar with large, evenly spaced buttons.
- Tools in order (left to right): Pan/Select, Zoom In, Zoom Out, Fit to Screen, Undo, Redo.
- Buttons use existing icons/labels; no new assets required.

### 5.3 Interaction & States
- Buttons mirror existing actions and disabled states (e.g., disabled undo when no history).
- Tap targets meet mobile-friendly size guidelines (minimum ~44px height).
- The bar does not overlap critical canvas UI; if needed, add safe padding to the canvas viewport.

---

## 6. UX Notes

- Keep visual styling consistent with existing toolbar buttons (colors, hover/active states).
- Avoid extra controls or menus; only core actions.
- Preserve existing shortcuts and behavior; this is only a layout change.

---

## 7. Data & API

- No API, backend, or schema changes.
- No changes to strategy JSON or canvas state format.

---

## 8. Acceptance Criteria

- On mobile-sized screens, the left tool stack is replaced with a bottom action bar.
- Core tool actions (pan/select, zoom, fit, undo/redo) work as before.
- Tap targets are visibly larger and easier to hit than the previous vertical stack.
- Desktop behavior remains unchanged.

---

## 9. Rollout Plan

1. Implement the mobile bottom bar behind the existing mobile breakpoint.
2. QA on common mobile sizes (iPhone/Android) to confirm spacing and no overlap issues.
3. Ship without backend changes.

---

## 10. Risks & Mitigations

- **Risk:** Bottom bar overlaps canvas content.
  - **Mitigation:** Add minimal bottom padding to the canvas viewport on mobile.
- **Risk:** Users rely on the left tool stack on tablets.
  - **Mitigation:** Use the same breakpoint as current mobile mode; keep desktop layout intact.

---

## 11. Open Questions

- Should the bar hide when a modal/panel is open, or remain fixed?
- Do we need labels under icons for first-time mobile users?

---

**End of PRD**
