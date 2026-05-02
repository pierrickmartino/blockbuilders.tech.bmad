# PRD: Remove Sentiment Analysis from Backtest Results

## 1. Summary
Remove sentiment analysis feedback from backtest results so users only see strategy performance, charts, trades, and plain-language guidance. Sentiment data remains available in Market Overview, but it is no longer shown in any backtest result response or UI.

## 2. Problem Statement
Backtest results should stay focused on what the strategy actually did. Sentiment feedback adds extra noise, can distract from core performance interpretation, and is not something users want to see in the backtest result experience.

## 3. Goals
- Remove sentiment analysis from all backtest result UI surfaces.
- Remove backtest-result sentiment fields or endpoints that only support this UI.
- Keep the implementation minimal and avoid replacing sentiment with new complexity.

## 4. Non-Goals
- Removing sentiment indicators from the Market Overview page.
- Redesigning the broader backtest results page.

## 5. Target Users & User Stories
### 5.1 Target Users
- Users reviewing completed backtest results.
- New users who need a simpler results experience.

### 5.2 User Stories
- As any user, I want sentiment analysis removed from my backtest result, so that I can focus on the actual strategy outcome.
- As any user, I want the results page to stay simple, so that I can review the important metrics faster.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Remove sentiment sections, labels, and summaries from completed backtest result pages.
- Remove or stop returning backtest-specific sentiment data that is no longer used.

### 6.2 Out of Scope
- Any change to Market Overview sentiment cards or `/market/sentiment`.
- Adding a replacement insight card, explanation, or new metric.

### 6.3 Functional Requirements
- Backtest results UI must not render any sentiment analysis card, strip, badge, helper text, or period summary.
- If a dedicated backtest sentiment endpoint exists only for this feature, it must be removed or left unused without breaking the main backtest result flow.
- Shared/read-only backtest result views must also exclude sentiment analysis.
- No empty state, placeholder, or “sentiment unavailable” message should appear on backtest results after removal.
- Existing metrics, charts, narrative, warnings, and trades sections must keep working as before.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens a completed backtest result and sees the usual results content, but no sentiment-related content anywhere in the page.

### 7.2 States
- Loading
- Empty
- Error
- Success

### 7.3 Design Notes
Keep this change subtractive. Remove sentiment UI cleanly instead of replacing it with new copy or layout. Avoid leaving spacing gaps or dead headings.

## 8. Data Requirements
### 8.1 Data Model
- No new fields.
- Backtest result payload should not require sentiment fields for rendering.

### 8.2 Calculations / Definitions (if applicable)
- None.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{id}` — should continue returning backtest results without sentiment-specific data requirements.
- `GET /share/backtests/{token}` — should continue returning shared backtest results without sentiment-specific data requirements.
- `GET /backtests/{run_id}/sentiment` — remove if it exists only for backtest result sentiment display; otherwise leave it unused and out of the UI path.

### 9.2 Validation & Error Handling
- Backtest result requests must still succeed when sentiment data is absent.
- Removal must not introduce frontend errors caused by missing sentiment fields.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Delete sentiment-related rendering in backtest result views.
- Remove unused sentiment fetches, types, and conditionals tied only to backtest results.

### 10.2 Backend
- Prefer removing unused backtest sentiment response wiring if it is dead after the UI change.
- Do not add compatibility shims unless they are required to keep existing callers working.

## 11. Rollout Plan
- Update documentation and test checklist.
- Remove the smallest set of frontend/backend pieces needed to stop showing sentiment in backtest results.

## 12. Acceptance Criteria
- [ ] Completed backtest result pages do not show sentiment analysis anywhere.
- [ ] Shared/read-only backtest result pages do not show sentiment analysis anywhere.
- [ ] Backtest result pages do not show empty sentiment placeholders or sentiment-related errors after removal.
- [ ] Market Overview sentiment indicators remain unchanged.

## 13. Tracking Metrics (Optional)
- Backtest results page support complaints about sentiment confusion — expected to decrease.

## 14. Dependencies (Optional)
- Existing backtest results page components.
- Existing market sentiment feature should remain isolated to Market Overview.

## 15. Risks & Mitigations (Optional)
- Risk: Removing sentiment UI leaves unused fetches or dead response fields behind.  
  Mitigation: Remove related code paths during the same change if they are clearly unused.
- Risk: Shared results page still shows sentiment because it uses a different component path.  
  Mitigation: Validate both authenticated and shared results views.

## 16. Open Questions
- Does `GET /backtests/{run_id}/sentiment` have any consumer outside the backtest results experience?
- Are any analytics events tied specifically to sentiment visibility on backtest results?
