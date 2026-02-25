import logging
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, correlation_id_var, generate_correlation_id

setup_logging()

logger = logging.getLogger(__name__)

from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.backtests import router as backtests_router
from app.api.billing import router as billing_router
from app.api.health import router as health_router
from app.api.market import router as market_router
from app.api.notifications import router as notifications_router
from app.api.profiles import router as profiles_router
from app.api.progress import router as progress_router
from app.api.strategies import router as strategies_router
from app.api.strategy_tags import router as strategy_tags_router
from app.api.strategy_templates import router as strategy_templates_router
from app.api.usage import router as usage_router
from app.api.users import router as users_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Correlation-ID"],
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next) -> Response:
    """Bind a correlation ID to every request and log request completion."""
    cid = request.headers.get("x-correlation-id") or generate_correlation_id()
    token = correlation_id_var.set(cid)
    start = time.monotonic()
    try:
        response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
    except Exception:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.exception(
            "request_failed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
            },
        )
        raise
    finally:
        correlation_id_var.reset(token)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(usage_router)
app.include_router(progress_router)
app.include_router(strategies_router)
app.include_router(strategy_tags_router)
app.include_router(strategy_templates_router)
app.include_router(backtests_router)
app.include_router(notifications_router)
app.include_router(alerts_router)
app.include_router(market_router)
