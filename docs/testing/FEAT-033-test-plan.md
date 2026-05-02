# TST: Digest Email Opt-Out Controls

## Test Checklist

### Backend / Data
- [ ] Migration adds `users.digest_email_enabled` with default `true`.
- [ ] Migration adds `strategies.digest_email_enabled` with default `true`.
- [ ] Existing users are backfilled/evaluated as `digest_email_enabled = true` after migration.
- [ ] Existing strategies are backfilled/evaluated as `digest_email_enabled = true` after migration.
- [ ] New user records default to `digest_email_enabled = true`.
- [ ] New strategy records default to `digest_email_enabled = true`.
- [ ] `GET /users/me` includes `digest_email_enabled`.
- [ ] `PUT /users/me` persists `digest_email_enabled` updates.
- [ ] Strategy settings/list payload includes `digest_email_enabled` per strategy.
- [ ] `PATCH /strategies/{id}` persists `digest_email_enabled` for owned strategy.
- [ ] `PATCH /strategies/{id}` rejects updates for strategies not owned by requester.
- [ ] Non-boolean digest values are rejected with validation errors.

### Frontend / UX
- [ ] Profile/notification settings show global `Weekly Strategy Digest` toggle.
- [ ] Global toggle renders as ON by default for users with no prior changes.
- [ ] Per-strategy section lists all user strategies with one digest toggle each.
- [ ] Each strategy toggle renders as ON by default for unchanged strategies.
- [ ] User can toggle global preference off and save successfully.
- [ ] After save and reload, global toggle remains off.
- [ ] User can toggle one specific strategy off and save successfully.
- [ ] After save and reload, only the changed strategy remains off.
- [ ] Empty strategy state shows clear `No strategies yet` message and still allows global toggle edits.
- [ ] Save failure shows plain-language error and does not silently discard pending toggle edits.

### Digest Scheduling Integration (Phase 3.1)
- [ ] User with `users.digest_email_enabled = false` receives no weekly strategy digest on next scheduled run.
- [ ] User with global ON but strategy OFF receives no digest content for that specific strategy.
- [ ] User with global ON and strategy ON remains eligible for digest content.
- [ ] Global OFF supersedes strategy-level ON flags during send eligibility checks.

### Regression
- [ ] Existing profile settings (fees/slippage/timezone/theme) still save correctly.
- [ ] Existing strategy update fields (name/asset/timeframe/archive) still save correctly when digest flag support is added.
