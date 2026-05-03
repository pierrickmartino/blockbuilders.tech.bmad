# FEAT-100 Test Plan: Market Indicator Inspection Chart

## Scope
Validate that users can open a Market chart side panel, inspect stored OHLCV candles, select available indicators, and verify EMA(20) and RSI(14) values aligned to the same candle timestamps.

## Test Cases

### TC-01 Opens chart side panel from Market asset list
**Acceptance criterion:** 1

**Input:** Authenticated user opens `/market` and selects `BTC/USDT` from the asset list.

**Expected output:** A chart side panel opens for `BTC/USDT`, covers approximately 80% of the desktop viewport width, and the Market asset list remains visible behind it.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-01"`

### TC-02 Displays stored OHLCV candlestick chart
**Acceptance criterion:** 2

**Input:** `GET /market/chart-data?asset=BTC/USDT&timeframe=1d` returns stored candles with open, high, low, close, and volume values.

**Expected output:** The chart renders candlesticks for the returned candles and displays volume for the same timestamps.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-02"`

### TC-03 Shows candle OHLCV values on hover or focus
**Acceptance criterion:** 3

**Input:** User hovers or keyboard-focuses the candle at `2026-01-01T00:00:00Z`.

**Expected output:** The UI shows timestamp `2026-01-01T00:00:00Z` and the stored open, high, low, close, and volume values for that candle.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-03"`

### TC-04 Indicator selector lists available strategy indicators
**Acceptance criterion:** 4

**Input:** User opens the indicator selector in the chart side panel.

**Expected output:** The selector lists the indicators available to strategy blocks, including SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, ADX, Ichimoku Cloud, OBV, and Fibonacci.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-04"`

### TC-05 Displays EMA(20) on the price chart
**Acceptance criterion:** 5

**Input:** User selects EMA and sets period `20`, or requests `GET /market/chart-data?asset=BTC/USDT&timeframe=1d&indicators=ema:20`.

**Expected output:** EMA(20) appears on the price chart, has label `EMA(20)`, and every returned EMA point timestamp matches a candle timestamp.

**Test command to run:** `pytest -q -k "feat_100 and ema_20"`

### TC-06 Displays RSI(14) in an indicator pane
**Acceptance criterion:** 6

**Input:** User selects RSI and sets period `14`, or requests `GET /market/chart-data?asset=BTC/USDT&timeframe=1d&indicators=rsi:14`.

**Expected output:** RSI(14) appears in a separate indicator pane, has label `RSI(14)`, and every returned RSI point timestamp matches a candle timestamp.

**Test command to run:** `pytest -q -k "feat_100 and rsi_14"`

### TC-07 Keeps multiple selected indicators visible and labelled
**Acceptance criterion:** 7

**Input:** User selects both EMA(20) and RSI(14).

**Expected output:** The chart displays both indicators at the same time with visible labels `EMA(20)` and `RSI(14)`.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-07"`

### TC-08 Shows unavailable values during indicator warm-up
**Acceptance criterion:** 8

**Input:** `GET /market/chart-data?asset=BTC/USDT&timeframe=1d&indicators=rsi:14` returns early RSI points before enough warm-up candles exist.

**Expected output:** Early RSI values are `null` or displayed as unavailable in the UI, not displayed as `0`.

**Test command to run:** `pytest -q -k "feat_100 and warmup_values"`

### TC-09 Shows empty state when no stored candles exist
**Acceptance criterion:** 9

**Input:** User opens the side panel for a supported asset/timeframe/date range with no stored candles.

**Expected output:** The side panel shows an empty state explaining that no stored OHLCV data is available, with no broken chart.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-09"`

### TC-10 Closing side panel preserves Market page state
**Acceptance criterion:** 10

**Input:** User filters or scrolls the Market asset list, opens the chart side panel, then closes it.

**Expected output:** The user returns to the same Market page state, including the prior filter or scroll position, without navigation.

**Test command to run:** `npm test -- --runInBand --testNamePattern="FEAT-100 TC-10"`
