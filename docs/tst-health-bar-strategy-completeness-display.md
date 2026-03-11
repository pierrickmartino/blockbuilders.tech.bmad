# TST: Health Bar - Strategy Completeness Display

## 1. Feature Flag & Rendering
- [ ] With `canvas_flag_health_bar` **enabled**, Health Bar renders above React Flow canvas.
- [ ] With `canvas_flag_health_bar` **disabled**, Health Bar does not render.
- [ ] Health Bar shows exactly three segments: Entry, Exit, Risk.

## 2. Segment State Rendering
- [ ] Entry segment shows **complete** state as green check icon.
- [ ] Entry segment shows **incomplete** state as red X icon with coaching text.
- [ ] Entry segment shows **warning** state as amber exclamation icon with advisory text.
- [ ] Exit segment supports complete/incomplete/warning visuals and text behavior.
- [ ] Risk segment supports complete/incomplete/warning visuals and text behavior.
- [ ] Segment colors/icons meet contrast/readability expectations in light and dark themes.

- [ ] Entry shows **incomplete** when no `entry_signal` exists.
- [ ] Entry shows **warning** when `entry_signal` exists but required input path is disconnected/invalid.
- [ ] Exit shows **incomplete** when no exit path exists (`exit_signal`, `time_exit`, `trailing_stop`, `stop_loss`, `take_profit`, `max_drawdown`).
- [ ] Exit shows **warning** when an exit path exists but is disconnected/misconfigured.
- [ ] Risk shows **incomplete** when no risk control exists (`position_size`, `stop_loss`, `take_profit`, `max_drawdown`).
- [ ] Risk shows **warning** when risk control exists but is disconnected/misconfigured.

## 3. Re-evaluation Behavior
- [ ] Adding a block triggers Health Bar state re-evaluation.
- [ ] Removing a block triggers Health Bar state re-evaluation.
- [ ] Adding a connection triggers Health Bar state re-evaluation.
- [ ] Removing a connection triggers Health Bar state re-evaluation.
- [ ] Re-evaluation completes within 200ms of canvas change.
- [ ] Health Bar output matches validation endpoint rule semantics for equivalent canvas states.

## 4. Animation
- [ ] Segment state transitions animate with 200ms ease timing.
- [ ] No jarring layout shift occurs during state transitions.

## 5. Minimize / Expand + Persistence
- [ ] Clicking minimize collapses Health Bar to icons-only view.
- [ ] Expanding restores coaching/advisory text.
- [ ] Collapsed/expanded preference is saved to localStorage.
- [ ] Reloading canvas restores previous collapse state from localStorage.

## 6. Robustness & Edge Cases
- [ ] Empty canvas displays sensible incomplete guidance without errors.
- [ ] Rapid add/remove edits do not freeze or visibly lag canvas interactions.
- [ ] If Health Bar evaluation errors internally, canvas remains usable and Health Bar fails safely.

## 7. Regression Checks
- [ ] Existing validation endpoint behavior remains unchanged.
- [ ] Existing Visual Strategy Validation Feedback behavior remains unchanged.
- [ ] SmartCanvas feature-flag fallback behavior remains unchanged.
