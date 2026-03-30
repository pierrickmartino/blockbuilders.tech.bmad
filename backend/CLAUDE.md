# backend/CLAUDE.md

## Commands
```bash
cd backend
uvicorn app.main:app --reload                       # dev server → localhost:8000
pytest                                              # run all tests (SQLite test.db via pytest.ini)
pytest tests/path/to/test_file.py                  # single file
alembic upgrade head                               # apply pending migrations
alembic revision --autogenerate -m "description"  # generate migration from model changes
```

## FastAPI patterns
- Explicit, flat routers — one file per domain area (e.g., `app/api/routes/strategies.py`)
- Simple `Depends()` injection; no deep chains
- No generic repository layer; no domain-driven-design ceremony
- Endpoints: implement only fields/behavior defined in the current spec; return well-typed concise responses matching frontend needs

## Models & schemas
- SQLAlchemy models: only fields required by the current spec
- Pydantic: separate request/response schemas when shapes differ; no over-generalized base schemas
- Non-execution strategy data: store under top-level `metadata` key so the interpreter ignores it

## Database & migrations
- Postgres is the only database (tests use SQLite via `pytest.ini` env overrides)
- Every schema change requires an Alembic migration — never alter tables by hand
- After pulling new code: always run `alembic upgrade head` before starting the server

## Testing
- Focus on critical paths: backtest correctness, strategy validation, auth flows
- No complex fixtures for trivial logic; avoid over-mocking
- YAGNI applies to tests: if a test adds more code than confidence, skip it

## Worker / infrastructure
- Background jobs run via the same app in worker mode — no separate service
- Redis for queue + caching; S3-compatible storage for backtest artifacts
- No new infrastructure (no extra DBs, message buses, or services)
