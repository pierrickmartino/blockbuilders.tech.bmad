# Test Checklist -- User Profiles & Reputation

> Source PRD: `prd-user-profiles-reputation.md`

## 1. Data Model

- [ ] `is_public` field exists (bool, default false)
- [ ] `handle` field exists (string, unique, optional)
- [ ] `display_name` field exists (string, optional)
- [ ] `bio` field exists (string, optional, max ~160 chars)
- [ ] `show_strategies` field exists (bool, default true)
- [ ] `show_contributions` field exists (bool, default true)
- [ ] `show_badges` field exists (bool, default true)
- [ ] `follower_count` field exists (integer, or derived from follow relationship)
- [ ] `badges` field exists (array of badge keys, computed or stored)
- [ ] Database migration runs cleanly on fresh and existing databases
- [ ] No new complex tables are introduced (single profile extension)

## 2. Profile Privacy -- Default State

- [ ] New user profile is private by default (is_public=false)
- [ ] Accessing a private profile's public URL returns 404 or "Profile not public" message
- [ ] Private profile data is not exposed in any public API response

## 3. Profile Privacy -- Toggles

- [ ] User can toggle `is_public` to true to make profile visible
- [ ] User can toggle `is_public` back to false to hide profile
- [ ] User can toggle `show_strategies` on/off independently
- [ ] User can toggle `show_contributions` on/off independently
- [ ] User can toggle `show_badges` on/off independently
- [ ] Toggling off `show_strategies` hides strategy list from public profile
- [ ] Toggling off `show_contributions` hides contribution counts from public profile
- [ ] Toggling off `show_badges` hides badges from public profile
- [ ] Privacy toggles are accessible from existing profile settings

## 4. Public Profile Page

- [ ] Public profile is accessible at `/u/{handle}` or `/profile/{id}`
- [ ] Display name is shown when profile is public
- [ ] Bio is shown (limited to ~160 chars) when provided
- [ ] Published strategies are listed with name and link (when show_strategies=true)
- [ ] Follower count is displayed as a numeric value
- [ ] Contribution counts are displayed (when show_contributions=true)
- [ ] Badges are displayed with icons and labels (when show_badges=true)
- [ ] Layout is a simple stacked format: header, stats row, strategy list, badges

## 5. Profile Fields -- Validation

- [ ] Handle must be unique across all users
- [ ] Handle rejects duplicate values with a clear error
- [ ] Handle accepts valid characters (alphanumeric, reasonable special chars)
- [ ] Bio is truncated or rejected if exceeding ~160 characters
- [ ] Display name accepts reasonable length strings
- [ ] Empty display name is allowed (field is optional)
- [ ] Empty handle is allowed (field is optional)

## 6. Contributions (Minimal)

- [ ] `published_strategies` count reflects the number of strategies marked public/shared
- [ ] `completed_backtests` count reflects completed backtest runs
- [ ] Counts are derived from existing data (no new event tracking)
- [ ] Counts update when user publishes a new strategy or runs a backtest

## 7. Badges -- Auto-Awarding

- [ ] "First Public Strategy" badge is awarded when published_strategies_count >= 1
- [ ] "10 Followers" badge is awarded when follower_count >= 10
- [ ] "100 Backtests Run" badge is awarded when completed_backtests_count >= 100
- [ ] Badges below threshold are not awarded
- [ ] Badge computation is deterministic (same inputs always produce same badges)
- [ ] Badges are computed server-side (on read or profile update, not via background jobs)

## 8. Badges -- Edge Cases

- [ ] User at exactly the threshold (e.g., follower_count=10) receives the badge
- [ ] User below threshold (e.g., follower_count=9) does not receive the badge
- [ ] Losing eligibility (e.g., unpublishing a strategy) removes the badge on next computation
- [ ] User can hide badges via `show_badges=false` even when awarded

## 9. API -- GET /profiles/{handle}

- [ ] Returns public profile data when `is_public=true`
- [ ] Returns 404 or "Profile not public" when `is_public=false`
- [ ] Response excludes private data (email, billing, settings)
- [ ] Response respects visibility toggles (strategies hidden if show_strategies=false)
- [ ] Response includes handle, display_name, bio, follower_count
- [ ] Response includes published_strategies list (when visible)
- [ ] Response includes contributions object (when visible)
- [ ] Response includes badges array (when visible)
- [ ] Invalid or nonexistent handle returns 404

## 10. API -- GET /profiles/me

- [ ] Returns full profile settings for the authenticated user
- [ ] Includes all visibility toggle values
- [ ] Includes handle, display_name, bio
- [ ] Includes computed badges and contributions
- [ ] Returns 401 for unauthenticated requests

## 11. API -- PUT /profiles/me

- [ ] Updates display_name successfully
- [ ] Updates bio successfully (within char limit)
- [ ] Updates handle successfully (when unique)
- [ ] Updates visibility toggles (is_public, show_strategies, show_contributions, show_badges)
- [ ] Returns 400 for duplicate handle
- [ ] Returns 400 for bio exceeding length limit
- [ ] Returns 401 for unauthenticated requests
- [ ] Does not allow updating computed fields (badges, contributions, follower_count)

## 12. Frontend -- Profile Settings

- [ ] "Public Profile" toggle is present in settings with privacy explanation
- [ ] Display name input field is editable
- [ ] Bio input field is editable with character limit indicator
- [ ] Handle input field is editable
- [ ] Visibility toggles for strategies, contributions, badges are available
- [ ] Saving settings persists changes and reloads correctly

## 13. Frontend -- Public Profile Page

- [ ] Public profile renders with stacked layout
- [ ] Uses existing components (Card, Badge) without new UI libraries
- [ ] Handles missing optional fields gracefully (no bio, no handle, etc.)
- [ ] Responsive on mobile and desktop
- [ ] Empty published strategies list shows appropriate empty state
- [ ] Profile with all sections hidden shows minimal public info only

## 14. Security

- [ ] Private profiles do not leak data via API
- [ ] Email is never exposed on public profiles
- [ ] Billing data is never exposed on public profiles
- [ ] Users can only edit their own profile via PUT /profiles/me
- [ ] Public profile endpoint does not require authentication
