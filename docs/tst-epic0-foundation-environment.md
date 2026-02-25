# Test Checklist – Foundation & Environment (Epic 0)

> Source PRD: `prd-epic0-foundation-environment.md`

---

## 1. Docker Compose & Local Environment (S0.1)

### 1.1 Service Startup

- [x] `docker-compose up` (or `docker compose up`) builds all images and starts all services without errors
- [x] `frontend` service starts and listens on the configured port (default 3000)
- [x] `api` service starts and listens on its configured port
- [x] `worker` service starts and connects to Redis successfully
- [x] `db` (Postgres) service starts with the configured DB name, user, and password
- [x] `redis` service starts and is reachable by `api` and `worker`
- [x] (Optional) `storage` (MinIO/S3-compatible) service starts if configured
- [x] All services can communicate with each other as expected (frontend -> api, api -> db, api -> redis, worker -> db, worker -> redis)

### 1.2 Environment Variables

- [x] `API_BASE_URL` environment variable is correctly consumed by the frontend service
- [x] DB URL environment variable is correctly consumed by the API service
- [x] Redis URL environment variable is correctly consumed by the API and worker services
- [x] Missing required environment variables cause a clear, fast failure with descriptive log output

### 1.3 Data Persistence

- [x] Postgres data directory is persisted via a Docker volume
- [x] Stopping and restarting `docker-compose` retains previously inserted DB data

### 1.4 Worker Configuration

- [x] Worker uses the same Docker image as the `api` service
- [x] Worker starts in "worker mode" via a different command/entrypoint
- [x] Worker is connected to Redis for job queue processing

---

## 2. Healthcheck Endpoints (S0.1)

### 2.1 Backend Health Endpoint

- [x] `GET /health` returns HTTP 200 with JSON body containing `"status": "ok"`
- [ ] Response includes `"db": "ok"` when the database is reachable
- [ ] Response includes `"version"` field with the app version string
- [x] When Postgres is unreachable, `GET /health` returns `"db": "error"` instead of crashing the process
- [ ] Health endpoint responds in under 300ms under typical dev conditions

### 2.2 Frontend Health Page

- [x] `GET /health` on the frontend returns an HTML page with text "OK" or similar status indicator
- [x] The page renders without errors in a browser
- [ ] (Optional) Frontend health page calls backend `/health` and displays its status

---

## 3. Core Data Model & Migrations (S0.2)

### 3.1 Migration Execution

- [x] A single documented command (e.g., `alembic upgrade head`) applies all migrations successfully
- [x] Migrations are idempotent: running them multiple times does not cause errors
- [x] Migrations run without manual intervention after initial setup

### 3.2 `users` Table

- [ ] Table `users` is created by migrations
- [ ] Table has `id` primary key (UUID or integer)
- [ ] Table has `email` column with unique constraint
- [ ] Table has `password_hash` column
- [ ] Table has `created_at` timestamp column
- [ ] Table has `updated_at` timestamp column
- [ ] Table has `default_fee_percent` nullable column
- [ ] Table has `default_slippage_percent` nullable column
- [ ] A record can be inserted and read back correctly

### 3.3 `strategies` Table

- [ ] Table `strategies` is created by migrations
- [ ] Table has `id` primary key
- [ ] Table has `user_id` column with foreign key to `users.id`
- [ ] Table has `name` text column
- [ ] Table has `asset` text column
- [ ] Table has `timeframe` text column
- [ ] Table has `is_archived` boolean column defaulting to `false`
- [ ] Table has `auto_update_enabled` boolean column defaulting to `false`
- [ ] Table has `created_at` and `updated_at` timestamp columns
- [ ] Foreign key constraint prevents inserting a strategy with a non-existent `user_id`
- [ ] A record can be inserted and read back correctly

### 3.4 `strategy_versions` Table

- [ ] Table `strategy_versions` is created by migrations
- [ ] Table has `id` primary key
- [ ] Table has `strategy_id` column with foreign key to `strategies.id`
- [ ] Table has `version_number` integer column
- [ ] Table has `definition_json` JSON/JSONB column
- [ ] Table has `created_at` timestamp column
- [ ] Foreign key constraint prevents inserting a version with a non-existent `strategy_id`
- [ ] A record can be inserted and read back correctly

### 3.5 `backtest_runs` Table

- [ ] Table `backtest_runs` is created by migrations
- [ ] Table has `id` primary key
- [ ] Table has `user_id` FK to `users`, `strategy_id` FK to `strategies`, `strategy_version_id` FK to `strategy_versions`
- [ ] Table has `status` column (supports values: `pending`, `running`, `completed`, `failed`)
- [ ] Table has `date_from` and `date_to` datetime columns
- [ ] Table has nullable summary metric columns: `total_return`, `cagr`, `max_drawdown`, `num_trades`, `win_rate`
- [ ] Table has `results_storage_key` nullable string column
- [ ] Table has `error_message` nullable string column
- [ ] Table has `created_at` and `updated_at` timestamp columns
- [ ] A record can be inserted and read back correctly

### 3.6 `candles` Table

- [ ] Table `candles` is created by migrations
- [ ] Table has `id` primary key
- [ ] Table has `asset`, `timeframe`, `timestamp` columns
- [ ] Table has `open`, `high`, `low`, `close`, `volume` numeric columns
- [ ] Table has `created_at` timestamp column
- [ ] Unique constraint on `(asset, timeframe, timestamp)` is enforced
- [ ] Inserting a duplicate `(asset, timeframe, timestamp)` raises a constraint violation error
- [ ] A record can be inserted and read back correctly

### 3.7 ORM Models

- [ ] ORM models exist for all five tables: `users`, `strategies`, `strategy_versions`, `backtest_runs`, `candles`
- [ ] ORM models map correctly to their respective tables
- [ ] Relationships between models are correctly defined (e.g., user -> strategies, strategy -> versions)

---

## 4. Deployment (Basic)

- [ ] The same stack can be run on a single remote machine using docker-compose (or a minimal prod variant)
- [ ] Documentation exists explaining how to run the stack in a prod-like environment
- [ ] No Kubernetes or advanced orchestration is required
- [ ] The deployment doc covers the necessary one or two commands to get started

---

## 5. Documentation

- [ ] README contains prerequisites (Docker, docker-compose)
- [ ] README documents `docker-compose up` command
- [ ] README documents `docker-compose down` command
- [ ] README documents the migration command
- [ ] Deployment doc snippet exists for running on a remote host

---

## 6. Non-Functional & Edge Cases

- [x] No additional infrastructure beyond what is listed in the PRD is required
- [x] All services use a single monolithic FastAPI codebase (API + worker modes)
- [x] Single Postgres DB is used (no extra databases)
- [x] Single Redis instance is used (no extra queue systems)
- [x] Stack does not include microservices, Kubernetes, or complex orchestration
