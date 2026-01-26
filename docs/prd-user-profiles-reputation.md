# PRD: User Profiles & Reputation

## Summary
Introduce simple, opt-in public profiles that highlight a user’s published strategies, follower count, and community contributions. Add lightweight badge logic for key milestones to build creator identity and trust without expanding scope.

## Goals
- Provide a minimal public profile page that users can opt into.
- Show only what the user chooses to share (privacy first).
- Add small, deterministic badge logic tied to existing counts.
- Keep data model changes minimal (single profile extension, no new complex tables).

## Non-Goals
- No social feed, comments, likes, or activity streams.
- No monetization, paid subscriptions to creators, or tips.
- No advanced reputation scoring or gamification.
- No public display of private strategies, emails, or billing data.

## User Stories
- As a creator, I can opt into a public profile to showcase my published strategies.
- As a viewer, I can see a creator’s follower count and contributions to gauge trust.
- As a user, I can control which sections of my profile are visible.
- As a user, I can earn badges for simple milestones.

## Scope

### Public Profile Page (Opt-In)
- Route: `/u/{handle}` or `/profile/{id}` (choose the simplest path already used in routing patterns).
- Visible fields (only when toggled on):
  - Display name
  - Short bio (optional, limited to ~160 chars)
  - Published strategies (list with name + link)
  - Follower count (numeric)
  - Community contributions (simple counts; see below)
  - Badges (icons + labels)
- If profile is not public, return a 404 or a simple “Profile not public” message.

### Profile Privacy Controls
- Profile is private by default.
- Toggle visibility for:
  - Strategies
  - Contributions
  - Badges
- Users can update these toggles in existing profile settings.

### Contributions (Minimal)
Use existing counts; no new event system.
- Strategies published (count of strategies marked public/shared/published).
- Backtests run (count of completed runs).
- Strategy templates created (if applicable, otherwise omit).

### Badges (Auto-Awarded)
Awarded when thresholds are met; computed server-side.
- **First Public Strategy** → published_strategies_count ≥ 1
- **10 Followers** → follower_count ≥ 10
- **100 Backtests Run** → completed_backtests_count ≥ 100

Badges are optional to display; user can hide them.

## Data Model (Minimal)
Add a simple profile extension (prefer a single table or JSON column, no new graph tables).

Suggested fields (new or extended profile record):
- `is_public` (bool, default false)
- `handle` (string, unique, optional)
- `display_name` (string, optional)
- `bio` (string, optional, short)
- `show_strategies` (bool, default true)
- `show_contributions` (bool, default true)
- `show_badges` (bool, default true)
- `badges` (array of badge keys, computed or stored)

Follower count can be derived from an existing follow relationship if present; otherwise store a simple `follower_count` integer on the profile for v1.

## API (Minimal)
- `GET /profiles/{handle}`
  - Returns public profile data if `is_public` is true.
- `GET /profiles/me`
  - Returns full profile settings for the authenticated user.
- `PUT /profiles/me`
  - Update display name, bio, handle, and visibility toggles.

Response example (public):
```json
{
  "handle": "trendbuilder",
  "display_name": "Trend Builder",
  "bio": "Simple, rules-based strategies.",
  "follower_count": 12,
  "published_strategies": [
    {"id": "uuid", "name": "MA Crossover"}
  ],
  "contributions": {
    "published_strategies": 1,
    "completed_backtests": 114
  },
  "badges": [
    {"key": "first_public_strategy", "label": "First Public Strategy"},
    {"key": "ten_followers", "label": "10 Followers"},
    {"key": "hundred_backtests", "label": "100 Backtests Run"}
  ]
}
```

## UX / UI
- Profile settings live under existing user settings page.
- Public profile page uses a simple stacked layout: header, stats row, strategy list, badges.
- Use existing components (Card, Badge) and avoid new UI libraries.
- Provide a “Public Profile” toggle with a brief privacy explanation.

## Acceptance Criteria
- Profiles are private by default.
- Users can opt in and choose what to display.
- Public profile only exposes selected fields; no private data leaks.
- Badges are awarded deterministically from existing counts.
- Data model changes are minimal and do not introduce new complex tables.

## Implementation Notes (Keep Simple)
- Compute contributions and badge eligibility in a single query or small service.
- Avoid background jobs for badges; compute on read or on profile update.
- Reuse existing strategy/backtest counts from current endpoints.
