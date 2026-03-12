# Test Checklist – Health Bar - Strategy Completeness Display

> Source PRD: `prd-health-bar-strategy-completeness-display.md`

## 1. Feature Flag Gating
- [x] With `canvas_flag_health_bar=false`, no Health Bar is rendered anywhere in the strategy editor.
- [x] With `canvas_flag_health_bar=true`, the Health Bar renders above the React Flow canvas.

## 2. Base Rendering
- [x] Health Bar renders exactly three segments: Entry, Exit, Risk.
- [x] Segment labels are visible in expanded mode.
- [x] Each segment always shows one state icon (check, X, or exclamation).

## 3. Segment States and Copy
- [x] `complete` state renders a green check icon and success text in expanded mode.
- [x] `incomplete` state renders a red X icon and coaching text in expanded mode.
- [x] `warning` state renders an amber exclamation icon and advisory text in expanded mode.
- [x] State is never represented by color alone (icon/text present).

## 4. Validation Rule Parity
- [x] Entry segment state matches validation-required entry completeness for the same strategy graph.
- [x] Exit segment state matches validation-required exit completeness for the same strategy graph.
- [x] Risk advisory warning behavior follows PRD definition for missing risk-management blocks.
- [x] Fixture strategies that pass/fail backend validation produce matching Health Bar Entry/Exit results.

## 5. Re-evaluation Triggers
- [x] Adding a block triggers Health Bar re-evaluation.
- [x] Removing a block triggers Health Bar re-evaluation.
- [x] Adding a connection triggers Health Bar re-evaluation.
- [x] Removing a connection triggers Health Bar re-evaluation.
- [x] Updating relevant block params triggers Health Bar re-evaluation when completeness can change.

## 6. Performance and Motion
- [x] Health Bar re-evaluates within 200ms after each relevant canvas state change (p95 target).
- [x] Segment state transitions animate with 200ms ease.
- [x] Rapid consecutive edits do not freeze or visibly lag the canvas editor.

## 7. Collapse / Expand Behavior
- [x] Clicking minimize collapses Health Bar to icon-only mode.
- [x] In collapsed mode, coaching/advisory text is hidden.
- [x] Clicking the control again expands to icon + text mode.
- [x] Minimize control remains visible in both collapsed and expanded modes.

## 8. localStorage Persistence
- [x] Collapse state is written to localStorage after user toggles it.
- [x] On page reload, Health Bar reads localStorage and restores prior collapsed/expanded state.
- [x] Invalid or missing localStorage value falls back safely to default expanded mode.

## 9. Empty / Loading / Error States
- [x] Empty strategy state shows expected default statuses without crashing.
- [ ] Initial loading state does not cause layout shift/jitter beyond normal tolerance.
- [ ] If client-side evaluation throws, Health Bar degrades gracefully and canvas remains usable.

## 10. Regression Safety
- [ ] Existing canvas behaviors (editing, save/autosave, validate, run backtest) continue to work with Health Bar enabled.
- [x] No new backend endpoints or schema changes are required.
- [x] Disabling the feature flag fully removes Health Bar behavior without side effects.
