# Test Checklist – Backtest Trade Details Drawer

> Source PRD: `prd-backtest-trade-details-drawer.md`

## 1. Drawer Opening & Closing

- [x] Clicking a trade row in the trades table opens the drawer
- [x] Pressing Enter on a focused trade row opens the drawer
- [x] Pressing Space on a focused trade row opens the drawer
- [ ] Drawer slides in from the right on desktop
- [x] Drawer behaves as a full-height bottom sheet (or right drawer) on mobile
- [x] Pressing Esc closes the drawer
- [x] Clicking the close button (top-right) closes the drawer
- [x] Clicking outside the drawer closes the drawer
- [ ] Selected row in the trades table is visually highlighted when the drawer is open
- [ ] Opening a different trade row while the drawer is open switches to the new trade

## 2. Drawer Header

- [x] Header displays "Trade #X" with the correct trade number
- [x] Side badge displays "LONG" for long trades
- [x] Side badge displays "SHORT" for short trades
- [x] Instrument and timeframe are displayed (e.g., "BTC/USDT . 1h")

## 3. Key Stats Section

- [x] P&L ($) is displayed with correct value
- [x] P&L (%) is displayed with correct value (2 decimal places)
- [x] Duration is displayed in human-readable format (e.g., "2d 6h")
- [ ] Exit reason is displayed with a human-readable label (not raw enum)

## 4. Execution Section

- [ ] Entry timestamp is displayed in ISO format
- [x] Entry price is displayed with appropriate decimal precision
- [ ] Exit timestamp is displayed in ISO format
- [x] Exit price is displayed with appropriate decimal precision

## 5. Risk at Entry Section

- [x] Planned SL price level is displayed when available
- [x] Planned TP price level is displayed when available
- [x] Initial risk is shown in $ amount
- [ ] Initial risk is shown in % of entry
- [ ] Stop distance is shown in price units
- [x] R-multiple is displayed when SL is available
- [x] R-multiple shows "--" when SL is missing or equals entry price
- [x] R-multiple shows "--" when initial risk is approximately zero
- [x] SL level shows "--" when not available
- [x] TP level shows "--" when not available

## 6. Excursions Section

- [x] MAE is displayed in $ amount
- [x] MAE is displayed in %
- [x] MFE is displayed in $ amount
- [x] MFE is displayed in %
- [ ] Entry to peak to exit summary is displayed (e.g., "Peak +3.2% @ timestamp -> Exit +0.8% (gave back 2.4%)")
- [ ] Entry to trough to exit summary is displayed (e.g., "Worst -1.1% @ timestamp -> Exit +0.8%")
- [x] Peak timestamp is shown in the summary
- [x] Trough timestamp is shown in the summary

## 7. MAE/MFE Calculations (Long)

- [x] MAE for long trade: `min_low - entry_price` (negative or zero)
- [x] MFE for long trade: `max_high - entry_price` (positive or zero)
- [x] MAE USD = MAE price move * qty
- [x] MFE USD = MFE price move * qty
- [x] MAE % = MAE price move / entry_price
- [x] MFE % = MFE price move / entry_price

## 8. MAE/MFE Calculations (Short)

- [ ] MAE for short trade: `entry_price - max_high` (negative or zero)
- [ ] MFE for short trade: `entry_price - min_low` (positive or zero)
- [ ] MAE and MFE USD and % conversions are correct for short trades

## 9. R-Multiple Calculation

- [x] R-multiple = pnl_usd / initial_risk_usd
- [x] Initial risk = abs(entry_price - sl_price_at_entry) * qty
- [x] Positive R-multiple for winning trades with SL
- [x] Negative R-multiple for losing trades with SL

## 10. Exit Reason Display

- [ ] `TP_HIT` displays as a human-readable label (e.g., "Take Profit Hit")
- [ ] `SL_HIT` displays as a human-readable label (e.g., "Stop Loss Hit")
- [ ] `SIGNAL_EXIT` displays correctly
- [ ] `TIME_BASED` displays correctly
- [ ] `LIQUIDATION` displays correctly
- [ ] `END_OF_TEST` displays correctly (e.g., "End of Test Period")
- [ ] `MANUAL` displays correctly (if supported)

## 11. Context Price Chart – Window Rule

- [x] Chart shows at least 10 days before entry timestamp
- [x] Chart shows at least 10 days after exit timestamp
- [x] Chart shows at least 90 days total window
- [x] For short-duration trades, the window is extended symmetrically to reach 90 days
- [ ] When data is clamped on one side (near dataset boundary), the other side is extended to target 90 days
- [x] Chart uses the same timeframe as the backtest (e.g., 1h candles)

## 12. Context Price Chart – Content

- [x] Candlestick chart is rendered (or line chart if candlestick not available)
- [ ] Vertical marker at entry time is displayed
- [ ] Vertical marker at exit time is displayed
- [x] Horizontal line at entry price is displayed
- [x] Horizontal line at SL price is displayed (when available)
- [x] Horizontal line at TP price is displayed (when available)
- [x] SL/TP lines are omitted when those values are not available
- [ ] Holding period between entry and exit is visually highlighted (if implemented)
- [ ] Peak and trough markers within holding period are shown (if implemented)

## 13. API – GET /backtests/{run_id}/trades/{trade_id}

- [x] Endpoint returns full trade details including all required and computed fields
- [x] Response includes candles array for the computed chart window
- [ ] Response includes window_start and window_end timestamps
- [ ] Trade fields include: trade_id, side, entry_ts, entry_price, exit_ts, exit_price, qty, pnl_usd, pnl_pct, duration_seconds, sl_price_at_entry, tp_price_at_entry, exit_reason
- [x] Computed fields include: mae_usd, mae_pct, mfe_usd, mfe_pct, initial_risk_usd, r_multiple, peak_price, peak_ts, trough_price, trough_ts
- [x] Candles are returned for the correct window based on the 10d/10d/90d rule

## 14. Authentication & Authorization

- [x] Unauthenticated request to trade details returns 401
- [x] User cannot access trade details for a run they do not own (returns 403 or 404)
- [x] Non-existent run_id returns 404
- [x] Non-existent trade_id for a valid run returns 404

## 15. Loading State

- [x] Drawer shows a skeleton/loading state while fetching trade details
- [ ] Chart area shows a loading indicator while candles are being fetched
- [ ] Trade details (excluding candles) load within 300ms typical

## 16. Edge Cases

- [x] Open trade at end of test (END_OF_TEST exit reason) still shows all details and chart
- [x] Trade with missing SL at entry: SL level shows "--", R-multiple shows "--"
- [x] Trade with missing TP at entry: TP level shows "--"
- [x] Very short duration trade still uses the 90-day minimum chart window
- [ ] Data not available for the full chart window: chart displays what exists with no errors
- [ ] Trade with zero P&L displays correctly

## 17. Formatting

- [x] Prices use fixed decimals based on asset (simple default acceptable)
- [x] Percentages display with 2 decimal places
- [ ] Timestamps are copy-friendly (ISO visible on hover or directly)
- [x] Duration formats as "Xd Yh Zm" (e.g., "2d 6h")
- [x] Positive P&L values show "+" prefix
- [x] Negative P&L values show "-" prefix

## 18. Responsiveness & Accessibility

- [ ] Drawer renders correctly on desktop
- [ ] Drawer renders correctly on tablet
- [ ] Drawer renders correctly on mobile (full-height bottom sheet or right drawer)
- [x] All drawer content is scrollable in a single column (no tabs unless necessary)
- [x] Drawer is keyboard-accessible (Tab through elements, Esc to close)
- [ ] Focus is trapped within the drawer when open
- [ ] Focus returns to the triggering trade row when the drawer closes

## 19. Trades Table Integration

- [x] Trade rows remain clickable and keyboard-accessible after drawer feature is added
- [ ] Existing table columns are preserved (no bloat)
- [ ] Table pagination still works correctly when the drawer is open
- [x] Clicking a trade on a different page opens the drawer with the correct trade

## 20. Performance

- [x] Candles payload stays under ~2500 candles for 1h timeframe at 90 days
- [ ] Chart renders within a reasonable time after candles are loaded
- [ ] Opening and closing the drawer repeatedly does not cause memory leaks or slowdowns
- [ ] Candle queries are cached by (asset, timeframe, start, end) where possible

## 21. Analytics (Optional)

- [ ] `trade_drawer_opened` event fires with run_id and trade_id
- [ ] `trade_drawer_closed` event fires when the drawer is closed
- [ ] `trade_drawer_chart_loaded` latency tracking (if implemented)
