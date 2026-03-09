# TST: Narrative Summary Generation (Backend)

## 1. API Contract Tests
- [x] `GET /backtests/{id}` includes `narrative` field for completed backtests with trades.
- [x] `narrative` is a string and not empty when `num_trades > 0`.
- [x] `GET /backtests/{id}` zero-trade completed backtests return the exact required narrative string.
- [x] Non-completed runs preserve existing behavior (narrative omitted or null per schema decision).

## 2. Content Correctness Tests (num_trades > 0)
- [ ] Narrative includes starting balance and ending balance in dollar format (`$X -> $Y`).
- [ ] Narrative includes best performing period.
- [ ] Narrative includes worst performing period with max drawdown expressed in dollar terms.
- [x] Narrative includes total number of trades.
- [x] Narrative includes strategy-vs-buy-and-hold comparison in percentage points.
- [x] Narrative uses user-configured initial balance (FR-08), not a hardcoded default.
- [ ] Drawdown sentence is experiential (FR-09) and references a drop from a peak dollar value to a trough dollar value.

## 3. Fallback & Robustness Tests
- [ ] If optional period metric is missing, narrative still renders deterministic fallback text without endpoint failure.
- [x] If benchmark metric is missing, narrative still renders with safe fallback phrasing and no 5xx.
- [x] If drawdown components are partially missing, narrative degrades gracefully and still returns 200 for valid completed run.

## 4. Performance Tests
- [x] Added narrative generation overhead is <=200ms for `GET /backtests/{id}` under representative payload sizes.
- [ ] p95 endpoint latency regression test passes against baseline in local/staging performance suite.

## 5. Unit Tests (backend/app/backtest/narrative.py)
- [x] Renderer returns deterministic output for fixed metric input.
- [x] Currency formatter renders dollars with separators and no scientific notation.
- [ ] Percentage-point formatter renders signed deltas correctly (e.g., `+2.4 pp`, `-1.1 pp`).
- [x] Zero-trade renderer returns exact required copy including punctuation.

## 6. Integration Tests
- [x] Backtest API response schema test validates `narrative` field presence/type for completed runs.
- [x] Existing backtest detail tests continue to pass without changes to endpoint path.
- [ ] Snapshot or golden-text tests verify expected paragraph structure for a canonical profitable run and a losing run.

## 7. Manual QA Checklist
- [ ] Run a completed backtest with trades and confirm narrative appears in results view.
- [ ] Run a completed backtest with zero trades and confirm exact fallback copy.
- [ ] Confirm narrative values (balances, trades, comparison) match metrics shown elsewhere on the page.
- [ ] Confirm no obvious response delay is perceptible in normal usage.
