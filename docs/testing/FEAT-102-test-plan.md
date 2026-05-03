# FEAT-102 Test Plan: Pandas TA Indicator Calculation Parity

## Scope
Validate that backend indicator calculations exposed through backtests and Market chart data match Pandas TA reference behavior for supported indicators, preserve existing validation behavior, and remain deterministic.

## Test cases

### TC-01 Backtest indicators match reference calculations
**Acceptance criterion:** 1

**Input:** Authenticated user runs representative backtests that cover all supported strategy indicators across known OHLCV candles and valid indicator parameters.

**Expected output:** Each completed backtest uses indicator values matching Pandas TA reference output for the same candles and parameters, and the run completes without indicator-calculation failures.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_backtest_indicators_match_reference_calculations -v`

### TC-02 Single-series Market indicators match reference calculations
**Acceptance criterion:** 2

**Input:** Authenticated user requests `GET /market/chart-data` with stored candles and indicator selections for SMA, EMA, RSI, ATR, and OBV.

**Expected output:** The returned indicator points match Pandas TA reference output for each requested single-series indicator, with values aligned to the returned candle timestamps.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_market_single_series_indicators_match_reference_calculations -v`

### TC-03 Multi-series Market indicators match reference calculations
**Acceptance criterion:** 3

**Input:** Authenticated user requests `GET /market/chart-data` with stored candles and indicator selections for MACD, Bollinger Bands, Stochastic, ADX, Ichimoku Cloud, and Fibonacci.

**Expected output:** Every returned output series for each selected multi-series indicator matches the expected reference output for the same candles and parameters.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_market_multi_series_indicators_match_reference_calculations -v`

### TC-04 Warm-up candles remain unavailable
**Acceptance criterion:** 4

**Input:** Authenticated user runs a backtest and requests Market chart data where the candle range starts before the selected indicators have enough history to produce values.

**Expected output:** Warm-up-period indicator values are unavailable in backend behavior and chart responses rather than represented as zero values or actionable false signals.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_indicator_warmup_values_remain_unavailable -v`

### TC-05 Backtest and Market chart outputs align by candle
**Acceptance criterion:** 5

**Input:** Authenticated user calculates the same indicator type and parameters over the same stored candles through a backtest flow and through `GET /market/chart-data`.

**Expected output:** Shared indicator outputs are aligned to the same candle timestamps in both backend flows.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_backtest_and_market_indicator_outputs_align_by_candle -v`

### TC-06 Invalid indicator requests keep existing errors
**Acceptance criterion:** 6

**Input:** Authenticated user submits invalid indicator parameters or unsupported indicator keys through strategy validation, backtest creation, or Market chart data requests.

**Expected output:** The backend returns the existing validation error behavior for invalid indicators and does not return a partial successful calculation for the invalid indicator.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_invalid_indicator_requests_keep_existing_errors -v`

### TC-07 Repeated backtests remain deterministic
**Acceptance criterion:** 7

**Input:** Authenticated user repeats a completed backtest with the same strategy version, asset, timeframe, date range, settings, and unchanged candle data.

**Expected output:** The repeated run returns the same trades and summary metrics as the original run.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_repeated_backtests_remain_deterministic -v`

### TC-08 Repeated Market chart requests remain deterministic
**Acceptance criterion:** 8

**Input:** Authenticated user repeats `GET /market/chart-data` with the same asset, timeframe, date range, and indicator list while stored candles are unchanged.

**Expected output:** The repeated response returns the same candle-aligned indicator series as the original response.

**Exact test command:** `pytest backend/tests/test_pandas_ta_indicators.py::test_repeated_market_chart_requests_remain_deterministic -v`
