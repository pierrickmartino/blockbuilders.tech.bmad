# TST: Rename Paper Trading to Strategy Monitor

## 1) UI Label Replacement
- [ ] Verify strategy list, strategy settings, dashboard cards, and related screens display **Strategy Monitor** instead of “Paper Trading”/“paper trading”.
- [ ] Verify no visible UI string contains “Paper Trading” or “paper trading”.
- [ ] Verify capitalization is consistent: **Strategy Monitor**.

## 2) Toggle Helper Copy
- [ ] Verify the toggle area includes a tooltip or subtitle.
- [ ] Verify helper text exactly matches: **“Automated daily re-testing of your strategy against the latest market data”**.
- [ ] Verify helper copy is visible on desktop hover and accessible on non-hover/touch contexts (subtitle or equivalent).

## 3) Backward Compatibility
- [ ] Verify API request payload still uses `auto_update_enabled` and `auto_update_lookback_days`.
- [ ] Verify existing strategies with `auto_update_enabled=true` still run in scheduler without migration.
- [ ] Verify no database schema or field rename is required.

## 4) Documentation & Help Copy
- [ ] Verify in-app help text references are updated to **Strategy Monitor**.
- [ ] Verify product/docs references for user-facing terminology are updated from “paper trading” to **Strategy Monitor** where applicable.

## 5) Regression Checks
- [ ] Enable Strategy Monitor and save settings successfully.
- [ ] Disable Strategy Monitor and save settings successfully.
- [ ] Update lookback days and confirm save behavior unchanged.
- [ ] Confirm status indicators (e.g., Updated today / Needs update) still behave as before.
