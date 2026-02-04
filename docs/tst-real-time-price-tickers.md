# Test Checklist -- Real-Time Price Tickers

> Source PRD: `prd-real-time-price-tickers.md`

## 1. Market Overview Page

- [ ] Market Overview page exists and is accessible from the main app navigation
- [ ] Page is within the protected (authenticated) app area
- [ ] Navigation link is visible in the header or sidebar
- [ ] Page lists all supported assets from Section 3.4 in `docs/product.md`
- [ ] Page title and layout are clear and consistent with the rest of the app

## 2. Ticker Data Display

- [ ] Each row shows the pair symbol (e.g., BTC/USDT)
- [ ] Each row shows the current price
- [ ] Each row shows the 24h change percentage
- [ ] 24h change percentage is green for positive values
- [ ] 24h change percentage is red for negative values
- [ ] Each row shows the 24h volume
- [ ] Each row shows a trend indicator arrow (up or down) based on price vs last update
- [ ] Trend arrow points up when price increased since last update
- [ ] Trend arrow points down when price decreased since last update

## 3. API -- GET /market/tickers

- [ ] Endpoint returns an array of ticker rows for all supported pairs
- [ ] Response includes `pair`, `price`, `change_24h_pct`, and `volume_24h` per item
- [ ] Response includes an `as_of` timestamp
- [ ] Response is cached briefly (3--5 seconds) to reduce vendor API calls
- [ ] Backend proxies vendor responses (CryptoCompare) without exposing API keys
- [ ] Returns 401 for unauthenticated requests (if the page is protected)
- [ ] Returns valid data for all supported pairs

## 4. Auto-Refresh / Polling

- [ ] Data refreshes automatically every 3--5 seconds without a full page reload
- [ ] Price values update in place when new data arrives
- [ ] Trend arrows update correctly based on the price delta between polls
- [ ] 24h change percentage updates on each refresh
- [ ] Volume updates on each refresh
- [ ] No visible flicker or layout shift on refresh

## 5. Last Updated Timestamp

- [ ] A "Last updated" timestamp is displayed on the page
- [ ] Timestamp updates on each successful data refresh
- [ ] Timestamp format is consistent with app-wide datetime formatting

## 6. Error & Empty States

- [ ] If the vendor is down, the page shows an error state (not a blank page)
- [ ] Error state message is user-friendly and suggests trying again later
- [ ] Stale data is shown with a "data may be stale" indicator when the vendor is unreachable
- [ ] Page remains functional (navigable) even during vendor downtime
- [ ] If no pairs are configured, an appropriate empty state is shown

## 7. Responsive Design

- [ ] Table layout is readable on desktop
- [ ] Table layout degrades gracefully on tablet
- [ ] Table layout degrades gracefully on mobile (no horizontal scroll for core data)
- [ ] Sticky header works if implemented (optional per PRD)

## 8. Infrastructure & Architecture

- [ ] Only one new backend router is added for market data
- [ ] No new complex infrastructure is introduced (no WebSocket, no new databases)
- [ ] No new data models are required (unless strictly necessary)
- [ ] Frontend uses a lightweight polling mechanism (setInterval + fetch or similar)

## 9. Negative & Edge Cases

- [ ] Price of zero or null is handled gracefully (e.g., displayed as a dash)
- [ ] Extremely large or small prices are formatted correctly
- [ ] 24h change of 0% shows as neutral (not colored or explicitly zero)
- [ ] Volume of zero is displayed correctly
- [ ] Rapid navigation away from and back to the page does not cause stale polling intervals
- [ ] Multiple browser tabs do not cause excessive API calls beyond normal polling
