# PRD – Foundation & Environment (Epic 0)

**Suggested filename:** `prd-epic0-foundation-environment.md`

---

## 1. Overview

This PRD covers **Epic 0 – Foundation & Environment** for Blockbuilders:

- **S0.1 – Local dev & basic deploy**
- **S0.2 – Core data model & migrations**

The goal is to set up a **minimal but complete skeleton** of the product that:

- Runs locally with `docker-compose`.
- Has a single, simple deployment target.
- Provides core database tables for the rest of the MVP.

Everything should be as simple as possible: one monolithic backend, one worker image, one DB, one cache.

---

## 2. Objectives & Success Criteria

### 2.1 Objectives

1. **Reproducible local stack**  
   Any developer can run the whole app with a single command and start building features.

2. **Simple deployment path**  
   There is a straightforward way to deploy the same stack to a small cloud/VPS environment.

3. **Core data model ready**  
   All core tables needed by later epics exist and are migrated, aligned with the MVP architecture.

### 2.2 Success Criteria

- `docker-compose up` starts:
  - FastAPI API,
  - Worker process,
  - Postgres,
  - Redis,
  - Next.js frontend.
- Frontend health page is reachable (e.g. `/health`).
- Backend health endpoint is reachable (e.g. `GET /health`).
- DB has migrated tables: `users`, `strategies`, `strategy_versions`, `backtest_runs`, `candles`.

---

## 3. Scope

### 3.1 In-scope

- **Local development environment** using Docker Compose.
- **Minimal deployment config** (e.g. same compose file or a trivially adapted variant).
- **Database schema & migrations** for:
  - `users`
  - `strategies`
  - `strategy_versions`
  - `backtest_runs`
  - `candles`
- **ORM models** (FastAPI + SQLModel / SQLAlchemy) wired to these tables.
- **Basic healthchecks**:
  - Frontend route returning a simple “OK”.
  - Backend endpoint returning app status and DB connectivity.

### 3.2 Out-of-scope

- Any complex observability stack (no Prometheus, tracing, etc.).
- Multi-environment config beyond **dev** and **a simple prod-like** setup.
- Any user-facing workflows (auth, strategies, backtests) beyond what’s needed to prove stack health.

---

## 4. Product Context

From the MVP spec:

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind.
- **Backend**: FastAPI monolith.
- **Worker**: Same codebase, different process mode.
- **Database**: Postgres.
- **Queue/Cache**: Redis.
- **Object storage**: S3-compatible (for now only needs to exist as config; full use comes later).

The foundation epic ensures these pieces can run together simply and reliably.

---

## 5. Functional Requirements

### 5.1 S0.1 – Local Dev & Basic Deploy

> As a developer, I want a reproducible local setup and a simple deployment target, so that I can run the whole stack easily and ship changes fast.

#### 5.1.1 Services

**Docker Compose must define at least:**

1. `frontend`  
   - Next.js app (TypeScript, Tailwind).  
   - Serves on a configurable port (default: `3000`).
   - Environment variables to talk to backend (`API_BASE_URL`).

2. `api`  
   - FastAPI application (Uvicorn / Gunicorn).  
   - Exposes REST endpoints (starting with `/health`).
   - Config via environment variables (DB URL, Redis URL, etc).

3. `worker`  
   - Same Docker image as `api`, different command (e.g. `worker` mode).  
   - Connected to Redis for job queue.
   - No extra complexity (no multiple queues, no extra processes).

4. `db`  
   - Postgres container with:
     - Default DB name, user, password set via env.
   - Data directory persisted via a volume.

5. `redis`  
   - Simple Redis instance used as:
     - Job queue backend.
     - Cache for later epics.

*(Optional but nice-to-have now)*

6. `storage`  
   - S3-compatible (e.g. MinIO) to mirror production assumptions, even if unused in early features.

#### 5.1.2 Commands & Developer Experience

- `docker-compose up` (or `docker compose up`) should:
  - Build images as needed.
  - Bring up all services in a working state.
- A **single documented command** for:
  - Applying DB migrations (e.g. `alembic upgrade head`).
  - Running backend tests (if any), but tests not required by this epic.

Minimal documentation:

- A short **README section** explaining:
  - Prerequisites (Docker, docker-compose).
  - Basic commands:
    - `docker-compose up`
    - `docker-compose down`
    - migration command.

#### 5.1.3 Healthchecks

- **Backend health endpoint**:
  - Route: `GET /health`.
  - Returns:
    ```json
    {
      "status": "ok",
      "db": "ok" | "error",
      "version": "<app_version>"
    }
    ```
  - Checks DB connectivity (simple query or connection attempt).

- **Frontend health page**:
  - Route: `/health` (Next.js page).
  - Minimal HTML: text “OK” or a simple status box.
  - Optional: call backend `/health` and show its status, but this is not required for the epic to be “done”.

#### 5.1.4 Deployment (Basic)

- It must be possible to run **the same stack** on a single remote machine or simple PaaS:
  - For example:
    - Using the same `docker-compose.yml` file, or
    - A minimal variant (`docker-compose.prod.yml`).
- No Kubernetes or advanced orchestration.
- Requirement: a short doc snippet exists explaining “how to run this in prod-like environment” (one or two commands).

---

### 5.2 S0.2 – Core Data Model & Migrations

> As a developer, I want core DB tables for users, strategies, strategy versions, backtest runs, and candles, so that I can build features without reworking the schema later.

All schemas should be **minimal**: just what later MVP epics clearly need.

#### 5.2.1 General Rules

- All tables must have:
  - `id` primary key (UUID or integer; choose one and stick with it).
  - `created_at` timestamp.
  - `updated_at` timestamp (optional for rarely changed tables like `candles`, but recommended for consistency).
- Use a single ORM (SQLModel or SQLAlchemy) and a single migrations tool (e.g. Alembic).

#### 5.2.2 `users` Table

Purpose: basic user identity + simple settings.

**Fields (minimum):**

- `id`
- `email` (unique)
- `password_hash`
- `created_at`
- `updated_at`
- Optional settings for later epics:
  - `default_fee_percent` (nullable).
  - `default_slippage_percent` (nullable).

#### 5.2.3 `strategies` Table

Purpose: strategy “container” with metadata per user.

**Fields (minimum):**

- `id`
- `user_id` (FK to `users`)
- `name`
- `asset` (e.g. `BTC/USDT`, limited set in later epics)
- `timeframe` (e.g. `1h`, `4h`)
- `is_archived` (boolean, default `false`)
- `auto_update_enabled` (boolean, default `false`) – used by scheduled re-backtests later.
- `created_at`
- `updated_at`

#### 5.2.4 `strategy_versions` Table

Purpose: snapshot of strategy logic as JSON per save.

**Fields (minimum):**

- `id`
- `strategy_id` (FK to `strategies`)
- `version_number` (simple integer, auto-increment per strategy)
- `definition_json` (JSON; stores blocks + connections)
- `created_at`

No need for complex relationships here; keep it simple.

#### 5.2.5 `backtest_runs` Table

Purpose: track backtest executions and their summary results.

**Fields (minimum):**

- `id`
- `user_id` (FK to `users`)
- `strategy_id` (FK to `strategies`)
- `strategy_version_id` (FK to `strategy_versions`)
- `status` (enum/string: `pending`, `running`, `completed`, `failed`)
- `date_from` (datetime)
- `date_to` (datetime)
- **Summary metrics** (nullable until run completes):
  - `total_return`
  - `cagr`
  - `max_drawdown`
  - `num_trades`
  - `win_rate`
- `results_storage_key` (string nullable; pointer to S3-like object storing equity curve & trades)
- `error_message` (nullable string)
- `created_at`
- `updated_at`

#### 5.2.6 `candles` Table

Purpose: store OHLCV candles for supported assets/timeframes.

**Fields (minimum):**

- `id`
- `asset`
- `timeframe`
- `timestamp` (start of candle; together with `asset` + `timeframe` should be unique)
- `open`
- `high`
- `low`
- `close`
- `volume`
- `created_at`

Add a unique constraint on `(asset, timeframe, timestamp)`.

---

## 6. Non-Functional Requirements

Pulled from MVP spec, tailored to this epic:

1. **Simplicity**
   - Monolithic FastAPI app + worker in a single codebase & image.
   - Single Postgres DB.
   - Single Redis instance.
   - No microservices, no Kubernetes.

2. **Performance (minimal for foundation)**
   - Healthcheck endpoint should respond in \<200–300 ms under typical dev conditions.
   - DB migrations should run without manual intervention.

3. **Reliability**
   - If DB is down, `/health` should report `db: "error"` rather than crashing the process.
   - `docker-compose up` should fail fast on obvious misconfigurations (e.g. missing env variables) with clear logs.

4. **Transparency**
   - README must clearly state what the stack contains and how to run it.

---

## 7. UX & UI Requirements (for this Epic)

Very minimal; only what’s needed to prove the stack is alive.

1. **Frontend health page**
   - Route `/health`.
   - Plain layout, no styling required.
   - Text: e.g. “Frontend OK”.
   - Optional: show backend health status.

2. **No additional pages required** in this epic. Future UX lives in later PRDs.

---

## 8. Dependencies & Integration

- **Framework & library decisions**:
  - Next.js + TS + Tailwind for frontend.
  - FastAPI for backend with SQLModel/SQLAlchemy.
  - Redis-backed queue library (RQ/Celery/Dramatiq) set up but can be minimally wired now.

- **External services**:
  - None required yet beyond optional S3-compatible storage (can run locally via MinIO or be stubbed).

---

## 9. Acceptance Criteria (Checklist)

**Epic 0 is done when:**

1. **Local environment**
   - [ ] `docker-compose up` starts `frontend`, `api`, `worker`, `db`, `redis` successfully.
   - [ ] `http://localhost:<frontend_port>/health` returns a simple “OK” page.
   - [ ] `http://localhost:<api_port>/health` returns JSON with `"status": "ok"` and checks DB.

2. **Core data model**
   - [ ] DB migrations create tables: `users`, `strategies`, `strategy_versions`, `backtest_runs`, `candles`.
   - [ ] ORM models exist and map to these tables.
   - [ ] A trivial script or test can insert and read records from each table.

3. **Basic deploy**
   - [ ] There is a short doc explaining how to run the same stack on a single remote host (e.g. via docker-compose).
   - [ ] No extra infrastructure is required beyond what’s listed in this PRD.

