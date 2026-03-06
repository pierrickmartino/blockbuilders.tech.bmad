# PRD: What You Just Learned Summary Card

## 1. Summary
Add a first-run-only educational summary card on the backtest results page. After a user completes their first-ever backtest, they should see a short plain-language takeaway that explains what they tested and how the strategy performed versus buy-and-hold.

## 2. Problem Statement
New users can reach results without clearly understanding what the backtest proved. We need a lightweight explanation moment that reinforces value immediately after their first success.

## 3. Goals
- Show a concise educational takeaway immediately after the first-ever backtest results render.
- Compare strategy outcome versus buy-and-hold in simple language.
- Keep behavior deterministic and minimal (show once, then never again).

## 4. Non-Goals
- Building a full AI-generated narrative system.
- Adding multi-card onboarding tours or modals.

## 5. Target Users & User Stories
### 5.1 Target Users
- Brand-new users who just ran their first backtest.
- Early users who need confidence in interpreting results.

### 5.2 User Stories
- As a new user who just completed their first backtest, I want a summary card explaining the takeaway, so that I understand the value of what I just did.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Add a “What you just learned” card below backtest results.
- Show card only for the user’s first-ever backtest results view.
- Generate 1–2 sentence copy comparing strategy vs buy-and-hold.

### 6.2 Out of Scope
- Personalization beyond first-run gating and run metrics.
- Localization/internationalization changes.

### 6.3 Functional Requirements
- On first-ever backtest results render, show a card titled **What you just learned** beneath the main results content.
- Card body must contain 1–2 sentences in plain language describing: (a) what the strategy tested and (b) strategy performance versus buy-and-hold with percentage-point difference.
- On second or later backtest results renders for that user, the card must not appear.
- Reuse existing run metrics (`total_return`, `benchmark_return` or equivalent) to calculate delta; avoid new backend endpoints unless strictly required.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User runs first-ever backtest.
2. Results page loads.
3. User sees standard results plus the “What you just learned” card below results.
4. User runs/opens another backtest result later.
5. Card is not shown.

### 7.2 States
- Loading: no card skeleton required; card renders only when eligibility and metrics are ready.
- Empty: if required metrics are unavailable, hide card (do not block results page).
- Error: if summary generation fails, show fallback plain sentence with best available data.
- Success: card renders with title + 1–2 sentence takeaway.

### 7.3 Design Notes
- Keep visual style consistent with existing result summary cards (reuse current card component styles).
- Place directly below results summary area; no modal, tooltip, or banner variant.
- Keep copy concise and non-technical.

## 8. Data Requirements
### 8.1 Data Model
- `user_id` — UUID — identify current user.
- `backtest_count` (or equivalent completed-run count) — integer — determine first-ever eligibility.
- `strategy_return_pct` — number — strategy return for run.
- `benchmark_return_pct` — number — buy-and-hold return for same period.
- `performance_delta_pct_points` — number — `strategy_return_pct - benchmark_return_pct`.

### 8.2 Calculations / Definitions (if applicable)
- `performance_delta_pct_points`: strategy return percentage minus benchmark return percentage.
- Suggested sentence pattern: “You just tested whether [strategy intent] would have outperformed simply holding. Your strategy [beat/lagged] buy-and-hold by [X] percentage points over [period].”

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{run_id}` — provide strategy return, benchmark return, and enough context to determine first-run eligibility.

### 9.2 Validation & Error Handling
- If eligibility cannot be determined, default to not showing the card.
- If benchmark/strategy metrics are missing, suppress card or show fallback sentence without delta (prefer suppression for simplicity).

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a small conditional card component in the results page component tree.
- Gate rendering with a simple boolean: `isFirstEverBacktestForUser && hasRequiredMetrics`.
- Build summary text from existing result payload fields; avoid extra client state complexity.

### 10.2 Backend
- Reuse existing user/run metadata to expose first-run eligibility with current results payload if already available.
- If eligibility is not currently exposed, add the smallest possible field to existing response schema rather than creating a new route.

## 11. Rollout Plan
- Phase 1: ship behind normal release (no feature flag needed).
- Phase 2: monitor basic engagement and support feedback; iterate copy only if needed.

## 12. Acceptance Criteria
- [ ] Given a user has just completed their first-ever backtest, when the results page renders, then a “What you just learned” card appears below the results.
- [ ] Given the first-ever backtest case above, the card copy summarizes in 1–2 sentences what the strategy did vs buy-and-hold and includes a percentage-point comparison.
- [ ] Given a user views results for their second or later backtests, when the results page renders, then the “What you just learned” card does not appear.

## 13. Tracking Metrics (Optional)
- First-run results views with card shown — expected near 100% for eligible users.
- First-run results dwell time — expected slight increase (indicates users read the takeaway).

## 14. Dependencies (Optional)
- Existing backtest results payload includes strategy and benchmark returns.
- Existing user/run history logic can determine first-ever run.

## 15. Risks & Mitigations (Optional)
- Risk: Incorrect first-run detection shows card more than once.  
  Mitigation: Base eligibility on completed backtest count from backend source of truth.
- Risk: Confusing copy if strategy intent cannot be inferred cleanly.  
  Mitigation: Use a simple generic sentence template when strategy intent is unavailable.

## 16. Open Questions
- Should “first-ever” mean first completed run in database or first viewed results page?
- Should we track a dedicated analytics event for card display and/or dismissal, or keep analytics unchanged for now?
