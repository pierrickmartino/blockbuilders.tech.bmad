# Tasks — in flight

## Issue #614 — Route the strategy wizard's enqueue through the shared startAutoBacktest helper (done)

Behavior-preserving refactor (ADR-0013 §4): the wizard's first-run auto-backtest enqueue now goes through the same `startAutoBacktest` helper introduced for the NL wedge in #613, so the 1-year window and `auto_backtest_started` telemetry are defined in exactly one place.

Frontend
- [x] `src/lib/start-auto-backtest.ts` — added an optional `source?: string | null` param to `StartAutoBacktestParams`, defaulting to `entryPath` when omitted (unchanged for the wedge's `nl_wedge` call). Lets a caller's `auto_backtest_started.source` differ from the `entryPath` used to resolve the cohort.
- [x] `src/app/(app)/strategies/strategy-wizard.tsx` — `handleComplete`'s first-run branch replaces the inline `yearAgo`/`now` window computation, `BacktestsApiClient.create`, and `auto_backtest_started` `trackEvent` call with `startAutoBacktest({ strategyId: strategy.id, entryPath: strategy.entry_path, source: "wizard_first_run", userId: user?.id })`. The returned `runId` drives the existing poll loop, `auto_backtest_completed` telemetry, and `onComplete(strategy.id, runId)` — all unchanged. `isFirstRun` gating, the in-dialog poll-then-navigate loop, and non-first-run behavior are untouched.

Tests
- [x] `src/lib/__tests__/start-auto-backtest.test.ts` (+1) — caller-supplied `source` overrides the `auto_backtest_started.source` while the cohort is still resolved from `entryPath`.
- [x] `src/app/(app)/strategies/__tests__/strategy-wizard.test.tsx` (+2, new describe block) — first-run completion calls `startAutoBacktest` with `{ entryPath: "wizard", source: "wizard_first_run" }` and the resulting `BacktestsApiClient.create` call/`auto_backtest_started` telemetry still carry the 1-year window and the `wizard`/`manual` cohort; non-first-run completion does not call `startAutoBacktest` or enqueue a backtest.

Verification
- [x] `cd frontend && npx vitest run "src/app/(app)/strategies/__tests__/strategy-wizard.test.tsx" "src/lib/__tests__/start-auto-backtest.test.ts"` → 10 passed
- [x] `cd frontend && npx vitest run` (full suite) → 612 passed (60 files)
- [x] `cd frontend && npx tsc --noEmit` → clean
- [x] `cd frontend && npx eslint` on changed files → clean

Risks / gaps
- No env vars added/changed. No backend or schema changes.

## NL-wedge #5 — Review surface core: Accept/Edit + running→verdict + disposition state machine (Issue #603, implemented — Module B)

Scope decision (sessionStorage full slice): #603 is logically gated on #6 (auto-backtest-on-draft) which doesn't exist yet, so there's no real "land on result page in running→verdict" flow today. Built Module B (`draftReviewReducer` + `useDraftReviewState`) self-contained behind a sessionStorage flag keyed by strategy id, so it's fully testable now and the Accept/Edit controls + canvas banner light up automatically once #6 lands and redirects to the result page.

Frontend
- [x] `src/lib/draft-review-reducer.ts` (new) — pure reducer: `DraftOutcome = "accepted" | "edited" | "kept" | "rejected"`; `DraftReviewState { isUnderReview, outcome }`; `INIT` arms review (no-op if already armed or already disposed); `ACCEPT`/`EDIT`/`KEEP`/`REJECT` disarm with the matching outcome (no-op if not under review)
- [x] `src/lib/draft-review-storage.ts` (new) — sessionStorage helpers `markDraftUnderReview`/`isDraftUnderReview`/`resolveDraftReview`, keyed `bb.nl_draft_review:{strategyId}`; `typeof window === "undefined"` + try/catch guarded (UI-only, ADR-0005, no schema change)
- [x] `src/hooks/useDraftReviewState.ts` (new) — wraps the reducer; `INIT`s when `entryPath === "nl_wedge"` and storage flags the strategy; `accept/edit/keep/reject` dispatch the matching action, clear storage, and fire `nl_draft_outcome` (`{strategy_id, outcome, ...resolveCohort(entryPath)}`) via `trackEvent`, guarded so disposed/never-armed states no-op
- [x] `src/components/DraftReviewBanner.tsx` (new) — non-committal canvas banner ("AI draft — under review"), UI-only, renders nothing when not visible
- [x] `src/components/backtest/DraftReviewControls.tsx` (new) — result-page Accept/Edit controls (Sparkles/Check/Pencil icons, primary-tinted card matching `AiDraftedBadge` tokens)
- [x] `src/app/(app)/strategies/draft/page.tsx` — calls `markDraftUnderReview(result.strategy_id)` on successful draft, before navigating to the strategy
- [x] `src/app/(app)/strategies/[id]/backtest/page.tsx` — instantiates `useDraftReviewState`; renders `<DraftReviewControls>` above the KPI strip when a completed run is under review; Accept → `accept()`; Edit → `edit()` + navigate to canvas; passes `shareLocked={isUnderReview}` to `BacktestPageHeader`
- [x] `src/app/(app)/strategies/[id]/page.tsx` (canvas) — added `useAuth`; instantiates `useDraftReviewState`; renders `<DraftReviewBanner visible={isUnderReview} />` above `<StrategyHeader>`
- [x] `src/components/backtest/PageHeader.tsx` — new `shareLocked?: boolean` prop; Share button now gated on `showActions && !shareLocked` (split from Export, which stays under `showActions`)

Tests (mandated: each disposition → correct `nl_draft_outcome`; `edited` fires on Edit choice; exit-guard arms/disarms)
- [x] `src/lib/__tests__/draft-review-reducer.test.ts` (new, 13 tests) — INIT/ACCEPT/EDIT/KEEP/REJECT transitions, no-op guards, immutability
- [x] `src/lib/__tests__/draft-review-storage.test.ts` (new, 5 tests) — mark/check/resolve, per-strategy scoping
- [x] `src/hooks/__tests__/useDraftReviewState.test.ts` (new, 11 tests) — init gating on `entry_path`/storage flag, accept/edit payload + storage clear, exit-guard arm (`isUnderReview = true`) and disarm on each of the 4 dispositions
- [x] `src/components/__tests__/DraftReviewBanner.test.tsx` (new, 2 tests)
- [x] `src/components/backtest/__tests__/DraftReviewControls.test.tsx` (new, 3 tests)
- [x] `src/components/backtest/__tests__/PageHeader.test.tsx` (new, 2 tests) — Share hidden / Export kept when `shareLocked`
- [x] `src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx` (+1) — `markDraftUnderReview("strategy-1")` called on success

Verification
- [x] `cd frontend && npx vitest run` → 587 passed (56 files)
- [x] `cd frontend && npx tsc --noEmit` → clean
- [x] `cd frontend && npm run lint` → 0 errors, 23 warnings (all pre-existing, none in touched files except one pre-existing unrelated `loadVersions` unused-var warning in `[id]/page.tsx`)

Risks / gaps
- Reject button/one-click+Undo flow is explicitly out of scope for this slice (follow-up per #603); `REJECT`/`KEEP` actions exist in the reducer/hook for completeness but have no UI entry point yet.
- No dedicated page-level integration test for `backtest/page.tsx` or `[id]/page.tsx` (both >800 lines, no existing test harness) — coverage lives at the reducer/storage/hook/component level, which is where the mandated behaviors are fully exercised.
- The Accept/Edit surface and canvas banner are inert until #6 (auto-backtest-on-draft) actually redirects users to the result page in a `running→verdict` state — `markDraftUnderReview` is called today, so the surface activates automatically once #6 ships.

## NL-wedge #5 — Reject cascade: extract delete_strategy_cascade + hard-delete endpoint (Issue #602, implemented)

Backend
- [x] `app/services/exceptions.py` — added `StrategyNotFound` (`DomainError`, 404)
- [x] `app/services/strategy_deletion.py` (new) — `delete_strategy_cascade(strategy_id, user, session)`: ownership-checked (raises `StrategyNotFound` if not owned), hard-deletes `AlertRule`, `BacktestRun`, `StrategyVersion`, `StrategyTagLink`, and `StrategyDraft` (working copy) rows for the strategy, then the `Strategy` row itself. Does not commit — caller owns the transaction. Idempotent: re-running after partial deletion is a no-op for already-removed rows; re-running after full deletion raises `StrategyNotFound`.
- [x] `app/api/strategies.py` — `bulk_delete_strategies` re-pointed at `delete_strategy_cascade` (looped per id, single commit, all-or-nothing on exception — same response contract as before); new `DELETE /strategies/{strategy_id}` endpoint calls the cascade + commits, returns `StrategyDeleteResponse`
- [x] `app/schemas/strategy.py` — added `StrategyDeleteResponse {id, deleted}`

Frontend
- [x] `src/lib/api/strategies-client.ts` — added `StrategiesApiClient.delete(id)` → `DELETE /strategies/{id}`

Tests
- [x] `backend/tests/services/test_strategy_deletion.py` (new, mandated module A) — full-cascade removal (working copy, version, backtest run, alert rule, tag link all gone), ownership enforcement (`StrategyNotFound` for another user's strategy and for a nonexistent id), idempotent/safe behavior on an already-partially-deleted strategy (pre-removed backtest run + alert rule; cascade still finishes; second call raises `StrategyNotFound`)
- [x] `backend/tests/api/test_docs_backend_cases.py` — new `DELETE /strategies/{id}` tests (happy path returns `{id, deleted: true}`, 404 on re-delete, 404 + no-op for an unowned strategy); existing bulk-delete test untouched and still passes
- [x] `frontend/src/lib/api/__tests__/strategies-client.test.ts` — `delete()` request/response contract

Verification
- [x] `cd backend && python -m pytest -q` → 974 passed
- [x] `cd frontend && npx vitest run src/lib/api/__tests__/strategies-client.test.ts` → 34 passed
- [x] `cd frontend && npx tsc --noEmit` → clean

Risks / gaps
- The cascade does not touch `SharedBacktestLink` rows (FK to `backtest_runs.id`), matching the pre-existing `bulk_delete_strategies` behavior — out of scope per #602's explicit list (working copy, frozen version(s), backtest run(s), alert rule(s)). If a strategy's backtest run was ever shared, its `shared_backtest_links` row becomes orphaned; not introduced by this change.
- No frontend UI wiring for the single-delete endpoint — #602 only asks for the API-client method; the Reject UI itself is a separate slice per ADR-0012.

## NL wedge slice 4: refusal path — declined arm + validator-invalid → plain-language, nothing persists (Issue #587, implemented)

Backend
- [x] `app/api/strategies.py` (`draft_strategy_from_nl`) — the validator-invalid branch now reuses the validator's plain-language `user_message` (falling back to its internal `message`) for `reason`, instead of a generic "did not pass validation" string. The `drafted | declined` IR union, `compile_graph`'s `GraphCompilationError → declined` mapping, and the `success: true` (HTTP 200, `outcome: "declined"`) refusal envelope already existed from slices 1–3 and needed no change.

Tests
- [x] `backend/tests/api/test_strategy_draft_from_nl.py` (+3 cases) — `test_draft_from_nl_declined_by_drafter_persists_nothing` (fake provider returns `DeclinedOutcome` → `outcome="declined"`, reason passed through, zero `Strategy`/`StrategyDraft` rows), `test_draft_from_nl_validator_invalid_persists_nothing` (a `drafted` IR with an entry condition but no exit → compiles fine, fails `collect_validation_errors` with `MISSING_EXIT` → `outcome="declined"` with the validator's plain-language message, zero rows persisted), `test_draft_from_nl_compile_error_persists_nothing` (IR with an unresolvable connection ref → `GraphCompilationError` → `outcome="declined"`, zero rows persisted).
- [x] `backend/tests/test_strategy_drafter.py` — `test_llm_drafter_passes_through_declined_outcome` (fake provider) already covered the `StrategyDrafter` → `DeclinedOutcome` mapping from slice 2; no new drafter-level test needed.
- [x] `frontend/src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx` — "shows the decline reason without navigating when the drafter declines" already covers rendering `reason` inline and leaving the form in place for re-submission; no change needed.

Verification
- [x] `cd backend && /tmp/venv/bin/python -m pytest -q` → 952 passed
- [x] `cd frontend && npx vitest run "src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx"` → 4 passed

Risks / gaps
- None — all acceptance criteria for #587 were already structurally satisfied by slices 1–3 (discriminated `drafted | declined` IR, no-partial-persist guards, `success: true`/HTTP 200 refusal envelope, frontend reason rendering); this slice's only functional gap was the validator-invalid path's generic reason string, now fixed and tested.

## NL wedge slice 3: full catalogue ∪ risk-block vocabulary — DrafterVocabulary projection (Issue #586, implemented)

Backend
- [x] `app/services/drafter_vocabulary.py` (new) — pure, zero-I/O `DrafterVocabulary` projection (ADR-0011 decision 6): `RISK_BLOCK_SPECS` (hand-defined `BlockSpec`s for the 6 inline risk/exit blocks, bounds mirroring `strategy_validation.validate_block_params`), `vocabulary_block_types()` (catalogue ∪ risk blocks, sorted by category/type), `vocabulary_spec`/`vocabulary_param_specs`/`vocabulary_description` (per-type lookups, `ParamSpec`s straight from `BlockSpec.params`), `render_prompt_vocabulary()` (compact prompt text grouped by category — label, one-liner "what it does/when to use", param shapes). A block not in the hand-curated `_DESCRIPTIONS` dict falls back to `f"{label} ({category} block)."`, so newly-catalogued blocks remain draftable with no change here.
- [x] `app/schemas/strategy_draft_ir.py` — `BlockType` is now `Literal[tuple(vocabulary_block_types())]`, derived from the catalogue ∪ risk-block union (29 types, up from the slice-2 hand-listed 15) instead of a static hand-listed `Literal`.
- [x] `app/services/strategy_drafter.py` — `_SYSTEM_PROMPT`'s "Available block types" section is now generated via `render_prompt_vocabulary()` instead of a hand-written block list; the static "Rules" section is unchanged.

Tests
- [x] `backend/tests/test_drafter_vocabulary.py` (new, 25 cases, 100% coverage) — module purity; vocabulary == catalogue ∪ `RISK_BLOCK_SPECS` (set equality); each risk block draftable and disjoint from `CATALOGUE`; sample catalogue blocks draftable; `vocabulary_param_specs` matches `BlockSpec.params`/`RISK_BLOCK_SPECS` for every catalogue/risk type; unknown type → `()`; prompt vocabulary lists every block type, includes descriptions and param shapes; param with no min/max bound renders correctly; new-catalogue-block-auto-appears property (monkeypatch `CATALOGUE`, assert it appears in both `vocabulary_block_types()` and `render_prompt_vocabulary()`).

Verification
- [x] `cd backend && python -m pytest -q` → 949 passed, including the 25 new `test_drafter_vocabulary.py` cases
- [x] `cd backend && python -m pytest tests/test_drafter_vocabulary.py --cov=app.services.drafter_vocabulary --cov-report=term-missing` → 100% coverage
- [x] `ruff check` on all changed/added files → clean

Risks / gaps
- Catalogue block one-liner descriptions in `_DESCRIPTIONS` are hand-curated for all 23 current catalogue blocks + 6 risk blocks; a new catalogue block without a curated entry still appears (via the generic fallback) but with a less informative prompt description — acceptable per the acceptance criteria ("no drafter code change" required, not "no prompt-quality follow-up").
- The `compare` block's `operator` enum now exposes all of `_OPERATOR_MAP`'s aliases (`>`, `above`, `gt`, `greater_than`, ...) in the prompt, vs. the slice-2 hand-written prompt's terse `[">", "<", ">=", "<="]` — more verbose but accurate to the catalogue; not expected to affect drafting quality since `instructor` retries on schema mismatches.

## NL wedge slice 1: walking skeleton — NL box → stub drafter → compile → validate → persist → canvas (Issue #584, implemented)

Backend
- [x] `app/schemas/strategy_draft_ir.py` (new) — semantic IR for the drafter/compiler seam (ADR-0011): `DraftedBlockIR`, `DraftedConnectionIR`, `DraftedIR`, discriminated `DraftResult = DraftedOutcome | DeclinedOutcome`
- [x] `app/services/graph_compiler.py` (new) — pure, zero-I/O `compile_graph(ir) -> dict`: mints `f"{type}-{n}"` block ids, resolves Ports against the Block Catalogue, assigns deterministic column/row layout positions, builds `connections` in the `{from_port,to_port}` shape consumed by `StrategyDefinitionValidate`. Raises `GraphCompilationError` for unknown refs/ports/block types.
- [x] `app/services/strategy_drafter.py` (new) — `StrategyDrafter` Protocol + `StubStrategyDrafter` (always returns a fixed RSI-oversold-bounce `DraftedOutcome` IR, no LLM) + `get_strategy_drafter()` factory — the seam later slices swap a real LLM provider into (sibling of Price Provider, ADR-0003)
- [x] `app/core/config.py` — added `strategy_drafter_enabled: bool = False`
- [x] `app/schemas/strategy.py` — added `StrategyDraftFromNlRequest` (`nl_text` 1–2000 chars, `asset`/`timeframe` validated like `StrategyCreateRequest`) and `StrategyDraftFromNlResponse` (`outcome: success|declined|disabled`, `strategy_id`, `reason`)
- [x] `app/api/strategies.py` — `POST /strategies/draft-from-nl`: flag check → `get_strategy_drafter().draft()` → `compile_graph()` → `StrategyDefinitionValidate` + `collect_validation_errors()` gate → on success persists `Strategy(entry_path=NL_WEDGE)` + working copy via `upsert_working_copy`; declined/disabled paths persist nothing

Frontend (new dedicated route, per user decision)
- [x] `src/components/ui/textarea.tsx` (new) — shadcn-style Textarea primitive, mirrors `Input`'s classes
- [x] `src/types/strategy.ts` — added `StrategyDraftFromNlRequest`/`StrategyDraftFromNlResponse`
- [x] `src/lib/api/strategies-client.ts` — added `StrategiesApiClient.draftFromNl(...)`
- [x] `src/app/(app)/strategies/draft/page.tsx` (new) — NL textarea + asset picker + timeframe selector + submit; loading state; success → `router.push(/strategies/{id})` + `strategy_created` (`source: "nl_wedge"`, cohort via `resolveCohort("nl_wedge")`); declined/disabled outcomes shown inline, nothing persisted client-side
- [x] `src/app/(app)/strategies/page.tsx` — added a "Generate from description" button linking to `/strategies/draft`

Tests
- [x] `backend/tests/test_graph_compiler.py` (new, 12 cases) — module purity, id minting/uniqueness, connection resolution, layout positions, determinism, port-resolution errors (unknown output/input port, unknown ref), risk-block handling, label defaults, full round-trip through `StrategyDefinitionValidate`
- [x] `backend/tests/test_strategy_drafter.py` (new, 5 cases) — module purity, stub returns `DraftedOutcome`, determinism, factory returns `StubStrategyDrafter`, stub IR compiles + validates with zero errors
- [x] `backend/tests/api/test_strategy_draft_from_nl.py` (new, 3 cases) — auth required (401), disabled-flag → `{outcome:"disabled"}` with nothing persisted, success → `{outcome:"success", strategy_id}` + exactly one `Strategy(entry_path=nl_wedge)` + populated `strategy_drafts` row
- [x] `frontend/src/lib/api/__tests__/strategies-client.test.ts` — `draftFromNl()` request/response contract
- [x] `frontend/src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx` (new, 4 cases) — renders form controls; submit → loading → success navigates + tracks `strategy_created`; declined shows reason inline; disabled shows unavailable message

Verification
- [x] RED→GREEN confirmed for each new module (graph_compiler, strategy_drafter, draft-from-nl endpoint, draft page) before implementing
- [x] `cd backend && .venv/bin/python -m pytest -q` → 917 passed
- [x] `cd frontend && npx vitest run` → 48 files / 538 passed
- [x] `cd frontend && npx tsc --noEmit` → clean
- [x] `cd frontend && npx eslint` on touched/added files → clean (2 pre-existing warnings on `strategies/page.tsx`, unrelated)

Docs / env
- [x] `STRATEGY_DRAFTER_ENABLED=false` added to `.env.example` and `README.md` env table; `docker-compose.yml` uses `env_file: .env` for the `api`/`worker` services so no per-var listing needed there

Risks / gaps
- `DrafterVocabulary` (real LLM-backed drafting) is explicitly out of scope for this slice (#583 PRD) — `StubStrategyDrafter` always returns the same RSI-oversold-bounce IR regardless of `nl_text`
- New-strategy `name` is derived by truncating `nl_text` to 100 chars; no dedicated naming heuristic — acceptable for the walking-skeleton slice, may want a friendlier default later
- Frontend dev-server smoke test (typing in the NL box, submitting, navigating to canvas) was not run interactively in this session — covered by the Vitest integration test instead

## Wire What-you-learned card behind wjl_retention_ab end-to-end (Issue #572, implemented)

Frontend
- [x] `frontend/src/lib/summary-card-storage.ts` (new) — extracted `getSummaryCardSeen`/`markSummaryCardSeen`/`SUMMARY_CARD_KEY` out of the backtest results page so the storage side-effects can be mocked from a hook test
- [x] `frontend/src/hooks/useWjlCardEnrollment.ts` (new) — `useWjlCardEnrollment(eligible, onSuppressSession?)`: at the first render where `eligible` is true (the enrollment/exposure moment), reads `getExperimentVariant(WJL_EXPERIMENT_FLAG)` once via `useMemo` and applies `decideWhatYouLearnedCard`; an effect closes the persistent gate (`markSummaryCardSeen()`) when `closeGateNow`, and calls `onSuppressSession` only for the control arm (`closeGateNow && !renderCard`) to clear the in-session gate immediately
- [x] `frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` — added `wjlEligible` (the card's existing eligibility conjunction: completed, non-zero-trade, has `summary`, `showSummaryCard` gate open, `benchmark_return_pct != null`); wired `useWjlCardEnrollment(wjlEligible, () => setShowSummaryCard(false))`; replaced the card's `showSummaryCard &&` render guard with `showWhatYouLearnedCard &&`. `onDismiss` (markSummaryCardSeen + setShowSummaryCard(false)) and the always-on `NarrativeCard` are untouched; `useResultViewedTracking` wiring is untouched.

Tests
- [x] `frontend/src/hooks/__tests__/useWjlCardEnrollment.test.ts` (new, 11 cases): `renderCard=true`+gate-closed for `test`; `renderCard=true`+gate-not-closed for `undefined` (unenrolled); `renderCard=false`+gate-closed+`onSuppressSession` called for `control`; `onSuppressSession` not called for `test`/`undefined`; not eligible → `renderCard=false` and variant never read; variant read exactly once across re-renders while eligible; `it.each` regression guard — `results_viewed` fires exactly once per `run_id` for `control`/`test`/`undefined` alike (alongside `useResultViewedTracking`)

Verification
- [x] RED→GREEN confirmed: all 10 hook tests failed (module not found) before `useWjlCardEnrollment.ts` existed, passed after
- [x] `npx vitest run` → 47 files / 533 passed, zero regressions
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on touched/added files → clean

Risks / gaps
- M4 (PostHog experiment + metric setup, runbook update) is HITL/out of scope for this slice per #570 — not done here
- The "no flash" behavior relies on the same hydration pattern as the existing `showSummaryCard` state (starts `false`/not-yet-evaluated, settles via effect on mount) — consistent with current UX, no new regression introduced

## Template clone emits the strategy_created "authored" milestone (Issue #558, implemented)

Frontend
- [x] `templates/page.tsx` `handleClone`: after a successful clone, fires `trackEvent("strategy_created", { asset, timeframe, source: "template_clone", entry_path: strategy.entry_path }, user?.id)` — `entry_path` is read from the clone response's *persisted* value (`StrategyEntryPath.TEMPLATE_CLONE`, stamped server-side per #556), never a hardcoded literal
- [x] Wired `useAuth()` (for `user?.id`) and `trackEvent` into the templates page, mirroring the existing `new-strategy-modal.tsx`/`strategy-wizard.tsx` `strategy_created` emissions — those three paths are untouched

Tests
- [x] `templates/__tests__/templates-page.test.tsx` — tracer-bullet TDD: (1) clicking Clone fires `strategy_created` carrying `entry_path: "template_clone"`; (2) fires exactly once per clone (no duplicate authored milestones)

Verification
- [x] RED→GREEN confirmed: both tests failed (`trackEvent` never called) before the `trackEvent` call landed, passed after
- [x] `npx vitest run src/app/(app)/strategies/` → 3 files / 14 passed, zero regressions in sibling modal/wizard suites
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on touched/added files → clean

Risks / gaps
- The payload doesn't yet carry `authoring_mode` or use the `resolveCohort` resolver — that uniform cohort-prop wiring across all four `strategy_created` emissions (plus `backtest_started`/`auto_backtest_started`) is explicitly #560's job, not this thin end-to-end slice (whose acceptance criteria asks only for `entry_path`)

## Cohort resolver: pure entry_path → { entry_path, authoring_mode } (Issue #557, implemented)

Frontend
- [x] `frontend/src/lib/cohort-resolver.ts` — pure `resolveCohort(entryPath: string | null): Cohort` (no I/O, no React, no PostHog): `nl_wedge → authoring_mode "nl"`; `wizard | blank_canvas | template_clone → authoring_mode "manual"` (path passed through unchanged); `null` and any unrecognised/garbage string → the `unknown` cohort sentinel for *both* fields (never surfaced as a real path)
- [x] `ResultsViewedEntryPath` (in `useResultViewedTracking.ts`) expanded from the legacy `manual | wizard | nl_wedge` to `StrategyEntryPath | "unknown"` — retires the `manual` catch-all per ADR-0009
- [x] Fixed the resulting `tsc` breakage: the manual backtest page's hardcoded `"manual"` fallback (no longer a valid `entry_path`) now reports the honest `"unknown"` cohort until a later slice (#559) wires the true persisted path through this resolver; updated `"manual"` literals in `useResultViewedTracking.test.ts` fixtures to `"unknown"`/new union members

Tests
- [x] `frontend/src/lib/__tests__/cohort-resolver.test.ts` — 11 cases (tracer-bullet TDD, one behavior at a time): `nl_wedge → nl`; each of `wizard | blank_canvas | template_clone → manual` (path passed through); `null → unknown`; 6 garbage-string cases including the retired `"manual"` literal itself, all → `unknown` (regression-proofs that the legacy value is no longer passed through)

Verification
- [x] RED→GREEN per behavior (tracer bullets): each new `it`/`it.each` block confirmed failing before the matching switch-branch landed
- [x] `npx vitest run` → 42 files / 492 passed, zero regressions
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on all touched/added files → clean

Risks / gaps
- The manual backtest page still doesn't source its true persisted `entry_path` (that's #559's job — read the loaded strategy's value through this resolver); the `"unknown"` fallback here is an honest interim value, not the final wiring

## Persist Strategy.entry_path + stamp at all four creation routes (Issue #556, implemented)

Backend
- [x] `StrategyEntryPath(str, Enum)` added to `app/models/strategy.py` with exactly four values (`wizard | blank_canvas | template_clone | nl_wedge`); `Strategy.entry_path` is a nullable `SAEnum` column (no backfill — pre-existing rows read `null`)
- [x] Alembic migration `038_add_strategy_entry_path.py` — `CREATE TYPE strategy_entry_path_enum` + nullable `entry_path` column on `strategies`
- [x] `StrategyCreateRequest.entry_path` (optional) with a `field_validator` restricting client-settable values to `CLIENT_STAMPABLE_ENTRY_PATHS` (`wizard | blank_canvas | nl_wedge`) — `template_clone` is rejected with 422 so only the dedicated clone route can stamp it
- [x] `StrategyResponse.entry_path` added; `create_strategy` passes `data.entry_path` through to the model and response
- [x] `clone_template` route stamps `StrategyEntryPath.TEMPLATE_CLONE` unconditionally (server-only, unspoofable) and returns it on the response
- [x] No `authoring_mode` column added (per ADR-0009 — derived later from `entry_path`)

Frontend
- [x] `StrategyEntryPath` union type + `Strategy.entry_path: StrategyEntryPath | null` + `StrategyCreateRequest.entry_path?: Exclude<StrategyEntryPath, "template_clone">` added to `src/types/strategy.ts`
- [x] `new-strategy-modal.tsx` sends `entry_path: "blank_canvas"` on create
- [x] `strategy-wizard.tsx` sends `entry_path: "wizard"` on create
- [x] Updated mock `Strategy` fixtures missing the new required field in `strategies-client.test.ts`, `strategy-templates-client.test.ts`, `StrategyHeader.load-version.test.tsx`, `strategy-wizard.test.tsx`

Tests
- [x] `backend/tests/api/test_strategy_entry_path.py` — 6 integration tests (blank-canvas, wizard, template-clone, null-default, nl_wedge accepted, template_clone rejected with 422), all RED-confirmed before implementation then GREEN after

Verification
- [x] `pytest tests/api/test_strategy_entry_path.py -v` → 6 passed
- [x] Full backend suite → 897 passed, zero regressions
- [x] `npx tsc --noEmit` → error count unchanged at 6257 before/after (all pre-existing module-resolution issues from incomplete `node_modules` in this remote env; the two `entry_path`-shaped TS2741 errors my change introduced are now fixed)
- [x] Docs check: `CONTEXT.md`, ADR-0009, runbook §7, `ANALYTICS_SETUP.md` already describe the four-value `entry_path` model, persistence, no-backfill semantics, and server-only `template_clone` stamping accurately — no edits needed (forward-written ahead of this slice; the runbook's claim that the manual backtest page "no longer hard-codes `manual`" describes a later frontend slice, not this one)

Risks / gaps
- Frontend vitest suite cannot run in this remote environment (`frontend/node_modules` absent — `npx vitest run` fails resolving `vitest/config`); type-check is the only available frontend verification
- NL-wedge route doesn't exist yet (later backlog, blocked behind this PRD) — the shared create endpoint accepts `entry_path: "nl_wedge"` pre-emptively per user direction so the future route needs no backend change

## Binance spot 400 fix — `symbols` array whitespace (Issue #490, implemented)

Backend
- [x] Diagnose: `refresh_spot_prices` wrote 51 zero-price placeholders; root cause = Binance `/api/v3/ticker/24hr` rejects whitespace in `symbols` param (`json.dumps` default `", "`) → HTTP 400, error -1100 "Illegal characters"
- [x] Fix `app/market_data/binance.py` spot fetch to emit compact JSON (`separators=(",", ":")`)
- [x] Regression test `tests/test_binance_provider.py::test_binance_provider_spot_sends_compact_symbols_without_spaces` (asserts serialized `symbols` has no spaces)

Verification
- [x] RED confirmed: test fails on old code (`' ' is contained here: ["BTCUSDT", "ETHUSDT"]`)
- [x] GREEN: `pytest tests/test_binance_provider.py` → 17 passed (mounted host source)
- [x] Rebuilt worker/scheduler/api images, cleared stale breaker keys
- [x] Live worker e2e: 51/51 prices fetched (BTC=73636, ETH=2002, SOL=81.70); scheduled `refresh_spot_prices` logged "wrote 51 prices" with no skips/400s

Zero-price cache poisoning fix (implemented)
- [x] `app/market_data/cryptocompare.py` — omit missing assets instead of emitting zero `SpotPrice` placeholders (a truthy zero satisfied the router's `remaining` filter, silently blocking the Binance fallback and poisoning the cache)
- [x] `app/worker/jobs.py::_fetch_full_ticker_items` — return only real, non-zero prices; no fabricated placeholders
- [x] `app/worker/jobs.py::refresh_spot_prices` + new `_merge_with_cached` — merge fresh prices over last-known-good so assets missing a cycle keep their previous price (never dropped/zeroed); empty fetch preserves cache
- [x] Tests: `tests/test_cryptocompare_provider.py` (omit-on-miss), `tests/test_refresh_spot_prices.py` (merge + no-zero-write + empty-fetch preservation)
- [x] RED confirmed (zero-placeholder + missing-merge assertions fail on old code); GREEN: 605 passed (3 pre-existing `test_api_auth` failures unrelated)
- [x] Deployed: rebuilt images, cleared breakers, live cache shows 51/51 items, 0 zero-priced (BTC=51613)

## Strategy alert edit form hydration (implemented)

- [x] Seed local alert form state from the loaded query-derived alert rule
- [x] Cover saving an existing alert without re-entering fields
- [x] Verify with targeted test, full frontend tests, scoped lint, and build
- [x] Record the correction pattern in `tasks/lessons.md`

## Strategy list query failure banner (implemented)

- [x] Wire the strategies React Query error state into the existing page error banner
- [x] Clear stale load-failure banners after successful query recovery without clearing unrelated action errors
- [x] Replace the initial-failure "No strategies yet" empty state with a load-failure retry state
- [x] Verify `npm test` (37 files / 471 tests passed)
- [x] Verify changed page with targeted ESLint (0 errors; existing warnings only)
- [x] Verify `npm run build`
- [ ] Full `npm run lint` remains blocked by existing generated `frontend/storybook-static` errors

## Issue #475 — TanStack Query infrastructure + notifications domain pilot (done)

- [x] Install `@tanstack/react-query` v5 + devtools
- [x] `src/lib/query-client.ts` — `createQueryClient()` with global defaults, retry predicate (`shouldRetry`), 401 error handler
- [x] `src/lib/api/notifications-client.ts` — moved from `notifications-api-client.ts`, added `markAsRead()`, `markAllAsRead()`, `notificationsKeys` factory
- [x] `src/app/providers.tsx` — SSR-safe `QueryClientProvider` + devtools (dev only)
- [x] `src/app/layout.tsx` — wrapped with `<Providers>`
- [x] `src/hooks/useNotifications.ts` — migrated to `useQuery` + `useMutation` with optimistic updates
- [x] `src/hooks/useNotificationsPage.ts` — write ops migrated to `useMutation`, reads use `queryClient.fetchQuery`
- [x] `eslint.config.mjs` — `no-restricted-imports` rule blocking `apiFetch` outside `src/lib/api/**`
- [x] All 299 tests pass, `tsc --noEmit` clean

Remaining violations of the ESLint rule are pre-existing (other domains not yet migrated — tracked by parent issue #446).

---

## FEAT-459 — Publish flow: promote draft to versioned (implemented)

Backend
- [x] `POST /strategies/{id}/draft/publish` — promotes draft row: assigns sequential `version_number`, sets `status=PUBLISHED`; returns 404 if no draft
- [x] `GET /strategies/{id}/versions` — filters to only `status=PUBLISHED` (was returning all including drafts)
- [x] `tests/api/test_strategy_publish.py` — 6 new tests (B1–B5 + empty-list edge case), all GREEN

Frontend
- [x] `draft-reducer.ts` — extended with `publishing | published | publishError` states + `PUBLISH_START / PUBLISH_SUCCESS / PUBLISH_ERROR` actions
- [x] `draft-reducer.test.ts` — 7 new tests (F6–F8), all GREEN
- [x] `use-strategy-draft.ts` — added `publishDraft()` callback + `hasDraft` derived boolean + `onPublishSuccess` callback prop
- [x] `StrategyHeader.tsx` — replaced "Save" button with "Publish" button (disabled when no draft / publishing); added `publishing | published | publishError` status display
- [x] `page.tsx` — wired `draft.publishDraft`, `draft.hasDraft`; `onPublishSuccess` reloads versions list

All 668 backend tests pass. All 256 frontend tests pass. `tsc --noEmit` clean.

---

## FEAT-454 — Wire canvas consumers to context, delete SmartCanvas (implemented)

Frontend
- [x] Extend `CanvasStateContext` to expose `flushSnapshot`, `commitSnapshot`, `resetHistory`, `stableTimerRef`
- [x] Add tests for new context methods (8 tests GREEN)
- [x] Rewrite `StrategyCanvas` to ≤3 props, reads all state from `useCanvasState()`, absorbs SmartCanvas feature flags/analytics
- [x] Update `use-auto-arrange` hook: `setNodes` → `onNodesChange` (removes `Dispatch<SetStateAction>` dependency)
- [x] Rewrite `InspectorPanel` to zero props — reads `selectedNode`, `validationErrors`, `isMobileMode` from context
- [x] Update `CommandPalette` — remove `reactFlowInstance` prop, read from context
- [x] Update `BlockLibrarySheet` — remove `reactFlowInstance` and `isMobileMode` props, read from context
- [x] Rewrite page to use bridge components (`CanvasBootstrapper`, `ContextDispatchBridge`, `CanvasKeyboardHandler`) for parent→context communication
- [x] Delete `SmartCanvas.tsx`
- [x] Fix all TypeScript errors (CanvasFlags key access, test API mismatch)
- [x] All 49 tests pass; `npx tsc --noEmit` clean

---

## Frontend Docker Next/SWC mismatch fix (implemented)

- [x] Diagnose Docker build failure caused by host `frontend/node_modules` overwriting image dependencies
- [x] Add `frontend/.dockerignore` to keep local install/build artifacts out of Docker context
- [x] Verify frontend Docker build no longer reports mismatched `@next/swc`

---

## FEAT-113 — Migrate to joserfc (implemented)

Backend
- [x] Replace `python-jose[cryptography]==3.3.0` with `joserfc==1.6.5` in `backend/requirements.txt`
- [x] Rewrite `backend/app/core/security.py` to use `joserfc.jwt.encode/decode` and `joserfc.jwk.import_key`; `JWTClaimsRegistry` validates exp/iat/nbf; every decode path passes `algorithms=[settings.jwt_algorithm]` per FEAT-106
- [x] Rewrite `backend/tests/test_jwt_algorithm_enforcement.py` to use `joserfc.jwt.encode` and `joserfc.jwk.RSAKey` for RS256 forgery; `_unsigned_token` stays hand-rolled

Verification command: `cd backend && python -m pytest tests/test_jwt_algorithm_enforcement.py tests/test_security.py tests/test_api_auth.py -v`

AC-006 human-approval checkbox: [ ] Maintainer must verify `python-jose` is removed from the installed environment before merging (`pip show python-jose` should report "not found").

Verification
- [x] `python -m pytest tests/test_jwt_algorithm_enforcement.py tests/test_security.py -v` → 24 passed
- [x] `python -m pytest tests/ --ignore=tests/test_billing.py -q` → 245 passed, 8 warnings

---

## FEAT-108 — Uvicorn upgrade sprint (implemented)

Backend dependency
- [x] Pin `uvicorn[standard]` from `0.32.1` to `0.47.0` in `backend/requirements.txt`
- [x] Leave unrelated backend dependency pins unchanged

Verification
- [x] Clean Python 3.12 venv install passed with `uvicorn 0.47.0`
- [x] `cd backend && /tmp/feat-108-backend-venv/bin/python -m pytest tests/ -v` passed: 258 passed
- [x] Production-style startup smoke passed on `127.0.0.1:8000`; `/health` returned 200
- [x] Reload-mode startup smoke passed on `127.0.0.1:8001`; `/health` returned 200 and reload used WatchFiles
- [x] Observed warnings were existing dependency/deprecation warnings, not uvicorn startup regressions

---

## FEAT-117 — Batch frontend dependency updates (implemented)

Frontend dependencies
- [x] Pin `react` and `react-dom` to `19.2.6`
- [x] Pin `tailwindcss` to `3.4.19` and keep Tailwind v3 config untouched
- [x] Update `typescript` manifest constraint to `^5.9.0`
- [x] Regenerate `frontend/package-lock.json` through `npm install`
- [x] Make no source compatibility edits because lint and build passed

Verification
- [x] TC-001 manifest check passed for React and React DOM `19.2.6`
- [x] TC-002 Tailwind v3 guard passed
- [x] TC-003 TypeScript manifest and lockfile check passed with `typescript@5.9.3`
- [x] TC-004 `npm ls react react-dom tailwindcss typescript --depth=0` passed
- [x] TC-005 diff is limited to FEAT-117 spec approval metadata plus frontend package files
- [x] TC-006 `npm run lint && npm run build` passed; lint exits 0 with existing warnings

---

## FEAT-116 — FastAPI upgrade plan (done)

Docs / verification
- [x] Add current dependency pin audit for FastAPI, Starlette, uvicorn, and httpx
- [x] Add response-class audit for `ORJSONResponse` / `UJSONResponse`
- [x] Add JSON request-client audit across tests, worker code, and backend HTTP callers
- [x] Add Starlette compatibility handling for FastAPI `0.136.1`
- [x] Add lifespan/startup audit and `/health` smoke coverage
- [x] Add bounded implementation sequence, exclusions, verification commands, and rollback path
- [x] Resolve open questions inline in the feature spec

Verification
- [x] FEAT-116 test-plan `rg` commands passed for TC-001 through TC-007
- [x] FastAPI `0.136.1` wheel metadata inspected; `Requires-Dist: starlette>=0.46.0`

---

## FEAT-112 — Verify Redis 2026 CVE posture (done)

Docs / verification
- [x] Confirm `docker-compose.yml` and `docker-compose.prod.yml` both pin `redis:7.4.6-alpine`
- [x] Verify official Redis 7.4 release notes and `redis/redis` GitHub release identify `7.4.9` as the patched 7.4.x release for the 2026 Redis server CVEs
- [x] Confirm `redis:7.4.9-alpine` is available as the nearest patched 7.4.x Alpine image candidate
- [x] Record that Docker Compose image updates require a follow-up implementation issue or feature
- [x] Mark FEAT-112 verification status as `Verified`

Verification
- [x] `rg -n "image:\s*redis:" docker-compose.yml docker-compose.prod.yml` returned both Redis image definitions
- [x] Official Redis Community Edition 7.4 release notes checked on 2026-05-18
- [x] `docker manifest inspect redis:7.4.9-alpine` confirmed the candidate tag is available
- [x] FEAT-112 test-plan `rg` commands passed for TC-001 through TC-005

---

## FEAT-107 — Pin Redis image version (done)

Infra
- [x] Pin `redis` service image in `docker-compose.yml` to `redis:7.4.6-alpine`
- [x] Pin `redis` service image in `docker-compose.prod.yml` to `redis:7.4.6-alpine`

Docs / tracking
- [x] Fix FEAT-107 test-plan heading and TC-003 document paths

Verification
- [x] `rg -n "redis:7-alpine" docker-compose.yml docker-compose.prod.yml` returned zero matches
- [x] `rg -n "redis:7\.4\.6-alpine" docker-compose.yml docker-compose.prod.yml` returned two matches
- [x] `docker compose config | rg -n "image:\s*redis:7\.4\.6-alpine"` returned the resolved Redis image
- [x] `rg -n "CVE|redis:7\.4\.6-alpine|verification|AC-00" docs/features/FEAT-107-pin-redis-image-version.md docs/testing/FEAT-107-test-plan.md` passed

---

## FEAT-106 — JWT decode algorithm audit (implemented)

Backend
- [x] Confirmed `backend/app/core/security.py` is the only backend `jwt.decode()` call site and already passes `algorithms=[settings.jwt_algorithm]`
- [x] Added inline comment documenting the explicit decode algorithm allowlist as algorithm-confusion mitigation
- [x] Added `backend/tests/test_jwt_algorithm_enforcement.py` covering valid HS256 decode, RS256 rejection, unsigned `alg=none` rejection, and HTTP 401 from `/users/me` for a non-HS256 token

Docs / tracking
- [x] Added FEAT-106 follow-up note deferring long-term migration to `PyJWT >= 2.12.0` or `joserfc`
- [x] Fixed FEAT-106 test-plan heading, feature-doc path, and pytest command references
- [x] AC mapping covered: AC-001 by decode audit, AC-002 by rejection tests, AC-003 by valid HS256 regression, AC-004 by follow-up documentation

Verification
- [x] `cd backend && ../backend/.venv/bin/python -m pytest tests/test_jwt_algorithm_enforcement.py -v` passed: 4 passed
- [x] `cd backend && ../backend/.venv/bin/python -m pytest tests/test_security.py -v` passed: 20 passed
- [x] `cd backend && ../backend/.venv/bin/python -m pytest tests/ -v` passed: 258 passed
- [x] `rg -n "jwt\.decode\(" backend` returned only `backend/app/core/security.py`
- [x] `rg -n "long-term|migrate|python-jose|PyJWT|joserfc|algorithms=\[\"HS256\"\]" docs/features/FEAT-106-jwt-decode-algorithm-audit.md` passed

---

## FEAT-105 — Pin Starlette patched version (done)

Backend
- [x] Add explicit `starlette>=0.49.1` directly after `fastapi==0.129.2` in `backend/requirements.txt`
- [x] Verify no direct Starlette requirement constrains the backend below `0.49.1`

Verification
- [x] `backend/.venv/bin/python -m pip install -r backend/requirements.txt` completed; `starlette` resolved to `0.52.1`
- [x] `rg "^starlette>=0\.49\.1$" backend/requirements.txt` passed
- [x] `backend/.venv/bin/python -m pip show starlette` reported `Version: 0.52.1`
- [x] `backend/.venv/bin/python -m pytest tests/ -v` passed: 254 passed, 34555 warnings

---

## CI frontend test step fix (in flight)

- [x] Write CI fix plan
- [x] Receive implementation approval
- [x] Update frontend CI test step to tolerate absent test runner
- [x] Verify frontend lint and build (`npm run lint` exit 0 with existing warnings; `npm run build` clean)

## Profile page hardening pass (in flight)

- [x] Write hardening plan for profile page
- [x] Receive implementation approval
- [x] Harden profile form validation, overflow, async retry, and accessible status states
- [x] Verify lint from `frontend/` via bundled Node runtime (0 errors, existing warnings elsewhere)
- [x] Verify TypeScript from `frontend/` via bundled Node runtime (`tsc --noEmit` clean)
- [ ] Manual smoke: invalid defaults, strategy retry, long text, mobile width, keyboard controls (not run)

## Market page polish pass (in flight)

- [x] Write polish plan for market page
- [x] Receive implementation approval
- [x] Make market list hierarchy and scanability feel composed
- [x] Flatten sentiment panel density while preserving source states
- [x] Tune chart panel controls and data summary polish
- [x] Verify lint from `frontend/` via local ESLint binary (0 errors, existing warnings elsewhere)
- [x] Verify TypeScript from `frontend/` via local TypeScript binary (`tsc --noEmit` clean)
- [x] Manual visual smoke stopped at user direction

## Market page hardening pass (in flight)

- [x] Write hardening plan for market page
- [x] Receive implementation approval
- [x] Harden market ticker and sentiment polling against stale responses
- [x] Harden market page overflow, empty, error, and live status states
- [x] Harden chart inspection panel accessible data fallback and edge states
- [x] Verify lint from `frontend/` via bundled Node runtime (0 errors, existing warnings elsewhere)
- [x] Verify TypeScript from `frontend/` via bundled Node runtime (`tsc --noEmit` clean)
- [x] Manual smoke: long symbols, empty filter, API failure, mobile width, keyboard inspect (skipped at user direction)

## Market page layout pass (in flight)

- [x] Write layout plan for market page
- [x] Receive implementation approval
- [x] Make asset list the primary market page object
- [x] Add explicit chart inspection affordances
- [x] Flatten sentiment section hierarchy
- [x] Verify lint from `frontend/` via bundled Node runtime (0 errors, existing warnings elsewhere)
- [x] Manual smoke: loading, error, empty filter, mobile width, keyboard sort/inspect (skipped at developer direction)

## Dashboard distill pass (in flight)

- [x] Write dashboard distillation plan
- [x] Receive implementation approval
- [x] Remove redundant dashboard shortcuts and copy
- [x] Update Dashboard Storybook docs to match distilled structure
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)
- [ ] Manual smoke: empty data, API failure, mobile width, keyboard flow (blocked: frontend dependencies absent)

## Dashboard hardening pass (in flight)

- [x] Write hardening plan for dashboard page
- [x] Receive implementation approval
- [x] Harden dashboard async fetches, edge-case copy, and clone recovery
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH; `frontend/node_modules` absent)
- [ ] Manual smoke: long names, empty data, API failure, mobile width, keyboard flow (blocked: frontend dependencies absent)

## Dashboard clarify pass (in flight)

- [x] Write copy-focused plan for dashboard clarification
- [x] Receive implementation approval
- [x] Tighten dashboard headline, primary action copy, states, and messages
- [x] Update Dashboard Storybook docs to match current implementation
- [ ] Verify lint (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)

## Dashboard flagship polish (in flight)

- [x] Align dashboard page to the design system polish checklist
- [x] Fix responsive strategy rows, touch targets, and state tokens
- [x] Remove visible dashboard shell drift in the sidebar
- [ ] Verify lint and local rendering (blocked: no npm/pnpm/yarn/corepack on PATH and no frontend/node_modules)

## FEAT-103 — Dashboard Toast Notifications (in flight)

Frontend
- [x] Add `import { toast } from "sonner"` and remove unused `CheckCircle2` import
- [x] Delete `successMessage` state, its `useEffect` auto-dismiss timer, and `setSuccessMessage(null)` calls
- [x] Replace `setSuccessMessage(...)` calls in `handleClone` with `toast.success(...)`
- [x] Replace `setError(...)` in `handleClone` catch with `toast.error(...)`
- [x] Remove `{successMessage && (...)}` JSX block; gate inline error alert on `error && strategiesLoadFailed`
- [x] Confirm `loadStrategies` still clears `error` on retry start (no change needed)

Verification
- [ ] Manual smoke: duplicate success toast (AC-001), partial-refresh toast (AC-002), duplicate failure toast (AC-003), layout stability (AC-004), toast dismissal (AC-005), blocking load error inline (AC-006), mobile 360px viewport (AC-007) — requires running dev server
- [ ] Verify lint from `frontend/` (blocked: `npm`, `pnpm`, `yarn`, and `corepack` are not on PATH)

---

## FEAT-102 — Pandas TA Indicator Calculation Parity (done)

Backend
- [x] Add `pandas==3.0.2`, `numpy==2.4.4`, `pandas-ta-classic==0.5.44` to `requirements.txt`
- [x] New `app/backtest/_ta_adapter.py` — `to_series` / `from_series` adapter (list ↔ pandas Series, None ↔ NaN)
- [x] Rewrite `app/backtest/indicators.py` — 10 indicator functions replaced with thin pandas-ta-classic wrappers; `fibonacci_retracements` and `price_variation_pct` retained as-is
- [x] Update `tests/test_indicators.py` — 5 tests adjusted to match pandas-ta behavior (OBV index-0, ATR init, stochastic flat price, Ichimoku ISB displacement)
- [x] Add `synthetic_ohlcv_candles` fixture to `tests/conftest.py` (seeded GBM, 252 candles)
- [x] New `tests/test_pandas_ta_indicators.py` — 32 parity/regression tests (TC-01 through TC-08)
- [x] Fix warmup boundary in `tests/test_chart_data.py` — RSI(14) first valid at index 13, not 14

Verification
- [x] `pytest tests/test_pandas_ta_indicators.py -v` → 29 passed (post C1-C4 fix rewrite)
- [x] `pytest tests/test_indicators.py -v` → 51 passed
- [x] `pytest tests/ --ignore=tests/test_billing.py -v` → 226 passed, 3 pre-existing auth failures (unrelated)

C1–C4 structural fixes (2026-05-04)
- [x] C1: moved `os.environ` + `app.main` import to module level; added `engine`/`session`/`client` fixtures — TC-06 no longer lazy-imports app inside test body
- [x] C2: TC-01 rewritten to use `interpret_strategy()` + `run_backtest()` + signal parity loop (AC-1 backtest path now exercised)
- [x] C3: TC-02 calls `GET /market/chart-data` for MACD/Bollinger/Stochastic/ADX/Ichimoku; TC-03 Fibonacci via HTTP (AC-2/AC-3 HTTP path now exercised)
- [x] C4: TC-07 calls `run_backtest()` twice and compares `num_trades`, `total_return_pct`, `final_balance`, `win_rate_pct`, trade `pnl`/`entry_price`/`exit_price` (AC-7 now exercised)
- [x] TC-08 upgraded to call `GET /market/chart-data` twice and compare responses

Code-review findings fixed (2026-05-04)
- [x] C1-fix: `indicators.py` Bollinger column lookup uses prefix search (`startswith`) instead of `:.1f` format — prevents KeyError for std_dev like 2.25
- [x] M1-fix: TC-01 (12 tests) now uses `from_series(ta.*, n)` raw reference for all indicators — no longer self-referential against `ind.*`
- [x] M2-fix: TC-02 restructured as `TestTC02SingleSeriesChartDataParity` with 5 HTTP tests (SMA/EMA/RSI/ATR/OBV) against raw `ta.*` reference
- [x] M3-fix: TC-03 restructured as `TestTC03MultiSeriesChartDataParity` (MACD/Bollinger/Stochastic/ADX/Ichimoku/Fibonacci) against raw `ta.*`/`_fib_ref()` pure-math — no longer self-referential

Verification (post code-review fixes)
- [x] `pytest tests/test_pandas_ta_indicators.py -v` → 40 passed
- [x] `pytest tests/ --ignore=tests/test_billing.py -v` → 237 passed, 3 pre-existing auth failures (unrelated)

---

## FEAT-101 — Backtest Toast Notifications (done)

Frontend
- [x] Install `sonner ^2.0.7` (`package.json` + `package-lock.json`)
- [x] Mount `<Toaster position="top-right" richColors />` in `src/app/layout.tsx`
- [x] Replace single-backtest inline banner with `toast.success(…)` in backtest page
- [x] Replace batch-backtest inline banner with `toast.success(…)` in backtest page
- [x] Replace shortcut guidance inline banner with `toast.info(…)` in backtest page
- [x] Remove `statusMessage` state declaration and `{statusMessage && (…)}` JSX block

Verification
- [x] `npm run lint` → 0 errors
- [x] `npx tsc --noEmit` → clean
- [x] `npm run build` → clean
- [ ] Manual smoke: single-run toast, batch-run toast, shortcut toast, failure (no toast) — requires running dev server

---

## FEAT-100 — Market Indicator Inspection Chart (done)

Backend
- [x] `GET /market/chart-data` (`app/api/chart.py`) returning candles + indicator series
- [x] Pydantic schemas (`ChartCandle`, `IndicatorPoint`, `IndicatorSeries`, `ChartDataStatus`, `ChartDataResponse`) in `app/schemas/market.py`
- [x] Indicator parser supporting all 11 strategy indicators (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, ADX, Ichimoku, OBV, Fibonacci) with multi-output series
- [x] Tests: 10 cases under `tests/test_chart_data.py` (auth, validation, alignment, warm-up null, multi-output)

Frontend
- [x] Types (`src/types/chart.ts`)
- [x] Indicator catalog sourced from `BLOCK_REGISTRY` (`src/lib/chart-indicators.ts`)
- [x] `useChartData` hook
- [x] `MarketChartPanel` slide-over (~80% viewport on md+) with candlestick + volume + price overlay + oscillator pane + tooltip readout + indicator selector + empty/error/loading states
- [x] Wired into `app/(app)/market/page.tsx` via clickable pair labels (filter/sort state preserved)

Verification
- [x] `pytest tests/test_chart_data.py -q` → 10 passed
- [x] `npx tsc --noEmit` → clean
- [x] `npm run lint` → no errors/warnings introduced by FEAT-100 files

Risks / gaps
- Frontend test runner not present in this repo (no `npm test` script); per direction, no Vitest/RTL added — TC-01/02/03/04/07/09/10 cannot be auto-verified, only via manual + Storybook.
- 11 unrelated backend tests still fail on main (`test_api_auth`, `test_billing`) — pre-existing 401/403 idiom & Stripe webhook setup, untouched by this feature.

---

## Issue #588 — NL wedge slice 6: provider-agnostic drafter config (done)

Backend
- [x] `app/core/config.py`: added `strategy_drafter_base_url`, `openai_api_key`, `openrouter_api_key`; added `STRATEGY_DRAFTER_PROVIDER_KEYS` map and `validate_strategy_drafter_config()` (fail-fast for the *selected* provider only)
- [x] `app/main.py`: calls `validate_strategy_drafter_config(settings)` at startup
- [x] `app/services/strategy_drafter.py`: `get_strategy_drafter()` now selects the `instructor` client (`from_anthropic` / `from_openai`) per `strategy_drafter_provider`, applies `strategy_drafter_base_url` (OpenRouter defaults to `https://openrouter.ai/api/v1` when unset), and looks up the per-provider key via `STRATEGY_DRAFTER_PROVIDER_KEYS`
- [x] `requirements.txt`: added explicit `openai` dependency (now imported directly)
- [x] `.env.example` / `README.md`: documented `STRATEGY_DRAFTER_BASE_URL`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`

Tests
- [x] `tests/test_strategy_drafter.py`: client selection per provider (anthropic/openai/openrouter), base_url override, stub fallback when selected key missing
- [x] `tests/test_config.py` (new): startup validation — disabled skips check, missing selected key raises, present key passes, other providers' keys not required, unsupported provider raises

Verification
- [x] `pytest -q` → 962 passed
- [x] Manual: `STRATEGY_DRAFTER_ENABLED=true` + missing selected key → `import app.main` raises `RuntimeError`; with key set → imports cleanly

Risks / gaps
- `docker-compose.yml` not changed — backend secrets are passed via `env_file: .env` (no per-service `environment:` entries for existing keys like `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, etc.), so the new keys follow the same pattern.

## Issue #589 — NL wedge slice 5: infra-failure path — timeout + provider error → retryable, distinct from refusal (done)

Backend
- [x] `app/core/config.py`: added `strategy_drafter_timeout_seconds` (default `30.0`)
- [x] `app/services/strategy_drafter.py`: `LLMStrategyDrafter.draft()` now passes `timeout=settings.strategy_drafter_timeout_seconds` to the `instructor` call; new `StrategyDrafterError` is raised (with a generic, safe message) when the call raises `anthropic.APIError`, `openai.APIError` (covers OpenRouter too), or `instructor.core.InstructorRetryException` (exhausted schema-retries). Full exception detail is logged server-side via `logger.error(..., exc_info=True)`; the raised message never includes provider/key/raw-exception detail.
- [x] `app/api/strategies.py`: `draft-from-nl` catches `StrategyDrafterError` and raises `HTTPException(503, detail=<safe message>)` — the envelope's error path, distinct from the `declined` (`success: true`) refusal. No re-draft beyond `instructor`'s bounded schema-retries (single call, as before).
- [x] `.env.example` / `README.md`: documented `STRATEGY_DRAFTER_TIMEOUT_SECONDS`

Frontend
- [x] `app/(app)/strategies/draft/page.tsx`: declined refusals now show a "Try rephrasing your idea above and submitting again." hint under the reason (amber box). Infra failures (503 `ApiError`) surface via the existing destructive/red `error` box with the backend's "...try again in a moment." message — visually and textually distinct from the amber refusal box.

Tests
- [x] `tests/test_strategy_drafter.py`: timeout passed to provider call; `StrategyDrafterError` raised for provider timeout / rate-limit / instructor retry-exhaustion; raised message doesn't leak provider exception detail
- [x] `tests/api/test_strategy_draft_from_nl.py`: new infra-failure integration test — 503, safe `detail` (no provider/key leakage), persists zero `Strategy`/`StrategyDraft` rows. Existing tests cover success and the two refusal cases (declined arm + validator-invalid), so all three outcome classes are now covered.
- [x] `app/(app)/strategies/draft/__tests__/draft-page.test.tsx`: declined shows reason + rephrase hint; infra failure (`ApiError(503, ...)`) shows "try again in a moment" in the destructive box, with no rephrase hint and no navigation

Verification
- [x] `pytest -q` → 968 passed
- [x] `npx vitest run "src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx"` → 5 passed
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on changed frontend files → clean

Risks / gaps
- `strategy_drafter_timeout_seconds` is a single bound for the whole `instructor` call, including its internal schema-retries — a slow-but-not-hung provider could still hit the timeout mid-retry; acceptable per the single-shot, bounded-retry design (ADR-0011).

## Issue #590 — NL wedge slice 7: draft-funnel instrumentation (done)

Frontend
- [x] `app/(app)/strategies/draft/page.tsx`: `handleSubmit` now fires consent-gated PostHog events via the existing `trackEvent` wrapper — `nl_draft_requested` on every real submit (after the empty-text guard), then exactly one of `nl_draft_drafted` (success), `nl_draft_declined` (declined outcome, includes `reason`), or `nl_draft_errored` (catch block, infra failure). All events carry `{ asset, timeframe, ...resolveCohort("nl_wedge") }` (`entry_path: "nl_wedge"`, `authoring_mode: "nl"`), consistent with the existing `strategy_created`/`results_viewed` events. The `disabled` outcome (feature flag off) is not part of the success/refusal/infra-failure taxonomy — `nl_draft_requested` fires but none of the three terminal events do. No new DB column for `authoring_mode` (cohort stays derived client-side).

Tests
- [x] `app/(app)/strategies/draft/__tests__/draft-page.test.tsx`: extended to 6 tests — added a case asserting `nl_draft_requested` does not fire on the empty-description client-side guard, and assertions for `nl_draft_requested`/`nl_draft_drafted` (success), `nl_draft_requested`/`nl_draft_declined` (declined), `nl_draft_requested`/`nl_draft_errored` (infra failure, with drafted/declined NOT firing), and `nl_draft_requested` only (disabled, with none of the three terminal events firing).

Verification
- [x] `npx vitest run "src/app/(app)/strategies/draft/__tests__/draft-page.test.tsx"` → 6 passed
- [x] `npx vitest run "src/app/(app)/strategies"` → 24 passed (no regressions in sibling strategy tests)
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on changed files → clean

Risks / gaps
- None. No env vars added/changed; PostHog wiring and consent gating reused as-is.

## Issue #604 — NL-wedge #5 — Reject with Undo (deferred delete) on the review surface (done)

Frontend
- [x] `hooks/useDeferredDelete.ts` (new, Module D): generic grace-window delete hook (ADR-0012 §7), matching the canvas node-delete pattern (`handlePopoverDeleteNode`). `scheduleDelete(message)` shows a 5s sonner Undo toast (`DEFERRED_DELETE_GRACE_MS`) and starts a timer; `onCommit` runs only if the window elapses without Undo; clicking Undo cancels the timer and runs `onUndo`; an unmount before the window elapses (interrupt) cancels the pending timer too — resolves to keep, with no commit.
- [x] `components/backtest/DraftReviewControls.tsx`: added a `Reject` button (destructive-styled, `Trash2` icon, no confirmation dialog) alongside Edit/Accept, via a new required `onReject` prop.
- [x] `app/(app)/strategies/[id]/backtest/page.tsx`: wired Reject — clicking it hides the review controls (`isRejectPending`) and calls `scheduleReject` with the strategy name. On commit: `StrategiesApiClient.delete(id)` (the #602 cascade endpoint) → `draftReview.reject()` (logs `nl_draft_outcome = rejected` and clears the under-review storage flag, per Module B from #603) → redirect to `/strategies`. On Undo or interrupt, `isRejectPending` resets (or the component unmounts) and nothing is deleted or logged — `draftReview.reject()` is only called at commit time, so the existing reducer/hook from #603 needed no changes.

Tests
- [x] `hooks/__tests__/useDeferredDelete.test.ts` (new): grace-window fire (commits after `DEFERRED_DELETE_GRACE_MS` with no Undo), cancel-on-undo (Undo toast action cancels the timer and runs `onUndo`, `onCommit` never fires), resolve-to-keep-on-interrupt (unmount before the window elapses cancels the pending commit), and the Undo toast shape/duration — all four "encouraged" Module D behaviors from the issue.
- [x] `components/backtest/__tests__/DraftReviewControls.test.tsx`: extended to require `onReject`; added a "renders Reject" case and a one-click-no-dialog case (`onReject` fires, no `role="dialog"` appears).

Verification
- [x] `npx vitest run` (full frontend suite) → 592 passed (57 files)
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on changed files → clean

Risks / gaps
- No env vars added/changed.
- If `StrategiesApiClient.delete(id)` fails after the grace window elapses, the page surfaces the error via the existing `error` banner and resets `isRejectPending` so the review controls reappear; the strategy remains (nothing was deleted), consistent with "no silent loss."

## Issue #605 — NL-wedge #5 — Confirm-on-exit guard (abandonment) (done)

Frontend
- [x] `hooks/useExitGuard.ts` (new, Module C): `useExitGuard({ isArmed, onKeep, onDiscard })`. Two effects, both gated on `isArmed` (= `draftReview.isUnderReview`, so the guard arms while under review and disarms on any explicit disposition with no extra wiring):
  - `beforeunload`: `event.preventDefault()` + `event.returnValue = ""` shows the native prompt only. A hard exit (tab close/refresh/URL change) always resolves to keep — neither `onKeep` nor `onDiscard` is ever called from this handler (no unload-delete attempted, ADR-0012 §6).
  - Document-level capture-phase `click` listener: intercepts left-clicks on same-tab in-app `<a>` (Next.js `Link`) elements (skips modifier-clicks, `target="_blank"`, and `#` hash links), calls `event.preventDefault()` (which Next's `Link` checks via `defaultPrevented` before navigating), stashes `() => router.push(href)` as the pending navigation, and opens the modal.
  - `handleKeep`: calls `onKeep` (→ `draftReview.keep()`, logs `nl_draft_outcome = kept`), closes the modal, then runs the pending navigation.
  - `handleDiscard`: awaits `onDiscard()`, then closes the modal and runs the pending navigation.
  - `handleCancel`: closes the modal and drops the pending navigation — stays on the page.
- [x] `components/DraftExitGuardModal.tsx` (new): shadcn `Dialog` with Keep / Discard / Cancel actions (`Discard` destructive-styled); dismissing via `onOpenChange(false)` (e.g. Escape) routes through `onCancel`.
- [x] `app/(app)/strategies/[id]/backtest/page.tsx`: wired `useExitGuard({ isArmed: draftReview.isUnderReview, onKeep: draftReview.keep, onDiscard: async () => { await StrategiesApiClient.delete(id); draftReview.reject(); } })` and rendered `<DraftExitGuardModal />` alongside the other page modals. Discard reuses the same `StrategiesApiClient.delete` (#602 cascade) → `draftReview.reject()` sequence as the Reject button (#604), but calls it directly (no deferred-delete grace window) since the user is already navigating away.

Tests
- [x] `hooks/__tests__/useExitGuard.test.ts` (new, 7 tests): beforeunload `preventDefault` while armed / not while disarmed, with `onKeep`/`onDiscard` never called (hard-exit resolves to keep); in-app link click intercepted + opens modal while armed / not intercepted while disarmed; Keep closes the modal, calls `onKeep`, and runs the pending `router.push`; Discard closes the modal, awaits `onDiscard` (the delete), and runs the pending navigation; Cancel closes the modal without calling `onKeep`/`onDiscard` or navigating.
- [x] `components/__tests__/DraftExitGuardModal.test.tsx` (new, 6 tests): hidden when closed; renders Keep/Discard/Cancel when open; each button invokes its handler; Escape (dialog dismiss) routes to `onCancel`.

Verification
- [x] `npx vitest run` (full frontend suite) → 605 passed (59 files)
- [x] `npx tsc --noEmit` → clean
- [x] `npx eslint` on changed files → clean

Risks / gaps
- No env vars added/changed.
- In-app interception only covers anchor-based (`<Link>`) navigation via the document-level click listener; a handful of `router.push(...)` calls triggered from non-link buttons elsewhere on the page (e.g. the "Compare" action) are not intercepted. This matches the issue's mandated coverage (in-app modal interception via navigation links + hard-exit) and keeps the slice small; broadening to all programmatic navigation is out of scope here.
- Per ADR-0012 §6/the issue, hard browser exit intentionally does not log `nl_draft_outcome = kept` (unreliable on unload) — the draft simply persists as an ordinary strategy and is treated as kept by omission, consistent with the accepted "tab-closed drafts accumulate as kept" cost.
