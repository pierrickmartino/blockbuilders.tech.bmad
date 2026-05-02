# PRD: Compact Node Display Mode

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

## 1. Summary

Introduce a compact node display mode that defaults each canvas block to a one-line summary (e.g., `EMA (24, prev_close)`, `RSI (14)`, `Compare: > 5%`). Users can tap/click a node to expand full details or use the Inspector panel. A settings toggle lets users choose compact vs expanded as a persistent preference. This is a frontend-only rendering change with no strategy JSON changes.

## 2. Goals

- Reduce visual clutter on small screens so complex strategies stay readable.
- Make mobile canvas navigation faster without hiding parameters (Inspector remains full detail).
- Keep implementation minimal and front-end-only.

## 3. Non-Goals

- No changes to strategy JSON or backend APIs.
- No new block types, validation rules, or data schema changes.
- No redesign of the Inspector panel or block palette.

## 4. User Stories

- As a mobile user, I want nodes to take up less space so I can see more of my strategy at once.
- As a user, I want to expand a node quickly when I need full details.
- As a user, I want a setting to choose compact or expanded mode as my default.

## 5. UX & Interaction

### 5.1 Default Behavior

- **Default:** Compact mode enabled for all users.
- Each node renders a **single-line summary** derived from its type and params.
- Example summaries:
  - `EMA (24, prev_close)`
  - `RSI (14)`
  - `Compare: > 5%`

### 5.2 Expand/Collapse

- Tap/click a node to expand it to the current full-detail view.
- Expanded state is **local UI state** and does not persist to the backend.
- Inspector panel always shows full parameters regardless of compact/expanded state.

### 5.3 Settings Toggle

- Add a **Compact Node Display** toggle in Settings.
- Options: **Compact** (default) and **Expanded**.
- Stored as a user display preference (front-end + existing user settings storage).

## 6. Functional Requirements

- Compact mode uses existing node metadata and params to render a concise summary.
- Expanded mode matches the current multi-line node content.
- Mode toggle applies instantly and updates all nodes on the canvas.
- No changes to strategy serialization, validation, or execution logic.

## 7. Technical Notes

- Frontend-only: React Flow node rendering changes + display preference wiring.
- Summary generation should be deterministic and minimal (no new dependencies).
- Keep logic small and localized to node rendering components.

## 8. Acceptance Criteria

- [ ] Nodes default to compact one-line summaries on first load.
- [ ] Tapping/clicking a node expands it to full details.
- [ ] Inspector panel always shows full parameter detail.
- [ ] Settings toggle switches between compact and expanded defaults.
- [ ] No strategy JSON changes and no backend changes.
- [ ] Mobile canvas is noticeably less cluttered with compact mode enabled.

## 9. Open Questions

- Exact summary formatting for multi-output indicators (e.g., MACD) — keep it minimal and consistent.
- Whether compact/expanded state should be per-node or global-only (default: per-node local state).
