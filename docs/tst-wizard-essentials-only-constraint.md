# TST: Wizard Essentials-Only Constraint

## 1. Objective
Validate that the strategy wizard indicator/strategy-type step shows only the 5 Essentials options with plain-English labels, never shows excluded advanced indicators, and that post-wizard canvas palette mode still respects existing toggle-state behavior.

## 2. Scope
- Strategy Building Wizard indicator/strategy-type step
- Wizard option labeling and option filtering
- Post-wizard transition into strategy canvas
- Palette mode continuity (Essentials default for new users)

## 3. Preconditions / Test Data
- App running locally with wizard entry point available.
- At least one test account representing a new user (no existing palette preference).
- At least one test account (or browser profile) with persisted palette mode set to `all`.

## 4. Test Cases

### TC-01 Wizard shows exactly 5 Essentials options
1. Open Strategy Building Wizard.
2. Navigate to indicator/strategy-type step.
3. Count visible selectable options.

**Expected:**
- Exactly 5 options are shown.
- They map to SMA, EMA, RSI, Bollinger Bands, MACD only.

### TC-02 Wizard option labels are plain English
1. At indicator/strategy-type step, inspect visible option text.

**Expected:**
- Options use plain-English phrasing and match:
  - `Use a Moving Average crossover`
  - `Use an Exponential Moving Average crossover`
  - `Use momentum (RSI)`
  - `Use volatility bands (Bollinger Bands)`
  - `Use trend & momentum (MACD)`

### TC-03 Excluded advanced indicators are never shown
1. At indicator/strategy-type step, scan/search option list for advanced terms.

**Expected:**
- No option includes Ichimoku, Fibonacci, ADX, OBV, or Stochastic.

### TC-04 Wizard completion still generates editable strategy
1. Complete wizard using each essential option (repeat as needed).
2. Open generated strategy on canvas.

**Expected:**
- Strategy loads without errors.
- Generated strategy is editable and uses existing indicator block behavior.

### TC-05 New user post-wizard palette defaults to Essentials
1. Use new-user context (no persisted palette preference).
2. Complete wizard and open strategy in canvas.
3. Open block palette.

**Expected:**
- Palette opens in Essentials mode by default.

### TC-06 Existing persisted mode remains respected post-wizard
1. In same browser profile, set palette mode to `all` and confirm persistence.
2. Start and complete wizard.
3. Open resulting strategy in canvas and inspect palette mode.

**Expected:**
- Palette opens in `all` mode for that user/profile.

### TC-07 Regression: no backend/API behavior changes
1. Run flow with network inspector open.
2. Compare requests before and after wizard indicator step.

**Expected:**
- No new endpoints introduced for wizard option loading.
- Strategy creation/save requests remain unchanged in shape.

## 5. Regression Checklist
- Wizard entry points (empty state and create modal) still function.
- Existing non-wizard canvas block insertion still supports full indicator set based on palette mode.
- Existing plain-English indicator labeling behavior in Essentials palette mode remains intact.

## 6. Exit Criteria
- TC-01 through TC-07 pass.
- No accessibility or copy regressions reported in wizard flow.
- Acceptance criteria from PRD are fully satisfied.
