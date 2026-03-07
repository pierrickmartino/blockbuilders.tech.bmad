# PRD: Canvas Escape Hatch from Wizard

## 1. Summary
Add a subtle wizard link (“I want to build manually”) so experienced signed-up users can skip guided onboarding and jump straight into an empty canvas editor with a newly created blank strategy.

## 2. Problem Statement
The wizard is useful for beginners, but experienced users can feel blocked by mandatory wizard steps when they already know they want to build directly on canvas.

## 3. Goals
- Let users in wizard flow bypass the wizard via one clear low-emphasis link.
- Route users directly to an empty canvas strategy editor and create a blank strategy in one click.
- Keep onboarding and analytics state accurate by setting `has_completed_onboarding=true` and firing `wizard_skipped`.

## 4. Non-Goals
- No redesign of wizard step content or order.
- No new onboarding state machine.
- No changes to backtest behavior.

## 5. Target Users & User Stories
### 5.1 Target Users
- Experienced users who signed up and are routed into the wizard first-run flow.
- Users who prefer manual strategy construction over guided question flow.

### 5.2 User Stories
- As an experienced user in the wizard, I want to skip to the canvas, so I can start building manually right away.
- As a product analyst, I want wizard skip behavior tracked, so onboarding path selection is measurable.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Wizard UI escape hatch link copy and placement.
- One-click blank strategy creation from wizard skip action.
- Navigation to empty canvas strategy editor after blank strategy creation.
- PostHog event emission for `wizard_skipped`.
- Onboarding flag update to `has_completed_onboarding=true` when skip action succeeds.

### 6.2 Out of Scope
- Any changes to wizard-generated strategy logic.
- Any additional skip confirmation modal.
- Any backend schema changes.

### 6.3 Functional Requirements
- Show a subtle link in wizard flow: **“I want to build manually”**.
- When user clicks the link:
  - Create a new blank strategy for the current user.
  - Navigate user directly to that strategy’s empty canvas editor.
  - Fire PostHog event `wizard_skipped`.
  - Set user `has_completed_onboarding=true`.
- If blank strategy creation fails:
  - Do not navigate away from wizard.
  - Show plain-language error with retry guidance.
  - Do not fire `wizard_skipped` and do not set onboarding complete.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User lands in wizard first-run flow.
2. User clicks “I want to build manually”.
3. App creates a blank strategy.
4. App routes user to the blank strategy canvas editor.
5. App records `wizard_skipped` and marks onboarding complete.

### 7.2 States
- Loading: Skip action in progress (brief disabled state for link/action area).
- Empty: Newly created strategy has no blocks; canvas displays existing empty-state guidance.
- Error: Strategy creation failure shows plain-language message and keeps user in wizard.
- Success: User lands on empty canvas for newly created strategy.

### 7.3 Design Notes
- Keep link visually secondary/subtle relative to main wizard CTA.
- Use exact copy: “I want to build manually”.
- Avoid new dialogs; one click should execute the skip flow.

## 8. Data Requirements
### 8.1 Data Model
- `users.has_completed_onboarding` — boolean — set to true on successful wizard skip.
- `strategies.id` — UUID — newly created blank strategy target for canvas navigation.

### 8.2 Calculations / Definitions (if applicable)
- Wizard skipped conversion event: count of `wizard_skipped` events.
- Successful skip means all of the following complete: blank strategy created, navigation succeeded, onboarding flag set true.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- Reuse existing strategy creation endpoint (`POST /strategies`) for blank strategy creation.
- Reuse existing user update/me endpoint path to persist `has_completed_onboarding=true`.

### 9.2 Validation & Error Handling
- Blank strategy creation must validate required defaults (name/asset/timeframe) using current server rules.
- If onboarding-flag update fails after strategy creation, keep user on canvas and retry flag update in background-safe way (or log for follow-up) without blocking manual building.
- User-facing errors must be plain-language and actionable.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a secondary link in wizard shell with exact copy.
- Implement one handler: create blank strategy -> set onboarding complete -> track `wizard_skipped` -> navigate to canvas.
- Reuse existing strategy-create API client and existing canvas route helper.

### 10.2 Backend
- No new endpoint required; rely on existing strategy create + user update behavior.
- Ensure existing auth-protected paths allow this flow from first-run wizard context.

## 11. Rollout Plan
- Phase 1: Add PRD/TST and product-doc updates.
- Phase 2: Implement wizard link + handler with existing endpoints.
- Phase 3: Validate analytics event and onboarding flag behavior in QA.

## 12. Acceptance Criteria
- [ ] Given a user is in the wizard flow, when they click “I want to build manually”, then they are navigated to an empty canvas strategy editor.
- [ ] Given a user clicks “I want to build manually”, then a new blank strategy is created for them.
- [ ] Given wizard skip succeeds, then PostHog event `wizard_skipped` fires once.
- [ ] Given wizard skip succeeds, then `has_completed_onboarding` is set to `true`.
- [ ] Given blank strategy creation fails, then user remains in wizard and sees a plain-language error with retry guidance.

## 13. Tracking Metrics (Optional)
- `wizard_skipped` event count — expected to increase from zero to stable measurable volume.
- Share of new users who choose skip path vs complete wizard — monitor onboarding path split.

## 14. Dependencies (Optional)
- Existing wizard first-run entry UI.
- Existing strategy creation API and canvas navigation route.
- Existing PostHog client event helper.

## 15. Risks & Mitigations (Optional)
- Risk: Users may skip wizard before understanding basics.  
  Mitigation: Keep link subtle and secondary to main guided CTA.
- Risk: Partial success (strategy created but onboarding flag fails).  
  Mitigation: Do not block canvas entry; log/retry flag update and alert via telemetry.

## 16. Open Questions
- Should the created blank strategy use a fixed default name (e.g., “Untitled Strategy”) or current existing naming convention?
- Should `wizard_skipped` include event properties like `entry_point=first_run` for clearer analytics segmentation?
