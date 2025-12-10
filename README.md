# Blockbuilders

No-code crypto strategy builder for retail traders.

## Prerequisites

- Docker and Docker Compose
- Git

## Quick Start

### 1. Start the stack

```bash
docker compose up --build
```

This starts:
- **Frontend** (Next.js): http://localhost:3000
- **API** (FastAPI): http://localhost:8000
- **Worker** (RQ): background job processor
- **PostgreSQL**: internal (5432 on Docker network)
- **Redis**: port 6379
- **MinIO** (S3-compatible): http://localhost:9000 (console: http://localhost:9001)

### 2. Run database migrations

```bash
docker compose exec api alembic upgrade head
```

### 3. Verify health

- Frontend: http://localhost:3000/health
- Backend: http://localhost:8000/health

## Commands

| Command | Description |
|---------|-------------|
| `docker compose up` | Start all services |
| `docker compose up --build` | Rebuild and start |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes |
| `docker compose exec api alembic upgrade head` | Run migrations |
| `docker compose logs -f api` | Follow API logs |

## Project Structure

```
.
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, database
│   │   ├── models/    # SQLModel models
│   │   └── worker/    # RQ worker
│   └── alembic/       # Database migrations
├── frontend/          # Next.js application
│   └── src/app/       # App Router pages
└── docker-compose.yml # Service orchestration
```

## Database Schema

Five core tables:
- `users` - User accounts and settings
- `strategies` - Strategy containers with metadata
- `strategy_versions` - JSON snapshots of strategy logic
- `backtest_runs` - Backtest execution records and metrics
- `candles` - OHLCV price data

## Production Deployment

The same `docker-compose.yml` can run on any server with Docker:

```bash
# On remote server
git clone <repo-url>
cd blockbuilders
docker compose up -d --build
docker compose exec api alembic upgrade head
```

For production, consider:
- Using environment variables for secrets (don't use defaults)
- Setting up a reverse proxy (nginx/traefik) with SSL
- Configuring proper backup for PostgreSQL volume
