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

## Implementation Plan: Not produced in this step.
