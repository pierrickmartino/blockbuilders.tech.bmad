# Test Checklist -- Price Alerts

> Source PRD: `prd-price-alerts.md`

## 1. Price Alert CRUD

- [x] User can create a price alert for a supported asset pair
- [x] User can create multiple alerts for the same asset pair
- [x] User can edit an existing price alert (threshold, channels, expiration)
- [x] User can enable/disable an alert via the active toggle
- [x] User can delete an alert
- [x] User can list all alert rules (price and performance) via GET /alerts

## 2. API -- POST /alerts (price type)

- [x] Creates a price alert with `alert_type=price` and valid fields
- [x] Validates that `asset` is a supported pair
- [x] Rejects unsupported asset pairs
- [x] Validates `direction` is either `above` or `below`
- [x] Rejects invalid direction values
- [x] Validates `threshold_price` is a positive number
- [x] Rejects zero or negative threshold prices
- [x] Accepts optional `expires_at` timestamp
- [x] Accepts optional `webhook_url` when `notify_webhook=true`
- [x] Rejects `notify_webhook=true` without a `webhook_url`
- [x] Defaults: `notify_in_app=true`, `notify_email=false`, `notify_webhook=false`, `is_active=true`
- [x] Returns 401 for unauthenticated requests

## 3. API -- PATCH /alerts/{id}

- [x] Updates threshold_price successfully
- [ ] Updates direction successfully
- [x] Updates channel flags (notify_email, notify_webhook)
- [x] Updates webhook_url
- [x] Updates expires_at
- [x] Updates is_active (enable/disable)
- [x] Returns 404 for non-existent alert
- [x] Returns 403 or 404 for alert owned by another user
- [x] Returns 401 for unauthenticated requests

## 4. API -- DELETE /alerts/{id}

- [x] Deletes the alert successfully
- [x] Returns 404 for non-existent alert
- [x] Returns 403 or 404 for alert owned by another user
- [x] Returns 401 for unauthenticated requests

## 5. API -- GET /alerts

- [x] Returns both price and performance alerts for the authenticated user
- [x] Each item includes `alert_type` to distinguish price vs performance
- [x] Filtering by `alert_type=price` works (if supported)
- [x] Returns 401 for unauthenticated requests

## 6. UX -- Alerts Page

- [x] Alerts page lists all price alerts
- [ ] Each row shows: pair, condition (above/below), threshold, channels, status, last triggered time
- [ ] Create form includes: asset pair select, condition toggle, threshold price input, channel checkboxes, optional expiration, active toggle
- [ ] Edit flow allows modifying all fields
- [x] Webhook URL input field appears when webhook checkbox is checked

## 7. Price Monitoring Job

- [x] Scheduled job runs at the configured interval (every 1--5 minutes)
- [x] Job fetches current prices from the existing market price source
- [x] Job evaluates only active (`is_active=true`) price alerts
- [ ] Job skips expired alerts (`expires_at` in the past)
- [ ] Expired alerts are marked inactive

## 8. Crossing Logic -- Above Direction

- [x] Triggers when `last_checked_price < threshold` AND `current_price >= threshold`
- [x] Does NOT trigger when both last and current prices are above threshold
- [x] Does NOT trigger when both last and current prices are below threshold
- [x] Does NOT trigger when current price is still below threshold
- [x] Boundary: triggers at exactly the threshold price (current_price == threshold)

## 9. Crossing Logic -- Below Direction

- [x] Triggers when `last_checked_price > threshold` AND `current_price <= threshold`
- [x] Does NOT trigger when both last and current prices are below threshold
- [x] Does NOT trigger when both last and current prices are above threshold
- [x] Does NOT trigger when current price is still above threshold
- [x] Boundary: triggers at exactly the threshold price (current_price == threshold)

## 10. One-Shot Behavior

- [x] After triggering, the alert is set to `is_active=false`
- [x] A triggered alert does not fire again on subsequent checks
- [x] `last_triggered_at` is updated on trigger
- [x] `last_checked_price` is updated after each evaluation cycle

## 11. In-App Notification on Trigger

- [x] In-app notification is created with type `price_alert`
- [x] Notification title is "Price alert triggered"
- [x] Notification body includes asset, direction, threshold, and current price
- [x] Notification includes a link to the market page or alerts list

## 12. Email Delivery on Trigger

- [x] Email is sent when `notify_email=true` and the alert triggers
- [x] Email is NOT sent when `notify_email=false`
- [x] Email includes asset, direction, threshold, and current price
- [x] Email uses the existing email provider

## 13. Webhook Delivery on Trigger

- [x] Webhook POST is sent when `notify_webhook=true` and `webhook_url` is set
- [x] Webhook is NOT sent when `notify_webhook=false`
- [x] Webhook payload includes: type, asset, direction, threshold_price, current_price, triggered_at
- [x] Webhook payload is valid JSON
- [x] Webhook delivery failure does not block other notifications (in-app, email)
- [x] No retries beyond existing job retry behavior

## 14. Expiration

- [ ] Alert with `expires_at` in the future is evaluated normally
- [ ] Alert with `expires_at` in the past is skipped and marked inactive
- [x] Alert with `expires_at=null` never expires (evaluated indefinitely until triggered)

## 15. Data Model Validation

- [x] `alert_rules` table includes `alert_type` enum column (`performance`, `price`)
- [x] `asset` field is nullable (null for performance alerts)
- [x] `direction` field is nullable (null for performance alerts)
- [x] `threshold_price` field is DECIMAL and nullable
- [x] `notify_webhook` and `webhook_url` fields exist
- [x] `expires_at` field is nullable TIMESTAMP
- [x] `last_checked_price` field is DECIMAL and nullable
- [x] Indexes exist on `(user_id, alert_type)` and `(alert_type, asset)`

## 16. Negative & Edge Cases

- [x] No SMS or push notifications are sent
- [x] Invalid webhook URL (malformed) is rejected at creation time
- [x] Alert for a pair that is later removed from supported pairs is handled gracefully
- [x] Price monitoring job handles vendor API downtime without crashing
- [x] First evaluation (when `last_checked_price` is null) does not false-trigger
- [x] Concurrent evaluation of many alerts completes within the polling interval
