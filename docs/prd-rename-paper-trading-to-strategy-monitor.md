# PRD: Rename Paper Trading to Strategy Monitor

## 1. Summary
Rename all user-facing references of “Paper Trading” / “paper trading” to **“Strategy Monitor”** and add clarifying helper copy so users understand this feature performs automated daily re-testing on the latest data (not live simulation).

## 2. Problem Statement
“Paper Trading” implies live or near-live simulated execution. The current feature is actually scheduled re-backtesting. This mismatch can confuse users and reduce trust in product language.

## 3. Goals
- Align user-facing naming with actual system behavior.
- Remove all “Paper Trading”/“paper trading” references from UI and in-app/help copy.
- Add concise explanatory copy at the strategy toggle point of use.

## 4. Non-Goals
- Changing backend scheduling logic.
- Renaming API/database fields such as `auto_update_enabled` and `auto_update_lookback_days`.

## 5. Target Users & User Stories
### 5.1 Target Users
- Users with strategies that use auto-update.
- New users learning strategy lifecycle features.

### 5.2 User Stories
- As a user with active auto-update strategies, I want this feature labeled “Strategy Monitor,” so that I understand it re-tests my strategy against the latest data.
- As a user viewing strategy settings, I want a short explanation near the toggle, so that I know what happens when it is enabled.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Rename “Paper Trading”/“paper trading” to “Strategy Monitor” on all UI surfaces.
- Update in-app/help/product copy that references the old label.
- Add tooltip/subtitle copy near the toggle: “Automated daily re-testing of your strategy against the latest market data”.

### 6.2 Out of Scope
- New strategy monitoring behavior or schedule changes.
- Migration or rename of backend/internal field names.

### 6.3 Functional Requirements
- FR-1: Any UI label showing “Paper Trading” or “paper trading” must show “Strategy Monitor”.
- FR-2: No UI instance of “paper trading” remains after release.
- FR-3: Strategy Monitor toggle area includes helper text or tooltip with the exact sentence: “Automated daily re-testing of your strategy against the latest market data”.
- FR-4: Existing API field names (`auto_update_*`) remain unchanged for backward compatibility (NFR-12).

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens strategy settings.
2. User sees toggle labeled “Strategy Monitor”.
3. User hovers or reads nearby helper text and sees: “Automated daily re-testing of your strategy against the latest market data”.
4. User enables/disables the setting and saves as usual.

### 7.2 States
- Loading: Existing loading skeleton/state unchanged.
- Empty: If no strategies exist, no special handling needed for this rename.
- Error: Existing save/validation errors unchanged; copy remains plain-language.
- Success: Updated label/copy is visible anywhere the feature appears.

### 7.3 Design Notes
- Keep copy change minimal; avoid layout refactors.
- Reuse existing tooltip/subtitle pattern where available.
- Prefer exact helper sentence for consistency across surfaces.

## 8. Data Requirements
### 8.1 Data Model
- No schema changes.
- Existing fields remain: `auto_update_enabled`, `auto_update_lookback_days`, `last_auto_run_at`.

### 8.2 Calculations / Definitions (if applicable)
- Strategy Monitor: Automated scheduled re-backtest of a saved strategy against latest market data.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `PATCH /strategies/{id}` — unchanged; still accepts `auto_update_enabled` and `auto_update_lookback_days`.
- `GET /strategies` — unchanged data contract; UI maps fields to updated user-facing label.

### 9.2 Validation & Error Handling
- Keep current validation on lookback days and strategy update payloads.
- No backend error-message changes required for this rename.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Replace old label/copy strings with “Strategy Monitor”.
- Add/confirm tooltip or subtitle copy near the toggle using the exact sentence from FR-3.
- Search all user-visible strings for “Paper Trading” and “paper trading” and update them.

### 10.2 Backend
- No code changes expected.
- Preserve `auto_update` field names and scheduler job names.

## 11. Rollout Plan
- Phase 1: Update all user-facing strings and helper copy.
- Phase 2: QA pass to verify no remaining “paper trading” text on UI surfaces and docs/help.

## 12. Acceptance Criteria
- [ ] Given any UI surface that currently displays “Paper Trading” or “paper trading”, when the rename is applied, then all instances read “Strategy Monitor” instead.
- [ ] Given the Strategy Monitor toggle on a strategy, when a user hovers or views the toggle area, then helper text/tooltip explains: “Automated daily re-testing of your strategy against the latest market data”.
- [ ] Given any existing documentation, help text, or in-app copy referencing “paper trading”, when the rename is applied, then all references are updated to “Strategy Monitor”.
- [ ] API field names under `auto_update_*` remain unchanged for backward compatibility.

## 13. Tracking Metrics (Optional)
- Support/feedback mentions related to confusion about paper trading wording — expected downward trend after rename.

## 14. Dependencies (Optional)
- Existing strategy settings UI where auto-update toggle is rendered.
- Existing localization/string files (if present).

## 15. Risks & Mitigations (Optional)
- Risk: Missed UI string in less common path (modal/tooltip/empty state).  
  Mitigation: Run comprehensive string search and execute checklist-based QA across all surfaces.
- Risk: Users interpret rename as behavior change.  
  Mitigation: Keep helper sentence explicit that behavior is automated daily re-testing.

## 16. Open Questions
- Should legacy changelog entries preserve historical wording, or should they be normalized to “Strategy Monitor” for consistency?
- Is this copy localized today, and if yes, should localization updates be included in the same release?
