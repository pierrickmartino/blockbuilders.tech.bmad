# TST: Enhanced Trade Explanation View

## 1. Purpose
Validate that trade detail explanations, indicator overlays, and condition-candle highlights work correctly and remain backward compatible.

## 2. Test Scope
- Backend trade detail payload extension.
- Frontend trade detail explanation rendering.
- Chart overlays and trigger candle highlighting.
- Error/fallback behavior.

## 3. Preconditions
- Seeded backtest with at least 3 trades using indicator-based entry and multiple exit types.
- One strategy using EMA + RSI.
- One strategy using Bollinger Bands and stop loss.

## 4. Test Cases

### 4.1 API Contract
- [x] `GET /backtests/{run_id}/trades/{trade_idx}` returns legacy trade fields unchanged.
- [ ] Response includes `entry_conditions`, `exit_trigger`, `indicator_overlays`, `condition_events`.
- [ ] Entry conditions include label, result, and true timestamp.
- [ ] Exit trigger includes reason code and user-readable label/value.

### 4.2 Entry Explanation Rendering
- [ ] UI displays entry explanation sentence with correct condition labels.
- [ ] Pass markers (✓) match payload booleans.
- [ ] Condition ordering matches strategy logic order.

### 4.3 Exit Explanation Rendering
- [ ] Stop-loss exit renders threshold value correctly (e.g., `-1.5%`).
- [ ] Signal-based exit renders rule label (e.g., EMA cross down).
- [ ] Time-exit and end-of-data labels render clearly.

### 4.4 Indicator Overlay Rendering
- [ ] EMA/SMA/Bollinger overlays appear on price pane when present in strategy.
- [ ] RSI/MACD overlays appear in subplot when present in strategy.
- [ ] No unrelated indicators are shown.

### 4.5 Condition Candle Highlighting
- [ ] Highlight appears on candle where entry condition becomes true.
- [ ] Highlight appears on candle where exit condition becomes true.
- [ ] Hover/tap tooltip shows condition label + timestamp.

### 4.6 Fallback and Error States
- [ ] If explanation payload is missing, trade detail still loads core information.
- [ ] Plain-language fallback message is displayed.
- [ ] Invalid trade index returns 404 and UI shows friendly error state.

### 4.7 Responsiveness
- [ ] Mobile layout keeps explanation readable without horizontal scroll.
- [ ] Chart remains usable on touch (zoom/pan unaffected by overlays).

## 5. Regression Checks
- [ ] Trades list page still loads and paginates.
- [ ] Existing backtest metrics/summary cards unaffected.
- [ ] Data export endpoints unaffected.

## 6. Exit Criteria
- [ ] All test cases above pass.
- [ ] No P1/P2 defects remain open for this feature.
- [ ] Documentation references updated in `docs/product.md` and PRD linked.
