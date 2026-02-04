# PRD: Canvas Minimap with Section Shortcuts

## 1. Summary
Add a small minimap overlay to the strategy canvas that shows the full canvas with a viewport indicator, plus quick-jump buttons for Entry, Exit, and Risk sections. This prevents users from getting lost on large strategies, especially on mobile.

## 2. Problem Statement
As strategies grow beyond one screen, users can lose their place while panning and zooming on mobile, slowing iteration and increasing frustration.

## 3. Goals
- Provide orientation via a minimap overlay with a clear viewport indicator.
- Offer one-tap shortcuts to common strategy sections (Entry, Exit, Risk).
- Keep the implementation lightweight and frontend-only.

## 4. Non-Goals
- No backend or data model changes.
- No new section classification system beyond existing block types.

## 5. Target Users & User Stories
### 5.1 Target Users
- Mobile-first strategy builders.
- Power users with large, multi-section strategies.

### 5.2 User Stories
- As a mobile user, I want a minimap of the canvas, so I can stay oriented while panning.
- As a strategy builder, I want quick-jump buttons to key sections, so I can navigate faster.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Minimap overlay showing full canvas bounds and current viewport rectangle.
- Quick-jump buttons for Entry, Exit, and Risk sections.
- Pan/zoom to the target section on button press.

### 6.2 Out of Scope
- Custom user-defined section bookmarks.
- Persisted minimap preferences.

### 6.3 Functional Requirements
- The minimap renders in a small overlay that does not block core canvas interaction.
- The viewport indicator updates as the user pans/zooms.
- “Go to Entry” pans/zooms to the first entry signal block cluster.
- “Go to Exit” pans/zooms to the first exit signal or exit rule cluster.
- “Go to Risk” pans/zooms to the first risk block cluster.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens a strategy → minimap is visible → user pans/zooms and sees viewport update → user taps a shortcut button to jump to a section.

### 7.2 States
- Loading: minimap hidden until canvas bounds are available.
- Empty: minimap hidden if no nodes exist.
- Error: minimap safely hides if bounds cannot be computed.
- Success: minimap renders with viewport indicator and buttons.

### 7.3 Design Notes
- Small overlay placed in a non-intrusive corner (top-right by default).
- Buttons are compact, stacked or inline, with clear labels.
- Respect mobile tap targets and avoid overlapping the bottom action bar.

## 8. Data Requirements
### 8.1 Data Model
- Canvas bounds — number tuple — derived from existing node positions.
- Viewport transform — number tuple — derived from React Flow state.

### 8.2 Calculations / Definitions (if applicable)
- Viewport rectangle: derived from canvas transform + container size mapped into minimap scale.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- None.

### 9.2 Validation & Error Handling
- If no matching section nodes exist, the corresponding button is disabled.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Use existing canvas position data and React Flow transform state to render the minimap.
- Compute the first node cluster per section using existing block types (entry_signal, exit_signal/exit rules, risk blocks).
- Keep styling minimal and use existing tokens.

### 10.2 Backend
- None.

## 11. Rollout Plan
- Add behind a small, UI-only toggle if needed for testing.
- Default on for mobile once stable.

## 12. Acceptance Criteria
- [ ] Minimap overlay renders with a correct viewport indicator on the strategy canvas.
- [ ] The viewport indicator updates as the user pans and zooms.
- [ ] “Go to Entry,” “Go to Exit,” and “Go to Risk” buttons pan/zoom to the correct sections or disable if missing.
- [ ] No backend changes are required.

## 13. Tracking Metrics (Optional)
- Canvas navigation time (proxy: time between section jumps).
- Shortcut usage rate on mobile.

## 14. Dependencies (Optional)
- React Flow canvas state and existing block type metadata.

## 15. Risks & Mitigations (Optional)
- Risk: Minimap obstructs other controls on small screens.  
  Mitigation: Use a small overlay and avoid the bottom action bar area.

## 16. Open Questions
- Should the minimap be collapsible on very small screens?
- Which exact block types define “Exit” and “Risk” clusters?
