# Blockbuilders Phase 3 — Brownfield Architectural Review

**Reviewer:** Archie (BMAD Architect Agent)
**Date:** February 27, 2026
**Input:** Phase 3 PRD "Confidence Engine" v1.0 + Product Documentation (2026-02-24)
**Current Stack:** FastAPI 0.129.x monolith · PostgreSQL 15 · Redis 7 + RQ · MinIO · Next.js 16 + React 19 · Docker Compose

---

## Executive Summary

**Phase 3 is architecturally well-scoped for the existing stack.** Six of seven epics fit cleanly within the current FastAPI monolith + PostgreSQL + Redis + MinIO architecture. No new infrastructure services are required. No epics need to be broken out as prerequisite architectural epics.

The one area that warrants careful attention is **Epic 5 (Weekly Digest)**, which introduces a new batch email processing pattern. Even there, the existing RQ worker + Resend integration is sufficient — but the batch job design needs to be right the first time to avoid scaling pain later.

Below is the epic-by-epic assessment.

---

## Epic 1: Wizard-First Onboarding (FR-01 through FR-05)

### 1. Can it be built within the current architecture?

**Yes — fully.** This is primarily a frontend routing and UX change.

The wizard already exists and generates valid strategy JSON. FR-01 is a Next.js App Router redirect change (post-signup → wizard instead of dashboard). FR-02 wires the wizard completion to the existing `POST /backtests` endpoint. FR-03 and FR-04 are frontend-only overlays. FR-05 is a link.

The one backend touch point is the `has_completed_onboarding` flag (mentioned in Risk R-01) needed to distinguish first-time vs. returning users.

### 2. Schema changes needed

**One column addition to `users` table:**

```
ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT false;
```

Alembic migration `026_add_onboarding_flag`. Trivial, non-breaking. Default `false` means all existing users will see the wizard on next login unless backfilled.

**Recommended:** Run a data migration to set `has_completed_onboarding = true` for all existing users who have at least one backtest_run. This is a one-time `UPDATE users SET has_completed_onboarding = true WHERE id IN (SELECT DISTINCT user_id FROM backtest_runs)`.

### 3. New services or infrastructure

**None.**

### 4. Scaling risks

**Medium — the 30-second SLA (NFR-01).** The PRD acknowledges the backtest engine is single-threaded. Wizard-generated backtests are constrained to 1-year range, which helps. However, if many users sign up simultaneously (e.g., after a ProductHunt launch), wizard-triggered backtests will queue behind each other in RQ.

**Mitigation:** Consider a dedicated RQ queue (`wizard_backtests`) with its own worker instance to isolate first-run latency from the general backtest queue. This is a Docker Compose config change, not an architectural change.

### 5. Migration strategy for existing users/data

Set `has_completed_onboarding = true` for all existing users with ≥1 backtest run. All others get the wizard flow. This is safe — existing users who never ran a backtest benefit from the wizard anyway.

**Verdict: ✅ No architectural concerns. Clean fit.**

---

## Epic 2: Plain-English Results (FR-06 through FR-12)

### 1. Can it be built within the current architecture?

**Yes — fully.** Narrative generation is template-based text rendering from existing backtest metrics. It can live either:

- **Option A (recommended):** Server-side in a new utility module `backend/app/backtest/narrative.py` that generates the narrative string when backtest results are fetched via `GET /backtests/{id}`. The narrative is returned as a new field in the response schema.
- **Option B:** Frontend-only, constructing the narrative from the existing metric fields. Simpler but harder to internationalize or A/B test later.

FR-10/FR-11 (simplified default view with expandable details) is purely frontend. FR-12 leverages the existing favorite_metrics feature.

### 2. Schema changes needed

**None required, but one optional addition is recommended:**

If choosing server-side narrative generation, consider caching the generated narrative text:

```
ALTER TABLE backtest_runs ADD COLUMN narrative_text TEXT;
```

This avoids regenerating narratives on every page load. However, since the template is deterministic from existing fields, this is an optimization, not a requirement. Skip for MVP; add if performance profiling shows it matters.

### 3. New services or infrastructure

**None.** The narrative template engine is pure Python string formatting. No NLP, no LLM calls, no external services.

### 4. Scaling risks

**Negligible.** Template rendering is sub-millisecond. The NFR-02 target of ≤200ms added latency is easily achievable.

### 5. Migration strategy for existing users/data

**None needed.** Narratives are generated on-demand from existing metric columns (`total_return`, `max_drawdown`, `num_trades`, `benchmark_return`, `initial_balance`, `date_from`, `date_to`). All historical backtests already have this data. If the optional `narrative_text` column is added, it can be lazily populated on first access.

**Verdict: ✅ No architectural concerns. Clean fit.**

---

## Epic 3: Strategy Health & Honesty (FR-16 through FR-19)

### 1. Can it be built within the current architecture?

**Yes — fully.** Strategy health warnings are computed from existing backtest output fields and displayed as frontend banners. The MVP scope (Story 3.1: low trade count warning) is trivially `if num_trades < 10: show_warning()`.

Even the deferred stories (3.2 overfitting, 3.3 bear-market fragility) only need existing metric data plus the equity curve / trades data already stored in MinIO. No new computation infrastructure is needed.

### 2. Schema changes needed

**None.** All warning logic can be computed from existing `backtest_runs` columns:

- Low trade count: `num_trades` column
- Overfitting: `total_return`, `benchmark_return`, `num_trades`
- Bear-market fragility: requires reading equity curve from MinIO and correlating with candle data — heavier, but still no schema change

The PRD correctly defers Stories 3.2 and 3.3. When they're added, consider a `warning_flags` JSONB column on `backtest_runs` to cache computed warnings, but this is optional.

### 3. New services or infrastructure

**None.**

### 4. Scaling risks

**None for MVP scope.** The low-trade-count check is a field comparison. Even the deferred warnings only add lightweight post-backtest computation.

### 5. Migration strategy for existing users/data

**None.** Warnings are computed dynamically. Existing backtest results will display warnings retroactively, which is actually the desired behavior.

**Verdict: ✅ No architectural concerns. Clean fit.**

---

## Epic 4: Progressive Disclosure (FR-13 through FR-15)

### 1. Can it be built within the current architecture?

**Yes — fully frontend.** This epic requires zero backend changes. The block palette mode (Essentials vs. All) is a UI toggle stored in the user's browser (localStorage or the existing theme preference pattern). Plain-English labels are a frontend mapping layer over existing indicator IDs.

NFR-05 explicitly states: "Palette mode is a frontend-only toggle; no additional API calls."

### 2. Schema changes needed

**None.** If the preference should persist server-side (the PRD says "persists across sessions" for Story 4.1), it could piggyback on the existing user preferences mechanism. One option:

```
ALTER TABLE users ADD COLUMN palette_mode VARCHAR DEFAULT 'essentials';
```

But localStorage is sufficient and avoids a migration. Let the frontend team decide.

### 3. New services or infrastructure

**None.**

### 4. Scaling risks

**None.** This is static UI.

### 5. Migration strategy for existing users/data

**None.** Default is "Essentials" for all users. Existing power users toggle to "All" once and it persists. No data migration.

**Verdict: ✅ No architectural concerns. Purely frontend.**

---

## Epic 5: Weekly Digest & Retention (FR-20 through FR-25)

### 1. Can it be built within the current architecture?

**Yes, with careful design.** This is the most architecturally interesting epic. It introduces:

1. **A weekly batch job** (Monday 08:00 UTC) that queries all users with active auto-update strategies, aggregates their strategy status, and sends personalized emails.
2. **Per-user and per-strategy email preferences** (opt-out controls).
3. **A new email template** sent via the existing Resend integration.

The existing infrastructure handles this: RQ scheduler already runs cron jobs (daily auto-update at 02:00 UTC), and Resend is already integrated for password reset emails. The pattern is proven.

**However:** The PRD's MVP scope wisely defers Stories 5.1 and 5.2 (the actual email sending) to Phase 3.1. The MVP only includes 5.3 (opt-out controls) and FR-24/FR-25 (renaming Paper Trading → Strategy Monitor). This means the heavy batch processing work is not in the immediate scope.

### 2. Schema changes needed

**For MVP scope (opt-out + rename):**

```
ALTER TABLE users ADD COLUMN digest_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE strategies ADD COLUMN digest_email_enabled BOOLEAN DEFAULT true;
```

Alembic migration `026_add_digest_preferences` (or `027` depending on onboarding flag ordering).

**For Phase 3.1 (actual digest sending):**

Consider a `digest_email_log` table for idempotency and debugging:

```sql
CREATE TABLE digest_email_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  sent_at TIMESTAMP,
  strategy_count INT,
  resend_message_id VARCHAR,
  status VARCHAR  -- sent, failed, bounced
);
```

**FR-24/FR-25 (rename):** No schema changes. The PRD explicitly states: "API field names may remain for backward compatibility" and NFR-12 confirms "existing `auto_update` fields unchanged." This is a UI-label-only change.

### 3. New services or infrastructure

**None for MVP. For Phase 3.1:**

- A new RQ scheduled job: `send_weekly_digest` at `0 8 * * 1` (Mondays 08:00 UTC)
- A new email template in the Resend integration
- No new Docker services; the existing scheduler and worker handle this

### 4. Scaling risks

**Medium — but only relevant for Phase 3.1, not MVP.**

NFR-03 requires the digest batch to complete within 2 hours for all active users. NFR-04 targets 10,000 users without degradation. Key concerns:

- **Resend API rate limits:** Resend's free tier allows 100 emails/day; paid plans go higher. At 10K users, the batch needs a paid Resend plan and potentially rate-limited sending (e.g., 50/second with backoff). This is a Resend plan decision, not an architecture decision.
- **Database query load:** The batch job queries strategies with `auto_update_enabled = true` and their latest backtest results. At 10K users × ~3 strategies each = 30K rows. This is well within PostgreSQL's capabilities with existing indexes. A single query with JOINs handles it.
- **Worker memory:** Each email is rendered individually. No concern at 10K scale with RQ's sequential processing.

**Mitigation for Phase 3.1:** Use chunked processing (e.g., 100 users per batch, enqueue sub-jobs) to avoid a single long-running job. This is a code pattern, not an infrastructure change.

### 5. Migration strategy for existing users/data

For digest opt-out fields: `DEFAULT true` means all existing users are opted in, which is the correct default (they can opt out). No backfill needed.

For the rename: Pure UI. No data migration.

**Verdict: ✅ Fits current architecture. Phase 3.1 batch processing needs thoughtful job design but no new infrastructure.**

---

## Epic 6: Educational Templates (FR-26 through FR-28)

### 1. Can it be built within the current architecture?

**Yes — fully.** The strategy_templates table already exists (migration `017_add_strategy_templates`). The templates API and frontend are already built. This epic adds:

1. A "What this teaches" text field to each template (FR-26)
2. A difficulty ordering/label (FR-27)
3. Three new seed templates (FR-28)

### 2. Schema changes needed

**Two columns on the `strategy_templates` table:**

```sql
ALTER TABLE strategy_templates ADD COLUMN teaches_description TEXT;
ALTER TABLE strategy_templates ADD COLUMN difficulty VARCHAR DEFAULT 'beginner';  -- beginner, intermediate, advanced
ALTER TABLE strategy_templates ADD COLUMN sort_order INT DEFAULT 0;
```

Alembic migration `026_add_template_educational_fields` (number TBD).

### 3. New services or infrastructure

**None.** New templates are seed data inserted via a migration or a management command.

### 4. Scaling risks

**None.** Templates are a small, infrequently-changing dataset. Even with 100 templates, this is a trivial query.

### 5. Migration strategy for existing users/data

Backfill `teaches_description` and `difficulty` for existing templates. This is seed data authored by the product/content team and applied via migration. No user data is affected.

**Verdict: ✅ No architectural concerns. Clean fit.**

---

## Epic 7: Data Transparency (FR-29 through FR-30)

### 1. Can it be built within the current architecture?

**Yes — fully.** The `data_quality_metrics` table already exists (migration `009`). The candles table has the data needed to compute earliest/latest available dates per asset/timeframe.

FR-29 needs an endpoint (or extension of an existing one) that returns `{asset, timeframe, earliest_date, latest_date}`. This can be:

- A query against `data_quality_metrics` if the daily validation job already computes this (it does — "Daily validation job computes quality metrics and candle coverage")
- A fallback `SELECT MIN(timestamp), MAX(timestamp) FROM candles WHERE asset = ? AND timeframe = ?` query

FR-30 is a frontend warning that compares the user's selected date range against the data returned by FR-29.

### 2. Schema changes needed

**Likely none.** The `data_quality_metrics` table already stores this information. If it doesn't have explicit `earliest_candle_date` and `latest_candle_date` columns, add them:

```sql
ALTER TABLE data_quality_metrics 
  ADD COLUMN earliest_candle_date TIMESTAMP,
  ADD COLUMN latest_candle_date TIMESTAMP;
```

But check the existing schema first — these may already be captured in the quality metrics JSON or computed fields.

### 3. New services or infrastructure

**None.**

### 4. Scaling risks

**None.** This is metadata about a bounded set of assets. Even with 100 asset/timeframe combinations, the query is trivial.

### 5. Migration strategy for existing users/data

If new columns are added to `data_quality_metrics`, run the daily validation job once after migration to populate them. No user-facing data migration.

**Verdict: ✅ No architectural concerns. Clean fit.**

---

## Cross-Cutting Architectural Observations

### PostHog Event Instrumentation (NFR-10)

All new features need PostHog events (`wizard_first_run_started`, `narrative_viewed`, `digest_email_sent`, `health_warning_shown`). This follows the existing fire-and-forget pattern. No architectural concern — just implementation discipline.

### Performance Budget (NFR-01, NFR-02)

The 30-second wizard-to-results SLA and 200ms narrative rendering target are achievable within the current architecture. The main risk is queue contention during traffic spikes, which is mitigated by dedicated queues (a config change, not an architecture change).

### No New External Dependencies

Phase 3 introduces zero new external services, vendors, or infrastructure components. Everything builds on:
- Resend (existing) for emails
- PostHog (existing) for analytics
- CryptoCompare (existing) for candle data
- Redis + RQ (existing) for job processing
- MinIO (existing) for object storage

This is excellent brownfield discipline.

---

## Summary Migration Plan

| Migration | Epic | Table | Change | Risk |
|-----------|------|-------|--------|------|
| `026_add_onboarding_flag` | 1 | `users` | `has_completed_onboarding BOOLEAN DEFAULT false` | Low — backfill existing users with backtests |
| `027_add_digest_preferences` | 5 | `users`, `strategies` | `digest_email_enabled BOOLEAN DEFAULT true` (both tables) | Low — default opt-in |
| `028_add_template_educational_fields` | 6 | `strategy_templates` | `teaches_description TEXT`, `difficulty VARCHAR`, `sort_order INT` | Low — backfill with content |
| `029_add_data_availability_fields` (if needed) | 7 | `data_quality_metrics` | `earliest_candle_date`, `latest_candle_date` | Low — populated by daily job |

All migrations are additive (new nullable or defaulted columns). No column removals, type changes, or constraint modifications. Zero downtime deployment compatible.

---

## Prerequisite Epic Assessment

**No epics require architectural changes significant enough to warrant a prerequisite epic.**

The PRD is well-scoped for the current stack. The PM (John) made smart calls:
- Deferring the heavy batch email work (Stories 5.1/5.2) to Phase 3.1
- Keeping health warnings to simple field comparisons for MVP
- Making progressive disclosure frontend-only
- Leveraging existing templates infrastructure

The recommended build order from the PRD (Epic 4 → 2 → 7 → 1 → 3 → 6 → 5) also happens to be the correct order from an architectural dependency perspective: the frontend-only work (4) has zero backend risk, while the most complex backend work (5) comes last and its heavy pieces are deferred.

**This PRD is ready for epic/story breakdown and sprint planning.**