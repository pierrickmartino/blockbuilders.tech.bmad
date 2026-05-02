# PRD: Market Sentiment Indicators (Market Overview)

## 1. Summary
Add lightweight market sentiment indicators to give qualitative context beyond price during market overview and backtest review. Use simple gauges and trend lines for Fear & Greed Index, Long/Short Ratio, and funding rates sourced from third-party providers (Alternative.me, Binance Futures). Keep the implementation minimal and read-only.

## 2. Goals
- Provide a quick sentiment snapshot alongside market prices.
- Show short trend context (7–30 days) without complex analytics.
- Help users interpret backtest periods with basic sentiment context.
- Integrate with existing market overview page and backend caching patterns.

## 3. Non-Goals
- No predictive analytics, alerts, or trading signals.
- No custom sentiment scoring or ML.
- No user configuration or saved preferences for sentiment.
- No additional charts beyond simple gauges/sparklines.

## 4. User Stories
- As a trader, I want to see Fear & Greed so I can quickly gauge market psychology.
- As a trader, I want to see Long/Short Ratio to understand trader positioning sentiment.
- As a trader, I want to see funding rates to spot overly long/short positioning.
- As a trader, I want sentiment context during a backtest so I can interpret performance beyond price alone.

## 5. UX Scope
### 5.1 Market Overview Page (/market)
Add a compact “Market Sentiment” panel above or alongside the tickers table.

**Display:**
- **Fear & Greed Index**: current value with a 0–100 gauge + 30-day sparkline.
- **Long/Short Ratio** (per selected asset): 7-day sparkline and latest value (>1 = bullish, <1 = bearish).
- **Funding Rate** (per selected asset): 7-day sparkline and latest value.
- Simple helper text: "Risk-on / Risk-off" derived from latest Fear & Greed value.

**Interaction:**
- Use the same asset selector as market overview (default: BTC/USDT).
- No custom filters beyond the existing asset selector.

### 5.2 Backtest Results (Context Strip)
Add a small "Sentiment During Backtest" strip below the backtest summary:
- Fear & Greed value at start/end of the backtest range.
- Average Long/Short Ratio and funding rate over the backtest range.
- A single-line sparkline for each indicator (same 7–30 day range as available).

## 6. Data Sources & Providers
- **Fear & Greed Index:** Alternative.me (no API key required).
- **Long/Short Ratio:** Binance Futures globalLongShortAccountRatio (no API key required).
- **Funding Rates:** Binance Futures fundingRate (no API key required).

## 7. API & Data Contract (Minimal)
### 7.1 Endpoints
- `GET /market/sentiment?asset=BTC/USDT`
  - Returns latest values + short history for three indicators.
- `GET /backtests/{run_id}/sentiment`
  - Returns start/end/average values for each indicator plus short history aligned to the run range.

### 7.2 Response Shape (Example)
```json
{
  "as_of": "2026-01-01T12:00:00Z",
  "asset": "BTC/USDT",
  "fear_greed": {"value": 62, "history": [{"t": "2025-12-02", "v": 45}]},
  "long_short_ratio": {"value": 1.25, "history": [{"t": "2025-12-26", "v": 1.15}]},
  "funding": {"value": 0.012, "history": [{"t": "2025-12-26", "v": 0.008}]},
  "source_status": {
    "fear_greed": "ok",
    "long_short_ratio": "ok",
    "funding": "partial"
  }
}
```

## 8. Caching & Freshness
- Cache market sentiment responses in Redis with a 15-minute TTL.
- Backtest sentiment queries can reuse cached data; no additional storage.
- If a provider fails, return partial data with `source_status` flags.

## 9. Error Handling
- If all providers fail, return 503 with a friendly message in UI.
- If one provider fails, still render the other indicators with a “data unavailable” badge.

## 10. Acceptance Criteria
- Market overview shows a sentiment panel with Fear & Greed, Long/Short Ratio, and funding rate using gauges/sparklines.
- Backtest results show a compact sentiment strip (start/end/average values).
- Data is cached and partial failures do not break the page.
- UI remains responsive on mobile (stacked cards).

## 11. Open Questions
- None. All providers are now Binance (Long/Short Ratio, Funding Rates) and Alternative.me (Fear & Greed).
