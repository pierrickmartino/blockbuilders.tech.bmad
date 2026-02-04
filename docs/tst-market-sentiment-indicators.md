# Test Checklist – Market Sentiment Indicators

> Source PRD: `prd-market-sentiment-indicators.md`

## 1. Market Overview – Sentiment Panel

- [ ] A compact "Market Sentiment" panel appears on the Market Overview page (/market)
- [ ] Panel is positioned above or alongside the tickers table
- [ ] Panel is responsive and stacks as cards on mobile

### 1.1 Fear & Greed Index
- [ ] Current Fear & Greed value is displayed (0-100 scale)
- [ ] A gauge visualization shows the current value
- [ ] A 30-day sparkline shows historical trend
- [ ] Helper text displays "Risk-on" or "Risk-off" based on the latest value
- [ ] High values (e.g., >60) show "Risk-on"
- [ ] Low values (e.g., <40) show "Risk-off"

### 1.2 Long/Short Ratio
- [ ] Latest Long/Short Ratio value is displayed per selected asset
- [ ] A 7-day sparkline shows historical trend
- [ ] Values >1 are indicated as bullish
- [ ] Values <1 are indicated as bearish
- [ ] Asset selector matches the existing Market Overview asset selector

### 1.3 Funding Rate
- [ ] Latest Funding Rate value is displayed per selected asset
- [ ] A 7-day sparkline shows historical trend
- [ ] Asset selector matches the existing Market Overview asset selector

## 2. Backtest Results – Sentiment Strip

- [ ] A "Sentiment During Backtest" strip appears below the backtest summary
- [ ] Strip shows Fear & Greed value at the start of the backtest range
- [ ] Strip shows Fear & Greed value at the end of the backtest range
- [ ] Strip shows average Long/Short Ratio over the backtest range
- [ ] Strip shows average Funding Rate over the backtest range
- [ ] Single-line sparklines are displayed for each indicator
- [ ] Sparklines cover the 7-30 day range as available

## 3. API – Market Sentiment Endpoint

- [ ] `GET /market/sentiment?asset=BTC/USDT` returns a valid response
- [ ] Response includes `as_of` timestamp
- [ ] Response includes `asset` field matching the query parameter
- [ ] Response includes `fear_greed` with `value` and `history` array
- [ ] Response includes `long_short_ratio` with `value` and `history` array
- [ ] Response includes `funding` with `value` and `history` array
- [ ] Response includes `source_status` with status per indicator
- [ ] Default asset (BTC/USDT) works when no asset parameter is provided
- [ ] Different assets return asset-specific Long/Short Ratio and Funding Rate
- [ ] Fear & Greed is the same across all assets (it is market-wide)

## 4. API – Backtest Sentiment Endpoint

- [ ] `GET /backtests/{run_id}/sentiment` returns a valid response
- [ ] Response includes start/end/average values for each indicator
- [ ] Response includes short history aligned to the backtest run range
- [ ] Invalid `run_id` returns 404 with a clear error message
- [ ] Backtest run with no overlapping sentiment data returns empty/null values gracefully

## 5. Data Sources

- [ ] Fear & Greed Index data is fetched from Alternative.me
- [ ] Long/Short Ratio data is fetched from Binance Futures globalLongShortAccountRatio
- [ ] Funding Rate data is fetched from Binance Futures fundingRate
- [ ] No API keys are required for any data source
- [ ] Data source URLs and parameters are correct

## 6. Caching & Freshness

- [ ] Market sentiment responses are cached in Redis
- [ ] Cache TTL is 15 minutes
- [ ] Subsequent requests within 15 minutes return cached data
- [ ] Cache expiry triggers a fresh fetch from providers
- [ ] Backtest sentiment queries reuse cached data where applicable

## 7. Error Handling – All Providers Fail

- [ ] When all three providers fail, API returns 503 status
- [ ] UI shows a friendly error message (not a raw error)
- [ ] Page does not crash or break

## 8. Error Handling – Partial Provider Failure

- [ ] When Fear & Greed fails but others succeed, Long/Short and Funding still render
- [ ] When Long/Short fails but others succeed, Fear & Greed and Funding still render
- [ ] When Funding fails but others succeed, Fear & Greed and Long/Short still render
- [ ] Failed indicators show a "data unavailable" badge in the UI
- [ ] `source_status` in the API response reflects the failure (e.g., "error" or "unavailable")
- [ ] Partial data response includes correct `source_status` flags

## 9. Asset Selector Integration

- [ ] Changing the asset in the Market Overview updates Long/Short Ratio data
- [ ] Changing the asset in the Market Overview updates Funding Rate data
- [ ] Fear & Greed Index does not change when asset is changed (market-wide indicator)
- [ ] Default asset is BTC/USDT

## 10. Responsive Layout

- [ ] Sentiment panel renders correctly on desktop
- [ ] Sentiment panel stacks as cards on mobile
- [ ] Sparklines are readable on mobile screens
- [ ] Gauge visualization is usable on mobile
- [ ] Backtest sentiment strip is readable on mobile

## 11. Edge Cases

- [ ] Very old backtest run (before sentiment data availability): graceful empty state
- [ ] Backtest run spanning only a few hours: sentiment values may be limited, handles gracefully
- [ ] Alternative.me returns unexpected data format: error is caught and logged
- [ ] Binance API returns rate limit error: cached data is served, error is logged
- [ ] Sentiment panel with all N/A values: displays without layout breakage
- [ ] Multiple rapid asset selector changes: no race conditions in data display

## 12. Dependencies

- [ ] No custom sentiment scoring or ML models are introduced
- [ ] No additional charts beyond simple gauges and sparklines
- [ ] Integration follows existing backend caching patterns
- [ ] No user configuration or saved preferences for sentiment
