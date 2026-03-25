# Test Checklist – Top-50 Token Coverage Expansion

> Source PRD: `docs/prd-top-50-token-coverage-expansion.md`

## 1. Strategy Asset Support
- [ ] Asset picker includes `BNB/USDT`.
- [ ] Asset picker includes `CRV/USDT`.
- [ ] Asset picker includes `GRT/USDT`.
- [ ] Users can create a strategy with each of the 3 new assets.
- [ ] Users can edit an existing strategy and switch asset to each of the 3 new assets.

## 2. Validation & Error Handling
- [ ] `POST /strategies` accepts `BNB/USDT`, `CRV/USDT`, `GRT/USDT`.
- [ ] `PATCH /strategies/{id}` accepts `BNB/USDT`, `CRV/USDT`, `GRT/USDT`.
- [ ] `POST /strategies/{id}/validate` accepts the 3 new assets.
- [ ] Unsupported asset (example: `FAKE/USDT`) is rejected with a plain-language error.

## 3. Data Ingestion & Storage
- [ ] Ingestion job fetches OHLCV data for `BNB/USDT`.
- [ ] Ingestion job fetches OHLCV data for `CRV/USDT`.
- [ ] Ingestion job fetches OHLCV data for `GRT/USDT`.
- [ ] Candles for each new asset are stored in the existing candles table format.
- [ ] No schema migration is required for this feature.

## 4. Backtesting
- [ ] Backtest runs complete successfully for strategies using `BNB/USDT`.
- [ ] Backtest runs complete successfully for strategies using `CRV/USDT`.
- [ ] Backtest runs complete successfully for strategies using `GRT/USDT`.
- [ ] Existing assets (BTC/USDT, ETH/USDT, and current list) still backtest successfully.

## 5. Market Price Coverage
- [ ] Market overview/ticker API response includes `BNB/USDT`.
- [ ] Market overview/ticker API response includes `CRV/USDT`.
- [ ] Market overview/ticker API response includes `GRT/USDT`.
- [ ] Market page UI renders the 3 new assets without layout regressions on desktop.
- [ ] Market page UI renders the 3 new assets without layout regressions on mobile.

## 6. Documentation
- [ ] `CLAUDE.md` reflects phased expansion guidance toward top-50 coverage.
- [ ] `docs/product.md` reflects newly added assets and top-50 direction.
- [ ] PRD exists and follows `docs/prd-template.md` structure.
- [ ] TST exists and provides implementation validation coverage.

## 7. Rollout Safety
- [ ] Feature can be released without introducing new services.
- [ ] Vendor rate limit impact is checked during rollout.
- [ ] Expansion remains phased (no forced jump directly to full 50 if unstable).
