# PRD: In-App Notifications

## Summary
Provide simple, persistent in-app notifications for important events (e.g., backtest completed, usage limits reached, new follower, strategy commented on). Notifications appear under a bell icon with an unread count in the header and persist until acknowledged.

## Goals
- Deliver time-sensitive updates inside the app without email.
- Keep the UI and data model minimal.
- Support a small set of core event types with room to add more.

## Non-Goals
- Email/SMS/push notifications.
- Real-time streaming or websocket updates (polling is fine).
- Complex preference management or notification rules.

## User Stories
- As a user, I can see when my backtest is finished without leaving the app.
- As a user, I’m notified when I hit usage limits.
- As a user, I can see social notifications like new followers or strategy comments.
- As a user, I can mark notifications as read so the list stays tidy.

## Scope
### Notification Types (initial)
- `backtest_completed`
- `usage_limit_reached`
- `new_follower`
- `strategy_commented`
- `system` (generic fallback for important events)

### Core Behaviors
- Bell icon in header with unread count badge.
- Dropdown/panel lists notifications newest first.
- Notifications persist until acknowledged.
- Each notification shows: title, short message, timestamp, optional link.
- “Mark read” per item + “Mark all read”.
- Empty state when no notifications.

## UX/UI
- Add a bell icon to the existing app header (reuse current header layout).
- Badge shows unread count; hide badge when zero.
- Dropdown/panel width ~320px, scroll for long lists.
- Simple rows: title (bold), body (subtext), time (small, muted).
- Read notifications appear visually muted (lower opacity).

## Data Model
### Table: `notifications`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `type` (VARCHAR)
- `title` (VARCHAR)
- `body` (TEXT)
- `link_url` (VARCHAR, nullable)
- `is_read` (BOOLEAN, default false)
- `created_at` (TIMESTAMP)
- `acknowledged_at` (TIMESTAMP, nullable)

**Indexes:** `(user_id, is_read, created_at)`

## API
### Endpoints
- `GET /notifications`
  - Returns paginated list (default 20) with unread first.
- `POST /notifications/{id}/acknowledge`
  - Marks a single notification as read.
- `POST /notifications/acknowledge-all`
  - Marks all notifications as read.

### Response Shape (example)
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "backtest_completed",
      "title": "Backtest completed",
      "body": "BTC/USDT 4h finished for \"Mean Reversion\".",
      "link_url": "/backtests/123",
      "is_read": false,
      "created_at": "2025-02-20T12:34:56Z"
    }
  ],
  "unread_count": 3
}
```

## Event Triggers
- **Backtest completed:** create notification when run status becomes `completed`.
- **Usage limit reached:** create notification when a request is blocked with limit error.
- **New follower:** create notification on follower creation.
- **Strategy commented:** create notification on new comment creation.

> If follower/comment features aren’t implemented yet, stub the trigger locations for future wiring without adding extra infrastructure.

## Acceptance Criteria
- Bell icon with unread count appears in header across app pages.
- Notifications list loads for the current user and persists until acknowledged.
- “Mark read” and “Mark all read” update unread count immediately.
- Notification items include timestamp and optional deep link.
- No email or push notifications are sent.

## Implementation Notes (Minimal)
- Add a single `notifications` model and migration.
- Add a small router in `backend/app/api/notifications.py`.
- Frontend: simple dropdown component in the header; fetch list on open or on interval (e.g., every 60s).
- Keep payloads small; avoid large metadata blobs.
