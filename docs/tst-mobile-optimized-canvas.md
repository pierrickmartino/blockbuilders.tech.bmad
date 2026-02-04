# Test Checklist – Mobile-Optimized Canvas

> Source PRD: `prd-mobile-optimized-canvas.md`

## 1. Mobile Mode Trigger

- [ ] Mobile mode activates automatically on small screens (at or below Tailwind `sm` breakpoint)
- [ ] Mobile mode does not activate on desktop-sized viewports
- [ ] Manual toggle in settings enables mobile mode on any screen size
- [ ] Manual toggle in settings disables mobile mode on small screens
- [ ] Resizing browser window from desktop to mobile triggers mobile mode automatically
- [ ] Resizing browser window from mobile to desktop deactivates mobile mode automatically

## 2. Touch-Friendly Controls

- [ ] Block headers have larger tap targets in mobile mode (easy to tap without precision)
- [ ] Connection ports have larger tap targets in mobile mode
- [ ] Selection handles have larger tap targets in mobile mode
- [ ] Canvas toolbar buttons have larger tap targets in mobile mode
- [ ] Tapping a block provides clear visual feedback (selection highlight or animation)
- [ ] Tap targets do not overlap or interfere with each other on small screens

## 3. Simplified Palette

- [ ] Palette displays as a single-column, scrollable layout on mobile
- [ ] Palette groups blocks by category with collapsible sections
- [ ] Collapsible sections expand and collapse correctly on tap
- [ ] Fewer items are shown at once to reduce visual clutter
- [ ] All block types are still accessible via the simplified palette
- [ ] Palette does not consume excessive screen space when open

## 4. Gesture-Based Connections (Tap-to-Connect)

- [ ] Tapping a source port enters "connect mode" with clear visual indication
- [ ] While in connect mode, tapping a target port completes the connection
- [ ] Completed connection renders correctly between the two blocks
- [ ] Tapping outside both ports while in connect mode cancels the connection
- [ ] Cancelling connect mode removes visual connection-in-progress state
- [ ] Multiple sequential connections can be created via tap-to-connect
- [ ] Invalid connections (incompatible port types) are rejected with feedback
- [ ] Desktop drag-to-connect behavior is preserved and unchanged

## 5. Mobile-Optimized Editing

- [ ] Properties panel is reachable and readable on phone-sized screens
- [ ] Properties panel does not overlap the canvas or other panels on mobile
- [ ] Properties panel uses drawer or full-height layout (not floating overlay that clips)
- [ ] Editing block parameters (inputs, dropdowns) works correctly on touch devices
- [ ] Closing the properties panel returns focus to the canvas

## 6. Block Manipulation on Mobile

- [ ] Users can add blocks from the palette to the canvas on mobile
- [ ] Users can select blocks reliably with touch (single tap)
- [ ] Users can move blocks by touch-dragging on mobile
- [ ] Users can delete blocks on mobile
- [ ] Multi-select (if applicable) works on mobile or is gracefully disabled

## 7. Desktop Regression

- [ ] All existing desktop canvas interactions work unchanged when mobile mode is off
- [ ] Drag-to-connect works normally on desktop
- [ ] Block manipulation (add, move, delete, select) works normally on desktop
- [ ] Properties panel behaves normally on desktop
- [ ] Palette displays in its existing format on desktop

## 8. Strategy Integrity

- [ ] Strategy JSON produced in mobile mode is identical in structure to desktop mode
- [ ] Strategies created on mobile can be opened and edited on desktop
- [ ] Strategies created on desktop can be opened and edited on mobile
- [ ] No API or database changes are required

## 9. Dependencies

- [ ] No new JavaScript, CSS, or gesture libraries are introduced
- [ ] No new backend endpoints or schema changes are required

## 10. Edge Cases

- [ ] Canvas with many blocks (20+) remains usable on mobile
- [ ] Very small screens (320px width) still render the canvas and palette
- [ ] Rotating device between portrait and landscape re-renders correctly
- [ ] Palette open + properties panel open simultaneously does not break layout
- [ ] Rapidly tapping multiple ports does not produce duplicate or broken connections

## 11. Analytics (Optional)

- [ ] "Mobile mode enabled" event is tracked when mobile mode activates
- [ ] Connection completion success rate is tracked in mobile mode
