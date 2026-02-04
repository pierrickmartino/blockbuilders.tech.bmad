# Test Checklist – Transaction Cost Analysis

> Source PRD: `prd-transaction-cost-analysis.md`

## 1. Cost Breakdown Panel

- [ ] Transaction Cost Analysis panel appears in Backtest Results view after the trades list
- [ ] Panel title is "Transaction Cost Analysis"
- [ ] Panel displays Fees (USD) row
- [ ] Panel displays Slippage (USD) row
- [ ] Panel displays Spread (USD) row
- [ ] Panel displays Total costs (USD) row
- [ ] Panel displays Average cost per trade (USD) row
- [ ] Panel displays Cost % of gross return row
- [ ] Callout line shows "Gross return: $X -> Net return: $Y (after costs)"
- [ ] All USD values are formatted consistently (2 decimal places)

## 2. Cost % of Gross Return Calculation

- [ ] `gross_return_usd` is computed as `net_return_usd + total_costs_usd`
- [ ] When `gross_return_usd > 0`, cost % is computed as `total_costs_usd / gross_return_usd * 100`
- [ ] When `gross_return_usd <= 0`, cost % shows "N/A"
- [ ] When `gross_return_usd` is exactly 0, cost % shows "N/A"
- [ ] When `gross_return_usd` is negative, cost % shows "N/A"

## 3. Per-Trade Cost Display

- [ ] Trade rows in the trades list show a "Costs" column with total cost in USD
- [ ] Trade detail drawer shows fee/slippage/spread breakdown
- [ ] Per-trade costs sum to the total costs shown in the summary panel
- [ ] Per-trade cost values are formatted consistently

## 4. Trade-Level Data Fields

- [ ] Each trade includes `fee_cost_usd` in results
- [ ] Each trade includes `slippage_cost_usd` in results
- [ ] Each trade includes `spread_cost_usd` in results
- [ ] Each trade includes `total_cost_usd` in results
- [ ] Each trade includes `notional_usd` (entry_price * qty) in results

## 5. Run-Level Summary Fields

- [ ] Backtest run includes `gross_return_usd` in results
- [ ] Backtest run includes `gross_return_pct` in results
- [ ] Backtest run includes `total_fees_usd` in results
- [ ] Backtest run includes `total_slippage_usd` in results
- [ ] Backtest run includes `total_spread_usd` in results
- [ ] Backtest run includes `total_costs_usd` in results
- [ ] Backtest run includes `cost_pct_gross_return` in results
- [ ] Backtest run includes `avg_cost_per_trade_usd` in results

## 6. Backend Cost Computation

- [ ] Costs are computed in the backtest engine and persisted in results
- [ ] Fee/slippage/spread are applied on both entry and exit legs
- [ ] Cost calculation uses per-trade notional (entry_price * qty)
- [ ] Default rates are applied: fee 0.1%, slippage 0.05%, spread 0.02%
- [ ] Custom rates from backtest settings override defaults when provided

## 7. What-If Sliders (Optional)

- [ ] Sliders appear for fee %, slippage %, and spread %
- [ ] Moving sliders updates displayed net return without re-running the backtest
- [ ] Computation uses stored trade notional and adjusted cost rates
- [ ] Sliders are labeled "What-if (preview)" to avoid implying re-execution
- [ ] Resetting sliders restores original values

## 8. Edge Cases & QA

- [ ] Run with 0 trades: costs show as $0 and cost % shows "N/A"
- [ ] Run with all losses (gross return <= 0): cost % shows "N/A"
- [ ] Large runs (1000+ trades): totals match the sum of per-trade costs
- [ ] Existing backtest runs without cost fields show "Not available" (backward compatibility)
- [ ] Very small costs (fractions of a cent) display without rounding to $0.00

## 9. Responsive Layout

- [ ] Cost panel stacks cleanly on mobile viewports
- [ ] Trade cost column is visible and readable on mobile
- [ ] Trade detail drawer with cost breakdown is usable on mobile
- [ ] What-if sliders (if present) are usable on touch devices

## 10. Dependencies

- [ ] No new execution model or pricing engine is introduced
- [ ] No new endpoints are required (costs are in existing payloads)
- [ ] No new frontend dependencies are introduced
