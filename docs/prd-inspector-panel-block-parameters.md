# PRD: Inspector Panel for Block Parameters

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Move block parameter editing (period, source, thresholds) out of cramped node UI into a dedicated Inspector panel that opens on block tap. The panel provides large touch-friendly inputs, quick presets for common periods (14/20/50/200), quick-swap buttons for sources (close vs prev_close), and inline validation for empty/invalid values. Nodes stay visually clean while parameters get proper editing space, following professional tool patterns (Figma/Notion).

---

## 2. Goals

- Improve mobile UX by separating block selection from parameter editing.
- Reduce visual clutter on nodes by moving parameter inputs into an Inspector panel.
- Make parameter editing faster with presets and quick-swap controls.
- Provide clear, inline validation for invalid or empty values.

---

## 3. Non-Goals

- No new block types or parameters.
- No backend or schema changes.
- No changes to validation rules or parameter ranges beyond UI presentation.
- No redesign of the canvas or block palette beyond the Inspector panel.

---

## 4. Users & Use Cases

### Primary Users
- Mobile and tablet users building strategies on touch devices.
- Desktop users who prefer a focused editing panel over inline node inputs.

### Key Use Cases
- Tap a block to edit its parameters in a spacious panel.
- Quickly set common indicator periods with one tap.
- Switch between `close` and `prev_close` sources without typing.
- See immediate feedback when a value is invalid or missing.

---

## 5. Requirements

### 5.1 Inspector Panel Behavior
- The Inspector panel opens when a block is tapped/selected.
- The panel shows only the parameters for the selected block.
- If a block has no parameters, show a simple “No parameters” state.
- Closing the panel leaves the block selected but returns focus to the canvas.

### 5.2 Inputs & Presets
- Numeric inputs use large, touch-friendly fields with clear labels.
- Period parameters show preset buttons: 14, 20, 50, 200.
- Threshold inputs (e.g., RSI levels, percentages) remain editable as direct inputs.
- Source parameters show quick-swap buttons for `close` and `prev_close` (with current selection highlighted).

### 5.3 Validation & Feedback
- Inline validation shows on the Inspector panel below the field.
- Empty or out-of-range values are flagged immediately.
- Validation messages are plain language and match existing validation rules.

### 5.4 Visual Layout
- Nodes display parameters in a minimal, read-only style or omit them entirely if they were previously inline.
- Inspector panel uses the existing panel placement (desktop sidebar or mobile drawer) to avoid new layout complexity.

---

## 6. UX Notes

- Keep the panel layout simple: single-column, readable spacing, large tap targets.
- Use existing input components and styles.
- Avoid introducing new modal flows; this is a panel-only interaction.
- Maintain a clear separation of viewing (node) vs editing (panel).

---

## 7. Data & API

- Frontend-only change.
- No new API calls or data formats.
- Strategy JSON stays unchanged.

---

## 8. Acceptance Criteria

- Tapping a block opens the Inspector panel with its parameters.
- Period fields provide 14/20/50/200 preset buttons that update the value.
- Source fields provide `close` and `prev_close` quick-swap buttons.
- Invalid or empty values show inline validation messages in the panel.
- Node UI remains visually clean with no cramped inline editing controls.
- Desktop and mobile layouts remain responsive and use existing panel placement.

---

## 9. Rollout Plan

1. Implement Inspector panel UI changes in the canvas editor.
2. QA on mobile and desktop to confirm usability and validation behavior.
3. Ship without backend changes.

---

## 10. Risks & Mitigations

- **Risk:** Users miss inline controls on nodes.
  - **Mitigation:** Keep block selection obvious and open the Inspector on tap by default.
- **Risk:** Validation feels noisy.
  - **Mitigation:** Use existing validation rules and concise messages; avoid multiple stacked alerts.

---

## 11. Open Questions

- Should the Inspector auto-focus the first input on open for faster edits?
- Should the panel persist between block selections or collapse on canvas tap?

---

**End of PRD**
