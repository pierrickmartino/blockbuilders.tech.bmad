# Tasks — in flight

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
