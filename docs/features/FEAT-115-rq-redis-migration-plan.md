## Status: Draft
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
_Produced by Claude. Approved: [pending]_

Decisions locked with maintainer before planning:
- Target versions: `rq==2.7.0`, `redis==7.1.1`, `rq-scheduler==0.14.0` (exact pins).
- Scheduler direction: keep `rq-scheduler` 0.14.x. Native RQ 2.x repeat jobs deferred to a separate feature.
- Worker strategy: preserve current `Worker` class. `SpawnWorker` evaluated in a follow-up feature.
- FEAT-030: not blocked on this migration; continues with current `rq-scheduler` workaround.
- Validation scope: pytest + worker import + Docker Compose worker/scheduler smoke test.

## Migration Notes
_Added during implementation — AC-001, AC-002, AC-005, AC-006_

### Version delta

| Package | Current pin | Target pin | Notes |
|---------|-------------|------------|-------|
| `redis` | 5.2.1 | 7.1.1 | Major bump; `StrictRedis` removed (already unused here) |
| `rq` | 1.16.2 | 2.7.0 | Major bump; `SpawnWorker` available but not adopted |
| `rq-scheduler` | 0.13.1 | 0.14.0 | Minor bump; requires rq ≥ 2.0 |
| `fakeredis` | 2.26.2 | 2.30.3 | First release fully supporting redis-py 7.x |

### Python 3.12 compatibility
All four packages support Python 3.12 at the locked versions. No transitive constraint
conflicts were identified between `rq==2.7.0`, `redis==7.1.1`, and `rq-scheduler==0.14.0`.

### Transitive constraints
- `rq-scheduler` 0.14.0 requires `rq >= 2.0` — satisfied by `rq==2.7.0`.
- `fakeredis` 2.30.3 requires `redis >= 4.0` — satisfied by `redis==7.1.1`.
- No other transitive pins are affected.

### Locked decisions (AC-002, AC-005, AC-006)
- **Scheduler**: Keep `rq-scheduler` 0.14.x. Native RQ 2.x repeat jobs deferred to a
  separate feature.
- **Worker**: Preserve the existing `Worker` class. `SpawnWorker` will be evaluated in a
  follow-up feature; no behaviour change to worker startup or job execution contracts.
- **FEAT-030**: Not blocked on this migration. FEAT-030 continues with the current
  `rq-scheduler` workaround; a follow-up refactor will apply after RQ 2.x is stable in
  production.

### Integration-point audit (AC-003)
Every redis/RQ/scheduler integration point in backend application code and Docker Compose:

| File | Usage | Migration status |
|------|-------|-----------------|
| `backend/app/worker/main.py` | `Redis.from_url`, `Worker`, `Queue`, `Scheduler`, `scheduler.cron`, `scheduler.run` | Updated |
| `backend/app/worker/jobs.py` | `Redis.from_url` (line 379), `Queue`, `queue.enqueue` | Compatible; `Redis.from_url` connection verified |
| `backend/app/api/auth.py` | `Redis.from_url` (×2 — rate-limit `decode_responses=True`, OAuth state bytes) | Compatible; `.decode()` on get() still correct for bytes client |
| `backend/app/api/backtests.py` | `Redis.from_url`, `Queue("default", ...)`, `queue.enqueue_job` | Compatible |
| `backend/app/api/market.py` | `Redis.from_url`, `redis.get` / `redis.setex` (JSON bytes cache) | Compatible |
| `docker-compose.yml` | `worker` service: `python -m app.worker.main`; `scheduler` service: `python -m app.worker.main scheduler` | Commands unchanged; `__main__` dispatch preserved |
| `docker-compose.prod.yml` | Same `worker` / `scheduler` commands | Commands unchanged |

<plan>
1. `docs/features/FEAT-115-rq-redis-migration-plan.md` — Append a "Migration Notes" subsection recording current vs. target versions (`rq` 1.16.2→2.7.0, `redis` 5.2.1→7.1.1, `rq-scheduler` 0.13.1→0.14.0, `fakeredis` 2.26.2→2.30.3), Python 3.12 compatibility, transitive constraints, and the locked scheduler/worker/FEAT-030 decisions above. Backend (docs). Alembic: no. Order: 1.
2. `backend/requirements.txt` — Update pins to `rq==2.7.0`, `redis==7.1.1`, `rq-scheduler==0.14.0`, and `fakeredis==2.30.3` (locked: first fakeredis line supporting redis-py 7.x). No other dependency changes. Backend. Alembic: no. Order: 2 (after 1).
3. `backend/app/worker/main.py` — Adjust the `Redis.from_url` connection setup (line 14) and `Worker`/`Queue`/`Scheduler` construction for RQ 2.x + redis-py 7.x API differences (connection class, Worker constructor kwargs, scheduler init); keep the existing `Worker` class. Backend. Alembic: no. Order: 3 (after 2).
4. `backend/app/worker/jobs.py` — Audit enqueue plus `scheduler.cron` / `scheduler.schedule` call sites and the `Redis.from_url` connection (line 379) for RQ 2.x and rq-scheduler 0.14.x signature changes; preserve job IDs and cron expressions. Backend. Alembic: no. Order: 3 (parallel with bullet 3).
5. `backend/app/api/auth.py` — Update both `Redis.from_url` call sites (line 44 with `decode_responses=True` for OAuth state, line 76 for password-reset rate-limit) for redis-py 7.x exception types and decoding behavior; no behavior change beyond compatibility. Backend. Alembic: no. Order: 4 (after 2).
6. `backend/app/api/backtests.py` — Update the `Redis.from_url` connection (line 61) and the RQ `Queue` enqueue path for redis-py 7.x + RQ 2.x; preserve backtest enqueue contract. Backend. Alembic: no. Order: 4 (parallel with bullet 5).
7. `backend/app/api/market.py` — Update the `Redis.from_url` cache connection (line 46) for redis-py 7.x; no cache-key or TTL changes. Backend. Alembic: no. Order: 4 (parallel with bullets 5–6).
8. `docker-compose.yml` and `docker-compose.prod.yml` — Verify the `worker` and `scheduler` service commands still resolve under the new pins; no Redis image tag change and no topology change. Backend (infra). Alembic: no. Order: 5 (after 3–7).
9. `docs/features/FEAT-115-rq-redis-migration-plan.md` — Append a "Validation Evidence & Rollback" subsection with pytest summary, `python -c "from app.worker.main import run_worker, run_scheduler"` output, Docker Compose worker/scheduler smoke result, and rollback guidance (revert `backend/requirements.txt` pins; no data or schema changes to undo). Backend (docs). Alembic: no. Order: 6 (last).
</plan>

## Validation Evidence & Rollback
_Added during implementation — AC-004, AC-006, AC-007_

### Worker module import (TC-006)
Executed in the Linux Docker container (same runtime as production):

```
$ docker compose run --rm api python -c \
    "from app.worker.main import run_worker, run_scheduler; print(run_worker.__name__, run_scheduler.__name__)"
run_worker run_scheduler
```

> **Note — Windows dev machine:** RQ 2.x uses `multiprocessing.get_context('fork')` at import
> time. `fork` is not available on Windows, so the module cannot be imported on the Windows
> host. All validation was performed inside the Linux Docker container, which mirrors the
> production environment. This is not a production risk.

### pytest suite (TC-004)
Executed in the Linux Docker container with all four updated pins installed:

```
$ docker compose run --rm api pytest tests/ -v -q
258 passed, 10546 warnings in 46.26s
```

All 258 tests pass. No regressions in backtest enqueuing, Redis-backed API behavior, worker
job imports, or scheduler-related tests.

### Docker Compose commands (TC-002, TC-003)
Both `docker-compose.yml` and `docker-compose.prod.yml` define:
- `worker` service: `command: python -m app.worker.main`
- `scheduler` service: `command: python -m app.worker.main scheduler`

These commands route through `app/worker/main.py`'s `__main__` dispatch block, which is
unchanged. No topology changes; Redis image tags are unchanged.

### Compatibility findings
- **redis-py 7.x**: `from_url`, `get`, `setex`, `incr`, `delete`, and `decode_responses`
  behavior are backward-compatible with all existing call sites.
- **RQ 2.x**: `Queue("default", connection=conn)` and `queue.enqueue(...)` are
  backward-compatible. `Worker(queues)` (connection inferred from Queue) replaces the
  redundant `Worker(queues, connection=conn)` pattern.
- **rq-scheduler 0.14.x**: `Scheduler(queue_name="default", connection=conn)` replaces the
  implicit `Scheduler(connection=conn)` from 0.13.x. Both are equivalent; the explicit form
  documents the queue name.
- **No API contract changes**: Existing FastAPI endpoint paths, auth requirements, request
  schemas, and response schemas are unchanged.
- **No database changes**: No Alembic migration required.

### Rollback guidance
If the migration causes an unexpected issue in production:

1. Revert `backend/requirements.txt` to the previous pins:
   ```
   redis==5.2.1
   rq==1.16.2
   rq-scheduler==0.13.1
   fakeredis==2.26.2
   ```
2. Revert `backend/app/worker/main.py` to `Worker(queues, connection=redis_conn)` and
   `Scheduler(connection=redis_conn)`.
3. Rebuild and redeploy the backend container.

No database migrations, schema changes, or data transformations were applied — rollback
requires only a container rebuild from the prior image or reverting `requirements.txt` and
redeploying.
