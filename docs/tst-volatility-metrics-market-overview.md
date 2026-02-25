# Test Checklist – Volatility Metrics (Market Overview)

> Source PRD: `prd-volatility-metrics-market-overview.md`

## 1. UI Display – Desktop Table

- [ ] Market Overview table shows a "Vol (Std)" column for each pair
- [ ] Market Overview table shows a "Vol (ATR%)" column for each pair
- [ ] Market Overview table shows a "Vol %ile" column for each pair
- [ ] Column headers use short labels: Vol (Std), Vol (ATR%), Vol %ile
- [ ] Values update with the existing polling cadence (every 3-5 seconds)

## 2. UI Display – Mobile Cards

- [ ] Mobile market cards show volatility fields for each pair
- [ ] Volatility fields are readable and not clipped on mobile
- [ ] Mobile cards stack cleanly with the additional volatility data

## 3. Volatility Calculations

- [ ] Std Dev Volatility is computed as standard deviation of log returns over a 30-candle window
- [ ] Log returns are computed as `ln(close_t / close_{t-1})`
- [ ] ATR Volatility is computed as ATR over a 30-candle window divided by current close, expressed as %
- [ ] Percentile ranks current volatility value against the last 365 candles (1-year history)
- [ ] Percentile value is between 0 and 100
- [ ] Calculations use existing OHLCV candles from the database
- [ ] Timeframe matches the Market Overview timeframe (default 1d)

## 4. API Response

- [x] `GET /market/tickers` response includes `volatility_stddev` field per pair
- [x] `GET /market/tickers` response includes `volatility_atr_pct` field per pair
- [x] `GET /market/tickers` response includes `volatility_percentile_1y` field per pair
- [ ] Response includes `as_of` timestamp
- [ ] Response shape matches the documented example structure

## 5. Insufficient Data Handling

- [ ] When insufficient history exists for a pair, volatility fields show `N/A`
- [ ] `N/A` values include a tooltip explaining insufficient data
- [ ] Tooltip text is helpful (e.g., "Not enough historical data to compute volatility")
- [ ] `N/A` is displayed instead of zeros for missing values
- [ ] Pairs with sufficient data still show correct values when others show `N/A`

## 6. Defaults & Configuration

- [ ] Rolling window defaults to 30 candles
- [ ] History window for percentile defaults to 365 candles
- [ ] Defaults are applied automatically without user configuration

## 7. Caching & Performance

- [ ] Volatility metrics are cached with the existing ticker cache
- [ ] No extra vendor calls are made for volatility data
- [ ] Volatility values refresh with the same tick data payload
- [ ] Page load time is not noticeably impacted by volatility calculations

## 8. Edge Cases

- [ ] Pair with exactly 30 candles of history: volatility computes correctly
- [ ] Pair with fewer than 30 candles: shows `N/A`
- [ ] Pair with exactly 365 candles: percentile computes correctly
- [ ] Pair with fewer than 365 candles for percentile but 30+ for volatility: volatility shows, percentile shows `N/A`
- [ ] Pair with all identical closes (zero volatility): std dev shows 0, percentile handles correctly
- [ ] Newly added pair with minimal data: graceful handling without errors

## 9. Dependencies & Infrastructure

- [ ] Uses existing OHLCV data only (no new vendor integration)
- [ ] No new infrastructure or complex models are added
- [ ] Computation uses simple numpy/pandas helpers already in the backend
- [ ] No new database tables or schema changes
