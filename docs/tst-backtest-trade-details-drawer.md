# Test Checklist – Backtest Trade Details Drawer

> Source PRD: `prd-backtest-trade-details-drawer.md`

## 1. Drawer Opening & Closing

- [ ] Clicking a trade row in the trades table opens the drawer
- [ ] Pressing Enter on a focused trade row opens the drawer
- [ ] Pressing Space on a focused trade row opens the drawer
- [ ] Drawer slides in from the right on desktop
- [ ] Drawer behaves as a full-height bottom sheet (or right drawer) on mobile
- [ ] Pressing Esc closes the drawer
- [ ] Clicking the close button (top-right) closes the drawer
- [ ] Clicking outside the drawer closes the drawer
- [ ] Selected row in the trades table is visually highlighted when the drawer is open
- [ ] Opening a different trade row while the drawer is open switches to the new trade

## 2. Drawer Header

- [ ] Header displays "Trade #X" with the correct trade number
- [ ] Side badge displays "LONG" for long trades
- [ ] Side badge displays "SHORT" for short trades
- [ ] Instrument and timeframe are displayed (e.g., "BTC/USDT . 1h")

## 3. Key Stats Section

- [ ] P&L ($) is displayed with correct value
- [ ] P&L (%) is displayed with correct value (2 decimal places)
- [ ] Duration is displayed in human-readable format (e.g., "2d 6h")
- [ ] Exit reason is displayed with a human-readable label (not raw enum)

## 4. Execution Section

- [ ] Entry timestamp is displayed in ISO format
- [ ] Entry price is displayed with appropriate decimal precision
- [ ] Exit timestamp is displayed in ISO format
- [ ] Exit price is displayed with appropriate decimal precision

## 5. Risk at Entry Section

- [ ] Planned SL price level is displayed when available
- [ ] Planned TP price level is displayed when available
- [ ] Initial risk is shown in $ amount
- [ ] Initial risk is shown in % of entry
- [ ] Stop distance is shown in price units
- [ ] R-multiple is displayed when SL is available
- [ ] R-multiple shows "--" when SL is missing or equals entry price
- [ ] R-multiple shows "--" when initial risk is approximately zero
- [ ] SL level shows "--" when not available
- [ ] TP level shows "--" when not available

## 6. Excursions Section

- [ ] MAE is displayed in $ amount
- [ ] MAE is displayed in %
- [ ] MFE is displayed in $ amount
- [ ] MFE is displayed in %
- [ ] Entry to peak to exit summary is displayed (e.g., "Peak +3.2% @ timestamp -> Exit +0.8% (gave back 2.4%)")
- [ ] Entry to trough to exit summary is displayed (e.g., "Worst -1.1% @ timestamp -> Exit +0.8%")
- [ ] Peak timestamp is shown in the summary
- [ ] Trough timestamp is shown in the summary

## 7. MAE/MFE Calculations (Long)

- [ ] MAE for long trade: `min_low - entry_price` (negative or zero)
- [ ] MFE for long trade: `max_high - entry_price` (positive or zero)
- [ ] MAE USD = MAE price move * qty
- [ ] MFE USD = MFE price move * qty
- [ ] MAE % = MAE price move / entry_price
- [ ] MFE % = MFE price move / entry_price

## 8. MAE/MFE Calculations (Short)

- [ ] MAE for short trade: `entry_price - max_high` (negative or zero)
- [ ] MFE for short trade: `entry_price - min_low` (positive or zero)
- [ ] MAE and MFE USD and % conversions are correct for short trades

## 9. R-Multiple Calculation

- [ ] R-multiple = pnl_usd / initial_risk_usd
- [ ] Initial risk = abs(entry_price - sl_price_at_entry) * qty
- [ ] Positive R-multiple for winning trades with SL
- [ ] Negative R-multiple for losing trades with SL

## 10. Exit Reason Display

- [ ] `TP_HIT` displays as a human-readable label (e.g., "Take Profit Hit")
- [ ] `SL_HIT` displays as a human-readable label (e.g., "Stop Loss Hit")
- [ ] `SIGNAL_EXIT` displays correctly
- [ ] `TIME_BASED` displays correctly
- [ ] `LIQUIDATION` displays correctly
- [ ] `END_OF_TEST` displays correctly (e.g., "End of Test Period")
- [ ] `MANUAL` displays correctly (if supported)

## 11. Context Price Chart – Window Rule

- [ ] Chart shows at least 10 days before entry timestamp
- [ ] Chart shows at least 10 days after exit timestamp
- [ ] Chart shows at least 90 days total window
- [ ] For short-duration trades, the window is extended symmetrically to reach 90 days
- [ ] When data is clamped on one side (near dataset boundary), the other side is extended to target 90 days
- [ ] Chart uses the same timeframe as the backtest (e.g., 1h candles)

## 12. Context Price Chart – Content

- [ ] Candlestick chart is rendered (or line chart if candlestick not available)
- [ ] Vertical marker at entry time is displayed
- [ ] Vertical marker at exit time is displayed
- [ ] Horizontal line at entry price is displayed
- [ ] Horizontal line at SL price is displayed (when available)
- [ ] Horizontal line at TP price is displayed (when available)
- [ ] SL/TP lines are omitted when those values are not available
- [ ] Holding period between entry and exit is visually highlighted (if implemented)
- [ ] Peak and trough markers within holding period are shown (if implemented)

## 13. API – GET /backtests/{run_id}/trades/{trade_id}

- [ ] Endpoint returns full trade details including all required and computed fields
- [ ] Response includes candles array for the computed chart window
- [ ] Response includes window_start and window_end timestamps
- [ ] Trade fields include: trade_id, side, entry_ts, entry_price, exit_ts, exit_price, qty, pnl_usd, pnl_pct, duration_seconds, sl_price_at_entry, tp_price_at_entry, exit_reason
- [ ] Computed fields include: mae_usd, mae_pct, mfe_usd, mfe_pct, initial_risk_usd, r_multiple, peak_price, peak_ts, trough_price, trough_ts
- [ ] Candles are returned for the correct window based on the 10d/10d/90d rule

## 14. Authentication & Authorization

- [ ] Unauthenticated request to trade details returns 401
- [ ] User cannot access trade details for a run they do not own (returns 403 or 404)
- [ ] Non-existent run_id returns 404
- [ ] Non-existent trade_id for a valid run returns 404

## 15. Loading State

- [ ] Drawer shows a skeleton/loading state while fetching trade details
- [ ] Chart area shows a loading indicator while candles are being fetched
- [ ] Trade details (excluding candles) load within 300ms typical

## 16. Edge Cases

- [ ] Open trade at end of test (END_OF_TEST exit reason) still shows all details and chart
- [ ] Trade with missing SL at entry: SL level shows "--", R-multiple shows "--"
- [ ] Trade with missing TP at entry: TP level shows "--"
- [ ] Very short duration trade still uses the 90-day minimum chart window
- [ ] Data not available for the full chart window: chart displays what exists with no errors
- [ ] Trade with zero P&L displays correctly

## 17. Formatting

- [ ] Prices use fixed decimals based on asset (simple default acceptable)
- [ ] Percentages display with 2 decimal places
- [ ] Timestamps are copy-friendly (ISO visible on hover or directly)
- [ ] Duration formats as "Xd Yh Zm" (e.g., "2d 6h")
- [ ] Positive P&L values show "+" prefix
- [ ] Negative P&L values show "-" prefix

## 18. Responsiveness & Accessibility

- [ ] Drawer renders correctly on desktop
- [ ] Drawer renders correctly on tablet
- [ ] Drawer renders correctly on mobile (full-height bottom sheet or right drawer)
- [ ] All drawer content is scrollable in a single column (no tabs unless necessary)
- [ ] Drawer is keyboard-accessible (Tab through elements, Esc to close)
- [ ] Focus is trapped within the drawer when open
- [ ] Focus returns to the triggering trade row when the drawer closes

## 19. Trades Table Integration

- [ ] Trade rows remain clickable and keyboard-accessible after drawer feature is added
- [ ] Existing table columns are preserved (no bloat)
- [ ] Table pagination still works correctly when the drawer is open
- [ ] Clicking a trade on a different page opens the drawer with the correct trade

## 20. Performance

- [ ] Candles payload stays under ~2500 candles for 1h timeframe at 90 days
- [ ] Chart renders within a reasonable time after candles are loaded
- [ ] Opening and closing the drawer repeatedly does not cause memory leaks or slowdowns
- [ ] Candle queries are cached by (asset, timeframe, start, end) where possible

## 21. Analytics (Optional)

- [ ] `trade_drawer_opened` event fires with run_id and trade_id
- [ ] `trade_drawer_closed` event fires when the drawer is closed
- [ ] `trade_drawer_chart_loaded` latency tracking (if implemented)
