# Test Checklist – Health Bar - Guided Block Placement

> Source PRD: `prd-health-bar-guided-block-placement.md`

## 1. Feature Gating & Preconditions
- [ ] Guided placement UI is available only when Health Bar feature flag is enabled.
- [ ] Exit segment click behavior is active only when Exit segment status is `incomplete`.
- [ ] Clicking Exit segment does nothing disruptive when segment is `complete` or `warning`.

## 2. Exit Segment Click Behavior
- [ ] Clicking incomplete Exit segment scrolls/focuses viewport to the logical Exit area.
- [ ] Scroll/focus behavior is deterministic across repeated clicks.
- [ ] On mobile viewport, focus behavior keeps target region visible and usable.

## 3. Suggestion Menu Rendering
- [ ] Suggestion UI opens immediately after Exit segment click.
- [ ] Menu contains exactly: Add Stop Loss, Add Exit Signal, Add Trailing Stop.
- [ ] Menu options are keyboard accessible (focus/enter/escape behavior).
- [ ] Menu options are touch accessible with 44px+ tap targets.

## 4. Add Stop Loss Placement
- [ ] Selecting Add Stop Loss inserts one Stop Loss block at appropriate Exit-area coordinates.
- [ ] Existing blocks are not unexpectedly moved unless required by current placement utility.
- [ ] Auto-created connections follow valid connection rules.
- [ ] No duplicate/invalid edges are created.

## 5. Add Exit Signal Placement
- [ ] Selecting Add Exit Signal inserts one Exit Signal block in logical Exit area.
- [ ] Logical upstream/downstream auto-connections are created when valid.
- [ ] Placement gracefully fails with plain-language message if no valid connection path exists.

## 6. Add Trailing Stop Placement
- [ ] Selecting Add Trailing Stop inserts one Trailing Stop block in logical Exit area.
- [ ] Logical upstream/downstream auto-connections are created when valid.
- [ ] Placement behavior is deterministic for the same input graph.

## 7. Undo Transaction Integrity
- [ ] Guided placement wraps all mutations in one transaction (`beginUndoTransaction`/`commitUndoTransaction`).
- [ ] A single Undo action fully reverts block + all guided connections.
- [ ] Redo reapplies the full guided placement as one step.

## 8. Autosave Behavior
- [ ] Successful guided placement triggers autosave exactly once.
- [ ] Autosave payload contains the final committed graph (block + connections).
- [ ] Failed placement does not trigger autosave.

## 9. Health Bar State Update
- [ ] After successful guided placement, Health Bar re-evaluates segment states.
- [ ] Exit segment changes from `incomplete` to `complete` when validation rules are satisfied.
- [ ] If placement does not satisfy full Exit requirements, segment remains accurate (not falsely complete).

## 10. Error & Edge Cases
- [ ] If placement throws mid-flow, transaction is rolled back (no partial graph mutation).
- [ ] User sees plain-language, non-blocking error with manual fallback guidance.
- [ ] Repeated rapid clicks on Exit segment do not create duplicate placement operations.
- [ ] Closing suggestion menu without selection leaves graph unchanged.

## 11. Regression Checks
- [ ] Manual block placement from Block Library still works unchanged.
- [ ] Existing Health Bar completeness display behavior is unchanged.
- [ ] Existing canvas edit/save/validate/backtest flows continue to work.
- [ ] No backend endpoint additions or schema migrations are required.
