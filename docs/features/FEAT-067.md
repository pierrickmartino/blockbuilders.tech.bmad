# PRD: Real-Time Price Tickers

## Summary
Add a simple market overview that displays live price tickers for all supported crypto pairs. Each row shows current price, 24h change %, 24h volume, and a basic trend indicator (up/down). Data refreshes every few seconds via polling (WebSocket optional later).

## Goals
- Give users quick market context while building or backtesting strategies.
- Keep the UI and data feed integration minimal.
- Reuse the existing supported asset list and data vendor.

## Non-Goals
- Full charting, order book, or depth data.
- Trading actions or alerts from the ticker view.
- Multi-exchange routing or complex data normalization.

## User Stories
- As a user, I can see live prices for all supported pairs in one place.
- As a user, I can quickly spot which assets are up or down today.
- As a user, I can check market context without leaving the app.

## Scope
### UI Placement (Minimal)
- Add a **Market Overview** page in the protected app area.
- Navigation link in the main app header/sidebar.

### Data Display (per pair)
- Pair symbol (e.g., BTC/USDT)
- Current price
- 24h change % (green for positive, red for negative)
- 24h volume
- Trend indicator (▲ / ▼) based on price vs last update

### Update Behavior
- Polling every 3–5 seconds (default).
- WebSocket integration is optional and deferred unless already available from the vendor.

### Data Source
- Use the existing market data vendor (CryptoCompare) as the source of truth.
- Backend proxies vendor responses to avoid exposing API keys.

## API
### Endpoint
- `GET /market/tickers`
  - Returns an array of ticker rows for all supported pairs.
  - Response cached briefly (e.g., 3–5 seconds) to reduce vendor calls.

### Response Shape (example)
```json
{
  "items": [
    {
      "pair": "BTC/USDT",
      "price": 68250.12,
      "change_24h_pct": 1.23,
      "volume_24h": 123456789.0
    }
  ],
  "as_of": "2026-01-01T12:00:00Z"
}
```

## UX/UI Notes
- Simple table layout with sticky header (optional).
- Sorting is optional; default order matches supported asset list.
- Show a subtle “Last updated” timestamp.
- If data is unavailable, show a lightweight empty/error state and keep the page functional.

## Acceptance Criteria
- Market Overview page lists all supported assets from Section 3.4 in `docs/product.md`.
- Each row includes price, 24h change %, 24h volume, and trend arrow.
- Data refreshes automatically every few seconds without a full page reload.
- The UI handles vendor downtime gracefully (shows error or stale state).
- No new complex infrastructure is introduced.

## Implementation Notes (Minimal)
- Add one backend router for market data with a single endpoint.
- Frontend page uses a lightweight polling hook (setInterval + fetch).
- Keep data mapping simple; avoid introducing new data models unless strictly necessary.
