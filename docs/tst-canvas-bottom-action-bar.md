# Test Checklist – Canvas Bottom Action Bar (Mobile Tools)

> Source PRD: `prd-canvas-bottom-action-bar.md`

## 1. Mobile Breakpoint Trigger

- [ ] On mobile-sized screens (at or below the `sm` Tailwind breakpoint), the left vertical tool stack is hidden
- [ ] On mobile-sized screens, the bottom action bar is displayed instead
- [ ] On desktop and larger screens, the left vertical tool stack remains visible and unchanged
- [ ] On desktop and larger screens, the bottom action bar is not shown
- [ ] Resizing the browser window across the breakpoint correctly toggles between the two layouts

## 2. Tool Set and Layout

- [ ] The bottom action bar is fixed to the bottom of the screen
- [ ] The bar is horizontal with evenly spaced buttons
- [ ] Tools appear in the correct order (left to right): Pan/Select, Zoom In, Zoom Out, Fit to Screen, Undo, Redo
- [ ] Buttons use the same icons as the existing vertical toolbar
- [ ] No extra controls or menus are present beyond the six core actions

## 3. Tool Actions

- [ ] Pan/Select button toggles between pan and select modes (same behavior as existing tool)
- [ ] Zoom In button zooms the canvas in
- [ ] Zoom Out button zooms the canvas out
- [ ] Fit to Screen button fits all nodes within the visible viewport
- [ ] Undo button undoes the last canvas change
- [ ] Redo button redoes the last undone change
- [ ] All actions behave identically to their existing toolbar counterparts

## 4. Button States

- [ ] Undo button is disabled when there is no undo history
- [ ] Redo button is disabled when there are no future states
- [ ] Pan/Select button reflects the current active mode (visual indicator)
- [ ] Disabled buttons are visually distinct (e.g., reduced opacity) and not interactive
- [ ] Button states update immediately when the underlying state changes

## 5. Touch Usability

- [ ] All button tap targets meet minimum mobile-friendly size (at least 44px height)
- [ ] Buttons are large enough to tap without accidental mis-taps on adjacent buttons
- [ ] Buttons respond to touch with appropriate visual feedback (hover/active states)
- [ ] Rapid tapping on zoom buttons works correctly without missed inputs
- [ ] Touch interactions on the bar do not accidentally trigger canvas interactions

## 6. Canvas Viewport and Overlap

- [ ] The bottom action bar does not overlap canvas nodes or connections
- [ ] The canvas viewport has appropriate bottom padding to account for the bar
- [ ] Scrolling/panning the canvas still works with the bar visible
- [ ] Nodes near the bottom of the canvas are still fully visible and interactable
- [ ] The bar does not obscure the block library bottom sheet (if both are active)

## 7. Visual Consistency

- [ ] Button styling is consistent with existing toolbar buttons (colors, borders, hover states)
- [ ] Active/hover states match the design language of the rest of the canvas UI
- [ ] The bar background is consistent with the app theme (light and dark mode)
- [ ] No new icons or visual assets are introduced; existing icons are reused

## 8. Desktop Behavior Unchanged

- [ ] On desktop, the left vertical tool stack renders as before
- [ ] On desktop, no bottom action bar is visible
- [ ] Desktop keyboard shortcuts continue to work as before
- [ ] Desktop tool behavior is completely unaffected by this change

## 9. Edge Cases and Negative Tests

- [ ] Rotating a mobile device between portrait and landscape correctly repositions the bar
- [ ] The bar remains visible and functional after navigating away and returning to the canvas
- [ ] Opening a modal or side panel on mobile does not cause the bar to malfunction
- [ ] The bar renders correctly on common mobile device sizes (iPhone SE, iPhone 14, Pixel, Galaxy)
- [ ] The bar does not flicker or jump during canvas zoom/pan operations

## 10. No Backend Impact

- [ ] No API calls are made related to the bottom action bar
- [ ] No changes to the strategy JSON, database schema, or backend endpoints
- [ ] No changes to canvas state format or serialization
- [ ] The feature is entirely a frontend layout change
