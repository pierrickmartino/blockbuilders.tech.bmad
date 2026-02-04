# Test Checklist -- Price Alerts

> Source PRD: `prd-price-alerts.md`

## 1. Price Alert CRUD

- [ ] User can create a price alert for a supported asset pair
- [ ] User can create multiple alerts for the same asset pair
- [ ] User can edit an existing price alert (threshold, channels, expiration)
- [ ] User can enable/disable an alert via the active toggle
- [ ] User can delete an alert
- [ ] User can list all alert rules (price and performance) via GET /alerts

## 2. API -- POST /alerts (price type)

- [ ] Creates a price alert with `alert_type=price` and valid fields
- [ ] Validates that `asset` is a supported pair
- [ ] Rejects unsupported asset pairs
- [ ] Validates `direction` is either `above` or `below`
- [ ] Rejects invalid direction values
- [ ] Validates `threshold_price` is a positive number
- [ ] Rejects zero or negative threshold prices
- [ ] Accepts optional `expires_at` timestamp
- [ ] Accepts optional `webhook_url` when `notify_webhook=true`
- [ ] Rejects `notify_webhook=true` without a `webhook_url`
- [ ] Defaults: `notify_in_app=true`, `notify_email=false`, `notify_webhook=false`, `is_active=true`
- [ ] Returns 401 for unauthenticated requests

## 3. API -- PATCH /alerts/{id}

- [ ] Updates threshold_price successfully
- [ ] Updates direction successfully
- [ ] Updates channel flags (notify_email, notify_webhook)
- [ ] Updates webhook_url
- [ ] Updates expires_at
- [ ] Updates is_active (enable/disable)
- [ ] Returns 404 for non-existent alert
- [ ] Returns 403 or 404 for alert owned by another user
- [ ] Returns 401 for unauthenticated requests

## 4. API -- DELETE /alerts/{id}

- [ ] Deletes the alert successfully
- [ ] Returns 404 for non-existent alert
- [ ] Returns 403 or 404 for alert owned by another user
- [ ] Returns 401 for unauthenticated requests

## 5. API -- GET /alerts

- [ ] Returns both price and performance alerts for the authenticated user
- [ ] Each item includes `alert_type` to distinguish price vs performance
- [ ] Filtering by `alert_type=price` works (if supported)
- [ ] Returns 401 for unauthenticated requests

## 6. UX -- Alerts Page

- [ ] Alerts page lists all price alerts
- [ ] Each row shows: pair, condition (above/below), threshold, channels, status, last triggered time
- [ ] Create form includes: asset pair select, condition toggle, threshold price input, channel checkboxes, optional expiration, active toggle
- [ ] Edit flow allows modifying all fields
- [ ] Webhook URL input field appears when webhook checkbox is checked

## 7. Price Monitoring Job

- [ ] Scheduled job runs at the configured interval (every 1--5 minutes)
- [ ] Job fetches current prices from the existing market price source
- [ ] Job evaluates only active (`is_active=true`) price alerts
- [ ] Job skips expired alerts (`expires_at` in the past)
- [ ] Expired alerts are marked inactive

## 8. Crossing Logic -- Above Direction

- [ ] Triggers when `last_checked_price < threshold` AND `current_price >= threshold`
- [ ] Does NOT trigger when both last and current prices are above threshold
- [ ] Does NOT trigger when both last and current prices are below threshold
- [ ] Does NOT trigger when current price is still below threshold
- [ ] Boundary: triggers at exactly the threshold price (current_price == threshold)

## 9. Crossing Logic -- Below Direction

- [ ] Triggers when `last_checked_price > threshold` AND `current_price <= threshold`
- [ ] Does NOT trigger when both last and current prices are below threshold
- [ ] Does NOT trigger when both last and current prices are above threshold
- [ ] Does NOT trigger when current price is still above threshold
- [ ] Boundary: triggers at exactly the threshold price (current_price == threshold)

## 10. One-Shot Behavior

- [ ] After triggering, the alert is set to `is_active=false`
- [ ] A triggered alert does not fire again on subsequent checks
- [ ] `last_triggered_at` is updated on trigger
- [ ] `last_checked_price` is updated after each evaluation cycle

## 11. In-App Notification on Trigger

- [ ] In-app notification is created with type `price_alert`
- [ ] Notification title is "Price alert triggered"
- [ ] Notification body includes asset, direction, threshold, and current price
- [ ] Notification includes a link to the market page or alerts list

## 12. Email Delivery on Trigger

- [ ] Email is sent when `notify_email=true` and the alert triggers
- [ ] Email is NOT sent when `notify_email=false`
- [ ] Email includes asset, direction, threshold, and current price
- [ ] Email uses the existing email provider

## 13. Webhook Delivery on Trigger

- [ ] Webhook POST is sent when `notify_webhook=true` and `webhook_url` is set
- [ ] Webhook is NOT sent when `notify_webhook=false`
- [ ] Webhook payload includes: type, asset, direction, threshold_price, current_price, triggered_at
- [ ] Webhook payload is valid JSON
- [ ] Webhook delivery failure does not block other notifications (in-app, email)
- [ ] No retries beyond existing job retry behavior

## 14. Expiration

- [ ] Alert with `expires_at` in the future is evaluated normally
- [ ] Alert with `expires_at` in the past is skipped and marked inactive
- [ ] Alert with `expires_at=null` never expires (evaluated indefinitely until triggered)

## 15. Data Model Validation

- [ ] `alert_rules` table includes `alert_type` enum column (`performance`, `price`)
- [ ] `asset` field is nullable (null for performance alerts)
- [ ] `direction` field is nullable (null for performance alerts)
- [ ] `threshold_price` field is DECIMAL and nullable
- [ ] `notify_webhook` and `webhook_url` fields exist
- [ ] `expires_at` field is nullable TIMESTAMP
- [ ] `last_checked_price` field is DECIMAL and nullable
- [ ] Indexes exist on `(user_id, alert_type)` and `(alert_type, asset)`

## 16. Negative & Edge Cases

- [ ] No SMS or push notifications are sent
- [ ] Invalid webhook URL (malformed) is rejected at creation time
- [ ] Alert for a pair that is later removed from supported pairs is handled gracefully
- [ ] Price monitoring job handles vendor API downtime without crashing
- [ ] First evaluation (when `last_checked_price` is null) does not false-trigger
- [ ] Concurrent evaluation of many alerts completes within the polling interval
