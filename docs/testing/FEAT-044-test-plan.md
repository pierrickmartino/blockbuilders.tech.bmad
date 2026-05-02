# Test Checklist -- In-App Notifications

> Source PRD: `prd-in-app-notifications.md`

## 1. Bell Icon & Unread Badge

- [ ] Bell icon is visible in the app header on all authenticated pages
- [ ] Bell icon is not visible for unauthenticated/logged-out users
- [ ] Unread count badge displays the correct number of unread notifications
- [ ] Badge is hidden when unread count is zero
- [ ] Badge updates immediately after marking a notification as read
- [ ] Badge updates immediately after "Mark all read"

## 2. Notification Dropdown/Panel

- [ ] Clicking the bell icon opens the notification dropdown/panel
- [ ] Dropdown width is approximately 320px
- [ ] Notifications are listed newest first
- [ ] Long lists are scrollable within the panel
- [ ] Empty state is shown when there are no notifications
- [ ] Panel closes when clicking outside of it

## 3. Notification Item Display

- [ ] Each notification shows a title (bold)
- [ ] Each notification shows a body (subtext)
- [ ] Each notification shows a timestamp (small, muted)
- [ ] Notifications with a `link_url` display a clickable deep link
- [ ] Notifications without a `link_url` do not show a broken link
- [ ] Read notifications appear visually muted (lower opacity)
- [ ] Unread notifications appear with normal/full opacity

## 4. Mark Read Actions

- [ ] "Mark read" on a single notification sets `is_read=true` for that item
- [ ] "Mark read" immediately updates the visual state of the notification (muted)
- [ ] "Mark read" immediately decrements the unread count badge
- [ ] "Mark all read" sets `is_read=true` for all notifications
- [ ] "Mark all read" sets the badge to zero and hides it
- [ ] "Mark all read" visually mutes all items in the list

## 5. API -- GET /notifications

- [ ] Returns paginated list of notifications (default page size 20)
- [ ] Returns unread notifications first, then read notifications
- [ ] Response includes `unread_count` field
- [ ] Each item includes `id`, `type`, `title`, `body`, `link_url`, `is_read`, `created_at`
- [ ] Returns only notifications for the authenticated user (no cross-user leakage)
- [ ] Returns 401 for unauthenticated requests
- [ ] Pagination works correctly (page 2 returns next set of results)

## 6. API -- POST /notifications/{id}/acknowledge

- [ ] Marks the specified notification as read (`is_read=true`, `acknowledged_at` set)
- [ ] Returns success for a valid notification owned by the current user
- [ ] Returns 404 for a notification that does not exist
- [ ] Returns 403 or 404 for a notification owned by another user
- [ ] Returns 401 for unauthenticated requests
- [ ] Acknowledging an already-read notification is idempotent (no error)

## 7. API -- POST /notifications/acknowledge-all

- [ ] Marks all unread notifications for the current user as read
- [ ] Sets `acknowledged_at` on all affected notifications
- [ ] Returns 401 for unauthenticated requests
- [ ] Works correctly when user has zero unread notifications (no error)
- [ ] Does not affect notifications belonging to other users

## 8. Data Model Validation

- [ ] `notifications` table exists with all specified columns: `id`, `user_id`, `type`, `title`, `body`, `link_url`, `is_read`, `created_at`, `acknowledged_at`
- [ ] `id` is a UUID primary key
- [ ] `user_id` references the users table (FK constraint)
- [ ] `is_read` defaults to `false`
- [ ] `link_url` is nullable
- [ ] `acknowledged_at` is nullable
- [ ] Composite index exists on `(user_id, is_read, created_at)`

## 9. Notification Types & Event Triggers

- [ ] `backtest_completed` notification is created when a backtest run status becomes `completed`
- [ ] `usage_limit_reached` notification is created when a request is blocked by a usage limit
- [ ] `new_follower` notification is created on follower creation (or stub exists for future wiring)
- [ ] `strategy_commented` notification is created on new comment creation (or stub exists for future wiring)
- [ ] `system` type notifications can be created for generic important events
- [ ] Notification `type` field stores the correct type string for each trigger

## 10. Polling & Refresh

- [ ] Frontend fetches notification list on dropdown open
- [ ] Frontend polls for new notifications on an interval (e.g., every 60 seconds)
- [ ] New notifications appear in the list without a full page reload
- [ ] Unread count badge updates on poll results

## 11. Negative & Edge Cases

- [ ] No email or push notifications are sent (only in-app)
- [ ] Extremely long title or body text does not break the dropdown layout
- [ ] Rapid "mark read" clicks do not cause duplicate API calls or race conditions
- [ ] Notification payloads remain small (no large metadata blobs)
- [ ] User with hundreds of notifications can scroll and paginate without performance issues
