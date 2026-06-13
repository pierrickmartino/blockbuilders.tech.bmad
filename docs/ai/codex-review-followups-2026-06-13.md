# Codex review follow-ups since PR #525 (as of 2026-06-13)

PR #525 itself ("docs: add strategy brainstorm through Karpathy lens") has no
`chatgpt-codex-connector` (openai-codex) review comments — only a Vercel
deploy comment.

This report instead covers every **closed PR numbered > 525** (up to the
current HEAD, PR #655) that received unresolved codex review comments, and
checks each comment against the current `main` branch (commit `960fbaa`).

11 PRs had codex review threads, totalling 15 unresolved comments. **7 are
still valid**, 7 are resolved, and 1 targets a doc/ADR that no longer exists
in this repo.

## Still valid (action needed)

### 1. [P1] Onboarding flag is frozen before PostHog loads
- **Source**: PR #622, [`frontend/src/app/auth/callback/page.tsx:19`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/622#discussion_r3400866728)
- **Issue**: `drafterEnabled` is read via a one-shot `useState(() => getFeatureFlag(...))` lazy initializer, and `useOnboardingArmEnrollment` (`frontend/src/hooks/useOnboardingArmEnrollment.ts:36-52`) resolves the onboarding arm via `useMemo` on first render with `user`. `PostHogBootstrap` (`frontend/src/components/PostHogBootstrap.tsx`) loads flags in its own `useEffect`, which is not guaranteed to run before this. If flags aren't cached, `getExperimentVariant`/`getFeatureFlag` return `undefined`/`false`, and `resolveOnboardingArm` (`frontend/src/lib/onboarding-arm.ts:35-48`) permanently locks the session into "wizard, no enrollment".
- **Effect**: Fresh OAuth signups may never be enrolled in the `onboarding_ab` experiment, undercounting the A/B test.
- **Fix direction**: Re-resolve the arm after PostHog flags finish loading (e.g. `posthog.onFeatureFlags` callback or an effect that re-runs once `posthog.isFeatureEnabled` is no longer `undefined`), instead of freezing the value at first render.

### 2. [P2] "Time to activation" redefined with a different anchor in ADR-0014
- **Source**: PR #617, [`docs/adr/0014-nl-wedge-onboarding-ab-harness.md:91`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/617#discussion_r3399154646)
- **Issue**: `CONTEXT.md:178-181` (and ADR-0009) define **Time to activation** as `signup_completed → first results_viewed`. ADR-0014 line 90-92 reuses the same name but anchors it at **enrollment** (post-signup routing fork) instead of `signup_completed`.
- **Effect**: Two metrics with the same canonical name but different anchors will produce incompatible dashboards.
- **Fix direction**: Rename the ADR-0014 metric (e.g. "Time to activation from enrollment") or align it to the canonical `signup_completed` anchor.

### 3. [P2] Drafter prompt vocabulary omits block port names
- **Source**: PR #593, [`backend/app/services/drafter_vocabulary.py:182`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/593#discussion_r3389826159)
- **Issue**: `render_prompt_vocabulary()` (lines 171-183) still only emits each block's `params`, not `BlockSpec.inputs`/`outputs` (`backend/app/backtest/catalogue/types.py:30-37`). The system prompt (`strategy_drafter.py:112-143`) tells the LLM connections must use ports "listed above", but non-obvious port names (`compare.left`, `compare.right`, `entry_signal.signal`, `macd.macd`/`macd.signal`, etc.) are never listed.
- **Effect**: The LLM has to guess port names; `GraphCompiler` rejects invalid guesses, causing avoidable retries/declines.
- **Fix direction**: Include each block's input/output port names in the rendered vocabulary line.

### 4. [P2] Activation funnel excludes OAuth signups
- **Source**: PR #553, [`docs/activation-metric-runbook.md:17`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/553#discussion_r3370757787)
- **Issue**: The runbook's step-1 cohort is still `signup_completed` (line 17, reaffirmed lines 45-51). OAuth callback still emits only `login_completed` for new users (`frontend/src/context/auth.tsx:141`), and `backend/app/api/auth.py:336-354` creates new `User` rows in the OAuth path with no `signup_completed` emission.
- **Effect**: Users who sign up via OAuth can reach `results_viewed` but never enter step 1 of the canonical activation funnel, undercounting activation.
- **Fix direction**: Emit `signup_completed` (or an equivalent first-touch event) for new OAuth users, or redefine the funnel's step-1 cohort to include OAuth signups.

### 5. [P2] Coverage proxy is still consent-gated
- **Source**: PR #553, [`docs/activation-metric-runbook.md:73`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/553#discussion_r3370757789)
- **Issue**: §3 (lines 62-91) still specifies the coverage line using the same `signup_completed`-filtered cohort as the canonical funnel. `signup_completed` is emitted via `trackEvent` (`frontend/src/context/auth.tsx:102`), which no-ops unless consent is `"accepted"` (`frontend/src/lib/analytics.ts:77`).
- **Effect**: The coverage metric — meant to measure the blind spot from non-consenting users — is itself filtered to consenting users, so the blind spot it's supposed to reveal will appear smaller or vanish.
- **Fix direction**: Define the coverage cohort using a server-side, consent-independent signal (e.g. all users with a completed backtest run), not a consent-gated client event.

### 6. [P2] No path to sync pre-auth analytics consent to the server
- **Source**: PR #538, [`frontend/src/lib/analytics.ts:26`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/538#discussion_r3369610368)
- **Issue**: `setConsent` (`frontend/src/lib/analytics.ts:23-37`) only writes to `localStorage`/toggles PostHog locally — there is no server sync call anywhere. `frontend/src/context/auth.tsx` login/signup/OAuth handlers (lines 85-142) never read `getConsent()` and push it to the backend.
- **Effect**: `users.analytics_consent` stays `NULL` for the common "decide consent before logging in" flow, so the worker can't honor the user's actual choice server-side.
- **Fix direction**: After successful authentication, if `getConsent()` is already decided, sync it to the backend (`users.analytics_consent`).

### 7. [P2] ADR-0007 overstates backtest cost amortization from version dedup
- **Source**: PR #528, [`docs/adr/0007-subscription-gates-on-depth-not-throughput.md:63`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/528#discussion_r3368104121)
- **Issue**: Lines 60-63 still claim "ADR-0005's content-dedup means similar drafts reuse a version instead of re-running [a backtest]". `backend/app/api/backtests.py` `create_backtest` (lines 131-160) calls `freeze_for_backtest` (dedupes the `StrategyVersion` row only, `backend/app/services/version_freezer.py:26-34`) but unconditionally creates a new `BacktestRun` and enqueues `run_backtest_job` regardless.
- **Effect**: The ADR's cost-amortization justification for unthrottled NL-wedge backtests is not actually true — only the version row is deduped, not the computation.
- **Fix direction**: Either correct the ADR's claim, or implement result-level reuse (skip enqueueing when an existing completed `BacktestRun` already exists for the deduped `strategy_version_id`).

## Resolved (no action needed)

| # | Source | Comment | Why resolved |
|---|--------|---------|---------------|
| 8 | PR #617 (`docs/adr/0014...md:65`) | PostHog variant mapping for `onboarding_ab` was ambiguous | `frontend/src/lib/onboarding-arm.ts:39-48` now explicitly pins `test → nl_wedge`, `control → wizard`, `undefined → wizard`, and ADR-0014 §2 documents the same mapping. |
| 9 | PR #592 (`strategy_drafter.py:144`) | Anthropic client had no bounded timeout | `draft`/`redraft` now pass `timeout=settings.strategy_drafter_timeout_seconds` (default 30s, `backend/app/core/config.py:44`), with a regression test (`backend/tests/test_strategy_drafter.py:353`). |
| 10 | PR #592 (`strategy_draft_ir.py:26`) | `DraftedBlockIR.type` was a hand-maintained subset missing catalogue blocks | `BlockType` is now `Literal[tuple(vocabulary_block_types())]`, dynamically derived from the full catalogue ∪ risk blocks — `volume`, `atr`, `macd`, `bollinger`, `and`, `or`, `not` are all included. |
| 11 | PR #543 (`alembic/versions/039_add_activated_at.py:24`) | Deleting revision 039/038 left an unresolvable migration chain | A new `038_add_strategy_entry_path.py` (chained onto `037`) was added after the rollback, restoring a single continuous head (`037 → 038`). |
| 12 | PR #543 (`strategy-wizard.tsx:224`) | Wizard's first-run path only emits `auto_backtest_completed`, missing the canonical funnel step | The canonical activation event is `results_viewed` (ADR-0008), fired by `useResultViewedTracking` on the backtest results page. The wizard's `onComplete` navigates there, so first-run users are captured via that path. |
| 13 | PR #542 (`ANALYTICS_SETUP.md:269`) | Doc equated `source = server` with `is_first = true` for the activation funnel | That section of `ANALYTICS_SETUP.md` has been rewritten and no longer makes this claim; `backend/app/services/activation.py` (the module the comment described) doesn't exist in this form. |
| 14 | PR #532 (`docs/analytics/backtest_completed.md:59`) | Doc described removed browser completion events that were still emitted | `docs/analytics/backtest_completed.md` no longer exists; the still-emitted `backtest_completed`/`auto_backtest_completed` client events are now explicitly commented as "job telemetry only — NOT the activation signal". |

## Not applicable

| # | Source | Comment | Why N/A |
|---|--------|---------|---------|
| 15 | PR #529 (`docs/adr/0006-execution-free-zero-custody.md:7`) | Alerts/exports (FEAT-016/017) should gate on the verified `strategy_version_id`, not "any completed backtest ever" | `docs/adr/0006-execution-free-zero-custody.md` does not exist (current ADR-0006 is `0006-nl-wedge-drafts-new-strategies.md`, an unrelated topic), and FEAT-016/017 in `docs/features/` are unrelated features (Backtest Trades table, Trade Details Drawer). The underlying concern can't be evaluated against this repo's current docs. Note: `backend/app/services/alert_evaluator.py:63` already evaluates alerts per completed `BacktestRun` (tied to a `strategy_version_id`), which is consistent with the per-run gating the comment recommends, if/when an ADR for alerts/exports gating is written. |

## Summary

| Status | Count |
|--------|-------|
| Still valid | 7 |
| Resolved | 7 |
| Not applicable (target doc doesn't exist) | 1 |
| **Total reviewed** | **15** |
