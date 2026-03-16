# Test Checklist – Inline Parameter Popover on Block Tap

> Source PRD: `prd-inline-parameter-popover-on-block-tap.md`

---

## 1. Feature Flag Behavior

- [ ] With `Inline Popovers` flag ON, tapping/clicking a block opens inline popover (not Inspector side panel)
- [ ] With `Inline Popovers` flag OFF, tapping/clicking a block opens existing Inspector Panel
- [ ] Toggling flag OFF after usage immediately restores current Inspector behavior without runtime errors

## 2. Popover Anchoring & Positioning

- [ ] Popover opens anchored to the selected block's canvas position
- [ ] Popover remains fully visible when block is near top edge (no clipping)
- [ ] Popover remains fully visible when block is near bottom edge (no clipping)
- [ ] Popover remains fully visible when block is near left edge (no clipping)
- [ ] Popover remains fully visible when block is near right edge (no clipping)
- [ ] Popover repositions correctly after canvas pan/zoom while open (if supported)

## 3. Parameter Controls Parity

- [ ] Popover renders sliders where Inspector currently uses sliders
- [ ] Popover renders dropdown/select controls where Inspector currently uses dropdown/select controls
- [ ] Popover renders number inputs where Inspector currently uses number inputs
- [ ] Popover renders preset controls (e.g., period presets) where Inspector currently uses presets
- [ ] Block with no parameters shows a clear “No parameters” empty state

## 4. Real-Time Label Update

- [ ] Changing popover parameter updates compact node label text immediately
- [ ] Example change verifies correctly: `RSI (14)` -> `RSI (25)`
- [ ] Label update remains responsive under rapid slider movement
- [ ] Manual check confirms update appears within ~100ms target on normal local environment

## 5. Close/Commit Behavior

- [ ] Clicking/tapping outside popover closes it
- [ ] Outside-close commits latest parameter values (not stale values)
- [ ] Reopening same block shows committed values
- [ ] Switching from one block to another closes first popover and preserves committed values

## 6. Undo/Redo Integration

- [ ] After popover close commit, one undo action reverts to previous parameter value
- [ ] Redo reapplies the committed parameter value
- [ ] Undo/redo still works for non-parameter canvas actions after popover usage

## 7. Autosave Integration

- [ ] Popover close commit triggers existing autosave debounce flow
- [ ] Autosave persists committed parameter value after debounce interval
- [ ] No duplicate/conflicting autosave requests are produced by one close action

## 8. Validation & Error States

- [ ] Existing inline validation messages appear in popover for invalid input
- [ ] Out-of-range values show correct plain-language message and range
- [ ] Correcting invalid value removes validation message
- [ ] Validation behavior matches existing Inspector rules (no unintended rule changes)

## 9. Interaction & Accessibility Basics

- [ ] Only one popover is active at a time
- [ ] Clicking inside popover controls does not accidentally close popover
- [ ] Tap targets remain usable on mobile/tablet
- [ ] Keyboard focus is not trapped incorrectly after popover close

## 10. Regression Checks

- [ ] Existing Inspector Panel works unchanged when feature flag is OFF
- [ ] Strategy save/version creation still works after popover edits
- [ ] Canvas performance remains acceptable with repeated open/edit/close cycles
- [ ] No backend/API changes are required for this feature
