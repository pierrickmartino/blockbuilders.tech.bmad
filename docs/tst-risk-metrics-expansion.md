# Test Checklist – Risk Metrics Expansion

> Source PRD: `prd-risk-metrics-expansion.md`

## 1. Sharpe Ratio

- [ ] Sharpe ratio is calculated using per-candle returns from the equity curve
- [ ] Risk-free rate is assumed to be 0
- [ ] Result is annualized using the timeframe's periods per year
- [ ] Sharpe ratio returns 0 when standard deviation is 0
- [ ] Sharpe ratio returns 0 when there is insufficient data
- [ ] Sharpe ratio is correct for a known test case (manual calculation verification)
- [ ] Positive Sharpe ratio is displayed for a profitable low-volatility strategy
- [ ] Negative Sharpe ratio is displayed for an unprofitable strategy

## 2. Sortino Ratio

- [ ] Sortino ratio is calculated using per-candle returns from the equity curve
- [ ] Downside deviation uses only negative returns
- [ ] Risk-free rate is assumed to be 0
- [ ] Result is annualized using the timeframe's periods per year
- [ ] Sortino ratio returns 0 when downside deviation is 0
- [ ] Sortino ratio returns 0 when there is insufficient data
- [ ] Sortino ratio is correct for a known test case (manual calculation verification)
- [ ] Sortino >= Sharpe for the same run (mathematical property)

## 3. Calmar Ratio

- [ ] Calmar ratio is calculated as CAGR / |Max Drawdown|
- [ ] Calmar ratio returns 0 when max drawdown is 0
- [ ] Calmar ratio is correct for a known test case (manual calculation verification)
- [ ] Calmar ratio handles very small max drawdown values without overflow

## 4. Maximum Consecutive Losses

- [ ] Max consecutive losses counts the longest streak of trades with PnL < 0
- [ ] Returns 0 when there are no trades
- [ ] Returns 0 when all trades are profitable
- [ ] Correctly counts a single losing trade as 1
- [ ] Correctly counts consecutive losing trades across the full trade list
- [ ] A trade with PnL exactly 0 does not count as a loss
- [ ] Handles alternating win/loss pattern correctly (max consecutive = 1)

## 5. Storage & API

- [ ] All four metrics are stored on `backtest_runs` alongside existing summary metrics
- [ ] Metrics are included in summary metrics JSON payloads
- [ ] Metrics are included in CSV export payloads
- [ ] Metrics are included in JSON export payloads
- [ ] Existing backtest runs without these metrics do not break (backward compatibility)

## 6. UI Display

- [ ] All four metrics appear in the results summary next to existing metrics
- [ ] Metrics use existing metric styling (no new UI components)
- [ ] Metrics display in the same row/card layout as return, drawdown, win rate
- [ ] Metric values are formatted with appropriate decimal precision
- [ ] Metric labels are clear and recognizable (Sharpe, Sortino, Calmar, Max Consec. Losses)

## 7. Edge Cases

- [ ] Backtest with 0 trades: all four metrics return 0 without errors
- [ ] Backtest with 1 trade: metrics compute without errors
- [ ] Backtest with zero volatility (flat equity curve): Sharpe and Sortino return 0
- [ ] Backtest with zero drawdown: Calmar returns 0
- [ ] Backtest with only winning trades: max consecutive losses returns 0
- [ ] Backtest with only losing trades: max consecutive losses equals total trade count
- [ ] Very short backtest (2-3 candles): metrics compute without errors

## 8. Dependencies & Implementation

- [ ] Calculations are in the existing backtest engine metrics section
- [ ] Existing return series and trade list data are reused (no new queries)
- [ ] No new dependencies or helper libraries are introduced
- [ ] No new API endpoints are created
