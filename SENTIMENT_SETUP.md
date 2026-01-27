# Sentiment API Setup Guide

This document explains how to configure the market sentiment API integration for Blockbuilders in both sandbox (development) and production environments.

## Overview

Blockbuilders integrates three sentiment data sources:

| Provider | Data | Endpoint |
|----------|------|----------|
| Alternative.me | Fear & Greed Index | `https://api.alternative.me/fng/` |
| Binance Futures | Long/Short Ratio | `https://fapi.binance.com/futures/data/globalLongShortAccountRatio` |
| Binance Futures | Funding rates | `https://fapi.binance.com/fapi/v1/fundingRate` |

## Environment Variables

Add these to your `.env` file:

```bash
# Market sentiment APIs
ALTERNATIVE_ME_API_URL=https://api.alternative.me
BINANCE_FUTURES_API_URL=https://fapi.binance.com
```

---

## Sandbox Setup (Development)

### 1. Alternative.me (Fear & Greed)

**No API key required.** The public endpoint works without authentication.

```bash
ALTERNATIVE_ME_API_URL=https://api.alternative.me
```

Rate limit: ~30 requests/minute (public).

### 2. Binance Futures (Long/Short Ratio & Funding Rates)

**No API key required.** Both public endpoints work without authentication.

```bash
BINANCE_FUTURES_API_URL=https://fapi.binance.com
```

Rate limit: 1200 requests/minute (IP-based).

**Long/Short Ratio interpretation:**
- Ratio > 1: More traders are long (bullish sentiment)
- Ratio < 1: More traders are short (bearish sentiment)
- Ratio = 1: Equal long/short positions (neutral)

### Testing the Integration

1. Start the backend:
   ```bash
   cd backend
   docker-compose up -d
   ```

2. Test the sentiment endpoint:
   ```bash
   curl -X GET "http://localhost:8000/market/sentiment?asset=BTC/USDT" \
     -H "Authorization: Bearer <your-jwt-token>"
   ```

3. Expected response:
   ```json
   {
     "as_of": "2026-01-22T12:00:00Z",
     "asset": "BTC/USDT",
     "fear_greed": {"value": 62, "history": [...]},
     "long_short_ratio": {"value": 1.25, "history": [...]},
     "funding": {"value": 0.0001, "history": [...]},
     "source_status": {
       "fear_greed": "ok",
       "long_short_ratio": "ok",
       "funding": "ok"
     }
   }
   ```

---

## Production Setup

### 1. Alternative.me (Fear & Greed)

**Same as sandbox.** No authentication needed.

```bash
ALTERNATIVE_ME_API_URL=https://api.alternative.me
```

Consider implementing additional error handling for occasional downtime.

### 2. Binance Futures (Long/Short Ratio & Funding Rates)

**Same as sandbox.** No authentication needed for public data.

```bash
BINANCE_FUTURES_API_URL=https://fapi.binance.com
```

For production, ensure your server IP is not rate-limited. Consider:
- Using a static IP
- Implementing exponential backoff on 429 responses

---

## Caching Configuration

Sentiment data is cached in Redis to reduce API calls:

| Data Type | Cache TTL | Cache Key Pattern |
|-----------|-----------|-------------------|
| Market sentiment | 15 minutes | `market:sentiment:{asset}` |
| Backtest sentiment | Not cached | Fetched on demand |

The 15-minute cache ensures:
- Reduced API costs
- Faster response times
- Graceful handling of temporary provider outages

---

## Supported Assets

All trading pairs available on Binance Futures are supported for Long/Short Ratio and Funding Rate data. Common pairs include:

| Trading Pair | Binance Symbol |
|--------------|----------------|
| BTC/USDT | BTCUSDT |
| ETH/USDT | ETHUSDT |
| ADA/USDT | ADAUSDT |
| SOL/USDT | SOLUSDT |
| MATIC/USDT | MATICUSDT |
| LINK/USDT | LINKUSDT |
| DOT/USDT | DOTUSDT |
| XRP/USDT | XRPUSDT |
| DOGE/USDT | DOGEUSDT |
| AVAX/USDT | AVAXUSDT |
| LTC/USDT | LTCUSDT |
| BCH/USDT | BCHUSDT |
| ATOM/USDT | ATOMUSDT |
| NEAR/USDT | NEARUSDT |
| FIL/USDT | FILUSDT |

---

## Error Handling

The API handles partial failures gracefully:

- If **one provider fails**: Other indicators still return; `source_status` shows `"unavailable"` for the failed source
- If **all providers fail**: Returns HTTP 503 with message "All sentiment providers unavailable"
- **Frontend behavior**: Shows "Data unavailable" badge for missing indicators

Example partial failure response:
```json
{
  "source_status": {
    "fear_greed": "ok",
    "long_short_ratio": "unavailable",
    "funding": "ok"
  }
}
```

---

## Troubleshooting

### "All sentiment providers unavailable" (503)

1. Check network connectivity from your server
2. Verify API URLs are correct in `.env`
3. Check if providers are experiencing downtime
4. Review backend logs: `docker logs blockbuilders-api`

### Binance Futures returns empty data

Possible causes:
- Asset not available on Binance Futures (e.g., some altcoins)
- IP-based rate limiting

Solutions:
- Verify the trading pair exists on Binance Futures
- Check if your IP is blocked (try from different network)

### Fear & Greed history is incomplete

Alternative.me limits historical data. The API returns up to 30 days by default. For longer backtest periods, the history may be shorter than the backtest range.

### Long/Short Ratio shows unexpected values

The Long/Short Ratio is based on Binance's global account ratio data, which measures the proportion of net long vs short positions across all accounts. Values typically range from 0.5 to 2.0:
- Values > 1.5: Very bullish sentiment (many more longs than shorts)
- Values 1.1 - 1.5: Bullish sentiment
- Values 0.9 - 1.1: Neutral sentiment
- Values 0.67 - 0.9: Bearish sentiment
- Values < 0.67: Very bearish sentiment (many more shorts than longs)

---

## API Reference

### GET /market/sentiment

Returns current sentiment indicators for an asset.

**Query Parameters:**
- `asset` (optional): Trading pair, default `BTC/USDT`

**Response:** `MarketSentimentResponse`

### GET /backtests/{run_id}/sentiment

Returns sentiment context for a specific backtest period.

**Path Parameters:**
- `run_id`: Backtest run UUID

**Response:** `BacktestSentimentResponse` with start/end/average values aligned to the backtest date range.
