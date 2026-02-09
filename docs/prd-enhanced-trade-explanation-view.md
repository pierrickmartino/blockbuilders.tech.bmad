# PRD: Enhanced Trade Explanation View

## 1. Summary
Add a richer trade detail experience in backtest results so each trade explains **why** it opened and closed. Users should see a readable condition breakdown (with pass/fail markers), indicator overlays on the trade chart, and highlighted candles where conditions became true.

## 2. Problem Statement
Backtest trade lists currently show what happened (entry/exit/PnL) but not enough context for why signals fired. This makes it harder for users to trust results and improve strategy logic.

## 3. Goals
- Show explicit entry and exit trigger explanations for each trade.
- Let users visually verify signals by overlaying strategy indicators on the trade detail chart.
- Highlight exact candles where each triggering condition became true.

## 4. Non-Goals
- Building a new strategy editor or adding new block types.
- Supporting indicators not already used in the strategy definition.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail crypto traders using Blockbuilders to learn from backtests.
- Existing users iterating strategies and debugging signal behavior.

### 5.2 User Stories
- As a strategy user, I want to read why a trade entered/exited, so that I can validate my logic.
- As a strategy user, I want chart overlays and trigger highlights, so that I can visually confirm signal alignment with price action.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Trade detail explanation text for entry and exit.
- Indicator overlays on trade detail chart (price-pane and subplot indicators).
- Condition-candle highlighting for entry and exit rules.

### 6.2 Out of Scope
- Real-time trading explanations.
- New backtest execution rules or simulation model changes.

### 6.3 Functional Requirements
- `GET /backtests/{run_id}/trades/{trade_idx}` response includes:
  - entry condition breakdown items (label, boolean result, true_timestamp)
  - exit reason metadata (rule type, label, value if applicable)
  - indicator series required to render trade detail overlays for the strategy
- UI renders readable explanation text, e.g.:
  - `Entry triggered because: EMA(12) crossed above EMA(24) ✓ AND RSI(14) < 30 ✓`
  - `Exit: Stop loss hit at -1.5%`
- UI overlays relevant indicators from strategy definition:
  - Price pane overlays (EMA/SMA/Bollinger Bands, etc.)
  - Subplot indicators (RSI/MACD/etc.)
- UI highlights exact candle(s) where each triggering condition turned true.
- If explanation data is unavailable, UI shows a plain-language fallback message and still renders core trade detail.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens backtest results.
2. User selects a trade from trades list.
3. Trade detail panel shows explanation text above chart.
4. Chart displays indicator overlays + highlighted trigger candles.
5. User hovers/taps highlights to inspect condition labels and timestamps.

### 7.2 States
- Loading
- Empty (no trade selected)
- Error (explanation unavailable; show fallback)
- Success (text explanation + overlays + highlights)

### 7.3 Design Notes
- Keep explanation copy plain language and compact.
- Reuse existing chart components/patterns.
- Use simple visual markers for highlights (single accent color + tooltip label).

## 8. Data Requirements
### 8.1 Data Model
- `entry_conditions` — `array<object>` — Ordered list of evaluated entry conditions for the trade.
- `exit_trigger` — `object` — Canonical exit rule that closed the position.
- `indicator_overlays` — `array<object>` — Indicator series metadata and points for chart rendering.
- `condition_events` — `array<object>` — Candle timestamps where each condition became true.

### 8.2 Calculations / Definitions (if applicable)
- Condition true timestamp: first candle timestamp where condition transitions false → true for the triggering event window.
- Entry explanation string: join successful condition labels with logical operators from strategy graph.
- Exit explanation string: map exit reason code + threshold/value to readable sentence.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /backtests/{run_id}/trades/{trade_idx}` — extend payload with explanation, indicator overlays, and condition event timestamps.

### 9.2 Validation & Error Handling
- Validate requested trade index exists; return 404 if not found.
- If indicator reconstruction fails for a subset, return partial explanation payload with `explanation_partial=true` and user-safe message.
- Keep existing trade detail fields backward compatible.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Extend trade detail types and panel rendering.
- Reuse existing chart primitives for overlays/subplots.
- Add compact explanation block + simple condition chips (✓/✗).

### 10.2 Backend
- Recompute/collect indicator values at trade detail fetch time using existing indicator functions.
- Derive entry/exit explanation payload from strategy definition + execution outputs.
- Prefer minimal additional storage; compute on read where feasible.

## 11. Rollout Plan
- Milestone 1: Backend payload extension and unit tests.
- Milestone 2: Frontend explanation block + chart overlays/highlights.
- Milestone 3: QA pass on representative strategies and mobile layout.

## 12. Acceptance Criteria
- [ ] Trade detail shows explicit entry explanation with condition labels and pass markers.
- [ ] Trade detail shows explicit exit explanation with closing rule details.
- [ ] Chart overlays render strategy indicators relevant to the selected trade.
- [ ] Chart highlights exact candle(s) where entry/exit conditions became true.
- [ ] Existing trade detail still works when explanation payload is unavailable.

## 13. Tracking Metrics (Optional)
- Trade detail engagement rate — expected upward trend.
- Mean time to first strategy edit after viewing trade detail — expected downward trend.
- Support tickets mentioning “unclear trade reason” — expected downward trend.

## 14. Dependencies (Optional)
- Existing backtest trade detail endpoint and schema.
- Existing indicator computation utilities.
- Existing chart rendering components.

## 15. Risks & Mitigations (Optional)
- Risk: Indicator overlays clutter chart readability.  
  Mitigation: Show only strategy-used indicators; keep toggles simple.
- Risk: Backend compute cost increases on trade-detail fetch.  
  Mitigation: Limit candle window, compute only requested indicators, return partial data if needed.

## 16. Open Questions
- Should users toggle individual overlays on/off per trade detail view?
- Should non-triggered conditions be shown as ✗ in v1 or only triggered conditions?
