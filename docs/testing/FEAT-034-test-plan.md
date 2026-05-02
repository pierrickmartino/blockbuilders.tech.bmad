# Test Checklist -- Display Formatting Consistency

> Source PRD: `prd-display-formatting-consistency.md`

## 1. Number Formatting -- Single Locale

- [ ] All numbers across the app use one locale per session (no mixed separators)
- [ ] Default locale is `navigator.language` (browser locale)
- [ ] Fallback locale is `en-US` when browser locale is unavailable
- [ ] No component uses hardcoded locale different from the session locale
- [ ] `Intl.NumberFormat` is used for all number formatting (no manual separator insertion)

## 2. Currency Display

- [ ] Currency is displayed as a suffix (e.g., `12,345.67 USDT`)
- [ ] Negative P&L uses a minus sign (e.g., `-123.45 USDT`)
- [ ] Positive P&L uses an explicit plus sign (e.g., `+123.45 USDT`)
- [ ] Zero P&L is displayed correctly (no spurious sign)

## 3. Precision Rules -- Prices

- [ ] BTC/USDT prices display with 2 decimal places
- [ ] ETH/USDT prices display with 2 decimal places
- [ ] Price example: `43,210.55 USDT` (not `43210.5` or `43,210.550`)

## 4. Precision Rules -- Equity & P&L

- [ ] Equity / balance values display with 2 decimal places
- [ ] Per-trade P&L displays with 2 decimal places
- [ ] Total P&L displays with 2 decimal places
- [ ] Currency suffix is included on all monetary values

## 5. Precision Rules -- Percentages

- [ ] Return percentage displays with 2 decimal places (e.g., `12.34%`)
- [ ] CAGR percentage displays with 2 decimal places
- [ ] Win rate displays with 2 decimal places
- [ ] Max drawdown percentage displays with 2 decimal places
- [ ] Percent sign is included after the value

## 6. Precision Rules -- Quantities

- [ ] Quantities display up to 6 decimal places
- [ ] Trailing zeros are trimmed on quantities (e.g., `0.1234 BTC` not `0.123400 BTC`)

## 7. Precision Rules -- Fees & Slippage

- [ ] Fees display with 2 decimal places when shown as money
- [ ] Slippage displays with 2 decimal places when shown as money

## 8. Invalid Value Handling

- [ ] `null` values render as a dash (`--`)
- [ ] `undefined` values render as a dash (`--`)
- [ ] `NaN` values render as a dash (`--`)
- [ ] No raw `null`, `undefined`, or `NaN` appears in the UI

## 9. Datetime Format

- [ ] All datetimes use `YYYY-MM-DD HH:mm` format (24-hour clock)
- [ ] Example local: `2025-12-23 14:05`
- [ ] Example UTC: `2025-12-23 13:05`
- [ ] No other datetime format is used anywhere in the app

## 10. Timezone Toggle

- [ ] Toggle options are "Local" (default) and "UTC"
- [ ] Toggle is accessible from an obvious location (e.g., user menu or settings)
- [ ] Switching the toggle updates all datetimes on the page without a refresh
- [ ] Default mode is "Local" when no preference is stored

## 11. Timezone Persistence

- [ ] Timezone preference is stored in `localStorage` under key `bb.display.timezone`
- [ ] Stored values are `local` or `utc`
- [ ] Preference persists across page refreshes
- [ ] Fallback to `local` when the key is missing or invalid

## 12. Formatter Utilities

- [ ] A shared `format.ts` module (or equivalent) exists for all formatting
- [ ] No UI component uses raw `toFixed()` for display
- [ ] No UI component uses manual string concatenation for number formatting
- [ ] All number and datetime rendering goes through the shared helpers
- [ ] Formatter functions include: `formatPrice`, `formatMoney`, `formatPercent`, `formatQuantity`, `formatDateTime`

## 13. Surface -- Strategy List

- [ ] Strategy metrics on the list page use correct formatting
- [ ] "Last modified" datetime uses the correct format and respects timezone toggle

## 14. Surface -- Backtest Overview Metrics

- [ ] Return metric card uses correct percentage formatting
- [ ] CAGR metric card uses correct percentage formatting
- [ ] Max drawdown metric card uses correct percentage formatting
- [ ] Number of trades displays as a whole number
- [ ] Win rate metric card uses correct percentage formatting

## 15. Surface -- Trades Table

- [ ] Entry time uses `YYYY-MM-DD HH:mm` format and respects timezone toggle
- [ ] Exit time uses `YYYY-MM-DD HH:mm` format and respects timezone toggle
- [ ] Entry price uses 2-decimal formatting with currency suffix
- [ ] Exit price uses 2-decimal formatting with currency suffix
- [ ] P&L column uses 2-decimal formatting with sign and currency suffix

## 16. Surface -- Equity Curve Chart Tooltips

- [ ] Equity values in tooltips use correct formatting (2 decimals, currency suffix)
- [ ] Timestamps in tooltips use `YYYY-MM-DD HH:mm` and respect timezone toggle
- [ ] Drawdown values in tooltips use correct formatting

## 17. API Data Contract

- [ ] API returns numbers as numbers (not pre-formatted strings)
- [ ] API returns timestamps in ISO 8601 UTC format (e.g., `2025-12-23T13:05:00Z`)
- [ ] Frontend handles formatting; backend does not pre-format display values

## 18. Negative & Edge Cases

- [ ] Switching timezone toggle does not cause layout shift
- [ ] Very large numbers (e.g., billions) format correctly with grouping separators
- [ ] Very small numbers (e.g., 0.000001) format correctly for quantities
- [ ] Negative percentages display correctly (e.g., `-5.23%`)
- [ ] Date edge cases (midnight, DST transitions) display correctly
