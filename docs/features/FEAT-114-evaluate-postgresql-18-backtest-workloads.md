## Status: Draft
## Source issue: #334
## Goal (one paragraph)
Evaluate PostgreSQL 18 as a future database upgrade for Blockbuilders backtest workloads by confirming the current PostgreSQL versions in repository and deployed environments, identifying representative candle and backtest query workloads, checking ecosystem compatibility, and documenting measured benefits, risks, rollback requirements, and a recommendation for whether a separate implementation feature should be proposed.

## Non-goals (explicit list — what this does NOT do)
- Does not upgrade PostgreSQL in Docker Compose, production infrastructure, CI, or any managed database.
- Does not change database schemas, SQLModel models, Alembic migrations, indexes, query semantics, or backtest numerical logic.
- Does not adopt PostgreSQL 18 features such as `uuidv7()`, virtual generated columns, or native OAuth authentication in application code.
- Does not change FastAPI endpoints, request or response schemas, authentication, billing, usage limits, Redis/RQ, MinIO, or frontend behavior.
- Does not change driver, ORM, dependency, or Docker image versions without a separately approved implementation feature.
- Does not run production-impacting benchmarks against live user traffic or production data.
- Does not make PostgreSQL 18 the chosen upgrade path unless explicit human approval is recorded in a follow-up implementation plan.

## Acceptance criteria (numbered AC-001, AC-002, …)
AC-001
**Given** the repository contains local and production Docker Compose database service definitions,
**When** the PostgreSQL image tags and database connection defaults are inspected,
**Then** the evaluation notes identify the current repository PostgreSQL version for each Compose file and call out any mismatch with product documentation.

AC-002
**Given** production or hosted database version information is required before any infrastructure recommendation,
**When** the evaluator checks available production configuration or asks the maintainer for the deployed PostgreSQL version,
**Then** the evaluation notes record the confirmed production version or explicitly mark it as blocked pending maintainer-provided access.

AC-003
**Given** Blockbuilders backtests depend on stored OHLCV candles and backtest run metadata,
**When** representative workloads are selected for benchmarking,
**Then** the evaluation notes define at least three stable benchmark scenarios covering candle range reads, existing candle lookup plus gap detection, and backtest run/history queries.

AC-004
**Given** PostgreSQL 18 may improve read throughput through async I/O,
**When** benchmark results are recorded,
**Then** the evaluation compares PostgreSQL 18 against the current PostgreSQL line using the same dataset, same query shapes, same hardware class, and includes latency or throughput measurements for each representative workload.

AC-005
**Given** PostgreSQL 18 introduces features that may be useful in future designs,
**When** the evaluation reviews `uuidv7()`, virtual generated columns, and native OAuth 2.0 authentication,
**Then** the notes distinguish near-term upgrade value from future product or architecture ideas and keep all feature adoption out of this scope.

AC-006
**Given** a database major-version upgrade can affect drivers, migrations, extensions, backups, and local development,
**When** compatibility is reviewed,
**Then** the evaluation documents compatibility status for Docker images, PostgreSQL extensions in use, SQLModel, SQLAlchemy, Alembic, psycopg or other database drivers, CI, backups, restore procedures, and Docker Compose development workflows.

AC-007
**Given** AGENTS.md classifies database and backtesting changes as high risk,
**When** the evaluation is completed,
**Then** the recommendation states whether to defer, run more benchmarks, or create a separate human-approved implementation feature, and includes migration risk, rollback approach, and required approval gates.

AC-008
**Given** this feature is research and planning only,
**When** the feature is reviewed,
**Then** the change set contains documentation and verification evidence only, with no source code, migration, dependency, Docker Compose, or production configuration changes.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing FastAPI routes, request schemas, response schemas, status codes, authentication requirements, billing gates, and backtest behavior remain unchanged.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
None.

## Edge cases
- `docs/product/product.md` may mention a PostgreSQL version that differs from the current Compose image tags; the evaluation must report the mismatch without editing the human-gated product document directly.
- Production database version may not be discoverable from repository metadata; if access is unavailable, the evaluation must mark production confirmation as blocked instead of inferring it from local Compose files.
- PostgreSQL 18 source release availability does not guarantee an acceptable Docker image tag, managed database offering, or production-ready upgrade path for this project.
- Benchmark results can be misleading if datasets are too small, warmed caches differ, hardware differs, or query plans are not captured; the evaluation must note these limitations.
- Improvements to candle reads must not be interpreted as permission to change backtest numerical logic, data quality rules, or historical depth limits.
- Future uses of `uuidv7()`, virtual generated columns, or native OAuth support may require migrations or auth architecture changes and must remain separate follow-up features.
- If SQLModel, SQLAlchemy, Alembic, database drivers, CI services, backup tooling, or Docker Compose workflows show incompatibility, the evaluation must stop at documentation and recommend a follow-up decision rather than changing the stack.

## Open questions
- What PostgreSQL version is currently running in production or the hosted database environment?
- What dataset size and asset/timeframe mix should be considered representative for backtest read workloads?
- Should benchmarks be run with sanitized production-like candle data, seeded synthetic OHLCV data, or both?
- Which managed database providers or deployment targets must support PostgreSQL 18 before an implementation feature can be approved?
- What performance improvement threshold would justify taking on a major-version database upgrade?
- Should a future implementation target PostgreSQL 18 directly or wait for a later patch release and managed-service support?

## Implementation Plan
_Produced by Claude. Approved: [pending]_

This feature is documentation-only (AC-008). All bullets edit Markdown under `docs/`; no source, migration, dependency, Docker Compose, or production configuration changes are permitted. "Backend or frontend" is marked "Docs" since neither application layer is touched.

1. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `## Evaluation Notes` with a `### Current Repository PostgreSQL Versions` subsection that records the `postgres:16-alpine` tags in `docker-compose.yml:75` and `docker-compose.prod.yml:81` and explicitly flags any mismatch with `docs/product/product.md` without editing the product doc (AC-001 / TC-001).
   **Layer:** Docs. **Alembic migration:** no. **Order:** first.

2. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### Production Database Version` subsection that either records the maintainer-confirmed deployed PostgreSQL version with its evidence source or marks it `blocked pending maintainer-provided access`, without inferring from local Compose files (AC-002 / TC-002).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 1.

3. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### Representative Benchmark Workloads` defining at least three stable scenarios — candle range reads, existing-candle lookup plus gap detection, and backtest run/history queries — describing query shapes and dataset assumptions only (AC-003 / TC-003).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 2.

4. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### Benchmark Methodology and Results` capturing PostgreSQL 18 vs current PostgreSQL line measurements on the same dataset, same query shapes, and same hardware class, with latency/throughput numbers per scenario, captured query plans, and noted limitations (cache state, dataset size, hardware) (AC-004 / TC-004).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 3.

5. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### PostgreSQL 18 Feature Review` covering `uuidv7()`, virtual generated columns, and native OAuth 2.0 authentication, each explicitly marked as future-only and out of this feature's scope (AC-005 / TC-005).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 4.

6. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### Compatibility Matrix` documenting status for Docker images, in-use PostgreSQL extensions, SQLModel, SQLAlchemy, Alembic, psycopg/other drivers, GitHub Actions CI services, backup tooling, restore procedures, and Docker Compose dev workflows; mark unknown/incompatible areas as risks or blockers (AC-006 / TC-006).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 5.

7. **File:** `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
   **Change:** Append `### Recommendation, Risk, and Rollback` stating defer / continue benchmarking / propose separate human-approved implementation feature, with migration risk, rollback approach, and the explicit human-approval gates required by AGENTS.md risk-high policy (AC-007 / TC-007).
   **Layer:** Docs. **Alembic migration:** no. **Order:** after bullet 6.

8. **File:** `tasks/todo.md`
   **Change:** Add a FEAT-114 entry pointing to the evaluation notes and run `git diff --name-only` as the final verification that only `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md` (and this `tasks/todo.md` line) changed — no source, migration, dependency, Compose, or production config files (AC-008 / TC-008).
   **Layer:** Docs. **Alembic migration:** no. **Order:** last.

