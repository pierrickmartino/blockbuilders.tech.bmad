# ADR-0023 — Profiles, badges, and digests are frozen behind a flag, not deleted

- **Status**: Accepted
- **Date**: 2026-06-17
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Publish (now frozen),
  Milestone (the kept `/progress` surface, distinct from profile badges),
  Shared backtest (the surviving distribution artifact); `docs/ACTIONS.md`
  #18 (this item), #13 / [ADR-0019](./0019-shared-backtest-is-a-social-card-artifact.md)
  (the Shared backtest, explicitly *kept* and unaffected),
  [ADR-0020](./0020-literacy-track-is-a-hybrid-template-anchored-curriculum.md)
  (the Literacy track, which the kept Milestones feed); resolved
  brainstorm decision #4 (profiles/badges/digests are roadmap drift).

## Context

ACTIONS #18 ("Freeze/hide profiles, badges, digests") reads as "switch off
three live vanity features." Grilling the code shows the surfaces are
mostly **vestigial already**, which changes what "freeze" has to mean:

- **Profiles.** `GET /profiles/{handle}` (the public `/u/[handle]` page),
  `User.is_public/handle/display_name/bio/show_*`, and `Strategy.is_published`
  exist — but `is_published` **has no setter anywhere** (the backend only ever
  *reads* it), so "Published strategies" on a profile is permanently empty.
- **The social graph is dead.** `User.follower_count` exists with **no
  follow/unfollow endpoint** anywhere, so it is forever `0`.
- **Badges.** `services/badges.py` computes three vanity badges
  (`first_public_strategy`, `ten_followers`, `hundred_backtests`) surfaced
  **only** through the profile. Two of the three are unreachable (no publish
  setter, no followers); only `hundred_backtests` can ever fire.
- **Digests are a phantom.** `digest_email_enabled` toggles sit on `User` and
  `Strategy` and are exposed in the preferences UI ("Weekly Strategy Digest")
  — but there is **no digest-generating or digest-sending job anywhere in the
  backend**. The toggle is a switch wired to nothing.

Two surfaces are deliberately **out of scope** and survive:

- The `/progress` **Milestones** (`first_strategy`, `saved_version`, …) are
  activation/onboarding scaffolding that feed the Literacy track (ADR-0020),
  not vanity-social. "Badges" in #18 means the *profile* badges only.
- The **Shared backtest** (#13 / ADR-0019) is the surviving organic-distribution
  artifact — token-gated, result-only, not on a profile — and is untouched.

This is recorded because the result deliberately leaves working-looking code
(`profiles.py`, `badges.py`, the profile columns, the digest columns) in the
tree, dark. Without this ADR a future reader cannot distinguish a deliberate
freeze from dead code to be "helpfully" deleted — or, worse, would revive
"profiles" assuming followers and publishing actually work.

## Decision

**Freeze the vanity-social surfaces behind a single backend feature flag and
static frontend removal, deleting nothing data-bearing. Handle the phantom
digest separately.**

Concretely:

1. **One backend flag.** Add `social_features_enabled: bool = False` to
   `backend/app/core/config.py`, matching the existing
   `strategy_drafter_enabled` / `scheduler_enabled` idiom. When off, the
   `/profiles/*` routes (public profile + profile badges + `me/settings`)
   return **404** — indistinguishable from the handler's existing
   "profile not found", no information leak. This covers profiles *and*
   profile badges (badges have no surface of their own).

2. **No destructive migration.** `profiles.py`, `badges.py`, and every
   profile/digest column (`is_public`, `handle`, `display_name`, `bio`,
   `show_*`, `follower_count`, `is_published`, `digest_email_enabled`) are
   **retained, dormant**. Revival of profiles is a one-line flag flip plus a
   `git revert` of the frontend removal.

3. **Frontend: hide entry points statically, no flag threaded to the client.**
   A freeze is not a runtime toggle users flip, so no public-config channel is
   built. Surgically:
   - Excise the **Public Profile card** from `/profile` (drop the
     `ProfileSettingsSection` usage). **Keep** the `/profile` route, its
     **Account card** (email, plan tier, founding-member perks), and the
     sidebar "Profile" link.
   - Excise the **Email Digest card** from `/preferences`.
   - Remove the `/u/[handle]` public-profile route.

4. **Digests are *not* under the social flag.** A weekly results digest is an
   unbuilt *retention* email — kin to Notification (#16) and pain-spike
   re-engagement (#20), not vanity-social. Folding it under
   `social_features_enabled` would mislead a future reader into thinking
   reviving digests requires un-freezing social. So: the dead toggles are
   **removed from the UI** (leaving a switch wired to nothing is worse than
   vanity — it is a dishonest promise), while the columns and API fields are
   left **dormant** for a future real digest to reuse. No flag, because there
   is no behavior to gate.

5. **`/progress` Milestones and the Shared backtest are untouched.**

6. **Existing `is_public` rows are left as-is.** No defensive
   `is_public → false` backfill. The consequence — that flipping the flag back
   on re-exposes previously-public users automatically — is accepted: the
   default is opt-in/off, the user base is tiny, the payload is near-empty
   (published 0, followers 0), and a backfill would be the destructive change
   this ADR rules out while punishing users on revival.

## Consequences

**Positive:**
- Surface area and cognitive load are reclaimed for the wedge and trust loop,
  per decision #4 — without throwing away recoverable work.
- The product gets *more honest*, not less: the digest switch-wired-to-nothing
  and the always-empty "Published strategies" stop being shown to users.
- Revival is cheap and legible (flag + `git revert`), and the dormant public
  profile shell remains available to repurpose (e.g. a public home for the
  Literacy-track content, the #14 follow-up).

**Negative / non-obvious:**
- Working-looking code is left in the tree on purpose. This ADR is the marker
  that says so; without it the freeze reads as rot.
- Frontend revival is a `git revert`, not a flag flip — the two halves of the
  freeze (backend flag, frontend static removal) have asymmetric reversal.
- On any future revival, previously-public profiles reappear without
  re-consent (see Decision §6).
- Tests that exercise `/profiles/*` and the profile/digest UI must be
  updated or gated as part of the build slice.

## Alternatives considered

- **Hard delete (rip out routes, `badges.py`, profile UI; drop columns).**
  Rejected: wrong altitude for a `[P1 · S]` prune with a handful of users, and
  it forecloses reuse of the profile shell and the dormant digest columns.
- **Hide entry points only, leave the API live.** Rejected: it hides the door
  but does not *reclaim* anything — the public `/profiles/{handle}` endpoint
  stays reachable and crawlable, so the near-empty profile data still travels.
- **One flag covering digests too.** Rejected: mislabels the digest as
  vanity-social and couples its (unrelated) future revival to un-freezing
  social.
- **Thread `social_features_enabled` to the frontend** via a public config
  endpoint or `NEXT_PUBLIC_*` var. Rejected: builds a config-delivery channel
  that does not exist, to make a *freeze* runtime-toggleable — overbuild.
- **Backfill `is_public → false` on freeze** for a safer-by-default privacy
  posture. Rejected: destructive (contradicts the no-migration decision) and
  punishes the user on revival, for a feature that is opt-in and exposes
  almost nothing.
