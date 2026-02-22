# Blockbuilders — Tech Stack Brainstorm

**Date:** 2026-02-22
**Context:** Post-adversarial-review analysis of the current technology stack. Should we upgrade, swap, or stay?

---

## Current Stack at a Glance

| Layer | Current | Version | Latest Available |
|---|---|---|---|
| Frontend framework | Next.js | 15 | **16.1** (stable, Dec 2025) |
| UI library | React | 19 | 19 (current) ✅ |
| Language | TypeScript | (unspecified) | 5.7+ |
| Styling | Tailwind CSS | (unspecified) | 4.x |
| Component library | shadcn/ui | — | Still actively maintained ✅ |
| Canvas | React Flow (XyFlow) | — | Still the best option ✅ |
| Charts | Recharts | — | Still maintained ✅ |
| Backend framework | FastAPI | (unspecified) | **0.129.1** (Feb 21, 2026) |
| Backend language | Python | 3.11+ | **3.13** (stable), 3.14 in beta |
| ORM | SQLModel | — | **0.0.31** (latest) |
| Database | PostgreSQL | 15 | **18.2** (Feb 2026) |
| Queue | Redis + RQ | Redis 7 | Redis 7 ✅, but RQ is aging |
| Storage | MinIO | — | Still S3-compatible, fine ✅ |
| Deployment | Docker Compose | — | Still appropriate for current scale ✅ |

---

## 1. Frontend: Next.js 15 → 16

### What Changed in Next.js 16

Next.js 16 was released in Oct 2025 with significant improvements:

- **Complete routing overhaul** — layout deduplication (shared layouts downloaded once instead of per-link), incremental prefetching, smarter cache invalidation. This directly benefits Blockbuilders' multi-page navigation (dashboard → strategy → backtest → results).
- **React Compiler support (stable)** — automatic memoization of components, reducing unnecessary re-renders. Your canvas with 20+ block types and complex state would benefit.
- **Cache Components with `"use cache"` directive** — opt-in caching replaces the implicit caching from earlier App Router versions. More predictable behavior.
- **Build Adapters API (alpha)** — custom deployment adapters. Not critical yet, but useful if you move off Docker Compose.
- **Turbopack improvements** — faster dev builds, file system caching (stable in 16.1).
- **Security patches** — critical CVEs were found in React Server Components across all versions (13-16). You should upgrade regardless of feature interest.

### Recommendation: **Upgrade to Next.js 16**

**Priority: High.** The security patches alone justify this. The routing performance improvements are a bonus for your multi-page app. Next.js provides a codemod for the 15→16 migration: `npx @next/codemod@canary upgrade latest`.

**Risk:** Medium. The routing overhaul may require testing around your OAuth callback flow, shared result links, and any prefetching behavior. App Router APIs are stable, so most of your code should work as-is.

**Effort estimate:** 1-2 days for upgrade + testing.

---

## 2. Backend: FastAPI Version

### Current State

FastAPI is now at **0.129.1** (Feb 2026). Key changes since your likely version:

- **Python 3.8 and 3.9 support dropped** — FastAPI now requires Python ≥ 3.10. This is a non-issue since you're already on 3.11+.
- **Starlette upgraded** to ≥ 0.40.0 — improved WebSocket handling, middleware performance.
- **fastapi-slim deprecated** — just use `fastapi[standard]`.
- **JWT timing attack prevention** in docs — you already handle this with timing-safe comparison.
- **Pydantic v1 compatibility layer still present** but being phased out.

### Recommendation: **Upgrade FastAPI to latest**

**Priority: Medium.** No breaking changes expected. It's a `pip install --upgrade fastapi` away. Your SQLModel + Pydantic v2 setup is the recommended stack.

**Effort estimate:** Half a day — upgrade, run tests, verify API docs still generate correctly.

---

## 3. Python: 3.11 → 3.13

### What's New

- **Python 3.12:** Better error messages, per-interpreter GIL (experimental), `type` statement, f-string improvements, faster startup.
- **Python 3.13:** Free-threaded mode (no-GIL experimental), improved REPL, deprecation removals, better typing features.
- **Python 3.14:** In beta — more typing improvements, performance work.

### What Matters for Blockbuilders

The **free-threaded mode in 3.13** is the most interesting feature for your backtest engine. Currently your engine is single-threaded (noted in Section 14.3 as a known limitation). The no-GIL build of Python 3.13 could eventually allow true multi-threaded backtest execution without moving to multiprocessing. However, this is still experimental and many C extensions (numpy, pandas) don't fully support it yet.

The practical wins are **faster startup** (helps Docker container boot), **better error messages** (helps debugging), and **typing improvements** (cleaner code).

### Recommendation: **Upgrade to Python 3.12 now, evaluate 3.13 later**

**Priority: Medium.** Python 3.12 is battle-tested and gives you meaningful quality-of-life improvements. Python 3.13's no-GIL is exciting but premature for production use with scientific computing libraries.

**Effort estimate:** 1 day — update Dockerfile base image, run full test suite, check for deprecation warnings.

---

## 4. PostgreSQL: 15 → 17 or 18

### Version Landscape

- **PostgreSQL 15:** Your current version. Still supported until Nov 2027.
- **PostgreSQL 16:** Logical replication improvements, better query parallelism, SIMD-accelerated text processing.
- **PostgreSQL 17:** JSON_TABLE() function, improved vacuum performance, streaming I/O for sequential reads, better btree index performance for multi-value searches.
- **PostgreSQL 18:** Latest major (18.2 as of Feb 2026). Incremental backup, virtual generated columns, `MAINTAIN` privilege, async I/O improvements.

### What Matters for Blockbuilders

- **PostgreSQL 17's JSON_TABLE()** is interesting — you store strategy definitions as JSON, and being able to query them with SQL directly could help with analytics and template search.
- **Improved sequential read performance** (17) directly helps your candle data queries, which are time-range scans over large tables.
- **Better vacuum** (17) matters as your candles table grows.
- **PostgreSQL 18's async I/O** would benefit concurrent backtest reads.

### Recommendation: **Upgrade to PostgreSQL 17**

**Priority: Medium-Low.** PostgreSQL 15 is still supported and working. But 17 offers concrete wins for your workload (JSON queries, sequential scan performance, vacuum). Jumping to 18 is also viable but more aggressive.

**Migration path:** `pg_dump` + `pg_restore`, or `pg_upgrade`. Since you use Docker, it's a container image swap + data migration.

**Effort estimate:** Half a day for the upgrade itself, plus testing. Schedule during a maintenance window.

---

## 5. Task Queue: RQ → Should You Switch?

### The Problem with RQ

RQ (Redis Queue) is simple and works, but it has limitations that are becoming relevant:

- **No built-in retry logic** — if a backtest job fails transiently (e.g., CryptoCompare rate limit), RQ doesn't retry automatically.
- **rq-scheduler is a separate package** and less actively maintained than the core.
- **No async support** — RQ is synchronous. If you move FastAPI to async handlers (your `database.py` notes "Async session support not yet used"), RQ can't participate in that ecosystem.
- **Limited concurrency model** — one worker = one process. Scaling requires spawning more worker containers.
- **Benchmark data:** RQ processed 20,000 no-op jobs in 51 seconds with 10 workers. Dramatiq did it in 5 seconds. Celery in 7 seconds.

### Alternatives

| Queue | Pros | Cons | Best For |
|---|---|---|---|
| **RQ (current)** | Dead simple, already working | No retries, no async, slow at scale, scheduler is separate | Small apps, ≤100 jobs/day |
| **Dramatiq** | Fast, reliable, built-in retries, simple API like RQ | No built-in scheduler (use APScheduler), smaller community than Celery | Mid-size apps wanting RQ simplicity + reliability |
| **Celery** | Full-featured, built-in scheduler (Beat), mature ecosystem | Complex setup, heavier, overkill for your scale | Large apps with complex workflows |
| **ARQ** | Async-native, Redis-based, lightweight | Small community, less battle-tested | Async-first Python apps |
| **Taskiq** | Redis Streams support (more reliable), async | Relatively new | Modern async apps |

### Recommendation: **Stay with RQ for now, consider Dramatiq for Phase 2+**

**Priority: Low.** RQ works for your current scale (50-500 backtests/day). The architecture delta document already planned queue separation (manual vs auto-update) which is achievable with RQ named queues.

**When to switch:** If you need automatic retries (for data vendor resilience), async workers (for performance), or hit throughput limits. Dramatiq is the natural upgrade path — similar simplicity to RQ but 10x faster and with built-in retries.

**Effort to migrate to Dramatiq:** 2-3 days. The decorator-based API requires refactoring job dispatch but the logic stays the same.

---

## 6. Tailwind CSS: 3.x → 4.x

### What Changed in Tailwind 4

Tailwind CSS v4 (released early 2025) is a major rewrite:

- **New engine built on Rust** (Oxide) — dramatically faster build times.
- **CSS-first configuration** — `@theme` directive in CSS replaces `tailwind.config.js`.
- **Automatic content detection** — no more `content: [...]` configuration.
- **Native CSS cascade layers** — better specificity handling.
- **New default color palette** and spacing scale.

### Recommendation: **Evaluate but don't rush**

**Priority: Low.** Tailwind 4 is a significant migration because the configuration model changed fundamentally. Since you use shadcn/ui, you need to ensure shadcn/ui is fully compatible with Tailwind 4 before upgrading. As of early 2026, shadcn/ui has been updating for Tailwind 4 support, but check their docs before proceeding.

**Risk:** Medium-High. The CSS-first config model means rewriting your tailwind configuration. With 50+ components, this is non-trivial.

**Effort estimate:** 2-3 days, but test thoroughly — styling regressions are hard to catch.

---

## 7. Architecture-Level Questions

Beyond version bumps, here are the bigger "should we rethink this?" questions:

### 7a. Monolith vs. Microservices

**Current:** FastAPI monolith handles everything (auth, strategies, backtests, market data, alerts, billing).

**Verdict: Stay monolith.** For a solo developer or small team, a monolith is operationally simpler. Your architecture delta document already validated that all Phase 2 epics fit within the current monolith. The only future candidate for extraction would be the backtest compute engine (if you need to scale it independently), but that's a Phase 3+ concern.

### 7b. Sync vs. Async FastAPI

**Current:** FastAPI is set up for async (`async/await`) but your database layer is synchronous (SQLModel + sync sessions).

**Recommendation:** Moving to fully async would improve throughput under concurrent load but requires:
- Async SQLAlchemy sessions (SQLModel supports this)
- Async Redis client (aioredis or redis-py async)
- Async S3 client (aiobotocore)

**Priority: Low.** Your current user base doesn't need this. Revisit when you hit concurrent user issues (100+ simultaneous users).

### 7c. Testing: SQLite → PostgreSQL for Tests

**Current:** Tests use in-memory SQLite. Your architecture delta document flagged SQLite/PostgreSQL divergence as a risk.

**Recommendation:** Use **testcontainers-python** to spin up a real PostgreSQL container for tests. This eliminates all dialect divergence issues (JSON columns, ENUM types, etc.).

**Priority: Medium.** This is a reliability improvement that pays for itself quickly.

**Effort:** 1 day to set up testcontainers + migrate existing tests.

### 7d. Object Storage: MinIO → S3/R2

**Current:** MinIO in Docker for local development, presumably MinIO or S3 for production.

**Recommendation:** For production, consider **Cloudflare R2** — S3-compatible, zero egress fees, simpler pricing than AWS S3. Your existing boto3 client works with R2 by changing the endpoint URL.

**Priority: Low.** Only matters when you deploy to production at scale.

---

## Summary: Prioritized Upgrade Plan

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 🔴 **High** | Upgrade Next.js 15 → 16 | 1-2 days | Security patches + routing performance |
| 🟡 **Medium** | Upgrade FastAPI to 0.129.x | 0.5 day | Bug fixes, keep current |
| 🟡 **Medium** | Upgrade Python 3.11 → 3.12 | 1 day | Faster startup, better errors |
| 🟡 **Medium** | Switch tests from SQLite to PostgreSQL (testcontainers) | 1 day | Eliminate test/prod divergence |
| 🟢 **Low-Med** | Upgrade PostgreSQL 15 → 17 | 0.5 day | JSON_TABLE, better sequential scans |
| 🟢 **Low** | Evaluate Tailwind 4 migration | 2-3 days | Faster builds, modern config |
| 🟢 **Low** | Evaluate Dramatiq (replace RQ) | 2-3 days | Retries, performance (when needed) |
| ⚪ **Future** | Async FastAPI + async DB sessions | 3-5 days | Concurrency (when needed) |
| ⚪ **Future** | Cloudflare R2 for production storage | 0.5 day | Cost savings at scale |

**Total for high + medium priorities: ~4 days of focused work.**

The key takeaway: your current stack choices are solid and well-matched to the product's needs. There are no technology dead-ends or deprecated components forcing your hand. The upgrades are incremental improvements, not rescues. The most urgent action is the Next.js 16 upgrade for security reasons; everything else can be scheduled opportunistically.
