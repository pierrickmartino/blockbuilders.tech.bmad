# Test Checklist -- User Profiles & Reputation

> Source PRD: `prd-user-profiles-reputation.md`

## 1. Data Model

- [x] `is_public` field exists (bool, default false)
- [x] `handle` field exists (string, unique, optional)
- [x] `display_name` field exists (string, optional)
- [x] `bio` field exists (string, optional, max ~160 chars)
- [x] `show_strategies` field exists (bool, default true)
- [x] `show_contributions` field exists (bool, default true)
- [x] `show_badges` field exists (bool, default true)
- [x] `follower_count` field exists (integer, or derived from follow relationship)
- [x] `badges` field exists (array of badge keys, computed or stored)
- [ ] Database migration runs cleanly on fresh and existing databases
- [x] No new complex tables are introduced (single profile extension)

## 2. Profile Privacy -- Default State

- [x] New user profile is private by default (is_public=false)
- [x] Accessing a private profile's public URL returns 404 or "Profile not public" message
- [x] Private profile data is not exposed in any public API response

## 3. Profile Privacy -- Toggles

- [x] User can toggle `is_public` to true to make profile visible
- [x] User can toggle `is_public` back to false to hide profile
- [x] User can toggle `show_strategies` on/off independently
- [x] User can toggle `show_contributions` on/off independently
- [x] User can toggle `show_badges` on/off independently
- [x] Toggling off `show_strategies` hides strategy list from public profile
- [x] Toggling off `show_contributions` hides contribution counts from public profile
- [x] Toggling off `show_badges` hides badges from public profile
- [x] Privacy toggles are accessible from existing profile settings

## 4. Public Profile Page

- [x] Public profile is accessible at `/u/{handle}` or `/profile/{id}`
- [x] Display name is shown when profile is public
- [x] Bio is shown (limited to ~160 chars) when provided
- [x] Published strategies are listed with name and link (when show_strategies=true)
- [x] Follower count is displayed as a numeric value
- [x] Contribution counts are displayed (when show_contributions=true)
- [ ] Badges are displayed with icons and labels (when show_badges=true)
- [x] Layout is a simple stacked format: header, stats row, strategy list, badges

## 5. Profile Fields -- Validation

- [x] Handle must be unique across all users
- [x] Handle rejects duplicate values with a clear error
- [x] Handle accepts valid characters (alphanumeric, reasonable special chars)
- [x] Bio is truncated or rejected if exceeding ~160 characters
- [x] Display name accepts reasonable length strings
- [x] Empty display name is allowed (field is optional)
- [ ] Empty handle is allowed (field is optional)

## 6. Contributions (Minimal)

- [x] `published_strategies` count reflects the number of strategies marked public/shared
- [x] `completed_backtests` count reflects completed backtest runs
- [x] Counts are derived from existing data (no new event tracking)
- [x] Counts update when user publishes a new strategy or runs a backtest

## 7. Badges -- Auto-Awarding

- [x] "First Public Strategy" badge is awarded when published_strategies_count >= 1
- [x] "10 Followers" badge is awarded when follower_count >= 10
- [x] "100 Backtests Run" badge is awarded when completed_backtests_count >= 100
- [x] Badges below threshold are not awarded
- [x] Badge computation is deterministic (same inputs always produce same badges)
- [x] Badges are computed server-side (on read or profile update, not via background jobs)

## 8. Badges -- Edge Cases

- [x] User at exactly the threshold (e.g., follower_count=10) receives the badge
- [x] User below threshold (e.g., follower_count=9) does not receive the badge
- [x] Losing eligibility (e.g., unpublishing a strategy) removes the badge on next computation
- [x] User can hide badges via `show_badges=false` even when awarded

## 9. API -- GET /profiles/{handle}

- [x] Returns public profile data when `is_public=true`
- [x] Returns 404 or "Profile not public" when `is_public=false`
- [x] Response excludes private data (email, billing, settings)
- [x] Response respects visibility toggles (strategies hidden if show_strategies=false)
- [x] Response includes handle, display_name, bio, follower_count
- [x] Response includes published_strategies list (when visible)
- [x] Response includes contributions object (when visible)
- [x] Response includes badges array (when visible)
- [x] Invalid or nonexistent handle returns 404

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

- [x] "Public Profile" toggle is present in settings with privacy explanation
- [x] Display name input field is editable
- [x] Bio input field is editable with character limit indicator
- [x] Handle input field is editable
- [x] Visibility toggles for strategies, contributions, badges are available
- [x] Saving settings persists changes and reloads correctly

## 13. Frontend -- Public Profile Page

- [x] Public profile renders with stacked layout
- [x] Uses existing components (Card, Badge) without new UI libraries
- [x] Handles missing optional fields gracefully (no bio, no handle, etc.)
- [x] Responsive on mobile and desktop
- [x] Empty published strategies list shows appropriate empty state
- [x] Profile with all sections hidden shows minimal public info only

## 14. Security

- [x] Private profiles do not leak data via API
- [x] Email is never exposed on public profiles
- [x] Billing data is never exposed on public profiles
- [ ] Users can only edit their own profile via PUT /profiles/me
- [x] Public profile endpoint does not require authentication
