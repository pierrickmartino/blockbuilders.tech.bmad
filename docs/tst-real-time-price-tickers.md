# Test Checklist -- Real-Time Price Tickers

> Source PRD: `prd-real-time-price-tickers.md`

## 1. Market Overview Page

- [x] Market Overview page exists and is accessible from the main app navigation
- [x] Page is within the protected (authenticated) app area
- [x] Navigation link is visible in the header or sidebar
- [x] Page lists all supported assets from Section 3.4 in `docs/product.md`
- [x] Page title and layout are clear and consistent with the rest of the app

## 2. Ticker Data Display

- [x] Each row shows the pair symbol (e.g., BTC/USDT)
- [x] Each row shows the current price
- [x] Each row shows the 24h change percentage
- [x] 24h change percentage is green for positive values
- [x] 24h change percentage is red for negative values
- [x] Each row shows the 24h volume
- [ ] Each row shows a trend indicator arrow (up or down) based on price vs last update
- [ ] Trend arrow points up when price increased since last update
- [ ] Trend arrow points down when price decreased since last update

## 3. API -- GET /market/tickers

- [x] Endpoint returns an array of ticker rows for all supported pairs
- [x] Response includes `pair`, `price`, `change_24h_pct`, and `volume_24h` per item
- [x] Response includes an `as_of` timestamp
- [x] Response is cached briefly (3--5 seconds) to reduce vendor API calls
- [x] Backend proxies vendor responses (CryptoCompare) without exposing API keys
- [x] Returns 401 for unauthenticated requests (if the page is protected)
- [x] Returns valid data for all supported pairs

## 4. Auto-Refresh / Polling

- [x] Data refreshes automatically every 3--5 seconds without a full page reload
- [x] Price values update in place when new data arrives
- [ ] Trend arrows update correctly based on the price delta between polls
- [x] 24h change percentage updates on each refresh
- [x] Volume updates on each refresh
- [ ] No visible flicker or layout shift on refresh

## 5. Last Updated Timestamp

- [x] A "Last updated" timestamp is displayed on the page
- [x] Timestamp updates on each successful data refresh
- [x] Timestamp format is consistent with app-wide datetime formatting

## 6. Error & Empty States

- [x] If the vendor is down, the page shows an error state (not a blank page)
- [x] Error state message is user-friendly and suggests trying again later
- [ ] Stale data is shown with a "data may be stale" indicator when the vendor is unreachable
- [x] Page remains functional (navigable) even during vendor downtime
- [ ] If no pairs are configured, an appropriate empty state is shown

## 7. Responsive Design

- [x] Table layout is readable on desktop
- [ ] Table layout degrades gracefully on tablet
- [x] Table layout degrades gracefully on mobile (no horizontal scroll for core data)
- [ ] Sticky header works if implemented (optional per PRD)

## 8. Infrastructure & Architecture

- [x] Only one new backend router is added for market data
- [x] No new complex infrastructure is introduced (no WebSocket, no new databases)
- [x] No new data models are required (unless strictly necessary)
- [x] Frontend uses a lightweight polling mechanism (setInterval + fetch or similar)

## 9. Negative & Edge Cases

- [x] Price of zero or null is handled gracefully (e.g., displayed as a dash)
- [x] Extremely large or small prices are formatted correctly
- [ ] 24h change of 0% shows as neutral (not colored or explicitly zero)
- [x] Volume of zero is displayed correctly
- [x] Rapid navigation away from and back to the page does not cause stale polling intervals
- [ ] Multiple browser tabs do not cause excessive API calls beyond normal polling
