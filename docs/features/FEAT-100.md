# FEAT-100: Market Indicator Inspection Chart

## Goal
Give users a read-only chart inspection view from the Market page where they can verify stored OHLCV prices and visually compare selected indicator values, such as RSI(14) and EMA(20), against the underlying asset candles that drive strategy backtests.

## Non-goals
- This feature does not create, edit, or run strategies.
- This feature does not change indicator formulas, backtest execution rules, or signal generation.
- This feature does not add new market data vendors, live trading data streams, or tick/order book data.
- This feature does not support multi-asset comparison charts.
- This feature does not allow users to save chart layouts or indicator presets.
- This feature does not expose private strategy definitions or backtest trades.

## Acceptance Criteria
1. Given an authenticated user is on the Market page, when they choose an asset from the market list, then a chart side panel opens for that asset and covers approximately 80% of the viewport width on desktop.
2. Given the chart side panel is open, when OHLCV data exists for the selected asset and timeframe, then the panel displays a candlestick price chart using the stored open, high, low, close, and volume values.
3. Given the chart side panel is open, when the user hovers or focuses a candle, then the UI shows the candle timestamp and its stored open, high, low, close, and volume values.
4. Given the chart side panel is open, when the user opens the indicator selector, then the selector lists the indicators currently available to strategy blocks.
5. Given the user selects EMA with period 20, when the chart updates, then EMA(20) is displayed on the price chart and its values are aligned to the same candles as the price data.
6. Given the user selects RSI with period 14, when the chart updates, then RSI(14) is displayed in an indicator pane and its values are aligned to the same candles as the price data.
7. Given multiple indicators are selected, when the chart updates, then all selected indicators remain visible with clear labels that include indicator name and period.
8. Given an indicator has insufficient warm-up candles for a value, when the chart renders those early candles, then the missing indicator values are shown as unavailable rather than zero.
9. Given the selected asset has no stored candles for the selected timeframe or date range, when the side panel opens, then the panel shows an empty state explaining that no stored OHLCV data is available.
10. Given the side panel is open, when the user closes it, then the Market page remains on the same asset list state without navigating away.

## API Contract

### New endpoint: `GET /market/chart-data`

Returns stored OHLCV candles and selected indicator series for one asset and timeframe. The endpoint is protected and requires the same authentication as the Market page.

**Query parameters**

| Name | Required | Type | Description |
|---|---:|---|---|
| `asset` | yes | string | Supported asset pair, for example `BTC/USDT`. |
| `timeframe` | yes | string | Supported candle timeframe. |
| `start` | no | ISO 8601 timestamp | Inclusive start bound. |
| `end` | no | ISO 8601 timestamp | Inclusive end bound. |
| `indicators` | no | string | Comma-separated indicator requests using existing indicator keys and parameters, for example `ema:20,rsi:14`. |

**Response: `200 OK`**

```json
{
  "asset": "BTC/USDT",
  "timeframe": "1d",
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-04-30T00:00:00Z",
  "candles": [
    {
      "timestamp": "2026-01-01T00:00:00Z",
      "open": 42000.0,
      "high": 43100.0,
      "low": 41800.0,
      "close": 42950.0,
      "volume": 123456.78
    }
  ],
  "indicators": [
    {
      "key": "ema",
      "label": "EMA(20)",
      "parameters": { "period": 20 },
      "pane": "price",
      "points": [
        { "timestamp": "2026-01-01T00:00:00Z", "value": null },
        { "timestamp": "2026-01-20T00:00:00Z", "value": 42510.25 }
      ]
    },
    {
      "key": "rsi",
      "label": "RSI(14)",
      "parameters": { "period": 14 },
      "pane": "oscillator",
      "points": [
        { "timestamp": "2026-01-01T00:00:00Z", "value": null },
        { "timestamp": "2026-01-15T00:00:00Z", "value": 54.6 }
      ]
    }
  ],
  "data_status": {
    "has_candles": true,
    "earliest_candle": "2024-01-01T00:00:00Z",
    "latest_candle": "2026-04-30T00:00:00Z"
  }
}
```

**Error responses**

- `400 Bad Request` when the asset, timeframe, date range, or indicator request is invalid.
- `401 Unauthorized` when the user is not authenticated.
- `404 Not Found` when the asset is not supported.

## Data Model Changes
- No new tables or persisted fields are required.
- The feature reads existing `candles` rows keyed by asset, timeframe, and timestamp.
- Indicator series are returned for inspection and are not persisted by this feature.

## UI Behaviour
- The Market page keeps the existing asset list as the entry point.
- Each asset row or card has an affordance to inspect the chart for that asset.
- Opening the chart displays a side panel over the Market page; on desktop it covers approximately 80% of the viewport width, and on smaller screens it uses the available screen width.
- The side panel header shows the selected asset, timeframe, data availability range, and a close control.
- The main chart area shows stored OHLCV candles with volume visible.
- A candle tooltip or focused data readout shows timestamp, open, high, low, close, and volume.
- The indicator selector allows users to add and remove indicators from the available strategy indicator list.
- Selected indicators display with labels that include their configured parameters, such as `EMA(20)` and `RSI(14)`.
- Price-based overlays such as EMA display on the price chart; oscillator indicators such as RSI display in a separate indicator pane.
- Empty, loading, and error states are visible inside the side panel without disrupting the underlying Market page.

## Implementation Notes

**Rendering library:** The chart uses `lightweight-charts` (TradingView) for the candlestick, volume histogram, and line series. This is a separate dependency from `recharts` used elsewhere in the app.

**Default indicator selection:** The panel opens with EMA(20) and RSI(14) pre-selected. Users can remove them like any other indicator.

**Indicator limit:** A maximum of 8 indicators can be selected simultaneously (enforced on the backend with a `400 Bad Request` error beyond that limit).

**Multi-output indicators:** MACD (3 series), Bollinger Bands (3 series), Stochastic (2 series), ADX (3 series), Ichimoku (4 series), and Fibonacci (5 series) each produce multiple output series from a single selection. These count as one selection against the 8-indicator limit but render multiple lines.

**Indicator catalog source:** The selector is built from `BLOCK_REGISTRY` in `src/types/canvas.ts` filtered to `category === "indicator"`, ensuring the chart panel always lists exactly the same indicators available to strategy blocks.

**Timeframe:** The timeframe is passed as a prop from the Market page (default `1d`). There is no in-panel timeframe switcher in this implementation.

**Files changed:**
- `backend/app/api/chart.py` — `GET /market/chart-data` endpoint
- `backend/app/schemas/market.py` — Pydantic schemas
- `backend/tests/test_chart_data.py` — 10 backend test cases
- `frontend/src/types/chart.ts` — TypeScript types
- `frontend/src/lib/chart-indicators.ts` — Indicator catalog builder
- `frontend/src/hooks/useChartData.ts` — Data-fetch hook
- `frontend/src/components/MarketChartPanel.tsx` — Side panel component
- `frontend/src/app/(app)/market/page.tsx` — Wired into Market page via clickable pair labels
