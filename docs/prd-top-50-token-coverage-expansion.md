# PRD: Top-50 Token Coverage Expansion

## 1. Summary
Expand supported strategy/backtest assets from the current curated list to a phased target of roughly the top 50 tokens. Start immediately by adding requested tokens (CRV/USDT, GRT/USDT, BNB/USDT) while reusing the existing ingestion, validation, and UI patterns.

## 2. Problem Statement
Users want to build strategies and monitor market prices for more tokens than the current list. Limited token coverage blocks strategy creation for requested assets and reduces product usefulness for altcoin-focused traders.

## 3. Goals
- Add CRV/USDT, GRT/USDT, and BNB/USDT to supported assets.
- Define a simple phased path to expand support toward ~50 tokens.
- Keep implementation minimal by reusing existing architecture (no new services/schemas).

## 4. Non-Goals
- Multi-asset strategies or portfolio-level strategies.
- New timeframes beyond current 4h and 1d.

## 5. Target Users & User Stories
### 5.1 Target Users
- Retail crypto traders using Blockbuilders to test discretionary strategy ideas.
- Existing users requesting broader altcoin coverage.

### 5.2 User Stories
- As a strategy builder, I want to select CRV, GRT, and BNB so that I can backtest ideas on those tokens.
- As a market-monitoring user, I want these tokens to appear in market price coverage so that I can track them in-app.
- As a product/admin operator, I want a phased top-50 expansion plan so that we can grow coverage safely without architectural complexity.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Add CRV/USDT, GRT/USDT, BNB/USDT to supported asset constants/lists.
- Ensure ingestion jobs fetch/store OHLCV for newly supported pairs.
- Show newly supported pairs in strategy asset picker and market overview ticker coverage.
- Document phased expansion from current list toward ~50 tokens.

### 6.2 Out of Scope
- Replacing data vendor or introducing multi-vendor reconciliation.
- Any schema redesign for asset metadata.

### 6.3 Functional Requirements
- Backend validation accepts only assets listed in the single allowed-assets source.
- Strategy creation/edit APIs accept the new assets and reject unsupported symbols with plain-language errors.
- Market ticker endpoints/services include new assets in the same response model already used.
- Ingestion/backfill runs for newly added symbols using current pipelines and schedules.
- Existing BTC/ETH and previously supported assets continue to work unchanged.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens strategy create/edit or wizard asset selection, chooses CRV/GRT/BNB from the existing picker, saves strategy, runs backtest, and sees results as usual. User also sees these tokens in Market page price coverage.

### 7.2 States
- Loading
- Empty
- Error
- Success

### 7.3 Design Notes
- No new UI components.
- Keep existing picker and market cards/tables.
- Preserve mobile responsiveness with current layouts.

## 8. Data Requirements
### 8.1 Data Model
- `strategy.asset` — string — selected trading pair (must be in allowed list).
- `candles.symbol` — string — market symbol for OHLCV rows.
- `data_quality_metrics.symbol` (if present in current flow) — string — data completeness tracking per asset.

### 8.2 Calculations / Definitions (if applicable)
- Supported asset universe: single configured list shared by validation, ingestion, and frontend asset selection.
- Expansion target: “top 50” means approximately 50 high-demand assets, finalized by vendor availability and cost.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `POST /strategies` — create strategy with newly supported assets.
- `PATCH /strategies/{id}` — update strategy asset to newly supported assets.
- `POST /strategies/{id}/validate` — validate asset against expanded allowed list.
- `GET /market/tickers` (or current market endpoint) — include CRV/USDT, GRT/USDT, BNB/USDT in output.

### 9.2 Validation & Error Handling
- Reject unknown assets with plain-language message: unsupported asset + suggestion to pick from supported list.
- If asset data is temporarily unavailable, return existing graceful error state (no crashes, no silent failure).

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Update shared asset constants/types for picker + market display.
- Reuse existing selection components and sorting behavior.

### 10.2 Backend
- Extend allowed asset list constant.
- Ensure ingestion config/scheduler includes new symbols.
- Reuse existing candle storage, data quality checks, and validation code paths.

## 11. Rollout Plan
- Phase 1: Add BNB/USDT, CRV/USDT, GRT/USDT.
- Phase 2: Add next 10–15 highest-demand tokens.
- Phase 3: Reach ~50 total supported assets, reviewed periodically for vendor viability.

## 12. Acceptance Criteria
- [ ] Users can create/update strategies with BNB/USDT, CRV/USDT, and GRT/USDT.
- [ ] Backtests run successfully for all three newly added pairs.
- [ ] Market page/ticker coverage includes all three pairs.
- [ ] Unsupported assets are rejected with clear plain-language errors.
- [ ] Product/docs are updated to state phased top-50 expansion target.

## 13. Tracking Metrics (Optional)
- Share of strategies created on non-BTC/ETH assets.
- Backtest success rate for newly added tokens.
- Number of user requests for unsupported tokens.

## 14. Dependencies (Optional)
- Current market data vendor supports requested symbols with sufficient history.
- Existing scheduler capacity and API quotas remain within safe limits.

## 15. Risks & Mitigations (Optional)
- Risk: Inconsistent history depth across newly added tokens.  
  Mitigation: Reuse existing data-availability warnings and quality indicators.
- Risk: Rate limits increase with larger universe.  
  Mitigation: Phased rollout and monitoring before each expansion step.

## 16. Open Questions
- What is the exact priority ordering for tokens 28–50 after BNB/CRV/GRT?
- Should market page show all supported assets by default or keep an initial subset with simple filtering?
