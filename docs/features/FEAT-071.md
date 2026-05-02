# PRD: Responsive Charts (Mobile & Touch)

**Status:** Planned
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary

Make the **equity curve** and **drawdown chart** fully **responsive** and **touch-friendly**. The charts should resize cleanly on small screens and support **pinch-to-zoom** and **pan** for mobile users. Keep configuration minimal and reuse the existing charting library.

---

## 2. Goals

- Improve backtest result readability on small screens.
- Enable touch gestures (pinch-to-zoom, pan) for chart exploration.
- Keep implementation simple, lightweight, and consistent with current UI.

---

## 3. Non-Goals

- No new chart libraries or dependencies.
- No advanced chart overlays or indicators beyond existing data.
- No changes to backend APIs, schemas, or data formats.

---

## 4. User Stories

1. **Mobile user:** “I can zoom into a dense section of the equity curve with pinch gestures.”
2. **Analyst:** “I can pan across the chart timeline to inspect a specific period on my phone.”
3. **Casual user:** “The chart fits my screen without horizontal scrolling or clipped labels.”

---

## 5. Scope & Requirements

### 5.1. Responsiveness (Must Have)

- Charts auto-size to their container width and height (no hardcoded pixels).
- Layout adapts cleanly for mobile widths (single-column flow, no overflow).
- Axis labels/ticks reduce density on small screens for readability.

### 5.2. Touch Interactions (Must Have)

- Pinch-to-zoom on the x-axis (time) and y-axis (value).
- Drag-to-pan within the zoomed view.
- Tap tooltips remain easy to trigger on mobile.

### 5.3. Chart Coverage (Must Have)

- Apply to **Equity Curve** and **Drawdown Chart**.
- Keep styling consistent with the existing charts.

---

## 6. UX / Design Notes

- Favor subtle, minimal controls; avoid adding visible buttons unless strictly necessary.
- Prioritize readable labels over dense information on small screens.
- Reuse current color palette and typography.

---

## 7. Acceptance Criteria

- Equity curve and drawdown charts resize properly across common mobile breakpoints.
- Pinch-to-zoom and pan work on touch devices without jank.
- No new dependencies are introduced.
- No backend changes required.

---

## 8. Implementation Notes (Engineering)

- Use existing chart library configuration for responsiveness and gestures.
- Keep any helper logic local to the chart component.
- Add lightweight UI tests or manual QA checklist for mobile breakpoints.

---

## 9. QA Checklist

- iPhone-sized viewport: charts fit without horizontal scroll.
- Android-sized viewport: tooltips are reachable and readable.
- Desktop: mouse wheel/drag interactions still work (if supported).

---

**End of PRD**
