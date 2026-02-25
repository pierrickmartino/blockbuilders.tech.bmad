# Test Checklist – Additional Crypto Pairs

> Source PRD: `prd-additional-crypto-pairs.md`

## 1. Data Ingestion

- [x] OHLCV data is fetched for each newly supported pair from the existing vendor
- [x] Candles are stored in the existing `candles` table (no schema changes)
- [x] Data ingestion uses the same schema and format as BTC/USDT and ETH/USDT
- [x] Gap detection works correctly for new pairs
- [ ] Error handling during ingestion works correctly for new pairs
- [x] Historical data backfill completes successfully for new pairs
- [x] Incremental data updates work correctly for new pairs

## 2. Strategy Creation & Validation

- [x] Users can create a strategy using any asset in the curated list
- [x] API validation accepts all pairs in the expanded list
- [x] API validation rejects pairs not in the supported list
- [x] Strategies remain single-asset per strategy (no multi-asset)
- [x] Strategies remain single-timeframe per strategy
- [x] Asset selection is saved correctly in strategy JSON

## 3. UI Asset Picker

- [x] Strategy asset picker lists all expanded assets
- [x] Asset picker includes BTC/USDT and ETH/USDT alongside new pairs
- [x] Asset names are displayed correctly (proper formatting)
- [x] Picker is usable without excessive scrolling for 20-30 items
- [x] Picker works correctly on desktop
- [x] Picker works correctly on mobile

## 4. Backtesting with New Pairs

- [x] Backtest runs successfully for ADA/USDT
- [x] Backtest runs successfully for SOL/USDT
- [x] Backtest runs successfully for a representative set of new pairs
- [x] Backtest results (equity curve, metrics, trades) display correctly for new pairs
- [x] Backtest uses correct OHLCV data for the selected pair
- [x] Existing BTC/USDT and ETH/USDT backtests continue to work unchanged

## 5. Data Quality & Error Handling

- [ ] Pairs with data gaps show appropriate error messages to users
- [x] Attempting to backtest a pair with no ingested data fails gracefully with a clear message
- [x] Pairs with shorter history than the backtest range are handled gracefully
- [x] Data quality indicators (if present) work for new pairs

## 6. Vendor Dependencies

- [x] Each pair in the curated list is confirmed available from CryptoCompare (or current vendor)
- [x] API key quota is sufficient for the additional symbols
- [x] Rate limiting does not break ingestion when all pairs are being updated

## 7. Rollout Phasing

- [ ] Phase 1 pairs (8-12 most requested) can be enabled independently
- [ ] Phase 2 pairs can be added without code changes (configuration only)
- [ ] Adding a new pair does not require redeployment (if designed as config)

## 8. Backward Compatibility

- [x] Existing strategies using BTC/USDT continue to work
- [x] Existing strategies using ETH/USDT continue to work
- [ ] Existing backtest results are not affected
- [ ] No database migrations break existing data

## 9. Documentation

- [ ] Documentation reflects the new supported assets
- [x] Supported pairs list is updated in product docs
- [ ] Any user-facing help docs mention the expanded asset list

## 10. Edge Cases

- [ ] Very low-volume pair: backtest completes but may show warnings about data quality
- [ ] Pair delisted by vendor: clear error when trying to create/run a strategy
- [x] Concurrent backtests on different new pairs: no data cross-contamination
- [x] Pair name with special characters (if any): handled correctly in UI and API
