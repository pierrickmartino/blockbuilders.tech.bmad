# Test Checklist – Health Bar - Strategy Completeness Display

> Source PRD: `prd-health-bar-strategy-completeness-display.md`

## 1. Feature Flag Gating
- [ ] With `canvas_flag_health_bar=false`, no Health Bar is rendered anywhere in the strategy editor.
- [ ] With `canvas_flag_health_bar=true`, the Health Bar renders above the React Flow canvas.

## 2. Base Rendering
- [ ] Health Bar renders exactly three segments: Entry, Exit, Risk.
- [ ] Segment labels are visible in expanded mode.
- [ ] Each segment always shows one state icon (check, X, or exclamation).

## 3. Segment States and Copy
- [ ] `complete` state renders a green check icon and success text in expanded mode.
- [ ] `incomplete` state renders a red X icon and coaching text in expanded mode.
- [ ] `warning` state renders an amber exclamation icon and advisory text in expanded mode.
- [ ] State is never represented by color alone (icon/text present).

## 4. Validation Rule Parity
- [ ] Entry segment state matches validation-required entry completeness for the same strategy graph.
- [ ] Exit segment state matches validation-required exit completeness for the same strategy graph.
- [ ] Risk advisory warning behavior follows PRD definition for missing risk-management blocks.
- [ ] Fixture strategies that pass/fail backend validation produce matching Health Bar Entry/Exit results.

## 5. Re-evaluation Triggers
- [ ] Adding a block triggers Health Bar re-evaluation.
- [ ] Removing a block triggers Health Bar re-evaluation.
- [ ] Adding a connection triggers Health Bar re-evaluation.
- [ ] Removing a connection triggers Health Bar re-evaluation.
- [ ] Updating relevant block params triggers Health Bar re-evaluation when completeness can change.

## 6. Performance and Motion
- [ ] Health Bar re-evaluates within 200ms after each relevant canvas state change (p95 target).
- [ ] Segment state transitions animate with 200ms ease.
- [ ] Rapid consecutive edits do not freeze or visibly lag the canvas editor.

## 7. Collapse / Expand Behavior
- [ ] Clicking minimize collapses Health Bar to icon-only mode.
- [ ] In collapsed mode, coaching/advisory text is hidden.
- [ ] Clicking the control again expands to icon + text mode.
- [ ] Minimize control remains visible in both collapsed and expanded modes.

## 8. localStorage Persistence
- [ ] Collapse state is written to localStorage after user toggles it.
- [ ] On page reload, Health Bar reads localStorage and restores prior collapsed/expanded state.
- [ ] Invalid or missing localStorage value falls back safely to default expanded mode.

## 9. Empty / Loading / Error States
- [ ] Empty strategy state shows expected default statuses without crashing.
- [ ] Initial loading state does not cause layout shift/jitter beyond normal tolerance.
- [ ] If client-side evaluation throws, Health Bar degrades gracefully and canvas remains usable.

## 10. Regression Safety
- [ ] Existing canvas behaviors (editing, save/autosave, validate, run backtest) continue to work with Health Bar enabled.
- [ ] No new backend endpoints or schema changes are required.
- [ ] Disabling the feature flag fully removes Health Bar behavior without side effects.
