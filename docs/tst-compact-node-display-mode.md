# Test Checklist – Compact Node Display Mode

> Source PRD: `prd-compact-node-display-mode.md`

## 1. Default Compact Mode

- [ ] On first load (no saved preference), all nodes render in compact one-line summary mode
- [ ] Compact summary for an EMA node displays something like `EMA (24, prev_close)`
- [ ] Compact summary for an RSI node displays something like `RSI (14)`
- [ ] Compact summary for a comparison node displays something like `Compare: > 5%`
- [ ] Compact summary for multi-output indicators (e.g., MACD) displays a minimal, consistent one-line format
- [ ] Compact nodes are visibly smaller than expanded nodes
- [ ] Compact mode makes the mobile canvas noticeably less cluttered

## 2. Expand/Collapse Individual Nodes

- [ ] Tapping/clicking a compact node expands it to show full details
- [ ] The expanded view matches the current full-detail node content
- [ ] Tapping/clicking an expanded node collapses it back to compact mode
- [ ] Expanded/collapsed state is per-node (expanding one node does not affect others)
- [ ] Expanded/collapsed state is local UI state and does not persist after page reload
- [ ] Expanded/collapsed state is not saved to the backend or strategy JSON

## 3. Inspector Panel

- [ ] The Inspector panel always shows full parameter details regardless of node compact/expanded state
- [ ] Selecting a compact node shows its full parameters in the Inspector panel
- [ ] Selecting an expanded node shows the same full parameters in the Inspector panel
- [ ] Changing parameters in the Inspector panel updates the compact summary if the node is in compact mode

## 4. Settings Toggle

- [ ] A "Compact Node Display" toggle is available in the Settings page
- [ ] The toggle offers Compact and Expanded options
- [ ] The default selection is Compact
- [ ] Switching to Expanded mode causes all nodes on the canvas to render in full-detail mode
- [ ] Switching back to Compact mode causes all nodes to render as one-line summaries
- [ ] The mode toggle applies instantly without requiring a page reload
- [ ] The preference persists across page reloads (stored in user display preferences)
- [ ] The preference persists across browser sessions

## 5. Summary Generation

- [ ] Summaries are deterministic (same block type + params always produce the same summary text)
- [ ] Summaries use existing node metadata and params (no new data sources)
- [ ] All block types have a valid compact summary (no missing or broken summaries)
- [ ] Summaries remain readable and do not overflow or get truncated in unexpected ways

## 6. Responsive and Mobile Behavior

- [ ] Compact mode renders correctly on mobile screen sizes
- [ ] Compact mode renders correctly on tablet screen sizes
- [ ] Compact mode renders correctly on desktop screen sizes
- [ ] Node tap/click targets remain usable at all screen sizes in compact mode
- [ ] Connection handles/ports remain accessible and functional on compact nodes

## 7. Edge Cases and Negative Tests

- [ ] Nodes with no parameters display a valid compact summary (e.g., just the type name)
- [ ] Nodes with many parameters still produce a concise one-line summary
- [ ] Switching the global mode while some nodes are individually expanded resets them to the new global default
- [ ] Adding a new node to the canvas respects the current display mode preference
- [ ] Undo/redo operations do not break the compact/expanded rendering state

## 8. No Backend Impact

- [ ] No changes to strategy JSON serialization or format
- [ ] No new API endpoints or backend changes
- [ ] No changes to strategy validation or execution logic
- [ ] Display preference is stored using existing frontend user settings storage only
