# Test Checklist – Block Library Bottom Sheet with Search

> Source PRD: `prd-block-library-bottom-sheet-search.md`

## 1. Bottom Sheet Trigger and Layout

- [ ] The floating "+" button is replaced by a bottom sheet trigger
- [ ] Tapping the trigger opens the bottom sheet with a smooth slide-up animation
- [ ] The bottom sheet does not block canvas interactions when it is closed
- [ ] The sheet height is reasonable (approximately 70-80% of viewport) with internal scrolling
- [ ] The sheet can be dismissed by swiping down
- [ ] The sheet can be dismissed by tapping outside the sheet area
- [ ] When dismissed, the sheet slides down smoothly
- [ ] The sheet trigger is accessible on both mobile and desktop

## 2. Search Functionality

- [ ] A search field is present at the top of the bottom sheet
- [ ] Typing a block name (e.g., "EMA") filters results to matching blocks
- [ ] Typing a keyword (e.g., "crossover") filters results to matching blocks
- [ ] Typing "stop loss" returns relevant risk management blocks
- [ ] Search filters results across all categories in-place (no navigation to a new page)
- [ ] Search is case-insensitive
- [ ] Clearing the search field restores the full block list
- [ ] Searching for a term with no matches shows an empty state or "no results" message
- [ ] Partial matches work (e.g., typing "bol" matches "Bollinger Bands")

## 3. Categories

- [ ] Blocks are organized under category headings: Indicators, Logic, Risk, Signals, Data
- [ ] Each category contains the correct blocks based on existing block definitions
- [ ] Categories are visually distinct with clear headings
- [ ] All categories are visible by scrolling within the sheet
- [ ] Category sections collapse or filter correctly when search is active

## 4. Recents and Favorites

- [ ] Recently used blocks appear at the top of the sheet in a horizontal strip
- [ ] The recents list updates after placing a block on the canvas
- [ ] Recents are stored client-side only (localStorage or frontend store)
- [ ] Recents persist across page reloads within the same browser
- [ ] Favorite toggle (star icon) is available on block cards (if implemented)
- [ ] Toggling a favorite persists the preference in client-side storage
- [ ] Favorited blocks appear in the favorites/recents area
- [ ] Recents/favorites do not make any API calls or backend requests

## 5. Block Placement -- Drag

- [ ] Blocks can be dragged from the bottom sheet onto the canvas
- [ ] Dragging reuses existing drag-to-canvas behavior
- [ ] The block is placed at the drop position on the canvas
- [ ] The bottom sheet closes or remains open appropriately after a drag placement
- [ ] Dragging a block that is dropped outside the canvas does not create a node

## 6. Block Placement -- Tap to Auto-Place

- [ ] Tapping a block in the sheet places it on the canvas
- [ ] If a cursor/focus position is known on the canvas, the block is placed there
- [ ] If no cursor position is known, the block is placed at the center of the viewport
- [ ] The placed block is a valid, fully functional canvas node
- [ ] Auto-placed blocks do not overlap existing nodes if possible

## 7. Responsive Behavior

- [ ] The bottom sheet works correctly on mobile phone screen sizes
- [ ] The bottom sheet works correctly on tablet screen sizes
- [ ] The bottom sheet works correctly on desktop screen sizes
- [ ] Touch interactions (swipe dismiss, tap to place, drag) work on touch devices
- [ ] Mouse interactions (click dismiss, click to place, drag) work on desktop

## 8. Edge Cases and Negative Tests

- [ ] Opening the sheet with no blocks defined shows an appropriate empty state
- [ ] Rapidly opening and closing the sheet does not cause visual glitches or stuck state
- [ ] Opening the sheet while another modal or panel is open does not cause conflicts
- [ ] The sheet does not prevent interaction with the canvas when closed
- [ ] Block definitions with missing or incomplete metadata still render without errors
- [ ] The sheet performs well with a large number of block types (no lag on open or search)

## 9. No Backend Impact

- [ ] No new API endpoints or backend changes are required
- [ ] No changes to block metadata schema on the backend
- [ ] Recents and favorites are stored entirely client-side
- [ ] Existing block definitions are used as-is without modification
