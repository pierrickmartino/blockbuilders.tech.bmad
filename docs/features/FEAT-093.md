# PRD – Transaction Cost Analysis

## Summary
Add a **Transaction Cost Analysis** section to backtest results that breaks out **fees**, **slippage**, and **spread** separately. Show total cost, cost as % of gross returns (pre-cost), and per-trade cost in USD. This is an educational feature to help users understand how execution costs affect profitability.

## Goals
- Show a clear **fees / slippage / spread** breakdown for each backtest run.
- Make the **impact** of costs obvious via:
  - Total costs (USD)
  - Cost % of gross return
  - Average cost per trade (USD)
- Store a **detailed cost breakdown** in results so the UI does not have to re-derive it.
- Keep the UX simple and readable.

## Non-goals
- No new execution model or pricing engine.
- No advanced broker-specific fee schedules.
- No per-venue spread modeling.
- No re-running backtests for “what-if” changes (use simple recompute only).

## User story
“As a user, I want to see how much fees, slippage, and spread reduce my returns, so I can judge whether the strategy is realistically profitable.”

## Placement in UI
Backtest Results page:
1. Summary metrics
2. Equity curve
3. Drawdown chart (if enabled)
4. Trades list
5. **Transaction Cost Analysis (new)**

## UI details (minimal)
**Transaction Cost Analysis panel**
- Title: “Transaction Cost Analysis”
- Summary rows:
  - Fees (USD)
  - Slippage (USD)
  - Spread (USD)
  - **Total costs (USD)**
  - **Average cost per trade (USD)**
  - **Cost % of gross return**
- Small callout line:
  - “Gross return: $X → Net return: $Y (after costs)”

**Trades list additions**
- For each trade row, show a small “Costs” column with total cost in USD.
- In the trade detail drawer, show the fee/slippage/spread breakdown.

### Optional: What-if sliders (simple)
- Sliders for fee %, slippage %, spread % to preview net return.
- **No re-run:** compute using stored trade notional and cost rates.
- Label as “What-if (preview)” to avoid implying the backtest was re-executed.

## Data requirements
### Backtest run summary fields
Store in `backtest_runs` (or result payload):
- `gross_return_usd`
- `gross_return_pct`
- `total_fees_usd`
- `total_slippage_usd`
- `total_spread_usd`
- `total_costs_usd`
- `cost_pct_gross_return` (see formula below)
- `avg_cost_per_trade_usd`

### Trade-level fields (in results JSON)
For each trade:
- `fee_cost_usd`
- `slippage_cost_usd`
- `spread_cost_usd`
- `total_cost_usd`
- `notional_usd` (entry_price * qty; used for what-if sliders)

### Cost % of gross return (formula)
- `gross_return_usd = net_return_usd + total_costs_usd`
- If `gross_return_usd <= 0`, set `cost_pct_gross_return` to `null` and show “N/A”.
- Else `cost_pct_gross_return = total_costs_usd / gross_return_usd * 100`.

## Backend implementation notes (minimal)
- Compute costs in the backtest engine once and persist them in the results payload.
- Apply fee/slippage/spread on both entry and exit legs using the current per-trade notional.
- Use existing backtest settings for fee/slippage/spread rates (defaults: 0.1%, 0.05%, 0.02%).
- No new endpoints needed if costs are returned in the existing backtest run summary and trades payloads.

## Frontend implementation notes (minimal)
- Add the Transaction Cost Analysis block to the Backtest Results page.
- Extend trade row and trade detail components to surface cost data.
- Implement optional what-if sliders as a small inline widget that updates the displayed totals locally.

## Acceptance criteria
- A completed backtest run shows a cost breakdown (fees, slippage, spread) and totals.
- Cost % of gross return displays correctly (or N/A when gross return <= 0).
- Average cost per trade is visible.
- Trade rows show per-trade cost totals with a drill-down breakdown in trade detail.
- Feature works with existing backtest runs (if cost fields are missing, show “Not available”).

## QA checklist
- Run with 0 trades: costs show as $0 and “N/A” for %.
- Run with losses: cost % shows “N/A” (gross return <= 0).
- Large runs: totals match sum of per-trade costs.
- Mobile view: cost panel stacks cleanly.
