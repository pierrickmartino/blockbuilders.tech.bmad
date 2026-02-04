# Test Checklist – Canvas Minimap with Section Shortcuts

> Source PRD: `prd-canvas-minimap-section-shortcuts.md`

## 1. Minimap Rendering

- [ ] Minimap overlay renders on the strategy canvas when nodes exist
- [ ] Minimap is hidden when there are no nodes
- [ ] Minimap does not block core canvas interactions (pan/select/drag)

## 2. Viewport Indicator

- [ ] Viewport rectangle matches the visible canvas area
- [ ] Viewport rectangle updates while panning
- [ ] Viewport rectangle updates while zooming in/out

## 3. Section Shortcut Buttons

- [ ] “Go to Entry” pans/zooms to the first entry section block cluster
- [ ] “Go to Exit” pans/zooms to the first exit section block cluster
- [ ] “Go to Risk” pans/zooms to the first risk section block cluster
- [ ] Buttons are disabled if no matching section exists

## 4. Mobile Usability

- [ ] Minimap and buttons remain visible on mobile-sized screens
- [ ] Controls do not overlap the bottom action bar
- [ ] Tap targets meet mobile-friendly size (≥44px height)

## 5. Visual Consistency

- [ ] Overlay styling matches existing canvas UI (colors, borders, shadows)
- [ ] Button styles match existing button patterns

## 6. Edge Cases

- [ ] Large strategies still render the minimap without noticeable lag
- [ ] Rapid pan/zoom does not cause minimap flicker
- [ ] Resizing the window keeps the minimap aligned to the viewport

## 7. No Backend Impact

- [ ] No API calls are added for the minimap feature
- [ ] No changes to strategy JSON or backend schemas
