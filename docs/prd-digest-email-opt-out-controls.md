# PRD: Digest Email Opt-Out Controls

## 1. Summary
Add simple digest email preference controls before weekly strategy digest launch. Users can opt out globally or per strategy from profile/notification settings, with both new fields defaulting to opted-in (`true`) for existing and new records.

## 2. Problem Statement
Without pre-launch controls, users cannot prevent receiving weekly digest emails. This creates avoidable trust and communication issues when the digest system starts sending by default.

## 3. Goals
- Give users a clear global on/off control for weekly digest emails.
- Give users per-strategy digest controls for finer granularity.
- Keep defaults simple and safe: existing users/strategies stay opted in unless explicitly changed.

## 4. Non-Goals
- Building or changing the digest generation/scheduling engine itself.
- Adding channel-level preferences beyond weekly strategy digest.

## 5. Target Users & User Stories
### 5.1 Target Users
- Existing users who want to opt out before digest launch.
- Active strategy creators who only want digests for selected strategies.

### 5.2 User Stories
- As a user, I want a global weekly digest toggle, so I can quickly opt out of all digest emails.
- As a user, I want per-strategy digest toggles, so I can receive digests only for strategies I care about.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Database migration adding `digest_email_enabled BOOLEAN DEFAULT true` to `users`.
- Database migration adding `digest_email_enabled BOOLEAN DEFAULT true` to `strategies`.
- Profile/notification settings UI section for digest preferences.
- Save behavior for global and per-strategy toggles.
- Digest eligibility rules for next scheduled digest run (Phase 3.1).

### 6.2 Out of Scope
- New digest content templates.
- New email providers, delivery retries, or unsubscribe token mechanics.

### 6.3 Functional Requirements
- Migration sets default `true` for both new columns, including existing rows via default/backfill behavior.
- Profile/notification settings show:
  - Global `Weekly Strategy Digest` toggle (default on).
  - Per-strategy list with one digest toggle per strategy (default on).
- Saving global toggle off sets `users.digest_email_enabled = false`.
- Saving a strategy toggle off sets `strategies.digest_email_enabled = false` only for that strategy.
- Digest send logic (Phase 3.1) must treat a user as eligible only when:
  - `users.digest_email_enabled = true`, and
  - the specific strategy has `strategies.digest_email_enabled = true`.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens profile/notification settings.
2. User sees `Weekly Strategy Digest` global toggle at top.
3. User sees per-strategy digest toggle list below global control.
4. User updates one or more toggles and saves.
5. Saved preferences apply to the next scheduled digest run.

### 7.2 States
- Loading: Show lightweight skeleton/placeholder for per-strategy list.
- Empty: Show `No strategies yet` and keep global toggle visible.
- Error: Show plain-language save error and keep unsaved edits visible.
- Success: Show confirmation message/toast after preferences persist.

### 7.3 Design Notes
- Keep this section in existing profile/settings page; no new multi-step flows.
- Per-strategy list should use strategy name + one toggle, no extra metadata.
- Global toggle placement should make precedence obvious (global off means no digest emails).

## 8. Data Requirements
### 8.1 Data Model
- `users.digest_email_enabled` — `BOOLEAN` — global digest opt-in/out, default `true`.
- `strategies.digest_email_enabled` — `BOOLEAN` — per-strategy digest opt-in/out, default `true`.

### 8.2 Calculations / Definitions (if applicable)
- **User digest enabled:** `users.digest_email_enabled = true`.
- **Strategy digest enabled:** `strategies.digest_email_enabled = true`.
- **Final send eligibility:** `user digest enabled AND strategy digest enabled`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /users/me` — include `digest_email_enabled` in user settings payload.
- `PUT /users/me` — allow updating user-level `digest_email_enabled`.
- `GET /strategies` (or existing strategy settings source) — include `digest_email_enabled` for list rendering in settings.
- `PATCH /strategies/{id}` — allow updating `digest_email_enabled` for one strategy.

### 9.2 Validation & Error Handling
- Reject non-boolean values for digest flags with clear validation errors.
- Enforce strategy ownership on per-strategy updates.
- If per-strategy save partially fails in batch UI flows, surface which strategies failed.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing profile settings layout and form save patterns.
- Keep toggle logic simple: controlled boolean state, no derived tri-state behavior.
- Persist global and per-strategy changes through existing settings endpoints where possible.

### 10.2 Backend
- Add one migration for both new boolean columns with default `true`.
- Extend existing user and strategy schemas/models to expose and accept digest flags.
- Ensure future digest job query includes both user-level and strategy-level flags.

## 11. Rollout Plan
- Deploy migration adding both digest columns.
- Deploy API/schema updates exposing new fields.
- Deploy profile/settings UI toggles.
- Validate next scheduled digest run respects saved preferences (Phase 3.1 integration check).

## 12. Acceptance Criteria
- [ ] Migration adds `users.digest_email_enabled BOOLEAN DEFAULT true`.
- [ ] Migration adds `strategies.digest_email_enabled BOOLEAN DEFAULT true`.
- [ ] Existing users and existing strategies are opted in by default after migration.
- [ ] Profile/notification settings show global `Weekly Strategy Digest` toggle on by default.
- [ ] Profile/notification settings show per-strategy digest toggles for each strategy, on by default.
- [ ] Saving global toggle off sets `users.digest_email_enabled` to `false`.
- [ ] Saving global toggle change affects the next scheduled digest run.
- [ ] Saving a strategy toggle off sets only that strategy’s `strategies.digest_email_enabled` to `false`.

## 13. Tracking Metrics (Optional)
- Percentage of users with global digest toggle turned off.
- Percentage of strategies with per-strategy digest toggle turned off.
- Digest send suppression count due to global or per-strategy opt-out flags.

## 14. Dependencies (Optional)
- Existing profile/settings page and user settings API.
- Existing strategy list/update API endpoints.
- Phase 3.1 scheduled digest pipeline consuming these flags.

## 15. Risks & Mitigations (Optional)
- Risk: Users think per-strategy toggles work when global toggle is off.  
  Mitigation: Add concise helper text indicating global toggle overrides sends.
- Risk: Incomplete API wiring causes UI mismatch between saved and displayed values.  
  Mitigation: Return persisted values from save response and refresh local state from server.

## 16. Open Questions
- Should per-strategy toggles be editable when global toggle is off, or simply shown as saved preferences?
- Should profile settings save global + per-strategy updates in one request or separate requests?
