# PRD: Wizard Essentials-Only Constraint

## 1. Summary
Constrain the strategy wizard so the indicator/strategy-type step only presents the 5 Essentials indicators with plain-English option copy. Exclude advanced indicators from wizard options entirely, while keeping the canvas block palette behavior unchanged so it continues to respect each user's current essentials/all toggle state (Essentials by default for new users).

## 2. Problem Statement
New users currently face unfamiliar technical indicator names during the wizard flow. This introduces unnecessary cognitive load at the exact moment we want the fastest path to a first strategy.

## 3. Goals
- Ensure wizard indicator selection is limited to exactly 5 Essentials indicators.
- Present options in plain English so first-time users can choose confidently.
- Preserve existing canvas palette toggle behavior after wizard completion.

## 4. Non-Goals
- Changing indicator math, block schemas, or backtest logic.
- Reworking the full canvas block palette beyond existing essentials/all behavior.

## 5. Target Users & User Stories
### 5.1 Target Users
- New users using the strategy wizard to create a first strategy.
- Returning users who still prefer wizard-guided strategy creation.

### 5.2 User Stories
- As a new user, I want the wizard to show only essential indicator choices in plain English, so that I can build a strategy without technical confusion.
- As a user finishing the wizard, I want the canvas palette to match my current essentials/all mode, so that the editor stays consistent with my preferences.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Restrict wizard indicator/strategy-type step to 5 Essentials options only.
- Use plain-English option labels at that wizard step.
- Explicitly exclude Ichimoku, Fibonacci, ADX, OBV, and Stochastic from wizard options.
- Ensure post-wizard canvas palette respects the existing toggle state logic.

### 6.2 Out of Scope
- Adding new indicators to Essentials.
- New backend endpoints, schema changes, or persistence changes for wizard choice labels.

### 6.3 Functional Requirements
- Wizard indicator/strategy-type step must display exactly these 5 options:
  - `Use a Moving Average crossover` (SMA)
  - `Use an Exponential Moving Average crossover` (EMA)
  - `Use momentum (RSI)`
  - `Use volatility bands (Bollinger Bands)`
  - `Use trend & momentum (MACD)`
- Wizard must never display the following as options: Ichimoku, Fibonacci, ADX, OBV, Stochastic.
- Wizard output strategy JSON continues using existing underlying block types/keys.
- After wizard completion and opening in canvas, block palette mode follows existing behavior:
  - New users default to Essentials mode.
  - Users with persisted toggle state continue to see their selected mode.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User starts Strategy Building Wizard.
2. User reaches indicator/strategy-type step.
3. Wizard shows only 5 Essentials options in plain-English phrasing.
4. User completes wizard and opens generated strategy on canvas.
5. Canvas palette loads using current toggle-state behavior (Essentials default for new users, persisted mode otherwise).

### 7.2 States
- Loading: Wizard step renders existing loading behavior while options are prepared.
- Empty: Not applicable (fixed 5-option list).
- Error: If label mapping fails, fallback to technical label for the matching essential only; do not surface non-essential options.
- Success: User sees only the 5 plain-English essentials options and can proceed.

### 7.3 Design Notes
- Keep wizard layout unchanged; only constrain and relabel options.
- Keep copy short, action-oriented, and beginner-friendly.
- Do not introduce additional toggles or branching in wizard.

## 8. Data Requirements
### 8.1 Data Model
- `wizard_essential_options` — frontend constant array mapping plain-English labels to existing essential indicator keys.
- No new persisted data fields.

### 8.2 Calculations / Definitions (if applicable)
- Essentials set (wizard scope): `{sma, ema, rsi, bollinger, macd}`.
- Excluded set (wizard scope): `{ichimoku, fibonacci, adx, obv, stochastic}`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- No existing endpoint changes.

### 9.2 Validation & Error Handling
- Frontend validates wizard option list contains exactly 5 essentials before render.
- If unexpected option data appears, filter down to the allowed essentials set and continue.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Replace wizard indicator option source with a fixed essentials-only list constant.
- Update option display copy to specified plain-English labels.
- Keep emitted/generated strategy block identifiers unchanged.
- Reuse existing palette mode initialization logic when opening generated strategy in canvas.

### 10.2 Backend
- No changes.

## 11. Rollout Plan
- Phase 1: Constrain wizard options to essentials-only fixed list.
- Phase 2: Apply plain-English labels and verify generated strategy mapping.
- Phase 3: Validate acceptance criteria and release.

## 12. Acceptance Criteria
- [ ] Given a user is in the strategy wizard, when they reach the indicator/strategy-type step, then only 5 Essentials indicators are presented as options.
- [ ] Given a user is at the indicator/strategy-type step, then options are labeled in plain English (e.g., `Use a Moving Average crossover`, `Use momentum (RSI)`).
- [ ] Given a user is at the indicator/strategy-type step, then Ichimoku, Fibonacci, ADX, OBV, and Stochastic are never presented as wizard options.
- [ ] Given a user completes the wizard and opens the resulting strategy in canvas, when they view the block palette, then palette mode respects the user's current toggle state (Essentials by default for new users).

## 13. Tracking Metrics (Optional)
- Wizard step completion rate from indicator-selection step to final submit.
- First-strategy creation time for new users (expected to decrease).

## 14. Dependencies (Optional)
- Existing strategy wizard flow and generation utilities.
- Existing Essentials-first palette mode/toggle behavior.

## 15. Risks & Mitigations (Optional)
- Risk: Label text diverges from product copy standards across wizard and palette.  
  Mitigation: Keep labels in one constant map and reference product-approved wording.
- Risk: Hidden dependency on a previously broad indicator list in wizard code path.  
  Mitigation: Add focused tests that assert exact allowed and disallowed options.

## 16. Open Questions
- Should wizard option labels include technical subtitles in a secondary line, or stay single-line action labels only?
- Should we instrument a dedicated analytics event for wizard option selection in this phase, or defer?
