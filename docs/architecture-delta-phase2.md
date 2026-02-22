# 🏗️ Archie's Architectural Review: Phase 2 PRD vs. Current Architecture

**Reviewer:** Archie (BMAD Architect Agent)  
**Date:** February 22, 2026  
**Input:** Phase 2 PRD (v2.0), Product Documentation (Jan 3, 2026)  
**Current Stack:** Next.js 15 / FastAPI monolith / PostgreSQL 15 / Redis 7 + RQ / MinIO / Docker Compose

---

## Executive Summary

**The Phase 2 PRD is architecturally conservative and well-scoped for the current stack.** The vast majority of epics (11 of 15) can be built within the existing FastAPI monolith + PostgreSQL + Redis + MinIO architecture with zero or minimal schema changes. Two epics require meaningful backend engine surgery (E-03: Short Selling, E-04: 1-Hour Timeframe). One epic (E-09: Product Analytics) requires a new infrastructure decision that, while not complex, has long-term implications. No epic requires a fundamentally different architecture.

**One epic should be elevated to a prerequisite:** E-03 (Short Selling Engine) touches the core backtest interpreter, simulation loop, and every risk management block. It is the riskiest change in the entire PRD and should be treated as a foundational prerequisite with its own regression test suite before other backtest-dependent features (E-01, E-02) are built on top.

---

## Epic-by-Epic Architectural Assessment

### E-01: Educational Backtest Insights (FR-02)

**Verdict: ✅ Fully within current architecture**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Pure computation + frontend. No new services needed. |
| **Schema changes** | **Minimal.** Add nullable columns to `backtest_runs`: `confidence_level VARCHAR`, `overfitting_risk BOOLEAN`, `insight_json JSON`. Alternatively, store computed insights in the existing MinIO result payload alongside equity curves. I recommend the MinIO approach — insights are derived data that don't need to be queried independently. |
| **New services** | None. Insight generation is a post-processing step inside the existing backtest worker. |
| **Scaling risks** | Negligible. The computation (trade count check, parameter sensitivity heuristic, regime detection) adds milliseconds to a multi-second backtest job. |
| **Migration strategy** | No user migration needed. Existing backtests simply won't have insights — show "Run a new backtest to see insights" on legacy results. |

**Dependency note:** If E-03 (Short Selling) ships first, insights must handle short-position-specific warnings (e.g., "Short strategies carry unlimited theoretical loss"). Sequence matters.

---

### E-02: Market Regime Analysis (FR-08)

**Verdict: ✅ Within current architecture (v2.1 — deferred, low urgency)**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Computation within backtest worker. Regime classification (SMA slope, ADX, or volatility-based) runs on candle data already in memory during backtests. |
| **Schema changes** | None for v2.1 scoping. Regime data can be stored in the MinIO result payload as a JSON array of `{start_date, end_date, regime_type, metrics}`. |
| **New services** | None. |
| **Scaling risks** | Low. Regime classification on 1-year daily data is ~365 data points — trivial. On 1-year 1h data (~8,760 candles), still negligible. |
| **Migration strategy** | Not applicable (new feature, new results only). |

---

### E-03: Short Selling Engine (FR-03)

**Verdict: ⚠️ PREREQUISITE EPIC — Requires engine surgery with high regression risk**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Fits within the monolith, but this is the **deepest backend change** in Phase 2. It touches the strategy interpreter, the simulation loop, all risk management block handlers (SL, TP, trailing stop, max drawdown), P&L calculation, and trade serialization. |
| **Schema changes** | **Moderate.** (1) `backtest_runs`: Add `has_short_positions BOOLEAN DEFAULT false` (useful for filtering/display). (2) Strategy `definition_json`: Entry Signal blocks need a `direction` field (`long`/`short`). This is a JSON schema change, not a DB schema change, but it requires a **version migration strategy** for existing strategy definitions. (3) No changes to `candles`, `users`, or other tables. |
| **New services** | None. But the backtest engine module (`backend/app/backtest/`) needs a significant refactor of the simulation loop to handle: inverted P&L for shorts, borrowing cost parameter, correct stop-loss direction for shorts (trigger on price *rise*), and correct trailing stop direction. |
| **Scaling risks** | Low from an infrastructure perspective. The risk is **correctness**, not scale. A bug in short P&L calculation would silently produce wrong results that erode the "Backtest Credibility" theme the PRD is built around. |
| **Migration strategy** | **Critical.** All existing strategies are implicitly long-only. The strategy `definition_json` must remain backward-compatible: (a) If no `direction` field is present on an Entry Signal block, default to `long`. (b) Existing backtest results are unaffected (they were long-only and remain valid). (c) The wizard (E-05) adds a short-selling question, but this is a frontend concern. |

**🚨 Recommendation: Elevate to prerequisite epic.**

This epic should be completed and regression-tested before E-01 (Educational Insights) and E-02 (Regime Analysis), because both of those features generate interpretive content based on backtest results. If short selling has subtle bugs, the educational layer will confidently explain wrong numbers. The PRD's suggested execution order (Short Selling in weeks 5-7, Educational Insights in weeks 8-10) is correct, but the dependency should be made explicit with a gate: **E-01 cannot begin until E-03 passes a defined regression suite.**

**Required regression test scope:**
- All 20+ existing block types produce identical results with no `direction` field (backward compat)
- Short positions: correct P&L in trending-down markets
- Short positions: correct stop-loss triggers (price rises to SL)
- Short positions: correct trailing stop behavior
- Short positions: correct max drawdown calculation
- Mixed long/short strategies (if supported in v2.0)
- Edge case: short position held through the end of the backtest period

---

### E-04: 1-Hour Timeframe (FR-04)

**Verdict: ✅ Within current architecture, but has data volume implications**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | The existing data pipeline (CryptoCompare fetch → candle upsert → PostgreSQL) handles this. The `candles` table already uses a `timeframe` VARCHAR column with a unique constraint on `(asset, timeframe, timestamp)`. Adding `1h` is a data-level change, not an architectural one. |
| **Schema changes** | **None.** The schema is already timeframe-agnostic. The `strategies.timeframe` column accepts any string. Frontend dropdown and backend validation need a new allowed value, not a schema change. |
| **New services** | None. But the **scheduler** (`backend/app/worker/scheduler`) needs a new job or modified schedule for 1h candle fetching. Currently the scheduler runs daily for daily/4h candle updates. 1h candles need hourly fetching or batch backfill. |
| **Scaling risks** | **MEDIUM.** This is the one data volume concern in Phase 2. Math: 24 pairs × 24 candles/day × 365 days = **210,240 rows/year** for 1h vs. 24 × 365 = **8,760 rows/year** for daily. That's a 24x increase in candle data. Over 5 years of history for 24 pairs, that's ~1M rows for 1h alone. PostgreSQL handles this fine, but: (a) The existing composite index on `candles(asset, timeframe, timestamp)` is sufficient. (b) CryptoCompare API rate limits may constrain initial backfill — stagger across hours, not a single burst. (c) Backtest execution time on 8,760 data points (1 year of 1h) should still be under the 5-second target, but this should be profiled. |
| **Migration strategy** | None needed for existing users/data. 1h candles are new data that gets fetched on demand or via scheduled backfill. Existing daily and 4h candle data is unaffected. |

**Operational note:** The scheduler currently runs once daily at a configurable hour. For 1h candles, either: (a) add a separate hourly cron job for candle fetching, or (b) fetch 1h candles on-demand when a backtest requests them (lazy backfill with caching). Option (b) is simpler and avoids burning API calls for pairs/periods nobody is backtesting. **Recommend lazy backfill with caching for v2.0, scheduled backfill for v2.1.**

---

### E-05: Wizard-First Default (FR-05)

**Verdict: ✅ Pure frontend change**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Entirely frontend routing logic. |
| **Schema changes** | **One nullable column:** `users.has_completed_wizard BOOLEAN DEFAULT false` or equivalent (could also use the existing `users` table to check if strategies count > 0, avoiding any schema change at all). |
| **New services** | None. |
| **Scaling risks** | None. |
| **Migration strategy** | Existing users (currently just the founder) should NOT be forced into the wizard. Check: if user has ≥ 1 strategy, skip wizard redirect. |

---

### E-06: Progressive Block Disclosure (FR-06)

**Verdict: ✅ Frontend-only with one backend query**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Block tier metadata is static config (hardcoded or JSON config file). Unlock logic needs the user's completed backtest count, which is already queryable from `backtest_runs` (`SELECT COUNT(*) FROM backtest_runs WHERE user_id = ? AND status = 'completed'`). |
| **Schema changes** | **Optional.** Could cache `completed_backtest_count` on the `users` table to avoid a COUNT query on every block library load, but this is premature optimization for <100 users. The existing index on `backtest_runs(user_id)` is sufficient. |
| **New services** | None. |
| **Scaling risks** | None. |
| **Migration strategy** | Existing users get their unlock level based on current backtest count. No data migration needed. Add a user setting (`block_disclosure_override`) to let users opt out of progressive disclosure — the PRD mentions this. |

---

### E-07: Strategy Sentence Summary (FR-07)

**Verdict: ✅ Pure frontend computation**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | This is a client-side parser that walks the React Flow node graph and generates a sentence. Zero backend involvement. |
| **Schema changes** | None. |
| **New services** | None. |
| **Scaling risks** | None. |
| **Migration strategy** | Not applicable. Works on any existing strategy definition. |

---

### E-08: Block Difficulty Badges (FR-14)

**Verdict: ✅ Pure frontend metadata**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Static metadata map (block_type → difficulty_tier) in the frontend. |
| **Schema changes** | None. |
| **New services** | None. |
| **Scaling risks** | None. |
| **Migration strategy** | Not applicable. |

---

### E-09: Product Analytics (FR-01, FR-10)

**Verdict: ⚠️ Architecture decision required — not complex, but has long-term lock-in**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | The PRD correctly identifies this as a "selection decision" (self-hosted vs. cloud). Both paths fit the current architecture, but they have different operational footprints. |
| **Schema changes** | **If self-hosted (Plausible/Umami):** New Docker service with its own PostgreSQL database (Umami) or ClickHouse (Plausible). This adds a container to `docker-compose.yml` but doesn't touch the application schema. **If cloud (PostHog free tier / Mixpanel):** Zero schema changes. Frontend JS snippet + optional backend event API calls. |
| **New services** | **Self-hosted:** 1 new Docker container + its database. Plausible needs ClickHouse + PostgreSQL; Umami needs PostgreSQL. This adds operational burden for a solo developer. **Cloud:** None. A JS snippet and a few `fetch()` calls. |
| **Scaling risks** | Low for the user volumes Phase 2 targets (5-10 beta users). At scale, self-hosted analytics can become resource-hungry. |
| **Migration strategy** | Not applicable (new instrumentation). |

**🏗️ Architect's recommendation:** Use **PostHog Cloud (free tier: 1M events/month)** for v2.0. Rationale: (1) Solo developer should not maintain additional infrastructure. (2) PostHog has a self-hosted option if you outgrow the free tier or want data sovereignty later. (3) The free tier is vastly more than enough for Phase 2's 5-10 beta testers. (4) PostHog includes funnels, feature flags, and session replay — all useful for the "Measurement & Validation" theme. (5) Frontend integration is ~20 lines of code. Backend event tracking is optional (use PostHog's server-side SDK for backtest events).

If the product owner has strong preferences for self-hosting, **Umami** is the lightest option (single PostgreSQL database, single Docker container, ~128MB RAM).

---

### E-10: Beta Recruitment (FR-12)

**Verdict: ✅ Minimal backend, mostly frontend**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Invite codes + feedback form. Fits in the monolith. |
| **Schema changes** | **Small.** (1) New `beta_invites` table: `id, code, email, status (pending/accepted/expired), created_at, accepted_at, invited_by`. (2) Add `is_beta_tester BOOLEAN DEFAULT false` to `users` (or reuse the existing `user_tier` field — set it to `beta` on invite acceptance, which already has grandfathered beta logic). (3) Optional: `beta_feedback` table for structured feedback: `id, user_id, category, content, created_at`. |
| **New services** | None. Email sending already exists via Resend API (used for password reset). |
| **Scaling risks** | None. |
| **Migration strategy** | The founder's account can be pre-flagged as `user_tier=beta`. New invite codes are generated fresh. |

**Note:** The existing `user_tier` field (migration 020) already supports beta flagging. Leverage this rather than adding a new boolean.

---

### E-11: Frontend Testing (FR-11)

**Verdict: ✅ Development tooling only — no architecture impact**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Jest + React Testing Library configuration in the Next.js 15 project. |
| **Schema changes** | None. |
| **New services** | None (CI/CD is out of scope per current Docker Compose deployment). |
| **Scaling risks** | None. |
| **Migration strategy** | Not applicable. |

**Note:** Next.js 15 + React 19 + App Router may need specific Jest configuration (e.g., `next/jest` transformer, `jest-environment-jsdom`). The PRD correctly flags this as low risk. Test against the deployed API with a test database, not SQLite — the brainstorm doc correctly identified SQLite/Postgres divergence as a risk.

---

### E-12: Backtest Performance Optimization (NFR-01) + Queue Separation (NFR-07)

**Verdict: ✅ Within current architecture, Redis queue config change**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Two sub-tasks: (a) **Performance:** Profiling and optimizing the Python backtest engine (numpy vectorization, avoid redundant DB queries). This is pure code optimization, no architecture change. (b) **Queue separation:** RQ supports named queues natively. Add a `manual` and `auto-update` queue, run separate workers for each. This is a `docker-compose.yml` change (add a second worker service pointing to a different queue) + a code change in job dispatch. |
| **Schema changes** | None. |
| **New services** | **One additional Docker container:** a second RQ worker listening on the `auto-update` queue. This is the most operationally simple way to prevent auto-backtests from blocking manual ones. |
| **Scaling risks** | Low. The second worker doubles backtest throughput trivially. For future scaling beyond that, workers can be horizontally scaled per queue. |
| **Migration strategy** | Existing queued jobs (if any) are on the default queue. Deploy the new queue setup, existing jobs complete on the default queue, new jobs route to the appropriate named queue. Zero downtime. |

**Implementation sketch:**
```yaml
# docker-compose.yml addition
worker-manual:
  <<: *worker-base
  command: python -m app.worker.worker --queue manual
worker-auto:
  <<: *worker-base  
  command: python -m app.worker.worker --queue auto-update
```

---

### E-13: Data Vendor Fallback (FR-09, NFR-04)

**Verdict: ✅ Within current architecture (v2.1 — correctly deferred)**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Add a vendor abstraction layer (strategy pattern) around the existing CryptoCompare client. The fallback vendor (CoinGecko, Binance public API) implements the same interface. |
| **Schema changes** | **Optional:** Add `data_source VARCHAR` to `candles` table to track which vendor provided each candle. Useful for debugging but not strictly required. |
| **New services** | None. It's a code-level abstraction, not an infrastructure change. |
| **Scaling risks** | Low. Rate limits vary by vendor — the abstraction layer should respect per-vendor rate limits. |
| **Migration strategy** | Existing candles from CryptoCompare are unaffected. If `data_source` column is added, backfill existing rows with `'cryptocompare'`. |

---

### E-14: Observability & Structured Logging (NFR-08)

**Verdict: ✅ Within current architecture, config-level change**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Replace Python's default logging with `structlog` or `python-json-logger`. Add correlation IDs via middleware (FastAPI middleware that generates a UUID per request, passes it through context). |
| **Schema changes** | None. |
| **New services** | **None required for v2.0.** Logs go to stdout (Docker captures them). For v2.1+, consider adding a log aggregator (Loki + Grafana, or a cloud service). But for 5-10 beta users, `docker compose logs -f` with structured JSON + `jq` is sufficient. |
| **Scaling risks** | None. Structured logging may marginally increase log volume but has no performance impact. |
| **Migration strategy** | Not applicable. |

---

### E-15: Weekly Performance Digest (FR-13)

**Verdict: ✅ Within current architecture (v2.1 stretch — correctly deferred)**

| Dimension | Assessment |
|-----------|-----------|
| **Architecture fit** | Scheduled RQ job (weekly cron) that queries each user's strategies, compiles a summary, and sends via the existing Resend API email integration. |
| **Schema changes** | **Minimal.** Add `digest_opted_in BOOLEAN DEFAULT false` to `users` table. |
| **New services** | None. Uses existing scheduler + Resend. |
| **Scaling risks** | At scale (1000+ users), sending all digest emails in a single batch could hit Resend rate limits. Use staggered dispatch. Not a concern for Phase 2 volumes. |
| **Migration strategy** | Existing users default to opted-out. |

---

## Cross-Cutting Architectural Concerns

### 1. Backtest Engine as a Stability Boundary

The backtest engine (`backend/app/backtest/`) is the core of the product. Phase 2 proposes three changes that touch it:

- **E-03:** Short selling (deep change to simulation loop)
- **E-01:** Educational insights (post-processing addition)
- **E-04:** 1h timeframe (data input change)

**Recommendation:** Define the backtest engine as a **stability boundary**. All changes to it require:
1. A written specification of the change
2. A regression test suite that passes before and after
3. Feature flags for new behaviors (short selling should be flag-gated during development)

### 2. Strategy Definition JSON Schema Versioning

The `definition_json` column in `strategy_versions` stores the block graph. Short selling adds a `direction` field to Entry Signal blocks. This is the first time Phase 2 changes the implicit JSON schema.

**Recommendation:** Add a `schema_version` field to the top level of `definition_json`:
```json
{
  "schema_version": 2,
  "nodes": [...],
  "edges": [...]
}
```
Existing strategies without `schema_version` are implicitly version 1 (long-only). The backtest interpreter checks the schema version and applies defaults for missing fields. This prevents fragile "if field exists" checks scattered across the codebase.

### 3. The Monolith Is Fine for Phase 2

The brainstorm document raised the question of monolith decomposition. **Phase 2 does not require decomposition.** The target is 5-10 beta users. The monolith handles this trivially. The only meaningful scaling lever needed is queue separation (E-12), which is a Docker Compose config change, not a decomposition.

**When to revisit:** If concurrent backtest volume exceeds what 2-3 workers can handle (roughly 50-100 concurrent users actively backtesting), consider extracting the backtest engine into a dedicated microservice. This is a v3+ concern.

### 4. PostgreSQL Is Fine for Phase 2

The 1h timeframe (E-04) increases candle data by ~24x. For 24 pairs over 5 years, that's approximately 1M rows. PostgreSQL handles this without any special configuration. The existing composite index on `(asset, timeframe, timestamp)` is sufficient.

**When to revisit:** If sub-hourly timeframes (15m, 5m) are added in future phases, or if the asset count expands beyond 50, consider TimescaleDB (PostgreSQL extension for time-series data) or a dedicated time-series store. Not needed for Phase 2.

---

## Schema Change Summary

| Migration | Table | Change | Epic | Required |
|-----------|-------|--------|------|----------|
| 026 | `backtest_runs` | Add `has_short_positions BOOLEAN DEFAULT false` | E-03 | Yes |
| 026 | `backtest_runs` | Add `confidence_level VARCHAR NULL` | E-01 | Optional (prefer MinIO) |
| 027 | `beta_invites` | New table: `id, code, email, status, created_at, accepted_at` | E-10 | Yes |
| 028 | `users` | Add `digest_opted_in BOOLEAN DEFAULT false` | E-15 | Only if E-15 ships |
| — | `candles` | Add `data_source VARCHAR NULL` | E-13 | Optional (v2.1) |

**Total new migrations: 2-3.** This is lean. The existing schema is well-designed for Phase 2's requirements.

---

## Infrastructure Change Summary

| Change | Epic | Effort | Notes |
|--------|------|--------|-------|
| Add PostHog JS snippet + optional server SDK | E-09 | Small | Free tier, no self-hosting |
| Add second RQ worker container (auto-update queue) | E-12 | Small | `docker-compose.yml` change |
| Add structured logging library (structlog) | E-14 | Small | `pip install structlog` + middleware |
| Scheduler update for 1h candle fetching | E-04 | Small | New hourly job or lazy backfill |

**No new infrastructure services required.** The Docker Compose topology goes from 7 containers to 8 (adding the second worker). PostHog is external SaaS. Everything else is code-level.

---

## Prerequisite Epic Recommendation

### ⚠️ E-03 (Short Selling Engine) → Elevate to Prerequisite Epic

**Why:** Every other backtest-touching epic (E-01, E-02, E-04, E-12) depends on the engine being stable and correct. Short selling is the deepest engine change. If it ships with bugs that aren't caught, the educational insights layer (E-01) will confidently explain wrong numbers — the worst possible outcome for the "Backtest Credibility" theme.

**What this means practically:**
1. E-03 gets its own 2-week sprint (weeks 5-6 per the PRD timeline)
2. E-03 ships with a **regression test gate**: a defined suite of ~20 backtest scenarios (long-only backward compat + short-specific + mixed) that must all pass
3. E-01 (Educational Insights) does not begin development until E-03's regression suite is green
4. E-03 is feature-flagged during development so it can be merged incrementally without affecting production backtests

This is already close to what the PRD suggests in its execution order, but making the dependency explicit prevents schedule pressure from collapsing the gate.

---

## Final Verdict

| Epic | Architecture Fit | Schema Impact | New Infra | Risk Level |
|------|-----------------|---------------|-----------|------------|
| E-01 Educational Insights | ✅ Fits | None–Minimal | None | Low |
| E-02 Market Regime | ✅ Fits | None | None | Low |
| E-03 Short Selling | ⚠️ Engine surgery | Moderate | None | **High** |
| E-04 1h Timeframe | ✅ Fits | None | Scheduler tweak | Low-Medium |
| E-05 Wizard-First | ✅ Fits | None–1 column | None | Low |
| E-06 Progressive Blocks | ✅ Fits | None | None | Low |
| E-07 Sentence Summary | ✅ Fits | None | None | Low |
| E-08 Block Badges | ✅ Fits | None | None | Low |
| E-09 Analytics | ⚠️ Decision needed | None | PostHog (SaaS) | Low |
| E-10 Beta Recruitment | ✅ Fits | 1 new table | None | Low |
| E-11 Frontend Tests | ✅ Fits | None | None | Low |
| E-12 Perf + Queues | ✅ Fits | None | 1 Docker container | Low |
| E-13 Data Vendor Fallback | ✅ Fits (v2.1) | Optional column | None | Low |
| E-14 Observability | ✅ Fits | None | None | Low |
| E-15 Weekly Digest | ✅ Fits (v2.1) | 1 column | None | Low |

**Bottom line:** This is a well-scoped brownfield PRD. The current architecture supports Phase 2 without fundamental changes. The only epic requiring architectural caution is Short Selling, and that's a correctness risk, not a scalability risk. The monolith, PostgreSQL, Redis, and MinIO are all appropriately sized for the target of 5-10 beta users in a 90-day window.

— Archie 🏗️
