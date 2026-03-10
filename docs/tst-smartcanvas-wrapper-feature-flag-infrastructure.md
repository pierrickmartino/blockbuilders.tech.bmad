# Test Checklist – SmartCanvas Wrapper & Feature Flag Infrastructure

> Source PRD: `prd-smartcanvas-wrapper-feature-flag-infrastructure.md`

## 1. Entry-Point Replacement
- [ ] All canvas entry routes/pages render `SmartCanvas` instead of direct `StrategyCanvas`.
- [ ] No remaining direct entry-point imports/usages of `StrategyCanvas` in page-level canvas containers.
- [ ] SmartCanvas passes required props through without missing required values.

## 2. Parity with All Flags Disabled
- [ ] Undo works exactly as before.
- [ ] Redo works exactly as before.
- [ ] Autosave behavior and status indicators remain unchanged.
- [ ] Copy/paste behavior remains unchanged (single and multi-select flows).
- [ ] Minimap rendering and interactions remain unchanged.
- [ ] Auto-layout behavior and output remain unchanged.
- [ ] Keyboard shortcuts behave exactly as before.

## 3. Feature Flag Evaluation
- [ ] SmartCanvas evaluates PostHog feature flags for each major canvas feature area.
- [ ] Flag values are read from the existing PostHog client SDK path (no ad-hoc duplicate client).
- [ ] Missing flag values are treated as disabled.

## 4. Failure Safety
- [ ] If PostHog client is unavailable, canvas still renders.
- [ ] If PostHog flag evaluation throws/fails, SmartCanvas falls back to disabled flags.
- [ ] No user-facing crash occurs due to flag lookup failure.

## 5. Regression / Stability
- [ ] Existing canvas smoke flow passes: open strategy → edit blocks → save/autosave → run backtest.
- [ ] No visible UI changes are introduced when all flags are off.
- [ ] No backend API/schema changes are required or introduced.

## 6. Code Simplicity Checks
- [ ] SmartCanvas wrapper remains thin and focused (no unnecessary abstraction layers).
- [ ] Existing helpers/hooks are reused instead of adding duplicate utilities.
- [ ] No new dependencies are introduced for this feature.
