# Test Checklist – Volatility Metrics (Market Overview)

> Source PRD: `prd-volatility-metrics-market-overview.md`

## 1. UI Display – Desktop Table

- [x] Market Overview table shows a "Vol (Std)" column for each pair
- [x] Market Overview table shows a "Vol (ATR%)" column for each pair
- [x] Market Overview table shows a "Vol %ile" column for each pair
- [x] Column headers use short labels: Vol (Std), Vol (ATR%), Vol %ile
- [x] Values update with the existing polling cadence (every 3-5 seconds)

## 2. UI Display – Mobile Cards

- [x] Mobile market cards show volatility fields for each pair
- [x] Volatility fields are readable and not clipped on mobile
- [x] Mobile cards stack cleanly with the additional volatility data

## 3. Volatility Calculations

- [x] Std Dev Volatility is computed as standard deviation of log returns over a 30-candle window
- [x] Log returns are computed as `ln(close_t / close_{t-1})`
- [x] ATR Volatility is computed as ATR over a 30-candle window divided by current close, expressed as %
- [x] Percentile ranks current volatility value against the last 365 candles (1-year history)
- [x] Percentile value is between 0 and 100
- [x] Calculations use existing OHLCV candles from the database
- [x] Timeframe matches the Market Overview timeframe (default 1d)

## 4. API Response

- [x] `GET /market/tickers` response includes `volatility_stddev` field per pair
- [x] `GET /market/tickers` response includes `volatility_atr_pct` field per pair
- [x] `GET /market/tickers` response includes `volatility_percentile_1y` field per pair
- [x] Response includes `as_of` timestamp
- [x] Response shape matches the documented example structure

## 5. Insufficient Data Handling

- [ ] When insufficient history exists for a pair, volatility fields show `N/A`
- [ ] `N/A` values include a tooltip explaining insufficient data
- [ ] Tooltip text is helpful (e.g., "Not enough historical data to compute volatility")
- [ ] `N/A` is displayed instead of zeros for missing values
- [ ] Pairs with sufficient data still show correct values when others show `N/A`

## 6. Defaults & Configuration

- [x] Rolling window defaults to 30 candles
- [x] History window for percentile defaults to 365 candles
- [x] Defaults are applied automatically without user configuration

## 7. Caching & Performance

- [x] Volatility metrics are cached with the existing ticker cache
- [x] No extra vendor calls are made for volatility data
- [x] Volatility values refresh with the same tick data payload
- [ ] Page load time is not noticeably impacted by volatility calculations

## 8. Edge Cases

- [x] Pair with exactly 30 candles of history: volatility computes correctly
- [ ] Pair with fewer than 30 candles: shows `N/A`
- [x] Pair with exactly 365 candles: percentile computes correctly
- [ ] Pair with fewer than 365 candles for percentile but 30+ for volatility: volatility shows, percentile shows `N/A`
- [x] Pair with all identical closes (zero volatility): std dev shows 0, percentile handles correctly
- [x] Newly added pair with minimal data: graceful handling without errors

## 9. Dependencies & Infrastructure

- [x] Uses existing OHLCV data only (no new vendor integration)
- [x] No new infrastructure or complex models are added
- [ ] Computation uses simple numpy/pandas helpers already in the backend
- [x] No new database tables or schema changes
