# Test Checklist -- Performance Alerts (Simple)

> Source PRD: `prd-performance-alerts-simple.md`

## 1. Alert Rule CRUD

- [ ] User can create a drawdown alert rule for a strategy
- [ ] Only one alert rule per strategy is allowed (unique constraint on `strategy_id`)
- [ ] Attempting to create a second rule for the same strategy returns an error
- [ ] User can update threshold, channels, entry/exit flags, or active state via PATCH
- [ ] User can delete an alert rule via DELETE
- [ ] User can list all their alert rules via GET /alerts

## 2. API -- GET /alerts

- [ ] Returns all alert rules for the authenticated user
- [ ] Returns 401 for unauthenticated requests
- [ ] Does not return alert rules belonging to other users

## 3. API -- POST /alerts

- [ ] Creates an alert rule with valid payload (strategy_id, threshold_pct, etc.)
- [ ] Validates `threshold_pct` is within range 0.1--100
- [ ] Rejects `threshold_pct` values below 0.1 or above 100
- [ ] Rejects missing `strategy_id`
- [ ] Rejects `strategy_id` for a strategy not owned by the user
- [ ] Returns 401 for unauthenticated requests
- [ ] Defaults: `notify_in_app=true`, `notify_email=false`, `is_active=true`, `alert_on_entry=false`, `alert_on_exit=false`

## 4. API -- PATCH /alerts/{id}

- [ ] Updates threshold_pct successfully
- [ ] Updates notify_email flag successfully
- [ ] Updates is_active flag (enable/disable toggle)
- [ ] Updates alert_on_entry and alert_on_exit flags
- [ ] Returns 404 for non-existent alert rule
- [ ] Returns 403 or 404 for alert rule owned by another user
- [ ] Returns 401 for unauthenticated requests

## 5. API -- DELETE /alerts/{id}

- [ ] Deletes the alert rule successfully
- [ ] Returns 404 for non-existent alert rule
- [ ] Returns 403 or 404 for alert rule owned by another user
- [ ] Returns 401 for unauthenticated requests

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

- [ ] Alert evaluation runs only after scheduled re-backtests (`triggered_by=auto`)
- [ ] Alert does NOT evaluate after manual backtests
- [ ] Current drawdown is calculated as peak equity to final equity (not historical max drawdown)
- [ ] Alert triggers when current drawdown >= threshold_pct
- [ ] Alert does NOT trigger when current drawdown < threshold_pct
- [ ] Drawdown of exactly the threshold value triggers the alert (boundary test)

## 8. Evaluation Logic -- Entry/Exit Checks

- [ ] Entry alert triggers when at least one trade entry occurred on the last day of the backtest
- [ ] Entry alert does NOT trigger when no trade entries occurred today
- [ ] Exit alert triggers when at least one trade exit occurred on the last day of the backtest
- [ ] Exit alert does NOT trigger when no trade exits occurred today
- [ ] Only selected conditions are evaluated (if alert_on_entry=false, entry is not checked)
- [ ] Multiple conditions can trigger simultaneously (drawdown + entry in same evaluation)

## 9. Notification on Trigger

- [ ] In-app notification is created with type `performance_alert` when any condition triggers
- [ ] Notification title is "Performance alert triggered"
- [ ] Notification body includes the strategy name and triggered reasons
- [ ] Notification body lists all reasons that fired (e.g., "current drawdown 22% >= 20%, entry signal today")
- [ ] Notification includes a link to the strategy detail or latest backtest run
- [ ] `last_triggered_run_id` is updated on the alert rule after triggering
- [ ] `last_triggered_at` is updated on the alert rule after triggering

## 10. Duplicate Alert Prevention

- [ ] Alert does not fire multiple times for the same backtest run
- [ ] If the same run ID matches `last_triggered_run_id`, the alert is skipped
- [ ] A new scheduled run with a different run ID can trigger the alert again

## 11. Optional Email Channel

- [ ] Email is sent when `notify_email=true` and the alert triggers
- [ ] Email is NOT sent when `notify_email=false`
- [ ] Email content includes the strategy name and alert reasons
- [ ] Email uses the existing email provider (no new email infrastructure)
- [ ] Email is plain text

## 12. Data Model Validation

- [ ] `alert_rules` table exists with all specified columns
- [ ] `strategy_id` has a unique constraint
- [ ] `threshold_pct` is stored as FLOAT
- [ ] `alert_on_entry` and `alert_on_exit` default to false
- [ ] `notify_in_app` defaults to true
- [ ] `notify_email` defaults to false
- [ ] `is_active` defaults to true
- [ ] `last_triggered_run_id` is nullable
- [ ] `last_triggered_at` is nullable
- [ ] Index exists on `(user_id, strategy_id)`

## 13. Negative & Edge Cases

- [ ] Inactive alert rule (`is_active=false`) is not evaluated
- [ ] Alert rule for a deleted strategy is handled gracefully
- [ ] Strategy with no scheduled re-backtests never triggers an alert
- [ ] Drawdown of 0% does not trigger an alert (no false positives for healthy strategies)
- [ ] No SMS, push, or webhook notifications are sent
