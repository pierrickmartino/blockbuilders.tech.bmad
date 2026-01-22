# PRD: Price Alerts

## Summary
Allow users to set price alerts for any supported crypto pair (e.g., “notify when BTC reaches $50,000”). Alerts trigger via **in-app notification**, **email**, or **webhook** when price crosses the threshold. Users can set multiple alerts per asset with optional expiration. A lightweight price monitoring job evaluates rules on a fixed interval.

## Goals
- Let users monitor price levels without constant manual checks.
- Keep rules simple: above/below a single threshold per alert.
- Reuse existing notifications + email infrastructure.
- Support multiple alerts per asset and optional expiration.

## Non-Goals
- Complex rule builders (AND/OR, multi-step conditions).
- SMS, push, or third-party integrations beyond a basic webhook.
- Sub-minute latency or streaming real-time alerts.
- Portfolio-wide alerts or strategy-aware logic.

## User Stories
- As a user, I can create an alert for BTC/USDT above $50,000.
- As a user, I can create multiple alerts for the same asset (e.g., $45k and $55k).
- As a user, I can choose to receive alerts in-app, by email, or via webhook.
- As a user, I can set an expiration time so old alerts stop running.
- As a user, I can enable/disable or delete alerts at any time.

## Scope (v1)
### Rule Type
- **Asset pair**: any supported pair (Section 3.4 in product doc)
- **Direction**: `above` or `below`
- **Threshold**: numeric price
- **Channels**: in-app (default), optional email, optional webhook URL
- **Expiration**: optional timestamp
- **Multiple per asset**: allowed
- **One-shot**: alert deactivates after firing

### Channels
- In-app notification (default)
- Optional email (if opted in)
- Optional webhook (if URL provided)

## UX/UI
- **Placement:** Alerts page shared with performance alerts.
- **Create/Edit Fields:**
  - Asset pair (select)
  - Condition (above/below)
  - Threshold price
  - Channels (in-app required, optional email, optional webhook URL)
  - Optional expiration datetime
  - Active toggle
- **List View:** pair, condition, threshold, channels, status, last triggered time.

## Data Model
### Table: `alert_rules` (extend existing)
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `alert_type` (ENUM: `performance`, `price`)
- `asset` (VARCHAR, nullable for performance alerts)
- `direction` (ENUM: `above`, `below`, nullable for performance alerts)
- `threshold_price` (DECIMAL, nullable for performance alerts)
- `notify_in_app` (BOOLEAN, default true)
- `notify_email` (BOOLEAN, default false)
- `notify_webhook` (BOOLEAN, default false)
- `webhook_url` (VARCHAR, nullable)
- `expires_at` (TIMESTAMP, nullable)
- `last_checked_price` (DECIMAL, nullable)
- `last_triggered_at` (TIMESTAMP, nullable)
- `is_active` (BOOLEAN, default true)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:** `(user_id, alert_type)`, `(alert_type, asset)`

## API
### Endpoints
Reuse `/alerts` with `alert_type=price`.
- `GET /alerts` → list all alert rules
- `POST /alerts` → create price alert
- `PATCH /alerts/{id}` → update alert fields
- `DELETE /alerts/{id}` → delete alert

### Example Payload
```json
{
  "alert_type": "price",
  "asset": "BTC/USDT",
  "direction": "above",
  "threshold_price": 50000,
  "notify_email": true,
  "notify_webhook": false,
  "webhook_url": null,
  "expires_at": "2026-03-01T00:00:00Z",
  "is_active": true
}
```

## Monitoring & Evaluation
- **Job:** A lightweight scheduled job runs at a fixed interval (e.g., every 1–5 minutes).
- **Price source:** Reuse existing market price fetcher (same as market tickers).
- **Crossing logic:**
  - Trigger only when the price crosses the threshold since the last check.
  - For `above`: last_checked_price < threshold AND current_price ≥ threshold.
  - For `below`: last_checked_price > threshold AND current_price ≤ threshold.
- **On trigger:**
  - Create an in-app notification (type: `price_alert`).
  - Send email if enabled.
  - Send webhook if enabled (simple POST with JSON payload).
  - Set `last_triggered_at` and set `is_active=false` (one-shot).
- **Expiration:** If `expires_at` is in the past, mark inactive and skip evaluation.

## Notification Payloads
**In-app:**
- Title: `Price alert triggered`
- Body: `{asset} {direction} {threshold_price}. Current: {current_price}.`
- Link: Market page or alerts list.

**Webhook:**
```json
{
  "type": "price_alert",
  "asset": "BTC/USDT",
  "direction": "above",
  "threshold_price": 50000,
  "current_price": 50120,
  "triggered_at": "2026-01-01T12:00:00Z"
}
```

## Acceptance Criteria
- Users can create, edit, enable/disable, and delete price alerts.
- Multiple alerts per asset are supported.
- Alerts trigger only on threshold crossing since the last check.
- Alerts respect expiration and do not trigger after expiry.
- In-app notifications are created on trigger.
- Optional email and webhook delivery work only when enabled.
- Triggered alerts deactivate to prevent repeated firing.

## Implementation Notes (Minimal)
- Extend existing `alert_rules` model with `alert_type` and price-alert fields.
- Add a simple scheduled job for polling prices and evaluating active price alerts.
- Reuse existing notification creation helper and email provider.
- Webhook delivery is a single POST with a small JSON payload; no retries beyond existing job retry behavior.
