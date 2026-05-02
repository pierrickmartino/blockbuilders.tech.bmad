# PRD: Narrative Display on Results Page (Frontend)

## 1. Summary
Show the narrative paragraph first on the backtest results page so users read the story before metrics. Style the narrative in a prominent card, track narrative visibility with PostHog, and support a zero-trade mode that prioritizes strategy iteration.

## 2. Problem Statement
Users currently need to parse metrics/charts before seeing the narrative context. This increases cognitive load and makes first-pass interpretation harder, especially for zero-trade outcomes where a clear next action is more useful than empty performance rows.

## 3. Goals
- Put narrative context first in the visual hierarchy of results.
- Distinguish narrative content from metric rows with clear, simple styling.
- Track narrative visibility with a dedicated analytics event.
- Provide a zero-trade flow that guides users to modify strategy without showing irrelevant metrics.

## 4. Non-Goals
- Changing backend narrative generation logic or copy templates.
- Redesigning the full results page layout beyond narrative placement and zero-trade hiding rules.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail crypto traders reviewing a completed backtest.
- New users who need plain-language context before advanced metrics.

### 5.2 User Stories
- As a user viewing backtest results, I want the narrative paragraph displayed before any metrics so that I understand the story first.
- As a user seeing a zero-trade result, I want a clear “Modify Strategy” CTA so that I can quickly iterate.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Frontend ordering of results content (narrative-first).
- Narrative card styling and prominence.
- PostHog `narrative_viewed` event when narrative enters viewport.
- Zero-trade conditional rendering: show narrative + CTA, hide performance metrics/charts.

### 6.2 Out of Scope
- Backend API schema changes.
- New analytics dashboards beyond event emission.

### 6.3 Functional Requirements
- Render narrative as the first content element on results page when `backtest.narrative` exists.
- Narrative appears in a distinct card container with larger paragraph text than standard metric row text.
- Fire `narrative_viewed` exactly once per page load when narrative card is visible in viewport.
- For zero-trade runs (`num_trades === 0`), render narrative card with a visible “Modify Strategy” CTA button.
- For zero-trade runs, do not render performance metric rows or charts below the narrative card.
- CTA routes user to strategy editing flow (existing modify path for the strategy).

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens completed backtest results -> sees narrative card first -> reads context -> (normal run) continues to metrics/charts, or (zero-trade run) clicks “Modify Strategy”.

### 7.2 States
- Loading: Keep existing loading skeleton behavior; narrative card appears when run data resolves.
- Empty: If narrative is missing, keep existing results layout unchanged (no blank narrative card).
- Error: Keep existing error handling/copy.
- Success: Narrative card renders first; zero-trade success path shows CTA and hides metrics.

### 7.3 Design Notes
- Keep implementation simple with existing container components and Tailwind utilities.
- Narrative card should be visually prominent but not modal-like.
- Suggested minimum: larger body text (`text-base`/`text-lg` equivalent), bordered/filled card container, comfortable spacing.
- “Modify Strategy” CTA should reuse existing primary/secondary button styling.

## 8. Data Requirements
### 8.1 Data Model
- `backtest.narrative` — string — precomputed narrative copy returned by backend.
- `backtest.num_trades` — number — used to detect zero-trade mode.
- `backtest.strategy_id` — string/UUID — used for CTA destination.

### 8.2 Calculations / Definitions (if applicable)
- Zero-trade condition: `num_trades === 0`.
- Narrative visible condition: narrative card intersects viewport (IntersectionObserver threshold; minimal threshold allowed).

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{id}` — consumes `narrative`, `num_trades`, and `strategy_id`.

### 9.2 Validation & Error Handling
- If `narrative` is null/empty, do not emit `narrative_viewed` and do not render narrative card.
- Analytics failures must not block UI rendering.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Update results page render order: narrative card block before metrics/charts sections.
- Add small visibility tracker (IntersectionObserver-based hook or inline effect) to fire `trackEvent('narrative_viewed', {...})` once.
- Gate metrics/charts rendering with `num_trades > 0`.
- In zero-trade mode, show `Modify Strategy` button linked to strategy edit route.

### 10.2 Backend
- No backend code changes required for this PRD (assumes narrative field already available per backend PRD).

## 11. Rollout Plan
- Implement behind normal release flow (no feature flag required).
- Validate in staging with one normal run and one zero-trade run fixture.

## 12. Acceptance Criteria
- [ ] Given a completed backtest with narrative, results page shows narrative paragraph as first content element above all metrics/charts.
- [ ] Narrative card is visually distinct from metrics (larger text + card container).
- [ ] `narrative_viewed` PostHog event fires when narrative enters viewport.
- [ ] Given a zero-trade run, narrative card includes “Modify Strategy” CTA.
- [ ] Given a zero-trade run, no performance metrics/charts are rendered below the narrative.

## 13. Tracking Metrics (Optional)
- `narrative_viewed` event count — expected to trend with `results_viewed` count.
- Zero-trade CTA click-through rate — expected to increase modify/retry loops for no-signal strategies.

## 14. Dependencies (Optional)
- Existing backend narrative field from `GET /backtests/{id}`.
- Existing frontend analytics helper (`trackEvent`) and PostHog consent gating.

## 15. Risks & Mitigations (Optional)
- Risk: Event over-firing due to repeated viewport intersections.  
  Mitigation: Client-side one-shot guard per page load.
- Risk: Users misinterpret hidden metrics in zero-trade mode as data loss.  
  Mitigation: Keep narrative copy explicit that no trades were executed and provide clear “Modify Strategy” CTA.

## 16. Open Questions
- Should zero-trade mode hide the trades table section label entirely or show a brief explanatory placeholder?
- Should `narrative_viewed` include a `zero_trade` boolean property for easier segmentation?
