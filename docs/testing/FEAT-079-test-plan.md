# Test Checklist – SmartCanvas Wrapper & Feature Flag Infrastructure

> Source PRD: `prd-smartcanvas-wrapper-feature-flag-infrastructure.md`

## 1. Entry-Point Replacement
- [x] All canvas entry routes/pages render `SmartCanvas` instead of direct `StrategyCanvas`.
- [x] No remaining direct entry-point imports/usages of `StrategyCanvas` in page-level canvas containers.
- [x] SmartCanvas passes required props through without missing required values.

## 2. Parity with All Flags Disabled
- [x] Undo works exactly as before.
- [x] Redo works exactly as before.
- [x] Autosave behavior and status indicators remain unchanged.
- [x] Copy/paste behavior remains unchanged (single and multi-select flows).
- [x] Minimap rendering and interactions remain unchanged.
- [x] Auto-layout behavior and output remain unchanged.
- [x] Keyboard shortcuts behave exactly as before.

## 3. Feature Flag Evaluation
- [x] SmartCanvas evaluates PostHog feature flags for each major canvas feature area.
- [x] Flag values are read from the existing PostHog client SDK path (no ad-hoc duplicate client).
- [x] Missing flag values are treated as disabled.

## 4. Failure Safety
- [x] If PostHog client is unavailable, canvas still renders.
- [x] If PostHog flag evaluation throws/fails, SmartCanvas falls back to disabled flags.
- [x] No user-facing crash occurs due to flag lookup failure.

## 5. Regression / Stability
- [x] Existing canvas smoke flow passes: open strategy → edit blocks → save/autosave → run backtest.
- [x] No visible UI changes are introduced when all flags are off.
- [x] No backend API/schema changes are required or introduced.

## 6. Code Simplicity Checks
- [x] SmartCanvas wrapper remains thin and focused (no unnecessary abstraction layers).
- [x] Existing helpers/hooks are reused instead of adding duplicate utilities.
- [x] No new dependencies are introduced for this feature.
