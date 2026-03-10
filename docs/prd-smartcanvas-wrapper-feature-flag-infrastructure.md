# PRD: SmartCanvas Wrapper & Feature Flag Infrastructure

## 1. Summary
Introduce a new `SmartCanvas` component as the single canvas entry point. `SmartCanvas` wraps the existing `StrategyCanvas` and adds PostHog feature-flag checks for major canvas feature areas, while preserving today’s behavior by default when all flags are off.

## 2. Problem Statement
We need a safe way to layer future canvas capabilities without repeatedly editing core `StrategyCanvas` behavior. Without a wrapper + flag boundary, new work increases regression risk for critical editor behaviors.

## 3. Goals
- Add `SmartCanvas` as the only component used by routes/pages that render the strategy canvas.
- Keep all current canvas behavior identical when all new flags are disabled.
- Centralize PostHog feature-flag reads for major canvas feature areas in one simple place.

## 4. Non-Goals
- Rebuilding or redesigning `StrategyCanvas` internals.
- Turning on any new end-user behavior by default.

## 5. Target Users & User Stories
### 5.1 Target Users
- Internal frontend developers shipping new canvas functionality.
- Existing strategy builders using the canvas editor.

### 5.2 User Stories
- As a developer, I want a SmartCanvas wrapper, so that I can ship incremental features behind flags without risky rewrites.
- As a strategy builder, I want existing canvas behavior unchanged, so that my current workflow remains stable.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Create `SmartCanvas` wrapper component around existing `StrategyCanvas`.
- Replace existing canvas entry-point usage with `SmartCanvas`.
- Read PostHog flags for major feature areas (e.g., history, autosave UX, copy/paste, minimap, layout helpers, keyboard shortcuts).

### 6.2 Out of Scope
- Creating new canvas feature implementations.
- Backend API/schema changes for this wrapper.

### 6.3 Functional Requirements
- `SmartCanvas` must pass through the same props used by `StrategyCanvas` today.
- `SmartCanvas` must fetch/evaluate feature flags via existing PostHog client SDK integration.
- With all relevant flags disabled, user-visible canvas behavior must match current implementation for undo/redo, autosave, copy/paste, minimap, auto-layout, and keyboard shortcuts.
- Flag access must fail safely (e.g., PostHog unavailable => treat flags as disabled).
- Keep implementation minimal: no new global state/store unless already required by existing patterns.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens a strategy in the canvas editor.
2. App renders `SmartCanvas` instead of rendering `StrategyCanvas` directly.
3. `SmartCanvas` evaluates PostHog flags and renders `StrategyCanvas` with parity defaults.
4. User interacts with canvas exactly as before when flags are off.

### 7.2 States
- Loading: Canvas page loading state remains unchanged.
- Empty: Empty strategy canvas state remains unchanged.
- Error: If flag client is unavailable, continue with all flags treated as off.
- Success: Canvas renders and behaves as expected with wrapper in place.

### 7.3 Design Notes
- No visual redesign required for this feature.
- No copy changes required.
- Do not add new controls or settings in this PRD scope.

## 8. Data Requirements
### 8.1 Data Model
- `canvas_flag_history` — boolean — enables/disables future history-area enhancements.
- `canvas_flag_autosave` — boolean — enables/disables future autosave-area enhancements.
- `canvas_flag_copy_paste` — boolean — enables/disables future copy/paste-area enhancements.
- `canvas_flag_minimap` — boolean — enables/disables future minimap-area enhancements.
- `canvas_flag_auto_layout` — boolean — enables/disables future layout-area enhancements.
- `canvas_flag_shortcuts` — boolean — enables/disables future keyboard-shortcut-area enhancements.

### 8.2 Calculations / Definitions (if applicable)
- Parity mode: all SmartCanvas feature flags evaluate to disabled, yielding the same behavior and outputs as current StrategyCanvas entry-point behavior.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new backend endpoints.
- Existing PostHog client SDK usage in frontend remains the source for flag checks.

### 9.2 Validation & Error Handling
- If PostHog SDK is not initialized, returns an error, or flags are unavailable, default all SmartCanvas flags to disabled.
- Do not block canvas rendering due to flag-read failures.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add `SmartCanvas` in canvas component area and keep it thin (wrapper-only).
- Replace direct `StrategyCanvas` imports/usages at entry points with `SmartCanvas`.
- Reuse existing PostHog helper/hooks where available; avoid creating redundant abstraction layers.

### 10.2 Backend
- No backend implementation required.

## 11. Rollout Plan
- Phase 1: Ship wrapper with all flags default-off and parity verification.
- Phase 2: Use wrapper for future feature-gated canvas enhancements.

## 12. Acceptance Criteria
- [ ] `SmartCanvas` replaces `StrategyCanvas` as the canvas entry point.
- [ ] Undo/redo, autosave, copy/paste, minimap, auto-layout, and keyboard shortcuts work identically with all flags off.
- [ ] PostHog feature flags are checked in `SmartCanvas` for each major feature area.
- [ ] Flag-read failures safely fall back to all-disabled behavior.

## 13. Tracking Metrics (Optional)
- `smartcanvas_rendered` — trend should match prior canvas page render volume.
- `smartcanvas_flag_fallback_used` — should remain low; investigate spikes.

## 14. Dependencies (Optional)
- Existing frontend PostHog SDK integration.
- Existing StrategyCanvas component and current canvas feature modules.

## 15. Risks & Mitigations (Optional)
- Risk: Wrapper introduces subtle regression even with flags disabled.  
  Mitigation: Run focused parity regression checklist on all core canvas behaviors.
- Risk: Flag naming drift between code and PostHog project.  
  Mitigation: Keep names centralized in one small map/constants file.

## 16. Open Questions
- Should SmartCanvas emit a lightweight internal analytics event for parity/fallback diagnostics, or rely only on existing events?
- Which exact PostHog flag keys should be standardized for long-term canvas feature-group ownership?
