# PRD: Performance Alerts (Simple)

## Summary
Allow users to set a simple alert like "notify me if strategy drawdown exceeds 20%" or "notify me when the strategy enters/exits" on scheduled re-backtests. **Alerts are triggered only when conditions are met FOR TODAY** (the last day of the backtest). When any selected condition is met, send an in-app notification (default) and optionally an email if the user opted in.

## Goals
- Let users monitor auto-updated strategies without manual checking.
- Keep alert rules extremely simple and easy to understand.
- Reuse existing scheduled re-backtest flow and notifications system.
- Support entry and exit alerts alongside drawdown.

## Non-Goals
- Real-time alerts or streaming updates.
- Complex rule builders (multiple metrics, AND/OR logic).
- Alerts for manual backtests.
- SMS, push, or webhook notifications.

## User Stories
- As a user, I can set a drawdown threshold for a strategy and get notified if my current equity is in drawdown by that amount today.
- As a user, I can get notified when the strategy generates an entry signal **today**.
- As a user, I can get notified when the strategy generates an exit signal **today**.
- As a user, I can enable/disable the alert without deleting it.
- As a user, I can choose in-app only or in-app + email.

## Scope
### Rule Type (v1)
- Metric: `current_drawdown_pct` (drawdown from peak to current equity)
- Condition: trigger when **current** drawdown >= `threshold_pct` (not historical max drawdown)
- Entry: trigger when at least one trade entry occurs **today** (on the last day of the backtest)
- Exit: trigger when at least one trade exit occurs **today** (on the last day of the backtest)
- Evaluation: only after **scheduled re-backtests**
- One rule per strategy (simple, no list management needed)

### Channels
- In-app notification (default, required)
- Optional email if `notify_email=true`

## UX/UI
- **Placement:** Strategy detail page → “Alerts” card.
- **Fields:**
  - Toggle: enabled/disabled
  - Alert on entry: checkbox
  - Alert on exit: checkbox
  - Threshold input: drawdown % (0.1–100)
  - Channel: checkbox for “Also email me”
- **Display:** last triggered timestamp (if any)

## Data Model
### Table: `alert_rules`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `strategy_id` (UUID, FK → strategies, unique)
- `metric` (VARCHAR, default `max_drawdown_pct`)
- `threshold_pct` (FLOAT)
- `alert_on_entry` (BOOLEAN, default false)
- `alert_on_exit` (BOOLEAN, default false)
- `notify_in_app` (BOOLEAN, default true)
- `notify_email` (BOOLEAN, default false)
- `is_active` (BOOLEAN, default true)
- `last_triggered_run_id` (UUID, FK → backtest_runs, nullable)
- `last_triggered_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:** `(user_id, strategy_id)`

## API
### Endpoints
- `GET /alerts`
  - List alert rules for current user.
- `POST /alerts`
  - Create rule for a strategy (one per strategy).
- `PATCH /alerts/{id}`
  - Update threshold, channels, or active state.
- `DELETE /alerts/{id}`
  - Delete rule.

### Example Payload
```json
{
  "strategy_id": "uuid",
  "threshold_pct": 20,
  "alert_on_entry": true,
  "alert_on_exit": false,
  "notify_email": true,
  "is_active": true
}
```

## Evaluation Logic
- Run after scheduled re-backtest completes (triggered_by = `auto`).
- Load alert rule for the strategy (if active).
- **Drawdown check:** Calculate current drawdown from peak equity to final equity (not historical max). Trigger if current drawdown >= `threshold_pct`.
- **Entry check:** Scan trades for any entry that occurred on the last day of the backtest (today).
- **Exit check:** Scan trades for any exit that occurred on the last day of the backtest (today).
- If any selected condition is triggered:
  - Create an in-app notification (type: `performance_alert`).
  - If `notify_email` is true, send a simple email using the existing email provider.
  - Update `last_triggered_run_id` and `last_triggered_at` to avoid duplicate alerts for the same run.

## Notification Copy (Simple)
- Title: "Performance alert triggered"
- Body: `"{strategy_name}" triggered alert: {reasons}.` (e.g., "current drawdown 22% ≥ 20%", "entry signal today", "exit signal today")
- Link: strategy detail or latest backtest run.

## Acceptance Criteria
- Users can create/update/delete a drawdown alert for a strategy.
- Users can opt into entry and/or exit alerts.
- Alerts only evaluate on scheduled re-backtests.
- **Entry/exit alerts only fire if the signal occurred today** (the last day of the backtest).
- **Drawdown alerts check current drawdown** (peak to final equity), not historical max drawdown.
- When triggered, an in-app notification is created.
- Optional email is sent only if enabled for the rule.
- Alerts do not fire multiple times for the same run.

## Implementation Notes (Minimal)
- Add a single `alert_rules` model + migration.
- Add a small `alerts` API router.
- Hook evaluation into the existing scheduled re-backtest completion path.
- Reuse the existing notification creation helper.
- Email is a short plain-text template using the current email provider.
