# PRD: Volatility Metrics (Market Overview)

## Summary
Add simple volatility metrics to the Market Overview so users can compare current and historical volatility per pair. The metrics rely only on existing OHLCV data and lightweight statistics.

## Goals
- Help users gauge risk by showing how volatile each pair is right now.
- Provide context vs. the last year (percentile ranking).
- Keep the calculations simple and easy to explain.

## Non-Goals
- No new trading signals or alerts.
- No advanced statistical models (GARCH, regime detection, etc.).
- No additional data vendors or streaming sources.

## User Stories
- As a user, I can see which pairs are currently more volatile than usual.
- As a user, I can compare pairs at a glance to match my risk tolerance.
- As a user, I can understand whether markets are unusually calm or chaotic.

## Scope
### UI Placement
- Extend the existing **Market Overview** page (`/market`).
- Add volatility columns to the table and fields to the mobile cards.

### Data Display (per pair)
- **Volatility (Std Dev):** Standard deviation of log returns over a rolling window (e.g., 30 periods).
- **Volatility (ATR %):** ATR over the same window, expressed as % of current price.
- **Volatility Percentile:** Current volatility rank vs. the last 1-year history (0–100%).

### Update Behavior
- Reuse the existing polling cadence (every 3–5 seconds).
- Volatility values can refresh with the same tick data payload.

## Data & Calculations
### Inputs
- Existing OHLCV candles from the database.
- Timeframe: match the Market Overview timeframe (default 1d unless already defined).

### Calculations (Simple)
- **Log returns:** `ln(close_t / close_{t-1})`.
- **Std Dev Volatility:** Standard deviation of log returns over a rolling window (e.g., 30 candles).
- **ATR Volatility:** ATR over the same window, divided by current close to express %.
- **Percentile:** Compare the current volatility value to historical daily values over the last 1 year.

### Defaults
- Rolling window: 30 candles.
- History window for percentile: 365 candles (1-year, time-aligned with available data).
- If insufficient data exists, show `N/A` with a tooltip.

## API
### Endpoint
- Extend `GET /market/tickers` to include volatility metrics.

### Response Shape (example)
```json
{
  "items": [
    {
      "pair": "BTC/USDT",
      "price": 68250.12,
      "change_24h_pct": 1.23,
      "volume_24h": 123456789.0,
      "volatility_stddev": 0.024,
      "volatility_atr_pct": 3.1,
      "volatility_percentile_1y": 80
    }
  ],
  "as_of": "2026-01-01T12:00:00Z"
}
```

## UX/UI Notes
- Keep labels short: **Vol (Std)**, **Vol (ATR%)**, **Vol %ile**.
- Tooltip copy explains: “Percentile compares today’s volatility to the last year.”
- Display `N/A` for missing values instead of zeros.

## Acceptance Criteria
- Market Overview shows volatility metrics per pair (table + mobile cards).
- Volatility percentile compares current volatility against 1-year history.
- Uses existing OHLCV data; no new vendor integration.
- Handles insufficient history gracefully with `N/A` and tooltip.
- No new infrastructure or complex models added.

## Implementation Notes (Minimal)
- Compute volatility metrics in the existing market data service using simple numpy/pandas helpers already in the backend.
- Cache volatility outputs with the existing ticker cache to avoid extra vendor calls.
- Keep UI changes limited to new columns/fields and tooltips.
