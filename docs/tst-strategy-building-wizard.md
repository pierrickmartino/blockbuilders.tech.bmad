# Test Checklist – Strategy Building Wizard

> Source PRD: `prd-strategy-building-wizard.md`

## 1. Entry Points

- [ ] Wizard is accessible from the strategy list empty state ("Create with wizard" button/link)
- [ ] Wizard is accessible from the new strategy modal ("Use wizard" option)
- [ ] Entry points are visible and functional on desktop
- [ ] Entry points are visible and functional on mobile / tablet (responsive layout)

## 2. Wizard Flow – General

- [ ] Wizard presents questions in a single-column layout
- [ ] Wizard completes in 6 or fewer questions/steps
- [ ] User can navigate forward through all steps
- [ ] User can navigate backward to previous steps without losing entered values
- [ ] Default values are pre-filled on every step so a user can click through without editing
- [ ] Accepting all defaults produces a valid strategy without any user edits

## 3. Step 1 – Signal Type Selection

- [ ] User can select "Moving average crossover" as signal type
- [ ] User can select "RSI mean reversion" as signal type
- [ ] Exactly one signal type must be selected to proceed
- [ ] Selecting a signal type updates subsequent steps to match that template

## 4. Step 2 – Indicator Parameters (MA Crossover)

- [ ] When MA crossover is selected, fast period field is shown with default 10
- [ ] When MA crossover is selected, slow period field is shown with default 30
- [ ] Fast period accepts valid integer values within indicator min/max bounds
- [ ] Slow period accepts valid integer values within indicator min/max bounds
- [ ] Invalid values (zero, negative, non-integer, out-of-range) are rejected with clear feedback
- [ ] Fast period < slow period is enforced (or at minimum documented behavior if not enforced)

## 5. Step 2 – Indicator Parameters (RSI Mean Reversion)

- [ ] When RSI is selected, period field is shown with default 14
- [ ] Period accepts valid integer values within indicator min/max bounds
- [ ] Invalid values (zero, negative, non-integer, out-of-range) are rejected with clear feedback

## 6. Step 3 – Exit Rule Selection

- [ ] "Exit on opposite signal" option is available for MA crossover flow (default)
- [ ] "Exit on RSI returning to neutral" option is available for RSI flow
- [ ] Default RSI neutral level is 50
- [ ] At least one exit rule must be selected

## 7. Step 4 – Risk Controls (Optional)

- [ ] Stop loss percentage field is shown with default 5
- [ ] Take profit percentage field is shown with default 10
- [ ] Risk controls are optional (user can skip/leave defaults)
- [ ] Invalid values (zero, negative, non-numeric, out-of-range) are rejected with clear feedback

## 8. Review & Create Step

- [ ] Review step shows a summary of all selected options and parameters
- [ ] User can confirm and create the strategy from the review step
- [ ] On creation, a strategy + version is created via the existing flow
- [ ] On creation, user is navigated to the strategy editor with the generated canvas loaded

## 9. Template A – MA Crossover JSON Generation

- [ ] Generated JSON includes a `price` block (close)
- [ ] Generated JSON includes a `sma` block for the fast period with the user-specified value
- [ ] Generated JSON includes a `sma` block for the slow period with the user-specified value
- [ ] Generated JSON includes a `crossover` block for entry (fast crosses above slow)
- [ ] Generated JSON includes an `entry_signal` block
- [ ] Generated JSON includes a `crossover` block for exit (fast crosses below slow)
- [ ] Generated JSON includes an `exit_signal` block
- [ ] When risk controls are set, `stop_loss` and `take_profit` blocks are included
- [ ] Connections: price connects to sma(fast) and sma(slow)
- [ ] Connections: sma(fast) + sma(slow) connect to crossover(entry)
- [ ] Connections: crossover(entry) connects to entry_signal
- [ ] Connections: sma(fast) + sma(slow) connect to crossover(exit)
- [ ] Connections: crossover(exit) connects to exit_signal

## 10. Template B – RSI Mean Reversion JSON Generation

- [ ] Generated JSON includes a `price` block (close)
- [ ] Generated JSON includes an `rsi` block with the user-specified period
- [ ] Generated JSON includes a `compare` block for entry (rsi < 30)
- [ ] Generated JSON includes an `entry_signal` block
- [ ] Generated JSON includes a `compare` block for exit (rsi > neutral level)
- [ ] Generated JSON includes an `exit_signal` block
- [ ] When risk controls are set, `stop_loss` and `take_profit` blocks are included
- [ ] Connections: price connects to rsi
- [ ] Connections: rsi + constant(30) connect to compare(entry)
- [ ] Connections: compare(entry) connects to entry_signal
- [ ] Connections: rsi + constant(50) connect to compare(exit)
- [ ] Connections: compare(exit) connects to exit_signal

## 11. Definition JSON Validity

- [ ] Generated JSON conforms to existing `CanvasDefinition` structure
- [ ] Block IDs are generated via `crypto.randomUUID()` (valid UUIDs)
- [ ] Generated strategy can be loaded on the canvas without errors
- [ ] Generated strategy is fully editable on the canvas (add/remove/modify blocks)
- [ ] Generated strategy passes existing canvas validation
- [ ] Generated strategy can be backtested successfully via the existing engine

## 12. Error Handling

- [ ] If all wizard steps are not answered/filled, the user cannot proceed (defaults satisfy requirement)
- [ ] Invalid indicator parameter ranges are caught and shown to the user
- [ ] If JSON generation fails, an error toast is shown
- [ ] If JSON generation fails, the user stays on the current wizard step (not ejected)
- [ ] No unhandled exceptions or console errors during normal wizard usage

## 13. No Backend Changes

- [ ] No new API endpoints are introduced
- [ ] No API schema changes are required
- [ ] Wizard is entirely a frontend-only feature
- [ ] Existing canvas utilities (`canvas-utils.ts`) are reused for conversion/normalization

## 14. Accessibility & Responsiveness

- [ ] Wizard layout is responsive on desktop, tablet, and mobile
- [ ] Form fields are keyboard-navigable
- [ ] Labels and questions use plain, beginner-friendly language
- [ ] Buttons and controls are touch-friendly on mobile
