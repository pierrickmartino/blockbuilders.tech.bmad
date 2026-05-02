# Test Checklist -- Performance Alerts (Simple)

> Source PRD: `prd-performance-alerts-simple.md`

## 1. Alert Rule CRUD

- [x] User can create a drawdown alert rule for a strategy
- [ ] Only one alert rule per strategy is allowed (unique constraint on `strategy_id`)
- [x] Attempting to create a second rule for the same strategy returns an error
- [x] User can update threshold, channels, entry/exit flags, or active state via PATCH
- [x] User can delete an alert rule via DELETE
- [x] User can list all their alert rules via GET /alerts

## 2. API -- GET /alerts

- [x] Returns all alert rules for the authenticated user
- [x] Returns 401 for unauthenticated requests
- [x] Does not return alert rules belonging to other users

## 3. API -- POST /alerts

- [x] Creates an alert rule with valid payload (strategy_id, threshold_pct, etc.)
- [x] Validates `threshold_pct` is within range 0.1--100
- [x] Rejects `threshold_pct` values below 0.1 or above 100
- [x] Rejects missing `strategy_id`
- [x] Rejects `strategy_id` for a strategy not owned by the user
- [x] Returns 401 for unauthenticated requests
- [x] Defaults: `notify_in_app=true`, `notify_email=false`, `is_active=true`, `alert_on_entry=false`, `alert_on_exit=false`

## 4. API -- PATCH /alerts/{id}

- [x] Updates threshold_pct successfully
- [x] Updates notify_email flag successfully
- [x] Updates is_active flag (enable/disable toggle)
- [x] Updates alert_on_entry and alert_on_exit flags
- [x] Returns 404 for non-existent alert rule
- [x] Returns 403 or 404 for alert rule owned by another user
- [x] Returns 401 for unauthenticated requests

## 5. API -- DELETE /alerts/{id}

- [x] Deletes the alert rule successfully
- [x] Returns 404 for non-existent alert rule
- [x] Returns 403 or 404 for alert rule owned by another user
- [x] Returns 401 for unauthenticated requests

## 6. UX -- Alerts Card on Strategy Detail

- [ ] Alerts card is visible on the strategy detail page
- [ ] Toggle to enable/disable the alert works
- [ ] Threshold input accepts valid percentage values
- [ ] Alert on entry checkbox toggles correctly
- [ ] Alert on exit checkbox toggles correctly
- [ ] "Also email me" checkbox toggles correctly
- [ ] Last triggered timestamp is displayed when the alert has fired
- [ ] Last triggered timestamp is hidden or shows "Never" when the alert has not fired

## 7. Evaluation Logic -- Drawdown Check

- [x] Alert evaluation runs only after scheduled re-backtests (`triggered_by=auto`)
- [x] Alert does NOT evaluate after manual backtests
- [x] Current drawdown is calculated as peak equity to final equity (not historical max drawdown)
- [x] Alert triggers when current drawdown >= threshold_pct
- [x] Alert does NOT trigger when current drawdown < threshold_pct
- [x] Drawdown of exactly the threshold value triggers the alert (boundary test)

## 8. Evaluation Logic -- Entry/Exit Checks

- [x] Entry alert triggers when at least one trade entry occurred on the last day of the backtest
- [x] Entry alert does NOT trigger when no trade entries occurred today
- [x] Exit alert triggers when at least one trade exit occurred on the last day of the backtest
- [x] Exit alert does NOT trigger when no trade exits occurred today
- [x] Only selected conditions are evaluated (if alert_on_entry=false, entry is not checked)
- [x] Multiple conditions can trigger simultaneously (drawdown + entry in same evaluation)

## 9. Notification on Trigger

- [x] In-app notification is created with type `performance_alert` when any condition triggers
- [x] Notification title is "Performance alert triggered"
- [x] Notification body includes the strategy name and triggered reasons
- [x] Notification body lists all reasons that fired (e.g., "current drawdown 22% >= 20%, entry signal today")
- [x] Notification includes a link to the strategy detail or latest backtest run
- [x] `last_triggered_run_id` is updated on the alert rule after triggering
- [x] `last_triggered_at` is updated on the alert rule after triggering

## 10. Duplicate Alert Prevention

- [x] Alert does not fire multiple times for the same backtest run
- [x] If the same run ID matches `last_triggered_run_id`, the alert is skipped
- [x] A new scheduled run with a different run ID can trigger the alert again

## 11. Optional Email Channel

- [x] Email is sent when `notify_email=true` and the alert triggers
- [x] Email is NOT sent when `notify_email=false`
- [x] Email content includes the strategy name and alert reasons
- [x] Email uses the existing email provider (no new email infrastructure)
- [ ] Email is plain text

## 12. Data Model Validation

- [x] `alert_rules` table exists with all specified columns
- [ ] `strategy_id` has a unique constraint
- [x] `threshold_pct` is stored as FLOAT
- [x] `alert_on_entry` and `alert_on_exit` default to false
- [x] `notify_in_app` defaults to true
- [x] `notify_email` defaults to false
- [x] `is_active` defaults to true
- [x] `last_triggered_run_id` is nullable
- [x] `last_triggered_at` is nullable
- [ ] Index exists on `(user_id, strategy_id)`

## 13. Negative & Edge Cases

- [x] Inactive alert rule (`is_active=false`) is not evaluated
- [x] Alert rule for a deleted strategy is handled gracefully
- [x] Strategy with no scheduled re-backtests never triggers an alert
- [x] Drawdown of 0% does not trigger an alert (no false positives for healthy strategies)
- [x] No SMS, push, or webhook notifications are sent
