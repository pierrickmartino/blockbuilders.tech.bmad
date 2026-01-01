# Blockbuilders

A web-based, no-code strategy lab where retail crypto traders can visually build, backtest, and iterate on trading strategies without writing code.

## Features

- **Visual Strategy Canvas** - Drag-and-drop block-based interface for building strategies
- **Technical Indicators** - SMA, EMA, RSI, MACD, Bollinger Bands, ATR
- **Logic Blocks** - Comparisons, crossovers, AND/OR/NOT operators
- **Risk Management** - Position sizing, take profit, stop loss
- **Backtesting Engine** - OHLCV-based simulation with equity curves and trade analysis
- **Scheduled Re-Backtests** - Daily auto-updates on saved strategies (paper trading mode)
- **Usage Limits** - Soft per-user limits with transparent tracking

## Supported Assets & Timeframes

| Assets | Timeframes |
|--------|------------|
| BTC/USDT | 1d (daily) |
| ETH/USDT | 4h (4-hour) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, XyFlow |
| Backend | FastAPI, Python, SQLModel |
| Database | PostgreSQL |
| Queue | Redis + RQ |
| Storage | MinIO (S3-compatible) |
| Deployment | Docker Compose |

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
| `docker compose logs -f worker` | Follow worker logs |

## Project Structure

```
.
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/             # API routes (auth, users, strategies, backtests, usage)
│   │   ├── backtest/        # Backtest engine, indicators, interpreter
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # SQLModel models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── worker/          # RQ worker and scheduler
│   └── alembic/             # Database migrations
├── frontend/                # Next.js application
│   └── src/
│       ├── app/             # App Router pages
│       │   ├── (auth)/      # Login, signup
│       │   └── (app)/       # Dashboard, strategies, settings
│       ├── components/
│       │   └── canvas/      # 18 visual block components
│       ├── context/         # Auth context
│       ├── lib/             # API client, utilities
│       └── types/           # TypeScript interfaces
└── docker-compose.yml       # Service orchestration
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts, authentication, default settings, usage limits |
| `strategies` | Strategy metadata (asset, timeframe, auto-update settings) |
| `strategy_versions` | JSON snapshots of strategy block definitions |
| `backtest_runs` | Execution records, status, metrics, result storage keys |
| `candles` | OHLCV price data cache |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/signup` | Create account |
| `POST /auth/login` | Get JWT token |
| `GET /users/me` | Get current user profile |
| `PUT /users/me` | Update user settings |
| `GET /strategies` | List user strategies |
| `POST /strategies` | Create strategy |
| `GET /strategies/{id}` | Get strategy details |
| `PUT /strategies/{id}` | Update strategy |
| `DELETE /strategies/{id}` | Archive strategy |
| `POST /strategies/{id}/versions` | Save new version |
| `POST /strategies/{id}/backtests` | Run backtest |
| `GET /backtests/{id}` | Get backtest status/results |
| `GET /usage/me` | Get usage limits and counts |

## Canvas Block Types

**Inputs**: Price, Volume

**Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, ATR

**Logic**: Compare (>, <, >=, <=), Crossover, AND, OR, NOT

**Signals**: Entry Signal, Exit Signal

**Risk**: Position Size, Take Profit, Stop Loss

## Backtest Assumptions

The backtest engine uses transparent, conservative assumptions:

- **Data**: OHLCV candles only (no tick/order book data)
- **Fees**: Default 0.1% per trade (configurable)
- **Slippage**: Default 0.05% per trade (configurable)
- **Execution**: Trades execute at next candle open after signal

## Environment Variables

Create a `.env` at the repo root for local development:

```bash
cp .env.example .env
```

The backend loads `.env` automatically via `backend/app/core/config.py`. Docker Compose uses the values defined in `docker-compose.yml` by default; if you want Compose to read `.env`, pass `--env-file .env`.
For production, use `.env.production` as a reference and replace all secrets with your own.

Key configuration (see `backend/app/core/config.py`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | - | Redis connection string |
| `JWT_SECRET_KEY` | - | Secret key for JWT tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_DAYS` | 7 | JWT expiration window in days |
| `S3_ENDPOINT_URL` | - | MinIO/S3 endpoint |
| `S3_ACCESS_KEY` | - | MinIO/S3 access key |
| `S3_SECRET_KEY` | - | MinIO/S3 secret key |
| `S3_BUCKET_NAME` | `blockbuilders` | MinIO/S3 bucket name |
| `S3_REGION` | `us-east-1` | MinIO/S3 region |
| `CRYPTOCOMPARE_API_URL` | `https://min-api.cryptocompare.com/data/v2` | CryptoCompare API base URL |
| `CRYPTOCOMPARE_API_KEY` | - | API key for price data |
| `DEFAULT_INITIAL_BALANCE` | 10000 | Default backtest starting balance |
| `DEFAULT_FEE_RATE` | 0.001 | Default fee rate per trade |
| `DEFAULT_SLIPPAGE_RATE` | 0.0005 | Default slippage rate per trade |
| `MAX_GAP_CANDLES` | 5 | Max gap candles allowed when fetching data |
| `DEFAULT_MAX_STRATEGIES` | 10 | Max strategies per user |
| `DEFAULT_MAX_BACKTESTS_PER_DAY` | 50 | Max backtests per day |
| `DATA_QUALITY_LOOKBACK_DAYS` | 90 | Days to recompute data quality metrics |
| `DATA_QUALITY_GAP_THRESHOLD` | 2.0 | Max allowed missing-candle percentage |
| `DATA_QUALITY_OUTLIER_THRESHOLD` | 0.25 | Price-move outlier threshold (ratio) |
| `DATA_QUALITY_VOLUME_THRESHOLD` | 95.0 | Minimum % of candles with non-zero volume |
| `SCHEDULER_ENABLED` | true | Enable/disable scheduled jobs |
| `SCHEDULER_HOUR_UTC` | 2 | Hour (UTC) for daily scheduler run |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `DEFAULT_MAX_STRATEGIES` | 10 | Max strategies per user |
| `DEFAULT_MAX_BACKTESTS_PER_DAY` | 50 | Max backtests per day |
| `RESEND_API_KEY` | - | Resend API key for password reset emails |
| `RESET_TOKEN_EXPIRE_HOURS` | 1 | Password reset token TTL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for auth flows |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | - | GitHub OAuth client secret |

MinIO root credentials for local storage (used by Docker Compose):

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIO_ROOT_USER` | `minioadmin` | MinIO root user |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | MinIO root password |

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

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev        # Start dev server
npm run lint       # Run ESLint
npm run build      # Production build
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # Start dev server
```

### Running Tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && pytest
```

## License

Proprietary - All rights reserved
