# Sentiment API Setup Guide

This document explains how to configure the market sentiment API integration for Blockbuilders in both sandbox (development) and production environments.

## Overview

Blockbuilders integrates three sentiment data sources:

| Provider | Data | Endpoint |
|----------|------|----------|
| Alternative.me | Fear & Greed Index | `https://api.alternative.me/fng/` |
| CoinGecko | Social mentions (Twitter followers) | `https://api.coingecko.com/api/v3/coins/{id}` |
| Binance Futures | Funding rates | `https://fapi.binance.com/fapi/v1/fundingRate` |

## Environment Variables

Add these to your `.env` file:

```bash
# Market sentiment APIs
ALTERNATIVE_ME_API_URL=https://api.alternative.me
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=CG-DEMO-KEY
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

### 2. CoinGecko (Social Mentions)

**Demo key works for development.** CoinGecko offers a free Demo API.

```bash
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=CG-DEMO-KEY
```

To get a demo key:
1. Go to [CoinGecko API](https://www.coingecko.com/en/api)
2. Sign up for free Demo API access
3. Replace `CG-DEMO-KEY` with your actual demo key

Rate limit (Demo): 10-30 calls/minute.

### 3. Binance Futures (Funding Rates)

**No API key required.** The public endpoint works without authentication.

```bash
BINANCE_FUTURES_API_URL=https://fapi.binance.com
```

Rate limit: 1200 requests/minute (IP-based).

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
     "mentions": {"value": 12450, "history": [...]},
     "funding": {"value": 0.0001, "history": [...]},
     "source_status": {
       "fear_greed": "ok",
       "mentions": "ok",
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

### 2. CoinGecko (Social Mentions)

**Upgrade to a paid plan for production** to avoid rate limits.

Options:
- **Demo API** (free): 10-30 calls/minute - may hit limits under load
- **Analyst Plan** (~$129/month): 500 calls/minute
- **Pro Plan** (~$449/month): Higher limits + priority support

```bash
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=CG-xxxxxxxxxxxxxxxxxxxx  # Your paid API key
```

To get a paid key:
1. Go to [CoinGecko API Pricing](https://www.coingecko.com/en/api/pricing)
2. Choose a plan based on expected traffic
3. Generate an API key from your dashboard

### 3. Binance Futures (Funding Rates)

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

The following assets have CoinGecko mappings for social mentions:

| Trading Pair | CoinGecko ID |
|--------------|--------------|
| BTC/USDT | bitcoin |
| ETH/USDT | ethereum |
| ADA/USDT | cardano |
| SOL/USDT | solana |
| MATIC/USDT | matic-network |
| LINK/USDT | chainlink |
| DOT/USDT | polkadot |
| XRP/USDT | ripple |
| DOGE/USDT | dogecoin |
| AVAX/USDT | avalanche-2 |
| LTC/USDT | litecoin |
| BCH/USDT | bitcoin-cash |
| ATOM/USDT | cosmos |
| NEAR/USDT | near |
| FIL/USDT | filecoin |

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
    "mentions": "unavailable",
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

### CoinGecko rate limit errors

Symptoms: `mentions` shows `"unavailable"` frequently

Solutions:
- Upgrade to a paid CoinGecko plan
- Increase cache TTL (edit `SENTIMENT_CACHE_TTL_SECONDS` in `backend/app/api/market.py`)

### Binance Futures returns empty data

Possible causes:
- Asset not available on Binance Futures (e.g., some altcoins)
- IP-based rate limiting

Solutions:
- Verify the trading pair exists on Binance Futures
- Check if your IP is blocked (try from different network)

### Fear & Greed history is incomplete

Alternative.me limits historical data. The API returns up to 30 days by default. For longer backtest periods, the history may be shorter than the backtest range.

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
