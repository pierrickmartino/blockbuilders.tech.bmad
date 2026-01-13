# PRD: Mobile-Optimized Canvas

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Enable full strategy creation on phones by redesigning canvas interactions for touch. The current desktop-first canvas works for viewing but is awkward for mobile creation. This feature introduces a mobile-specific mode with larger tap targets, a simplified palette, and tap-based connections, while keeping desktop behavior unchanged.

---

## 2. Goals

- Make it practical to build and edit strategies on mobile devices.
- Reduce precision requirements for connections and block manipulation.
- Keep changes UI-only with minimal code and no backend updates.

---

## 3. Non-Goals

- No new block types or backend schema changes.
- No custom gesture libraries or complex touch physics.
- No native app or offline mode.

---

## 4. Users & Use Cases

### Primary Users
- Retail traders using phones as their primary device.

### Key Use Cases
- Create a new strategy from scratch on mobile.
- Edit parameters on existing blocks.
- Connect blocks without drag precision.

---

## 5. Requirements

### 5.1 Mobile Mode Trigger
- Automatically enabled for small screens (Tailwind `sm` breakpoint or similar).
- Manual toggle in settings for testing and edge cases.

### 5.2 Touch-Friendly Controls
- Larger tap targets for:
  - Block headers
  - Connection ports
  - Selection handles
  - Canvas toolbar buttons
- Clear visual feedback on tap/selection.

### 5.3 Simplified Palette
- Single-column, scrollable palette.
- Category grouping with collapsible sections.
- Show fewer items at once to reduce clutter.

### 5.4 Gesture-Based Connections
- Tap a source port to enter “connect mode.”
- Tap a target port to complete the connection.
- Tap outside to cancel.
- Preserve existing drag-to-connect on desktop.

### 5.5 Mobile-Optimized Editing
- Ensure properties panel is reachable and readable on phones.
- Avoid overlapping panels; use drawer or full-height panel if already present.

---

## 6. UX Notes

- Keep existing block visuals; only adjust touch affordances.
- Use simple, direct interactions. Avoid hidden multi-step flows.
- Ensure mobile mode does not degrade desktop usability.

---

## 7. Data & API

- No API or database changes.
- Strategy definition JSON remains unchanged.

---

## 8. Acceptance Criteria

- On mobile-sized screens, users can:
  - Add blocks from a simplified palette.
  - Select and move blocks reliably with touch.
  - Create connections via tap-to-connect without drag precision.
- Desktop behavior remains unchanged.
- No new dependencies added.

---

## 9. Analytics (Optional)

- Track a simple event for “mobile mode enabled.”
- Track connection completion success rate in mobile mode.

---

## 10. Rollout Plan

1. Ship behind an automatic mobile breakpoint trigger.
2. Add manual toggle for QA and power users.
3. Monitor feedback; adjust tap target sizes if needed.

---

## 11. Risks & Mitigations

- **Risk:** Tap-to-connect feels slower than drag.
  - **Mitigation:** Keep drag connections on larger screens; optimize tap flow with clear visual state.
- **Risk:** Palette takes too much screen space.
  - **Mitigation:** Collapsible categories and single-column layout.

---

## 12. Open Questions

- Do we need a quick tutorial tooltip the first time mobile mode activates?
- Should mobile mode default to hiding the properties panel until a block is selected?

---

**End of PRD**
