## Status: Implemmented
## Source issue: #331
## Goal (one paragraph)
Plan and bound the backend migration from `rq==1.16.2`, `redis==5.2.1`, and `rq-scheduler==0.13.1` to compatible current targets in the RQ 2.x, redis-py 7.x, and rq-scheduler 0.14.x lines, preserving existing queue, worker, scheduler, backtest, auto-update, data-quality, and price-alert behavior while documenting whether native RQ repeat jobs should replace or defer the current `rq-scheduler` usage.

## Non-goals (explicit list — what this does NOT do)
- This does not implement the dependency upgrade before the migration plan is reviewed and approved.
- This does not change authentication, billing, backtesting numerical logic, database models, or migrations.
- This does not change Redis server Docker image tags or Redis server configuration.
- This does not add a new queue backend, process manager, scheduler service, or deployment topology.
- This does not change FastAPI endpoint request or response contracts.
- This does not change frontend code, UI behavior, or user-facing product workflows.
- This does not implement FEAT-030 daily validation behavior beyond deciding whether the RQ 2.x migration should be a prerequisite.

## Acceptance criteria (numbered AC-001, AC-002, …)
1. AC-001  
   **Given** the current backend dependency manifest pins RQ, redis-py, and rq-scheduler,  
   **When** the migration scope is reviewed,  
   **Then** the current versions, target versions, Python compatibility constraints, and any transitive dependency constraints are documented before any dependency pins are changed.

2. AC-002  
   **Given** the backend currently uses `rq-scheduler` for recurring auto-update, data-quality, and price-alert jobs,  
   **When** the migration plan evaluates scheduling options,  
   **Then** it documents whether to keep `rq-scheduler` 0.14.x, replace it with native RQ 2.x scheduling or repeat jobs, or defer that choice to a separate approved feature.

3. AC-003  
   **Given** the backend has worker startup code, queue enqueue paths, Redis cache/rate-limit usage, and scheduled jobs,  
   **When** the migration audit is completed,  
   **Then** every RQ, redis-py, and rq-scheduler integration point in backend application code and Docker Compose worker/scheduler services is identified with an expected post-migration behavior.

4. AC-004  
   **Given** backtest execution depends on queued jobs,  
   **When** the migration validation plan is prepared,  
   **Then** it includes automated checks for backtest enqueue behavior, worker job imports, Redis-backed API behavior, and recurring scheduler registration.

5. AC-005  
   **Given** FEAT-030 may benefit from RQ 2.x repeat jobs,  
   **When** the migration plan is reviewed,  
   **Then** it states whether FEAT-030 should wait for this migration or continue with the current scheduler workaround, including the reason for that decision.

6. AC-006  
   **Given** RQ 2.x includes worker behavior changes such as `SpawnWorker`,  
   **When** the migration plan defines the worker strategy,  
   **Then** it documents whether the existing worker class remains acceptable or whether a new worker mode is required, with local verification steps for the chosen approach.

7. AC-007  
   **Given** this is a backend infrastructure migration with production scheduling impact,  
   **When** maintainers review the implementation PR for the later migration,  
   **Then** the PR includes executed validation evidence, known compatibility findings, rollback guidance, and confirmation that no unrelated dependencies or product behavior were changed.

## API contract (FastAPI endpoints if backend; omit otherwise)
No API contract changes. Existing FastAPI endpoints keep their current paths, authentication requirements, request schemas, response schemas, and status-code behavior.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
Not applicable.

## Edge cases
- RQ 2.x native scheduling or repeat jobs may not fully replace the existing `rq-scheduler` cron behavior without changing operational expectations.
- `rq-scheduler` compatibility with RQ 2.x may depend on the exact RQ and redis-py versions selected.
- redis-py 7.x may alter connection, response decoding, timeout, or exception behavior used by API cache, OAuth state, password reset rate limiting, and queue code.
- A worker may start successfully but fail when importing or executing queued backtest, auto-update, data-quality, or price-alert jobs.
- A scheduler may register duplicate jobs, fail to cancel existing jobs, or change job IDs if the migration changes scheduling primitives.
- FEAT-030 could be delayed by requiring the migration first; choosing the current scheduler workaround may create follow-up migration work later.
- Clean installs may expose dependency conflicts that are hidden in an existing local virtual environment.

## Open questions
- Should the migration target exactly `rq==2.7.0`, `redis==7.1.1`, and `rq-scheduler==0.14.0`, or should implementation use the newest compatible patch versions available at approval time?
- Should `rq-scheduler` remain in the dependency set for one release even if native RQ repeat jobs are chosen, to reduce rollout risk?
- Should worker validation include a Docker Compose smoke test in addition to direct backend commands?
- Should FEAT-030 be blocked on this migration, or should it proceed with the current scheduler workaround and receive a follow-up refactor after RQ 2.x is adopted?
- Should `SpawnWorker` be adopted immediately, or should the first migration preserve the current `Worker` behavior and evaluate `SpawnWorker` separately?

## Implementation Plan
_Produced by Claude. Approved: [approved]_

Decisions locked with maintainer before planning:
- Target versions: `rq==2.7.0`, `redis==7.1.1`, `rq-scheduler==0.14.0` (exact pins).
- Scheduler direction: keep `rq-scheduler` 0.14.x. Native RQ 2.x repeat jobs deferred to a separate feature.
- Worker strategy: preserve current `Worker` class. `SpawnWorker` evaluated in a follow-up feature.
- FEAT-030: not blocked on this migration; continues with current `rq-scheduler` workaround.
- Validation scope: pytest + worker import + Docker Compose worker/scheduler smoke test.

<plan>
1. `docs/features/FEAT-115-rq-redis-migration-plan.md` — Append a "Migration Notes" subsection recording current vs. target versions, Python 3.12 compatibility, transitive constraints (incl. `fakeredis`), and the locked scheduler/worker/FEAT-030 decisions above. Backend (docs). Alembic: no. Order: 1.
2. `backend/requirements.txt` — Update pins to `rq==2.7.0`, `redis==7.1.1`, `rq-scheduler==0.14.0`; bump `fakeredis` only if required for redis-py 7.x compatibility and justify the bump in the PR body. Backend. Alembic: no. Order: 2 (after 1).
3. `backend/app/worker/main.py` — Adjust `Queue`, `Worker`, and `Scheduler` construction and Redis connection setup for RQ 2.x + redis-py 7.x API differences (decode_responses, connection class, Worker constructor kwargs); keep the existing `Worker` class. Backend. Alembic: no. Order: 3 (after 2).
4. `backend/app/worker/jobs.py` — Audit enqueue and `scheduler.cron` / `scheduler.schedule` call sites for RQ 2.x and rq-scheduler 0.14.x signature changes; adjust call sites only, preserving job IDs and cron expressions. Backend. Alembic: no. Order: 3 (parallel with bullet 3).
5. Backend Redis call sites (`backend/app/api/**`, cache, rate-limit, OAuth state, password-reset paths) — Update `from redis` / `Redis.from_url` usages for redis-py 7.x exception types, timeout, and response-decoding behavior; no behavior change beyond compatibility. Backend. Alembic: no. Order: 4 (after 2).
6. `docker-compose.yml` and `docker-compose.prod.yml` — Verify the `worker` and `scheduler` service commands still resolve under the new pins; no Redis image tag change and no topology change. Backend (infra). Alembic: no. Order: 5 (after 3–5).
7. `docs/features/FEAT-115-rq-redis-migration-plan.md` — Append a "Validation Evidence & Rollback" subsection with pytest summary, `python -c "from app.worker.main import run_worker, run_scheduler"` output, Docker Compose worker/scheduler smoke result, and rollback guidance (revert `backend/requirements.txt` pins; no data or schema changes to undo). Backend (docs). Alembic: no. Order: 6 (last).
</plan>
