# Test Checklist – Responsive Charts (Mobile & Touch)

> Source PRD: `prd-responsive-charts-mobile.md`

## 1. Chart Responsiveness

- [ ] Equity curve chart auto-sizes to container width (no hardcoded pixel dimensions)
- [ ] Drawdown chart auto-sizes to container width (no hardcoded pixel dimensions)
- [ ] Charts resize correctly when browser window is resized on desktop
- [ ] Charts render without horizontal scrolling on iPhone-sized viewport (375px width)
- [ ] Charts render without horizontal scrolling on Android-sized viewport (360px width)
- [ ] Charts render without horizontal scrolling on tablet viewport (768px width)
- [ ] Layout flows to single-column on mobile widths without overflow
- [ ] Axis labels reduce density on small screens (fewer ticks displayed)
- [ ] Axis labels remain readable on small screens (no overlap or clipping)
- [ ] Charts maintain correct aspect ratio across breakpoints

## 2. Touch Interactions

- [ ] Pinch-to-zoom works on the x-axis (time) on a touch device
- [ ] Pinch-to-zoom works on the y-axis (value) on a touch device
- [ ] Drag-to-pan works within a zoomed view on a touch device
- [ ] Pinch-to-zoom and pan perform smoothly without visible jank or lag
- [ ] Tap tooltips trigger correctly on mobile (single tap shows data point info)
- [ ] Tooltip content is fully readable and not clipped on mobile screens
- [ ] Zooming in on a dense section of the equity curve reveals finer detail
- [ ] Panning across the chart timeline allows inspection of specific periods on mobile
- [ ] Double-tap or pinch-out resets zoom to default view (if supported by library)

## 3. Desktop Interactions (No Regression)

- [ ] Mouse wheel zoom still works on desktop (if previously supported)
- [ ] Mouse drag-to-pan still works on desktop (if previously supported)
- [ ] Hover tooltips still display correctly on desktop
- [ ] Chart rendering and behavior is unchanged on desktop viewports

## 4. Chart Coverage & Styling

- [ ] Responsive and touch behavior applies to the Equity Curve chart
- [ ] Responsive and touch behavior applies to the Drawdown Chart
- [ ] Chart styling (colors, fonts, line widths) is consistent with existing charts
- [ ] Chart color palette matches the existing design system

## 5. Dependencies & Backend

- [ ] No new JavaScript or CSS dependencies are introduced
- [ ] No backend API changes are required (charts use existing data)
- [ ] Existing chart library configuration is used for responsiveness and gestures

## 6. Edge Cases

- [ ] Charts render correctly with very few data points (e.g., 2-3 candles)
- [ ] Charts render correctly with very many data points (e.g., 10,000+ candles)
- [ ] Charts handle empty data gracefully (no crash, appropriate placeholder)
- [ ] Rapid pinch-zoom and pan gestures do not crash or freeze the chart
- [ ] Rotating device from portrait to landscape re-renders charts correctly
