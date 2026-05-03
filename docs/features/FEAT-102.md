# FEAT-102: Pandas TA Indicator Calculation Parity

## Goal
Indicator calculations used by Blockbuilders backend flows produce values that match Pandas TA reference behavior for the supported strategy indicators, so financial analysts can trust that backtests and market chart inspection use standard technical-analysis calculations instead of app-specific approximations.

## Non-goals
- This feature does not add new strategy indicators beyond the 11 indicators already available in the product.
- This feature does not change strategy block parameters, parameter ranges, node labels, or validation rules.
- This feature does not change trade execution rules, position sizing, fees, slippage, spreads, or summary metric formulas.
- This feature does not add a new user-facing indicator editor or chart configuration UI.
- This feature does not persist indicator series, add new database tables, or store calculation snapshots.
- This feature does not introduce live trading, tick data, order book data, or non-OHLCV data sources.
- This feature does not change authentication, plan limits, daily backtest limits, or historical depth enforcement.

## Acceptance criteria
1. Given an authenticated user runs a backtest for a strategy using any supported indicator, when the run completes, then the backtest uses indicator values that match Pandas TA reference output for the same OHLCV candles and parameters.
2. Given an authenticated user requests Market chart data for SMA, EMA, RSI, ATR, or OBV, when stored candles exist for the requested asset and timeframe, then each returned indicator series matches Pandas TA reference output for the same candles and parameters.
3. Given an authenticated user requests Market chart data for MACD, Bollinger Bands, Stochastic, ADX, Ichimoku Cloud, or Fibonacci, when stored candles exist for the requested asset and timeframe, then each returned output series matches the expected reference output for the same candles and parameters.
4. Given an indicator does not have enough warm-up candles to produce a value, when the backtest or Market chart response reaches those candles, then the missing indicator values are treated as unavailable rather than as zero or false signals.
5. Given the same stored candles, indicator type, and parameters are used in a backtest and in Market chart inspection, when both flows calculate indicator values, then shared indicator outputs are aligned to the same candle timestamps.
6. Given an indicator request uses invalid parameters or unsupported indicator keys, when the backend validates the request or strategy definition, then the existing validation error behavior remains available and no partial successful calculation is returned for that invalid indicator.
7. Given a completed backtest is repeated with the same strategy version, asset, timeframe, date range, and backtest settings, when the underlying candles have not changed, then the resulting trades and summary metrics remain deterministic.
8. Given a Market chart data request is repeated with the same asset, timeframe, date range, and indicator list, when the underlying candles have not changed, then the returned candle-aligned indicator series remains deterministic.

## API contract
No new FastAPI endpoints are required.

Existing endpoints keep their request and response shapes, authentication requirements, and status codes:

- `POST /backtests` creates a backtest run using the existing request body and authentication requirements.
- `GET /backtests/{run_id}` returns the existing backtest status and summary response.
- `GET /backtests/{run_id}/trades` returns the existing trade list response.
- `GET /backtests/{run_id}/trades/{trade_idx}` returns the existing trade detail response.
- `GET /market/chart-data` returns stored OHLCV candles and requested indicator series using the existing query parameters and authentication requirements.

The observable behavior change is calculation parity for existing indicator outputs; no response fields are added, removed, or renamed.

## Data model changes
No SQLModel fields, tables, indexes, or persisted values are added or changed.
